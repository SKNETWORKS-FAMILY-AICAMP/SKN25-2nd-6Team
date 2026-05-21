from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.guardian import Guardian
from app.models.schedule import Schedule
from app.models.master import CategoryMaster

# 정기검진 예약 생성
async def create_checkup_schedule(db: AsyncSession, pet_id: int, date: str, time: str, memo: str, doctorid: int):

    # category_id 1 = 정기검진
    result = await db.execute(
        select(CategoryMaster).where(CategoryMaster.code == 1)
    )
    category = result.scalar_one_or_none()

    # guardianDB 생성
    guardian = Guardian(
        petid=pet_id,
        category_id=category.id,
        date=datetime.strptime(date, "%Y-%m-%d").date(),
        memo=memo
    )
    db.add(guardian)
    await db.flush()

    # 예약 시간 설정
    confirmed_time = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    confirmed_end_time = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")

    # scheduleDB 생성
    schedule = Schedule(
        emrid=guardian.emrid,
        doctorid=doctorid,
        duration_min=30,
        confirmed_time=confirmed_time,
        confirmed_end_time=confirmed_end_time,
        status="예약대기"
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule, guardian

# 예약 조회
async def get_schedule_by_id(db: AsyncSession, schedule_id: int):
    result = await db.execute(
        select(Schedule).where(Schedule.scheduleid == schedule_id)
    )
    return result.scalar_one_or_none()
