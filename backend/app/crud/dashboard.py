from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule
from app.models.guardian import Guardian
from app.models.pet import Pet
from app.models.master import TriageMaster


async def get_doctor_day_schedules(
    db: AsyncSession,
    doctor_id: int,
    start: datetime,
    end: datetime,
):
    """특정 수의사의 하루치 예약을 조인 조회한다.

    소프트 삭제된 예약/진료기록(deleted_at)은 제외한다.
    """
    result = await db.execute(
        select(Schedule, Guardian, Pet, TriageMaster)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .outerjoin(TriageMaster, Guardian.triage_id == TriageMaster.id)
        .where(Schedule.doctorid == doctor_id)
        .where(Schedule.confirmed_time >= start)
        .where(Schedule.confirmed_time < end)
        .where(Schedule.deleted_at.is_(None))
        .where(Guardian.deleted_at.is_(None))
        .order_by(Schedule.confirmed_time.asc())
    )
    return result.all()
