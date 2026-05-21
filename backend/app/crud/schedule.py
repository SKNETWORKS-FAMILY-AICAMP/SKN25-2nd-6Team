from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timedelta
from app.models.guardian import Guardian
from app.models.schedule import Schedule
from app.models.master import CategoryMaster
from app.models.pet import Pet
from app.models.doctor import Doctor
from app.models.vet_schedule import VetSchedule


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
        status="CONFIRMED"
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule, guardian


# 예약 상세 조회
async def get_schedule_by_id(db: AsyncSession, schedule_id: int):
    result = await db.execute(
        select(Schedule).where(Schedule.scheduleid == schedule_id)
    )
    return result.scalar_one_or_none()


# 예약 목록 조회 (페이지네이션)
async def get_schedules_by_userid(db: AsyncSession, userid: int, page: int, size: int, filter: str = "all"):
    offset = (page - 1) * size

    conditions = [Pet.userid == userid]

    if filter == "upcoming":
        conditions.append(Schedule.status == "CONFIRMED")
        conditions.append(Schedule.deleted_at.is_(None))
    elif filter == "past":
        conditions.append(Schedule.status == "COMPLETED")
        conditions.append(Schedule.deleted_at.is_(None))
    elif filter == "cancelled":
        conditions.append(
            or_(Schedule.status == "CANCELLED", Schedule.deleted_at.isnot(None))
        )
    else:
        conditions.append(Schedule.status != "CANCELLED")
        conditions.append(Schedule.deleted_at.is_(None))

    stmt = (
        select(Schedule)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .where(*conditions)
        .order_by(Schedule.confirmed_time.desc())
        .offset(offset).limit(size + 1)
    )
    result = await db.execute(stmt)
    schedules = list(result.scalars().all())

    has_next = len(schedules) > size
    if has_next:
        schedules = schedules[:size]

    return schedules, has_next


# 예약 취소 (soft cancel)
async def cancel_schedule(db: AsyncSession, schedule: Schedule):
    schedule.status = "CANCELLED"

    result = await db.execute(
        select(VetSchedule).where(
            VetSchedule.doctorid == schedule.doctorid,
            VetSchedule.start_time >= schedule.confirmed_time.time(),
            VetSchedule.end_time <= schedule.confirmed_end_time.time()
        )
    )
    for slot in result.scalars().all():
        slot.is_available = True

    await db.commit()
    await db.refresh(schedule)
    return schedule


# 예약 변경
async def update_schedule_time(db: AsyncSession, schedule: Schedule, confirmed_time: str, duration_min: int):
    new_time = datetime.fromisoformat(confirmed_time)
    new_end_time = new_time + timedelta(minutes=duration_min)

    # 기존 슬롯 복원
    old_result = await db.execute(
        select(VetSchedule).where(
            VetSchedule.doctorid == schedule.doctorid,
            VetSchedule.date == schedule.confirmed_time.date(),
            VetSchedule.start_time >= schedule.confirmed_time.time(),
            VetSchedule.end_time <= schedule.confirmed_end_time.time()
        )
    )
    for slot in old_result.scalars().all():
        slot.is_available = True

    # 새 슬롯 충돌 검증
    new_result = await db.execute(
        select(VetSchedule).where(
            VetSchedule.doctorid == schedule.doctorid,
            VetSchedule.date == new_time.date(),
            VetSchedule.start_time >= new_time.time(),
            VetSchedule.end_time <= new_end_time.time()
        )
    )
    new_slots = list(new_result.scalars().all())

    for slot in new_slots:
        if not slot.is_available:
            return None  # 충돌

    for slot in new_slots:
        slot.is_available = False

    schedule.confirmed_time = new_time
    schedule.confirmed_end_time = new_end_time
    schedule.duration_min = duration_min
    await db.commit()
    await db.refresh(schedule)
    return schedule


# 빈 슬롯 조회
async def get_available_slots(db: AsyncSession, date: str, duration_min: int, doctorid: int = None):
    stmt = select(VetSchedule).where(
        VetSchedule.date == datetime.strptime(date, "%Y-%m-%d").date(),
        VetSchedule.is_available == True
    ).order_by(VetSchedule.start_time)

    if doctorid:
        stmt = stmt.where(VetSchedule.doctorid == doctorid)

    result = await db.execute(stmt)
    slots = list(result.scalars().all())

    # duration_min 기반 연속 슬롯 계산
    needed_slots = -(-duration_min // 30)  # 올림 나눗셈
    available_starts = []

    for i in range(len(slots) - needed_slots + 1):
        consecutive = True
        for j in range(1, needed_slots):
            if slots[i + j].start_time != slots[i + j - 1].end_time:
                consecutive = False
                break
        if consecutive:
            available_starts.append(slots[i])

    return available_starts


# 챗봇 예약 확정
async def confirm_schedule(db: AsyncSession, emrid: int, doctorid: int, confirmed_time: str, duration_min: int):
    new_time = datetime.fromisoformat(confirmed_time)
    new_end_time = new_time + timedelta(minutes=duration_min)

    schedule = Schedule(
        emrid=emrid,
        doctorid=doctorid,
        duration_min=duration_min,
        confirmed_time=new_time,
        confirmed_end_time=new_end_time,
        status="CONFIRMED"
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule
