from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_doctor
from app.db.session import get_db
from app.crud.dashboard import get_doctor_day_schedules
from app.models.doctor import Doctor
from app.utils.timezone import KST, to_kst
from app.schemas.dashboard import (
    DashboardResult,
    DashboardScheduleItem,
    DashboardSummary,
)

# 라우터 설정
router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

# triage label(한국어) -> 프론트 VisitType
TRIAGE_TO_TYPE = {
    "응급": "emergency",
    "준응급": "semiEmergency",
    "일반": "normal",
}


def _age_label(birth: date | None) -> str:
    if not birth:
        return "-"
    today = date.today()
    years = today.year - birth.year - (
        (today.month, today.day) < (birth.month, birth.day)
    )
    return f"{years}세"


def _weight_label(weight) -> str:
    if weight is None:
        return "-"
    return f"{float(weight):g}kg"


def _hhmm(dt: datetime | None) -> str:
    kst = to_kst(dt)
    return kst.strftime("%H:%M") if kst else "-"


@router.get("/today", status_code=200)
async def get_today_dashboard(
    target_date: date = Query(default_factory=date.today, alias="date"),
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    start = datetime.combine(target_date, time.min)
    end = start + timedelta(days=1)

    rows = await get_doctor_day_schedules(
        db, current_doctor.doctorid, start, end
    )

    schedules: list[DashboardScheduleItem] = []
    emergency_count = 0
    waiting_count = 0
    completed_count = 0

    now = datetime.now(KST)

    for schedule, guardian, pet, triage in rows:
        triage_label = triage.label if triage else None
        visit_type = TRIAGE_TO_TYPE.get(triage_label or "", "normal")

        if visit_type == "emergency":
            emergency_count += 1
        if schedule.status == "진료완료":
            completed_count += 1
        elif schedule.status in ("예약대기", "대기", "예약확정"):
            # 예약 시간이 이미 지난 건은 '대기중'으로 세지 않는다.
            confirmed = to_kst(schedule.confirmed_time)
            if confirmed and confirmed >= now:
                waiting_count += 1

        schedules.append(DashboardScheduleItem(
            id=schedule.scheduleid,
            start=_hhmm(schedule.confirmed_time),
            end=_hhmm(schedule.confirmed_end_time),
            patientName=pet.petname,
            species=pet.species or "-",
            breed=pet.breed or "-",
            age=_age_label(pet.birth_date),
            weight=_weight_label(pet.weight_kg),
            reason=guardian.memo or (triage_label or "-"),
            type=visit_type,
            status=schedule.status,
        ))

    result = DashboardResult(
        summaries=DashboardSummary(
            total=len(schedules),
            waiting=waiting_count,
            emergency=emergency_count,
            completed=completed_count,
        ),
        schedules=schedules,
    )

    return {
        "code": 200,
        "result": result.model_dump(),
    }
