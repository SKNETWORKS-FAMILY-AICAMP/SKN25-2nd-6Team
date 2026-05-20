from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.schedule import Schedule
from app.models.guardian import Guardian
from app.models.pet import Pet
from app.models.user import User
from app.models.doctor import Doctor
from app.models.master import TriageMaster, CategoryMaster


# triage_masterDB.code -> 프론트 응급도 키
TRIAGE_CODE_TO_KEY = {
    1: "emergency",
    2: "semiEmergency",
    3: "normal",
}


class TimeSlotConflict(Exception):
    """같은 날짜·시간에 이미 예약이 존재할 때"""
    pass


def has_time_conflict(
    db: Session,
    confirmed: datetime,
    exclude_schedule_id: int | None = None,
) -> bool:

    target_date = confirmed.date()
    target_hm = confirmed.strftime("%H:%M")

    query = db.query(Schedule).filter(Schedule.confirmed_time.isnot(None))
    if exclude_schedule_id is not None:
        query = query.filter(Schedule.scheduleid != exclude_schedule_id)

    for schedule in query.all():
        ct = schedule.confirmed_time
        if ct and ct.date() == target_date and ct.strftime("%H:%M") == target_hm:
            return True

    return False

# 예약 추가/수정 시 진료항목 선택 UI를 없앴으므로 기본 카테고리(일반진료, code=2)를 사용
DEFAULT_CATEGORY_CODE = 2
# 예약 추가 시 기본 응급도(일반, code=3)
DEFAULT_TRIAGE_CODE = 3
DEFAULT_DURATION_MIN = 30


def _resolve_doctor(db: Session, doctor_name: str | None) -> Doctor | None:
    doctor = None
    if doctor_name:
        doctor = (
            db.query(Doctor)
            .filter(Doctor.doctor_name == doctor_name)
            .first()
        )
    if not doctor:
        doctor = db.query(Doctor).first()
    return doctor


def _calculate_age(birth_date) -> str:

    if not birth_date:
        return ""

    today = date.today()
    years = today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )

    if years >= 1:
        return f"{years}세"

    months = (
        (today.year - birth_date.year) * 12
        + today.month
        - birth_date.month
    )
    if today.day < birth_date.day:
        months -= 1

    return f"{max(months, 0)}개월"


def get_reservations(db: Session):

    results = (
        db.query(Schedule, Guardian, Pet, User, Doctor, TriageMaster, CategoryMaster)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .join(User, Pet.userid == User.userid)
        .join(Doctor, Schedule.doctorid == Doctor.doctorid)
        .outerjoin(TriageMaster, Guardian.triage_id == TriageMaster.id)
        .outerjoin(CategoryMaster, Guardian.category_id == CategoryMaster.id)
        .order_by(Schedule.confirmed_time)
        .all()
    )

    reservation_list = []

    for schedule, guardian, pet, user, doctor, triage, category in results:
        confirmed = schedule.confirmed_time
        end = schedule.confirmed_end_time

        reservation_list.append({
            "schedule_id": schedule.scheduleid,
            "petid": pet.petid,
            "pet_name": pet.petname,
            "species": pet.species or "",
            "breed": pet.breed or "",
            "birth_date": pet.birth_date.isoformat() if pet.birth_date else "",
            "age": _calculate_age(pet.birth_date),
            "weight_kg": float(pet.weight_kg) if pet.weight_kg else 0,
            "gender": pet.gender or "",
            "is_neutered": bool(pet.is_neutered),
            "profile_image": pet.profile_image,
            "last_checkup_date": (
                pet.checkup_date.isoformat() if pet.checkup_date else ""
            ),
            "owner_name": user.name,
            "phone": user.phone,
            "doctor_name": doctor.doctor_name,
            "visit_reason": category.label if category else "",
            "triage": (
                TRIAGE_CODE_TO_KEY.get(triage.code, "normal")
                if triage else "normal"
            ),
            "date": confirmed.date().isoformat() if confirmed else "",
            "start": confirmed.strftime("%H:%M") if confirmed else "",
            "end": end.strftime("%H:%M") if end else "",
            "duration_min": schedule.duration_min,
            "memo": guardian.memo or "",
            "status": schedule.status,
        })

    return reservation_list


def update_reservation_status(
    db: Session,
    schedule_id: int,
    status: str
):

    schedule = (
        db.query(Schedule)
        .filter(Schedule.scheduleid == schedule_id)
        .first()
    )

    if not schedule:
        return None

    schedule.status = status

    db.commit()
    db.refresh(schedule)

    return schedule


def create_reservation(
    db: Session,
    pet_id: int,
    date_str: str,
    time_str: str,
    doctor_name: str | None = None,
    memo: str | None = None,
):

    doctor = _resolve_doctor(db, doctor_name)
    if not doctor:
        return None

    category = (
        db.query(CategoryMaster)
        .filter(CategoryMaster.code == DEFAULT_CATEGORY_CODE)
        .first()
    ) or db.query(CategoryMaster).first()

    if not category:
        return None

    triage = (
        db.query(TriageMaster)
        .filter(TriageMaster.code == DEFAULT_TRIAGE_CODE)
        .first()
    )

    confirmed = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    if has_time_conflict(db, confirmed):
        raise TimeSlotConflict()

    guardian = Guardian(
        petid=pet_id,
        category_id=category.id,
        triage_id=triage.id if triage else None,
        date=datetime.strptime(date_str, "%Y-%m-%d").date(),
        memo=memo,
    )
    db.add(guardian)
    db.flush()

    schedule = Schedule(
        emrid=guardian.emrid,
        doctorid=doctor.doctorid,
        duration_min=DEFAULT_DURATION_MIN,
        confirmed_time=confirmed,
        confirmed_end_time=confirmed + timedelta(minutes=DEFAULT_DURATION_MIN),
        status="예약대기",
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return schedule


def update_reservation(
    db: Session,
    schedule_id: int,
    date_str: str | None = None,
    time_str: str | None = None,
    doctor_name: str | None = None,
    memo: str | None = None,
):

    schedule = (
        db.query(Schedule)
        .filter(Schedule.scheduleid == schedule_id)
        .first()
    )

    if not schedule:
        return None

    guardian = (
        db.query(Guardian)
        .filter(Guardian.emrid == schedule.emrid)
        .first()
    )

    if date_str and time_str:
        confirmed = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        if has_time_conflict(db, confirmed, exclude_schedule_id=schedule_id):
            raise TimeSlotConflict()
        duration = schedule.duration_min or DEFAULT_DURATION_MIN
        schedule.confirmed_time = confirmed
        schedule.confirmed_end_time = confirmed + timedelta(minutes=duration)
        if guardian:
            guardian.date = confirmed.date()

    if doctor_name:
        doctor = _resolve_doctor(db, doctor_name)
        if doctor:
            schedule.doctorid = doctor.doctorid

    if memo is not None and guardian:
        guardian.memo = memo

    db.commit()
    db.refresh(schedule)

    return schedule


def delete_reservation(db: Session, schedule_id: int) -> bool:

    schedule = (
        db.query(Schedule)
        .filter(Schedule.scheduleid == schedule_id)
        .first()
    )

    if not schedule:
        return False

    guardian = (
        db.query(Guardian)
        .filter(Guardian.emrid == schedule.emrid)
        .first()
    )

    # schedule.emrid -> guardian.emrid FK 때문에 schedule을 먼저 지우고 flush
    db.delete(schedule)
    db.flush()

    if guardian:
        db.delete(guardian)

    db.commit()

    return True
