import math
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db

from app.crud.patient import (
    get_patient_list,
    get_patient_detail,
    get_latest_visit_date,
    get_patient_emr_history,
    get_prescriptions_by_emr,
    update_patient,
)


class PatientUpdate(BaseModel):
    petname: str | None = None
    species: str | None = None
    breed: str | None = None
    gender: str | None = None
    is_neutered: bool | None = None
    birth_date: date | None = None
    weight_kg: float | None = None
    notes: str | None = None


router = APIRouter(
    prefix="/doctor/patient",
    tags=["doctor-patient"]
)


def calculate_age(birth_date: date | None) -> str:

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


@router.get("/list", status_code=200)
def list_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: str | None = Query(None),
    species: str | None = Query(None),
    db: Session = Depends(get_db),
):

    rows, total_count = get_patient_list(
        db,
        page=page,
        page_size=page_size,
        keyword=keyword,
        species=species,
    )

    patient_list = []
    for pet, user in rows:
        last_visit = get_latest_visit_date(db, pet.petid)

        patient_list.append({
            "petid": pet.petid,
            "petname": pet.petname,
            "age": calculate_age(pet.birth_date),
            "owner_name": user.name,
            "phone": user.phone,
            "breed": pet.breed or "",
            "last_visit_date": (
                last_visit.date().isoformat() if last_visit else ""
            ),
            "memo": pet.notes or "",
        })

    total_page = (
        math.ceil(total_count / page_size) if total_count else 1
    )

    return {
        "code": 200,
        "result": {
            "total_count": total_count,
            "patient_list": patient_list,
            "pagination": {
                "current_page": page,
                "total_page": total_page,
            },
        },
    }


@router.get("/{petid}", status_code=200)
def patient_detail(
    petid: int,
    db: Session = Depends(get_db),
):

    result = get_patient_detail(db, petid)

    if not result:
        return {
            "code": 404,
            "message": "환자를 찾을 수 없습니다."
        }

    pet, user = result

    history_rows = get_patient_emr_history(db, petid)

    emr_history = []
    for emr, doctor, schedule in history_rows:
        prescription_rows = get_prescriptions_by_emr(
            db, emr.doctor_emrid
        )

        visit_dt = schedule.confirmed_time or emr.created_at

        emr_history.append({
            "doctor_emrid": emr.doctor_emrid,
            "visit_date": (
                visit_dt.date().isoformat() if visit_dt else ""
            ),
            "doctor_name": doctor.doctor_name,
            "status": "treatment",
            "chief_complaint": emr.vet_note or "",
            "soap": {
                "subjective": "",
                "objective": "",
                "assessment": "",
                "plan": "",
            },
            "prescription": [
                {
                    "drug_name": drug.name,
                    "dosage": prescription.dosage or drug.dosage or "",
                    "frequency": "",
                    "duration_days": prescription.duration_days or 0,
                }
                for prescription, drug in prescription_rows
            ],
        })

    return {
        "code": 200,
        "result": {
            "patient_info": {
                "petid": pet.petid,
                "petname": pet.petname,
                "species": pet.species or "",
                "breed": pet.breed or "",
                "gender": pet.gender or "",
                "is_neutered": bool(pet.is_neutered),
                "birth_date": (
                    pet.birth_date.isoformat() if pet.birth_date else ""
                ),
                "age": calculate_age(pet.birth_date),
                "weight_kg": (
                    float(pet.weight_kg) if pet.weight_kg else 0
                ),
                "owner_name": user.name,
                "phone": user.phone,
                "notes": pet.notes or "",
                "profile_image": pet.profile_image,
            },
            "emr_history": emr_history,
        },
    }


@router.put("/{petid}", status_code=200)
def update_patient_endpoint(
    petid: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
):

    result = get_patient_detail(db, petid)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="환자를 찾을 수 없습니다."
        )

    pet, _ = result

    updates = payload.model_dump(exclude_unset=True)

    updated_pet = update_patient(db, pet, updates)

    return {
        "code": 200,
        "message": "수정 완료",
        "result": {
            "petid": updated_pet.petid,
            "petname": updated_pet.petname,
            "species": updated_pet.species or "",
            "breed": updated_pet.breed or "",
            "gender": updated_pet.gender or "",
            "is_neutered": bool(updated_pet.is_neutered),
            "birth_date": (
                updated_pet.birth_date.isoformat()
                if updated_pet.birth_date else ""
            ),
            "weight_kg": (
                float(updated_pet.weight_kg)
                if updated_pet.weight_kg else 0
            ),
            "notes": updated_pet.notes or "",
        },
    }
