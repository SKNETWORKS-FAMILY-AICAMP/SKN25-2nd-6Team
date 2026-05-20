from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_doctor
from app.db.session import get_db
from app.models.doctor import Doctor
from app.models.guardian import Guardian
from app.models.master import TriageMaster
from app.models.pet import Pet
from app.models.schedule import Schedule

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
    return dt.strftime("%H:%M") if dt else "-"


@router.get("/today", status_code=200)
def get_today_dashboard(
    target_date: date = Query(default_factory=date.today, alias="date"),
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    start = datetime.combine(target_date, time.min)
    end = start + timedelta(days=1)

    rows = (
        db.query(Schedule, Guardian, Pet, TriageMaster)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .outerjoin(TriageMaster, Guardian.triage_id == TriageMaster.id)
        .filter(Schedule.doctorid == current_doctor.doctorid)
        .filter(Schedule.confirmed_time >= start)
        .filter(Schedule.confirmed_time < end)
        .order_by(Schedule.confirmed_time.asc())
        .all()
    )

    schedules = []
    emergency_count = 0
    waiting_count = 0
    completed_count = 0

    for schedule, guardian, pet, triage in rows:
        triage_label = triage.label if triage else None
        visit_type = TRIAGE_TO_TYPE.get(triage_label or "", "normal")

        if visit_type == "emergency":
            emergency_count += 1
        if schedule.status == "진료완료":
            completed_count += 1
        elif schedule.status in ("예약대기", "대기", "예약확정"):
            waiting_count += 1

        schedules.append({
            "id": schedule.scheduleid,
            "start": _hhmm(schedule.confirmed_time),
            "end": _hhmm(schedule.confirmed_end_time),
            "patientName": pet.petname,
            "species": pet.species or "-",
            "breed": pet.breed or "-",
            "age": _age_label(pet.birth_date),
            "weight": _weight_label(pet.weight_kg),
            "reason": guardian.memo or (triage_label or "-"),
            "type": visit_type,
            "status": schedule.status,
        })

    return {
        "code": 200,
        "result": {
            "summaries": {
                "total": len(schedules),
                "waiting": waiting_count,
                "emergency": emergency_count,
                "completed": completed_count,
            },
            "schedules": schedules,
        },
    }
