from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alarm import DoctorAlarm


async def get_alarms(db: AsyncSession, doctor_id: int, limit: int = 50):
    result = await db.execute(
        select(DoctorAlarm)
        .where(DoctorAlarm.doctorid == doctor_id)
        .order_by(DoctorAlarm.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def mark_all_read(db: AsyncSession, doctor_id: int) -> int:
    result = await db.execute(
        update(DoctorAlarm)
        .where(DoctorAlarm.doctorid == doctor_id, DoctorAlarm.is_read.is_(False))
        .values(is_read=True)
        .returning(DoctorAlarm.alarmid)
    )
    await db.commit()
    return len(result.all())


async def create_alarm(
    db: AsyncSession,
    doctor_id: int,
    schedule_id: int,
    alarm_type: str,
    contents: str,
) -> DoctorAlarm:
    alarm = DoctorAlarm(
        doctorid=doctor_id,
        scheduleid=schedule_id,
        type=alarm_type,
        contents=contents,
        is_read=False,
    )
    db.add(alarm)
    await db.commit()
    await db.refresh(alarm)
    return alarm
