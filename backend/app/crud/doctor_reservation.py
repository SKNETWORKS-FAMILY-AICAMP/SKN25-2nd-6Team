from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule
from app.models.guardian import Guardian
from app.models.pet import Pet
from app.models.user import User
from app.models.doctor import Doctor
from app.models.master import TriageMaster, CategoryMaster
from app.utils.timezone import to_kst


class TimeSlotConflict(Exception):
    """같은 날짜·시간에 이미 예약이 존재할 때"""
    pass


# 예약 추가/수정 시 진료항목 선택 UI를 없앴으므로 기본 카테고리(일반진료, code=2)를 사용
DEFAULT_CATEGORY_CODE = 2
# 예약 추가 시 기본 응급도(일반, code=3)
DEFAULT_TRIAGE_CODE = 3
DEFAULT_DURATION_MIN = 30


async def _resolve_doctor(db: AsyncSession, doctor_name: str | None) -> Doctor | None:
    doctor = None
    if doctor_name:
        result = await db.execute(
            select(Doctor).where(Doctor.doctor_name == doctor_name)
        )
        doctor = result.scalars().first()
    if not doctor:
        result = await db.execute(select(Doctor))
        doctor = result.scalars().first()
    return doctor


async def has_time_conflict(
    db: AsyncSession,
    confirmed: datetime,
    exclude_schedule_id: int | None = None,
) -> bool:
    """소프트 삭제되지 않은 예약 중 같은 날짜·시각이 있는지 확인."""
    target_date = confirmed.date()
    target_hm = confirmed.strftime("%H:%M")

    stmt = (
        select(Schedule)
        .where(Schedule.confirmed_time.isnot(None))
        .where(Schedule.deleted_at.is_(None))
    )
    if exclude_schedule_id is not None:
        stmt = stmt.where(Schedule.scheduleid != exclude_schedule_id)

    result = await db.execute(stmt)
    for schedule in result.scalars().all():
        # 저장된 값은 asyncpg가 UTC로 반환하므로 KST로 변환 후 비교해야
        # 새 예약("13:00")과 기존 예약이 같은 시각인지 올바르게 판정된다.
        ct = to_kst(schedule.confirmed_time)
        if ct and ct.date() == target_date and ct.strftime("%H:%M") == target_hm:
            return True

    return False


async def get_reservations(db: AsyncSession):
    """예약 목록 조회용 조인 쿼리. 소프트 삭제된 예약/진료기록은 제외한다."""
    result = await db.execute(
        select(Schedule, Guardian, Pet, User, Doctor, TriageMaster, CategoryMaster)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .join(User, Pet.userid == User.userid)
        .join(Doctor, Schedule.doctorid == Doctor.doctorid)
        .outerjoin(TriageMaster, Guardian.triage_id == TriageMaster.id)
        .outerjoin(CategoryMaster, Guardian.category_id == CategoryMaster.id)
        .where(Schedule.deleted_at.is_(None))
        .where(Guardian.deleted_at.is_(None))
        .order_by(Schedule.confirmed_time)
    )
    return result.all()


async def get_schedule(db: AsyncSession, schedule_id: int) -> Schedule | None:
    """소프트 삭제되지 않은 예약 단건 조회."""
    result = await db.execute(
        select(Schedule).where(
            Schedule.scheduleid == schedule_id,
            Schedule.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def get_guardian_by_emrid(db: AsyncSession, emrid: int) -> Guardian | None:
    result = await db.execute(
        select(Guardian).where(
            Guardian.emrid == emrid,
            Guardian.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def get_default_category(db: AsyncSession) -> CategoryMaster | None:
    result = await db.execute(
        select(CategoryMaster).where(CategoryMaster.code == DEFAULT_CATEGORY_CODE)
    )
    category = result.scalars().first()
    if category:
        return category
    result = await db.execute(select(CategoryMaster))
    return result.scalars().first()


async def get_default_triage(db: AsyncSession) -> TriageMaster | None:
    result = await db.execute(
        select(TriageMaster).where(TriageMaster.code == DEFAULT_TRIAGE_CODE)
    )
    return result.scalars().first()


async def update_reservation_status(db: AsyncSession, schedule_id: int, status: str):
    schedule = await get_schedule(db, schedule_id)
    if not schedule:
        return None

    schedule.status = status
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def create_reservation(
    db: AsyncSession,
    pet_id: int,
    date_str: str,
    time_str: str,
    doctor_name: str | None = None,
    memo: str | None = None,
):
    doctor = await _resolve_doctor(db, doctor_name)
    if not doctor:
        return None

    category = await get_default_category(db)
    if not category:
        return None

    triage = await get_default_triage(db)

    confirmed = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    if await has_time_conflict(db, confirmed):
        raise TimeSlotConflict()

    guardian = Guardian(
        petid=pet_id,
        category_id=category.id,
        triage_id=triage.id if triage else None,
        date=datetime.strptime(date_str, "%Y-%m-%d").date(),
        memo=memo,
    )
    db.add(guardian)
    await db.flush()

    schedule = Schedule(
        emrid=guardian.emrid,
        doctorid=doctor.doctorid,
        duration_min=DEFAULT_DURATION_MIN,
        confirmed_time=confirmed,
        confirmed_end_time=confirmed + timedelta(minutes=DEFAULT_DURATION_MIN),
        status="예약대기",
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    return schedule


async def update_reservation(
    db: AsyncSession,
    schedule_id: int,
    date_str: str | None = None,
    time_str: str | None = None,
    doctor_name: str | None = None,
    memo: str | None = None,
):
    schedule = await get_schedule(db, schedule_id)
    if not schedule:
        return None

    guardian = await get_guardian_by_emrid(db, schedule.emrid)

    if date_str and time_str:
        confirmed = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        if await has_time_conflict(db, confirmed, exclude_schedule_id=schedule_id):
            raise TimeSlotConflict()
        duration = schedule.duration_min or DEFAULT_DURATION_MIN
        schedule.confirmed_time = confirmed
        schedule.confirmed_end_time = confirmed + timedelta(minutes=duration)
        if guardian:
            guardian.date = confirmed.date()

    if doctor_name:
        doctor = await _resolve_doctor(db, doctor_name)
        if doctor:
            schedule.doctorid = doctor.doctorid

    if memo is not None and guardian:
        guardian.memo = memo

    await db.commit()
    await db.refresh(schedule)

    return schedule


async def delete_reservation(db: AsyncSession, schedule_id: int) -> bool:
    """하드 삭제 대신 deleted_at 타임스탬프를 기록하는 소프트 삭제."""
    schedule = await get_schedule(db, schedule_id)
    if not schedule:
        return False

    guardian = await get_guardian_by_emrid(db, schedule.emrid)

    now = datetime.now(timezone.utc)
    schedule.deleted_at = now
    if guardian:
        guardian.deleted_at = now

    await db.commit()

    return True
