from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule
from app.models.guardian import Guardian
from app.models.pet import Pet
from app.models.triage_result import TriageResult
from app.utils.timezone import KST


async def get_doctor_day_schedules(
    db: AsyncSession,
    doctor_id: int,
    start: datetime,
    end: datetime,
):
    """특정 수의사의 하루치 예약을 조인 조회한다.

    소프트 삭제된 예약/진료기록(deleted_at)은 제외한다.
    """
    kst_start = start.replace(tzinfo=KST)
    kst_end = end.replace(tzinfo=KST)

    result = await db.execute(
        select(Schedule, Guardian, Pet, TriageResult)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .outerjoin(TriageResult, Guardian.emrid == TriageResult.emrid)
        .where(Schedule.doctorid == doctor_id)
        .where(Schedule.confirmed_time >= kst_start)
        .where(Schedule.confirmed_time < kst_end)
        .where(Schedule.deleted_at.is_(None))
        .where(Guardian.deleted_at.is_(None))
        .order_by(Schedule.confirmed_time.asc())
    )
    return result.all()
