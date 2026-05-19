from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schedule import CheckupScheduleRequest, ScheduleResponse
from app.crud.schedule import create_checkup_schedule, get_schedule_by_id
from app.core.dependencies import get_current_user
from app.models.pet import Pet
from app.models.doctor import Doctor

router = APIRouter(prefix="/schedules", tags=["schedules"])

# 정기검진 예약
@router.post("/checkup", status_code=201)
def create_checkup(
    request: CheckupScheduleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 반려동물 확인
    pet = db.query(Pet).filter(
        Pet.petid == request.pet_id,
        Pet.userid == current_user.userid
    ).first()

    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    # 수의사 확인 (첫 번째 수의사로 자동 배정)
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

# 예약 조회
@router.get("/{schedule_id}", status_code=200)
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = get_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="예약 정보를 찾을 수 없습니다.")

    # 반려동물 정보 조회
    guardian = schedule.emrid
    pet = db.query(Pet).filter(Pet.petid == schedule.emrid).first()

    return {
        "code": 200,
        "result": {
            "schedule_id": schedule.scheduleid,
            "status": schedule.status,
            "confirmed_time": str(schedule.confirmed_time),
            "confirmed_end_time": str(schedule.confirmed_end_time),
            "duration_min": schedule.duration_min
        }
    }