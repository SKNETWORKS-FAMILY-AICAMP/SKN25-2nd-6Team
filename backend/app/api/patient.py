import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.utils.age import calculate_age
from app.utils.timezone import to_kst
from app.schemas.patient import PatientUpdate

from app.crud.patient import (
    get_patient_list,
    get_patient_detail,
    get_last_visit_map,
    get_patient_emr_history,
    get_prescriptions_by_emr,
    update_patient,
)


router = APIRouter(
    prefix="/doctor/patient",
    tags=["doctor-patient"]
)


@router.get("/list", status_code=200)
async def list_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: str | None = Query(None),
    species: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    rows, total_count = await get_patient_list(
        db,
        page=page,
        page_size=page_size,
        keyword=keyword,
        species=species,
    )

    pet_ids = [pet.petid for pet, _ in rows]
    last_visit_map = await get_last_visit_map(db, pet_ids)

    patient_list = []
    for pet, user in rows:
        last_visit = to_kst(last_visit_map.get(pet.petid))

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
async def patient_detail(
    petid: int,
    db: AsyncSession = Depends(get_db),
):
    result = await get_patient_detail(db, petid)

    if not result:
        return {
            "code": 404,
            "message": "환자를 찾을 수 없습니다."
        }

    pet, user = result

    history_rows = await get_patient_emr_history(db, petid)

    emr_history = []
    for emr, doctor, schedule in history_rows:
        prescription_rows = await get_prescriptions_by_emr(db, emr.doctor_emrid)

        # 안전하게 visit_dt 추출
        confirmed_time = schedule.confirmed_time if schedule else None
        visit_dt = to_kst(confirmed_time or emr.created_at)

        # vet_note JSON/String 안전하게 파싱 및 SOAP 추출
        vet_memo_data = emr.vet_note
        if isinstance(vet_memo_data, str):
            try:
                import json
                vet_memo_data = json.loads(vet_memo_data)
            except Exception:
                pass

        soap_data = {
            "subjective": "",
            "objective": "",
            "assessment": "",
            "plan": "",
        }
        chief_complaint = ""
        if isinstance(vet_memo_data, dict):
            soap_data["subjective"] = vet_memo_data.get("subjective") or vet_memo_data.get("Subjective") or ""
            soap_data["objective"] = vet_memo_data.get("objective") or vet_memo_data.get("Objective") or ""
            soap_data["assessment"] = vet_memo_data.get("assessment") or vet_memo_data.get("Assessment") or ""
            soap_data["plan"] = vet_memo_data.get("plan") or vet_memo_data.get("Plan") or ""
            chief_complaint = soap_data["subjective"] or soap_data["assessment"] or ""
        else:
            chief_complaint = str(vet_memo_data) if vet_memo_data else ""

        emr_history.append({
            "doctor_emrid": emr.doctor_emrid,
            "visit_date": (
                visit_dt.date().isoformat() if visit_dt else ""
            ),
            "doctor_name": doctor.doctor_name,
            "status": "treatment",
            "chief_complaint": chief_complaint,
            "soap": soap_data,
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
async def update_patient_endpoint(
    petid: int,
    payload: PatientUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await get_patient_detail(db, petid)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="환자를 찾을 수 없습니다."
        )

    pet, _ = result

    updates = payload.model_dump(exclude_unset=True)

    updated_pet = await update_patient(db, pet, updates)

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
