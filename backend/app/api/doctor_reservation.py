import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.utils.age import calculate_age
from app.utils.timezone import to_kst

logger = logging.getLogger(__name__)

from app.crud.doctor_reservation import (
    get_reservations,
    update_reservation_status,
    create_reservation,
    update_reservation,
    delete_reservation,
    TimeSlotConflict,
    DuplicatePetReservation,
)

from app.schemas.doctor_reservation import (
    ReservationCreate,
    ReservationUpdate,
    ReservationStatusUpdate,
)


router = APIRouter(
    prefix="/doctor/reservations",
    tags=["doctor-reservations"]
)


def _triage_key(triage, triage_result) -> str:
    """챗봇 문진 결과가 있으면 그 응급도를 우선 사용한다."""
    if triage_result:
        urgency_num = triage_result.urgency_level_num
        if urgency_num == 1:
            return "emergency"
        if urgency_num == 2:
            return "semiEmergency"
        return "normal"

    if triage:
        if triage.code == 1:
            return "emergency"
        if triage.code == 2:
            return "semiEmergency"

    return "normal"


def _visit_reason(category, triage_result) -> str:
    """진료 항목은 예약 경로 기준으로 단순하게 보여준다."""
    if triage_result:
        return "일반"

    return category.label if category else ""


def _serialize_reservation(row) -> dict:
    """get_reservations 조인 결과 한 행을 응답 형태로 변환한다."""
    schedule, guardian, pet, user, doctor, triage, category, triage_result = row
    confirmed = to_kst(schedule.confirmed_time)
    end = to_kst(schedule.confirmed_end_time)

    return {
        "schedule_id": schedule.scheduleid,
        "petid": pet.petid,
        "pet_name": pet.petname,
        "species": pet.species or "",
        "breed": pet.breed or "",
        "birth_date": pet.birth_date.isoformat() if pet.birth_date else "",
        "age": calculate_age(pet.birth_date),
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
        "visit_reason": _visit_reason(category, triage_result),
        "triage": _triage_key(triage, triage_result),
        "date": confirmed.date().isoformat() if confirmed else "",
        "start": confirmed.strftime("%H:%M") if confirmed else "",
        "end": end.strftime("%H:%M") if end else "",
        "duration_min": schedule.duration_min,
        "memo": guardian.memo or "",
        "status": schedule.status,
    }


@router.get("")
async def reservation_list(
    db: AsyncSession = Depends(get_db)
):
    rows = await get_reservations(db)

    return {
        "code": 200,
        "result": [_serialize_reservation(row) for row in rows],
    }


@router.post("", status_code=201)
async def add_reservation(
    request: ReservationCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        schedule = await create_reservation(
            db,
            pet_id=request.pet_id,
            date_str=request.date,
            time_str=request.time,
            doctor_name=request.doctor_name,
            memo=request.memo,
        )
    except DuplicatePetReservation:
        raise HTTPException(
            status_code=409,
            detail="해당 반려동물의 예약이 이미 존재합니다."
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
async def edit_reservation(
    schedule_id: int,
    request: ReservationUpdate,
    db: AsyncSession = Depends(get_db)
):
    try:
        updated = await update_reservation(
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
async def remove_reservation(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    logger.info(f"[DELETE reservation] schedule_id={schedule_id}")

    # 존재 여부 선확인
    from app.crud.doctor_reservation import get_schedule as _get_schedule
    schedule = await _get_schedule(db, schedule_id)
    if not schedule:
        # 소프트 삭제된 경우도 포함해서 재조회
        from sqlalchemy import select as _select
        from app.models.schedule import Schedule as _Schedule
        row = await db.execute(
            _select(_Schedule).where(_Schedule.scheduleid == schedule_id)
        )
        existing = row.scalar_one_or_none()
        if existing and existing.deleted_at:
            raise HTTPException(status_code=409, detail="이미 취소된 예약입니다.")
        raise HTTPException(status_code=404, detail="예약 정보를 찾을 수 없습니다.")

    if schedule.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="이미 취소된 예약입니다.")

    try:
        slot_restored = await delete_reservation(db, schedule_id)
        logger.info(
            f"[DELETE reservation] success schedule_id={schedule_id} "
            f"slot_restored={slot_restored}"
        )
    except Exception:
        logger.exception(
            f"[DELETE reservation] failed schedule_id={schedule_id}"
        )
        raise HTTPException(status_code=500, detail="예약 취소 중 오류가 발생했습니다.")

    return {
        "code": 200,
        "message": "예약이 취소되었습니다.",
        "result": {
            "success": True,
            "reservation_id": schedule_id,
            "slot_restored": True,
        },
    }


@router.patch("/{schedule_id}")
async def change_reservation_status(
    schedule_id: int,
    request: ReservationStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    updated = await update_reservation_status(
        db,
        schedule_id,
        request.status,
        vet_memo=request.vet_memo,
        attachments=request.attachments,
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
