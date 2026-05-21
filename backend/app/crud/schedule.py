from sqlalchemy import select, or_, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timedelta
from app.models.guardian import Guardian
from app.models.schedule import Schedule
from app.models.master import CategoryMaster
from app.models.pet import Pet
from app.models.doctor import Doctor
from app.models.vet_schedule import VetSchedule
from app.utils.timezone import to_kst, KST


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
        conditions.append(Schedule.confirmed_time > datetime.now())
        conditions.append(Schedule.deleted_at.is_(None))
    elif filter == "past":
        conditions.append(Schedule.deleted_at.is_(None))
        conditions.append(
            or_(
                Schedule.status == "COMPLETED",
                and_(Schedule.status == "CONFIRMED", Schedule.confirmed_time <= datetime.now())
            )
        )
    elif filter == "cancelled":
        conditions.append(
            or_(Schedule.status == "CANCELLED", Schedule.deleted_at.isnot(None))
        )
    else:
        pass  # "all": CONFIRMED + COMPLETED + CANCELLED + soft-deleted 전부 포함

    cancelled_last = case(
        (or_(
            Schedule.status == "CANCELLED",
            Schedule.deleted_at.isnot(None),
            and_(Schedule.status == "CONFIRMED", Schedule.confirmed_time <= datetime.now())
        ), 1),
        else_=0
    )

    stmt = (
        select(Schedule)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .where(*conditions)
        .order_by(cancelled_last.asc(), Schedule.confirmed_time.asc())
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

    confirmed_kst = to_kst(schedule.confirmed_time)
    end_kst = to_kst(schedule.confirmed_end_time)

    result = await db.execute(
        select(VetSchedule).where(
            VetSchedule.doctorid == schedule.doctorid,
            VetSchedule.date == confirmed_kst.date(),
            VetSchedule.start_time >= confirmed_kst.time(),
            VetSchedule.end_time <= end_kst.time()
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
    new_kst = to_kst(new_time) if new_time.tzinfo else new_time.replace(tzinfo=KST)
    new_date = new_kst.date()
    new_hhmm = new_kst.strftime("%H:%M")

    # Schedule 테이블 기반 충돌 검증 (본인 예약 제외)
    conflict_result = await db.execute(
        select(Schedule).where(
            Schedule.scheduleid != schedule.scheduleid,
            Schedule.confirmed_time.isnot(None),
            Schedule.deleted_at.is_(None),
            Schedule.status != "CANCELLED",
            Schedule.doctorid == schedule.doctorid,
        )
    )
    for s in conflict_result.scalars().all():
        ct = to_kst(s.confirmed_time)
        if ct and ct.date() == new_date and ct.strftime("%H:%M") == new_hhmm:
            return None  # 충돌

    schedule.confirmed_time = new_time
    schedule.confirmed_end_time = new_end_time
    schedule.duration_min = duration_min
    await db.commit()
    await db.refresh(schedule)
    return schedule


# 수의사 운영 시간 슬롯 (30분 단위, 점심 12:00~13:00 제외)
_VET_TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00",
]


class AvailableSlot:
    def __init__(self, start_time: str, end_time: str, doctorid: int, doctor_name: str = None):
        self.start_time = start_time
        self.end_time = end_time
        self.doctorid = doctorid
        self.doctor_name = doctor_name


# 빈 슬롯 조회 (Schedule 테이블 기반 동적 계산 — VetSchedule 의존 없음)
async def get_available_slots(db: AsyncSession, date: str, duration_min: int, doctorid: int = None):
    target_date = datetime.strptime(date, "%Y-%m-%d").date()
    now_kst = datetime.now(KST)

    # 의사 확인
    if doctorid:
        doc_result = await db.execute(select(Doctor).where(Doctor.doctorid == doctorid))
        doctor = doc_result.scalar_one_or_none()
    else:
        doc_result = await db.execute(select(Doctor))
        doctor = doc_result.scalars().first()

    if not doctor:
        return []

    resolved_doctorid = doctor.doctorid

    # 해당 날짜에 이미 활성 예약된 시작 시간 수집
    sched_result = await db.execute(
        select(Schedule).where(
            Schedule.confirmed_time.isnot(None),
            Schedule.deleted_at.is_(None),
            Schedule.status != "CANCELLED",
            Schedule.doctorid == resolved_doctorid,
        )
    )
    booked = set()
    for s in sched_result.scalars().all():
        ct = to_kst(s.confirmed_time)
        if ct and ct.date() == target_date:
            booked.add(ct.strftime("%H:%M"))

    # 오늘이면 현재 시간 이전 슬롯 제외
    is_today = target_date == now_kst.date()
    current_hhmm = now_kst.strftime("%H:%M") if is_today else "00:00"

    avail = [
        t for t in _VET_TIME_SLOTS
        if t not in booked and (not is_today or t > current_hhmm)
    ]

    # duration_min 기반 연속 슬롯 계산
    needed = max(1, -(-duration_min // 30))
    available_starts = []

    for i in range(len(avail) - needed + 1):
        consecutive = True
        for j in range(1, needed):
            if _VET_TIME_SLOTS.index(avail[i + j]) != _VET_TIME_SLOTS.index(avail[i + j - 1]) + 1:
                consecutive = False
                break
        if consecutive:
            t = avail[i]
            h, m = map(int, t.split(":"))
            end_dt = datetime(2000, 1, 1, h, m) + timedelta(minutes=duration_min)
            available_starts.append(AvailableSlot(
                start_time=t,
                end_time=end_dt.strftime("%H:%M"),
                doctorid=resolved_doctorid,
                doctor_name=doctor.doctor_name,
            ))

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
