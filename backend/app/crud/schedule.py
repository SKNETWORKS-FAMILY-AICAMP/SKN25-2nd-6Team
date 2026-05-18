from sqlalchemy.orm import Session
from datetime import datetime
from app.models.guardian import Guardian
from app.models.schedule import Schedule
from app.models.master import CategoryMaster
from app.models.pet import Pet
from app.models.doctor import Doctor

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

# 예약 조회
def get_schedule_by_id(db: Session, schedule_id: int):
    return db.query(Schedule).filter(Schedule.scheduleid == schedule_id).first()