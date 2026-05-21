from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, date as date_type, timezone, timedelta
from app.db.session import get_db
from app.schemas.schedule import CheckupScheduleRequest, ConfirmScheduleRequest, UpdateScheduleRequest
from app.crud.schedule import (
    create_checkup_schedule, get_schedules_by_userid,
    get_schedule_by_id, cancel_schedule,
    update_schedule_time, get_available_slots, confirm_schedule
)
from app.core.dependencies import get_current_user
from app.models.pet import Pet
from app.models.doctor import Doctor
from app.models.guardian import Guardian
from app.models.master import CategoryMaster

router = APIRouter(prefix="/schedules", tags=["schedules"])

KST = timezone(timedelta(hours=9))

# 정기검진 예약
@router.post("/checkup", status_code=201)
def create_checkup(
    request: CheckupScheduleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    pet = db.query(Pet).filter(
        Pet.petid == request.pet_id,
        Pet.userid == current_user.userid
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    doctor = db.query(Doctor).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="등록된 수의사가 없습니다.")

    schedule, guardian = create_checkup_schedule(
        db=db,
        pet_id=request.pet_id,
        date=request.date,
        time=request.time,
        memo=request.memo,
        doctorid=doctor.doctorid
    )

    return {
        "code": 201,
        "message": "예약이 완료되었습니다.",
        "result": {
            "schedule_id": schedule.scheduleid,
            "pet_name": pet.petname,
            "category": "정기검진",
            "date": request.date,
            "time": request.time,
            "memo": request.memo,
            "status": schedule.status
        }
    }

# 예약 목록 조회
@router.get("")
def get_schedules(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedules, has_next = get_schedules_by_userid(db, current_user.userid, page, size)

    result = []
    for schedule in schedules:
        guardian = db.query(Guardian).filter(Guardian.emrid == schedule.emrid).first()
        pet = db.query(Pet).filter(Pet.petid == guardian.petid).first()
        doctor = db.query(Doctor).filter(Doctor.doctorid == schedule.doctorid).first()
        category = db.query(CategoryMaster).filter(CategoryMaster.id == guardian.category_id).first()

        from datetime import date
        age = None
        if pet.birth_date:
            today = date.today()
            age = today.year - pet.birth_date.year

        result.append({
            "schedule_id": schedule.scheduleid,
            "pet_name": pet.petname,
            "pet_profile_image": pet.profile_image,
            "breed": pet.breed,
            "age": age,
            "gender": pet.gender,
            "category": category.label if category else None,
            "status": schedule.status,
            "confirmed_time": schedule.confirmed_time.astimezone(KST).isoformat() if schedule.confirmed_time else None,
            "confirmed_end_time": schedule.confirmed_end_time.astimezone(KST).isoformat() if schedule.confirmed_end_time else None,
            "duration_min": schedule.duration_min,
            "hospital_name": doctor.hospital_name if doctor else None,
            "hospital_address": doctor.hospital_address if doctor else None,
            "doctorid": schedule.doctorid,
            "doctor_name": doctor.doctor_name if doctor else None,
        })

    return {
        "code": 200,
        "result": result,
        "pagination": {
            "page": page,
            "size": size,
            "has_next": has_next
        }
    }

# 예약 상세 조회
@router.get("/{schedule_id}")
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = get_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="예약 정보를 찾을 수 없습니다.")

    guardian = db.query(Guardian).filter(Guardian.emrid == schedule.emrid).first()
    pet = db.query(Pet).filter(Pet.petid == guardian.petid).first()
    doctor = db.query(Doctor).filter(Doctor.doctorid == schedule.doctorid).first()

    from datetime import date
    age = None
    if pet.birth_date:
        today = date.today()
        age = today.year - pet.birth_date.year

    return {
        "code": 200,
        "result": {
            "schedule_id": schedule.scheduleid,
            "pet_name": pet.petname,
            "pet_profile_image": pet.profile_image,
            "breed": pet.breed,
            "age": age,
            "gender": pet.gender,
            "status": schedule.status,
            "confirmed_time": schedule.confirmed_time.astimezone(KST).isoformat() if schedule.confirmed_time else None,
            "confirmed_end_time": schedule.confirmed_end_time.astimezone(KST).isoformat() if schedule.confirmed_end_time else None,
            "duration_min": schedule.duration_min,
            "hospital_name": doctor.hospital_name if doctor else None,
            "hospital_address": doctor.hospital_address if doctor else None,
            "doctorid": schedule.doctorid,
            "doctor_name": doctor.doctor_name if doctor else None,
            "memo": guardian.memo
        }
    }

# 예약 취소 (soft cancel)
@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = get_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="예약 정보를 찾을 수 없습니다.")

    if schedule.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="이미 완료된 예약은 취소할 수 없습니다.")

    if schedule.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="이미 취소된 예약입니다.")

    if schedule.confirmed_time.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="이미 지난 예약은 취소할 수 없습니다.")

    cancel_schedule(db, schedule)
    return {"code": 200, "message": "예약이 취소되었습니다."}

# 예약 변경
@router.patch("/{schedule_id}")
def update_schedule(
    schedule_id: int,
    request: UpdateScheduleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = get_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="예약 정보를 찾을 수 없습니다.")

    if schedule.status in ["COMPLETED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="변경할 수 없는 예약입니다.")

    if schedule.confirmed_time.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="이미 지난 예약은 변경할 수 없습니다.")

    result = update_schedule_time(db, schedule, request.confirmed_time, request.duration_min)

    if not result:
        raise HTTPException(status_code=409, detail="선택하신 시간에 이미 예약이 있습니다.")

    return {"code": 200, "message": "예약이 변경되었습니다."}

# 빈 슬롯 조회
@router.get("/available")
def get_available(
    date: str = Query(...),
    duration_min: int = Query(...),
    doctorid: int = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    slots = get_available_slots(db, date, duration_min, doctorid)
    doctor = db.query(Doctor).filter(Doctor.doctorid == slots[0].doctorid).first() if slots else None

    return {
        "code": 200,
        "result": [
            {
                "start_time": str(slot.start_time),
                "end_time": str(slot.end_time),
                "doctorid": slot.doctorid,
                "doctor_name": doctor.doctor_name if doctor else None
            }
            for slot in slots
        ]
    }

# 챗봇 예약 확정
@router.post("/confirm", status_code=201)
def confirm_schedule_api(
    request: ConfirmScheduleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = confirm_schedule(
        db=db,
        emrid=request.emrid,
        doctorid=request.doctorid,
        confirmed_time=request.confirmed_time,
        duration_min=request.duration_min
    )

    return {
        "code": 201,
        "message": "예약이 확정되었습니다.",
        "result": {
            "schedule_id": schedule.scheduleid,
            "confirmed_time": schedule.confirmed_time.astimezone(KST).isoformat() if schedule.confirmed_time else None,
            "confirmed_end_time": schedule.confirmed_end_time.astimezone(KST).isoformat() if schedule.confirmed_end_time else None,
            "status": schedule.status
        }
    }