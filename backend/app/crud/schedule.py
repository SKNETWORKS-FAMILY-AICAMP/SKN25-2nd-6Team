from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.guardian import Guardian
from app.models.schedule import Schedule
from app.models.master import CategoryMaster
from app.models.pet import Pet
from app.models.doctor import Doctor
from app.models.vet_schedule import VetSchedule

# 정기검진 예약 생성
def create_checkup_schedule(db: Session, pet_id: int, date: str, time: str, memo: str, doctorid: int):

    # category_id 1 = 정기검진
    category = db.query(CategoryMaster).filter(CategoryMaster.code == 1).first()

    # guardianDB 생성
    guardian = Guardian(
        petid=pet_id,
        category_id=category.id,
        date=datetime.strptime(date, "%Y-%m-%d").date(),
        memo=memo
    )
    db.add(guardian)
    db.flush()

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
    db.commit()
    db.refresh(schedule)
    return schedule, guardian

# 예약 상세 조회
def get_schedule_by_id(db: Session, schedule_id: int):
    return db.query(Schedule).filter(Schedule.scheduleid == schedule_id).first()

# 예약 목록 조회 (페이지네이션)
def get_schedules_by_userid(db: Session, userid: int, page: int, size: int):
    offset = (page - 1) * size

    query = db.query(Schedule).join(
        Guardian, Schedule.emrid == Guardian.emrid
    ).join(
        Pet, Guardian.petid == Pet.petid
    ).filter(
        Pet.userid == userid,
        Schedule.status != "CANCELLED"
    ).order_by(Schedule.confirmed_time.desc())

    total = query.count()
    schedules = query.offset(offset).limit(size + 1).all()

    has_next = len(schedules) > size
    if has_next:
        schedules = schedules[:size]

    return schedules, has_next

# 예약 취소 (soft cancel)
def cancel_schedule(db: Session, schedule: Schedule):
    schedule.status = "CANCELLED"
    # vet_scheduleDB 슬롯 복원
    vet_slots = db.query(VetSchedule).filter(
        VetSchedule.doctorid == schedule.doctorid,
        VetSchedule.start_time >= schedule.confirmed_time.time(),
        VetSchedule.end_time <= schedule.confirmed_end_time.time()
    ).all()
    for slot in vet_slots:
        slot.is_available = True
    db.commit()
    db.refresh(schedule)
    return schedule

# 예약 변경
def update_schedule_time(db: Session, schedule: Schedule, confirmed_time: str, duration_min: int):
    new_time = datetime.fromisoformat(confirmed_time)
    new_end_time = new_time + timedelta(minutes=duration_min)

    # 기존 슬롯 복원
    old_slots = db.query(VetSchedule).filter(
        VetSchedule.doctorid == schedule.doctorid,
        VetSchedule.date == schedule.confirmed_time.date(),
        VetSchedule.start_time >= schedule.confirmed_time.time(),
        VetSchedule.end_time <= schedule.confirmed_end_time.time()
    ).all()
    for slot in old_slots:
        slot.is_available = True

    # 새 슬롯 충돌 검증
    new_slots = db.query(VetSchedule).filter(
        VetSchedule.doctorid == schedule.doctorid,
        VetSchedule.date == new_time.date(),
        VetSchedule.start_time >= new_time.time(),
        VetSchedule.end_time <= new_end_time.time()
    ).all()

    for slot in new_slots:
        if not slot.is_available:
            return None  # 충돌

    for slot in new_slots:
        slot.is_available = False

    schedule.confirmed_time = new_time
    schedule.confirmed_end_time = new_end_time
    schedule.duration_min = duration_min
    db.commit()
    db.refresh(schedule)
    return schedule

# 빈 슬롯 조회
def get_available_slots(db: Session, date: str, duration_min: int, doctorid: int = None):
    from app.models.vet_schedule import VetSchedule
    query = db.query(VetSchedule).filter(
        VetSchedule.date == datetime.strptime(date, "%Y-%m-%d").date(),
        VetSchedule.is_available == True
    )
    if doctorid:
        query = query.filter(VetSchedule.doctorid == doctorid)

    slots = query.order_by(VetSchedule.start_time).all()

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
def confirm_schedule(db: Session, emrid: int, doctorid: int, confirmed_time: str, duration_min: int):
    new_time = datetime.fromisoformat(confirmed_time)
    new_end_time = new_time + timedelta(minutes=duration_min)

    schedule = Schedule(
        emrid=emrid,
        doctorid=doctorid,
        duration_min=duration_min,
        confirmed_time=new_time,
        confirmed_end_time=new_end_time,
        status="PENDING"
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule
