from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db

from app.crud.doctor_reservation import (
    get_reservations,
    update_reservation_status,
    create_reservation,
    update_reservation,
    delete_reservation,
    TimeSlotConflict,
)

from app.schemas.doctor_reservation import (
    ReservationStatusUpdate
)


class ReservationCreate(BaseModel):
    pet_id: int
    date: str
    time: str
    doctor_name: str | None = None
    memo: str | None = None


class ReservationUpdate(BaseModel):
    date: str | None = None
    time: str | None = None
    doctor_name: str | None = None
    memo: str | None = None


router = APIRouter(
    prefix="/doctor/reservations",
    tags=["doctor-reservations"]
)

@router.get("")
def reservation_list(
    db: Session = Depends(get_db)
):

    reservations = get_reservations(db)

    return {
        "code": 200,
        "result": reservations
    }


@router.post("", status_code=201)
def add_reservation(
    request: ReservationCreate,
    db: Session = Depends(get_db)
):

    try:
        schedule = create_reservation(
            db,
            pet_id=request.pet_id,
            date_str=request.date,
            time_str=request.time,
            doctor_name=request.doctor_name,
            memo=request.memo,
        )
    except TimeSlotConflict:
        raise HTTPException(
            status_code=409,
            detail="해당 시간에 이미 예약이 있습니다. 다른 시간을 선택해주세요."
        )

    if not schedule:
        raise HTTPException(
            status_code=400,
            detail="예약을 생성할 수 없습니다. (수의사/카테고리 정보를 확인하세요)"
        )

    return {
        "code": 201,
        "message": "예약이 추가되었습니다.",
        "result": {"schedule_id": schedule.scheduleid},
    }


@router.put("/{schedule_id}")
def edit_reservation(
    schedule_id: int,
    request: ReservationUpdate,
    db: Session = Depends(get_db)
):

    try:
        updated = update_reservation(
            db,
            schedule_id,
            date_str=request.date,
            time_str=request.time,
            doctor_name=request.doctor_name,
            memo=request.memo,
        )
    except TimeSlotConflict:
        raise HTTPException(
            status_code=409,
            detail="해당 시간에 이미 예약이 있습니다. 다른 시간을 선택해주세요."
        )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="예약 정보를 찾을 수 없습니다."
        )

    return {
        "code": 200,
        "message": "예약이 수정되었습니다.",
        "result": {"schedule_id": updated.scheduleid},
    }


@router.delete("/{schedule_id}")
def remove_reservation(
    schedule_id: int,
    db: Session = Depends(get_db)
):

    deleted = delete_reservation(db, schedule_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="예약 정보를 찾을 수 없습니다."
        )

    return {
        "code": 200,
        "message": "예약이 취소되었습니다.",
    }


@router.patch("/{schedule_id}")
def change_reservation_status(
    schedule_id: int,
    request: ReservationStatusUpdate,
    db: Session = Depends(get_db)
):

    updated = update_reservation_status(
        db,
        schedule_id,
        request.status
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="예약 정보를 찾을 수 없습니다."
        )

    return {
        "code": 200,
        "message": "예약 상태가 변경되었습니다."
    }