from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.models.pet import Pet
from app.models.user import User
from app.models.emr import EMR
from app.models.schedule import Schedule
from app.models.doctor import Doctor
from app.models.prescription import Prescription
from app.models.drug import Drug


def get_patient_list(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    keyword: str | None = None,
    species: str | None = None,
):

    query = (
        db.query(Pet, User)
        .join(User, Pet.userid == User.userid)
    )

    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            or_(Pet.petname.ilike(like), User.name.ilike(like))
        )

    if species:
        query = query.filter(Pet.species == species)

    total_count = query.count()

    rows = (
        query.order_by(Pet.petid.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return rows, total_count


def get_patient_detail(db: Session, petid: int):

    return (
        db.query(Pet, User)
        .join(User, Pet.userid == User.userid)
        .filter(Pet.petid == petid)
        .first()
    )


def get_latest_visit_date(db: Session, petid: int):

    return (
        db.query(func.max(Schedule.confirmed_time))
        .join(EMR, EMR.scheduleid == Schedule.scheduleid)
        .filter(EMR.petid == petid)
        .scalar()
    )


def get_patient_emr_history(db: Session, petid: int):

    return (
        db.query(EMR, Doctor, Schedule)
        .join(Doctor, EMR.doctorid == Doctor.doctorid)
        .join(Schedule, EMR.scheduleid == Schedule.scheduleid)
        .filter(EMR.petid == petid)
        .order_by(EMR.created_at.desc())
        .all()
    )


def get_prescriptions_by_emr(db: Session, doctor_emrid: int):

    return (
        db.query(Prescription, Drug)
        .join(Drug, Prescription.drug_id == Drug.drugid)
        .filter(Prescription.doctor_emrid == doctor_emrid)
        .all()
    )


def update_patient(db: Session, pet: Pet, updates: dict):

    for key, value in updates.items():
        setattr(pet, key, value)

    db.commit()
    db.refresh(pet)

    return pet
