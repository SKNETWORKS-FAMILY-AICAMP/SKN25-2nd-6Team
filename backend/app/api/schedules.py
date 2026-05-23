from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import asyncio
import logging
import uuid
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
from app.models.triage_result import TriageResult
from ai.tasks import RUNNERS, _task_store, save_result, cleanup_task_after_ttl, safe_create_task, TaskStatus, PipelineState
from app.crud.alarm import create_alarm

logger = logging.getLogger(__name__)
audit_logger = logging.getLogger("medipaw.audit")
from app.models.guardian import Guardian
from app.models.master import CategoryMaster
from app.models.schedule import Schedule

router = APIRouter(prefix="/schedules", tags=["schedules"])

KST = timezone(timedelta(hours=9))



# 정기검진 예약
@router.post("/checkup", status_code=201)
async def create_checkup(
    request: CheckupScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 반려동물 확인
    result = await db.execute(
        select(Pet).where(
            Pet.petid == request.pet_id,
            Pet.userid == current_user.userid
        )
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    # 미래 예약 중복 확인 (과거 예약은 허용)
    dup_result = await db.execute(
        select(Schedule)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .where(
            Guardian.petid == request.pet_id,
            Schedule.status == "CONFIRMED",
            Schedule.deleted_at.is_(None),
            Schedule.confirmed_time > datetime.now(),
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="해당 반려동물의 예약이 이미 존재합니다.")

    # 수의사 확인 (첫 번째 수의사로 자동 배정)
    result = await db.execute(select(Doctor))
    doctor = result.scalars().first()
    if not doctor:
        raise HTTPException(status_code=404, detail="등록된 수의사가 없습니다.")

    schedule, guardian = await create_checkup_schedule(
        db=db,
        pet_id=request.pet_id,
        date=request.date,
        time=request.time,
        memo=request.memo,
        doctorid=doctor.doctorid
    )

    if schedule is None:
        raise HTTPException(status_code=409, detail="선택하신 시간에 이미 예약이 있습니다.")

    # 수의사 알람 생성
    try:
        await create_alarm(
            db=db,
            doctor_id=doctor.doctorid,
            schedule_id=schedule.scheduleid,
            alarm_type="reservation_confirmed",
            contents=f"{pet.petname} 보호자가 정기검진 예약을 확정했습니다. ({request.date} {request.time})",
        )
    except Exception as e:
        logger.warning(f"[Alarm] create failed schedule_id={schedule.scheduleid}: {e}")

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
async def get_schedules(
    filter: str = Query("all"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedules, has_next = await get_schedules_by_userid(db, current_user.userid, page, size, filter)

    result = []
    for schedule in schedules:
        guardian_result = await db.execute(
            select(Guardian).where(Guardian.emrid == schedule.emrid)
        )
        guardian = guardian_result.scalar_one_or_none()

        pet_result = await db.execute(
            select(Pet).where(Pet.petid == guardian.petid)
        )
        pet = pet_result.scalar_one_or_none()

        doctor_result = await db.execute(
            select(Doctor).where(Doctor.doctorid == schedule.doctorid)
        )
        doctor = doctor_result.scalar_one_or_none()

        category_result = await db.execute(
            select(CategoryMaster).where(CategoryMaster.id == guardian.category_id)
        )
        category = category_result.scalar_one_or_none()

        from datetime import date
        age = None
        if pet.birth_date:
            today = date.today()
            age = today.year - pet.birth_date.year

        raw_status = "CANCELLED" if schedule.deleted_at else schedule.status
        result.append({
            "schedule_id": schedule.scheduleid,
            "pet_id": pet.petid,
            "pet_name": pet.petname,
            "pet_profile_image": pet.profile_image,
            "breed": pet.breed,
            "age": age,
            "gender": pet.gender,
            "category": category.label if category else None,
            "status": raw_status,
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
        "result": {
            "items": result,
            "page": page,
            "has_next": has_next
        }
    }


# 빈 슬롯 조회
@router.get("/available")
async def get_available(
    date: str = Query(...),
    duration_min: int = Query(...),
    doctorid: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    slots = await get_available_slots(db, date, duration_min, doctorid)

    return {
        "code": 200,
        "result": [
            {
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "doctorid": slot.doctorid,
                "doctor_name": slot.doctor_name,
            }
            for slot in slots
        ]
    }


# 예약 조회
@router.get("/{schedule_id}", status_code=200)
async def get_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = await get_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="예약 정보를 찾을 수 없습니다.")

    guardian_result = await db.execute(
        select(Guardian).where(Guardian.emrid == schedule.emrid)
    )
    guardian = guardian_result.scalar_one_or_none()

    pet_result = await db.execute(
        select(Pet).where(Pet.petid == guardian.petid)
    )
    pet = pet_result.scalar_one_or_none()

    doctor_result = await db.execute(
        select(Doctor).where(Doctor.doctorid == schedule.doctorid)
    )
    doctor = doctor_result.scalar_one_or_none()

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
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = await get_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="예약 정보를 찾을 수 없습니다.")

    if schedule.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="이미 완료된 예약은 취소할 수 없습니다.")

    if schedule.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="이미 취소된 예약입니다.")

    if schedule.confirmed_time.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="이미 지난 예약은 취소할 수 없습니다.")

    await cancel_schedule(db, schedule)
    return {"code": 200, "message": "예약이 취소되었습니다."}


# 예약 변경
@router.patch("/{schedule_id}")
async def update_schedule(
    schedule_id: int,
    request: UpdateScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = await get_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="예약 정보를 찾을 수 없습니다.")

    if schedule.status in ["COMPLETED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="변경할 수 없는 예약입니다.")

    if schedule.confirmed_time.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="이미 지난 예약은 변경할 수 없습니다.")

    result = await update_schedule_time(db, schedule, request.confirmed_time, schedule.duration_min)

    if not result:
        raise HTTPException(status_code=409, detail="선택하신 시간에 이미 예약이 있습니다.")

    return {"code": 200, "message": "예약이 변경되었습니다."}


async def _run_post_booking_agents(
    emrid: int,
    scheduleid: int,
    duration_min: int,
    user_id: int,
    chart_task_id: str,
    validation_task_id: str,
    judge_task_id: str,
) -> None:
    """예약 확정 직후 asyncio.create_task로 실행되는 Chart+Validation+Judge 파이프라인."""
    from app.db.session import AsyncSessionLocal

    logger.info(f"[PostBooking] start emrid={emrid} scheduleid={scheduleid}")

    # DB에서 Triage 결과 및 Pet 정보 조회
    async with AsyncSessionLocal() as db:
        triage_row = await db.execute(select(TriageResult).where(TriageResult.emrid == emrid))
        triage = triage_row.scalar_one_or_none()
        guardian_row = await db.execute(select(Guardian).where(Guardian.emrid == emrid))
        guardian = guardian_row.scalar_one_or_none()
        pet_row = await db.execute(select(Pet).where(Pet.petid == guardian.petid)) if guardian else None
        pet = pet_row.scalar_one_or_none() if pet_row else None

    if not triage or not pet:
        logger.warning(f"[PostBooking] 필수 데이터 없음 emrid={emrid} triage={bool(triage)} pet={bool(pet)}")
        for tid in (chart_task_id, validation_task_id, judge_task_id):
            _task_store[tid] = {"status": "error", "detail": "트리아지 또는 반려동물 정보 없음"}
        return

    age = (date_type.today().year - pet.birth_date.year) if pet.birth_date else None
    pet_payload = {
        "name": pet.petname,
        "species": pet.species or "dog",
        "breed": pet.breed or "알 수 없음",
        "age": age,
        "gender": pet.gender,
        "weight": float(pet.weight_kg) if pet.weight_kg else None,
    }

    from app.crud.patient import build_patient_context
    async with AsyncSessionLocal() as db:
        patient_context_data = await build_patient_context(db, pet.petid)

    triage_info = {
        "urgency_level": triage.urgency_level,
        "urgency_level_num": triage.urgency_level_num,
        "vtl_basis": triage.vtl_basis,
        "red_flags": triage.red_flags or [],
        "chief_complaint": triage.chief_complaint,
        "symptom_onset": triage.symptom_onset,
        "symptom_keywords": triage.symptom_keywords or [],
        "suspected_diseases": triage.suspected_diseases or [],
        "symptom_summary": triage.symptom_summary,
        "recommended_action": triage.recommended_action,
        "is_initial_visit": True,
    }

    # VTL urgency → slot_window 매핑 (Schedule Agent와 동일한 기준)
    _URGENCY_WINDOW_MAP = {
        1: "immediate", 2: "emergency_today", 3: "urgent_24h",
        4: "semi_urgent_48h", 5: "routine_72h",
    }
    actual_slot_window = _URGENCY_WINDOW_MAP.get(
        triage_info.get("urgency_level_num", 3), "urgent_24h"
    )
    schedule_slot = {
        "estimated_duration_min": duration_min,
        "is_initial_visit": True,
        "slot_window": actual_slot_window,
    }

    chart_payload = {
        "pet": pet_payload,
        "triage_result": triage_info,
        "triage_info": triage_info,
        "patient_context": patient_context_data,
        "schedule_slot": schedule_slot,
        "schedule_result": schedule_slot,
    }
    validation_payload = {
        "pet": pet_payload,
        "triage_result": triage_info,
        "triage_info": triage_info,
        "patient_context": patient_context_data,
        "schedule_slot": schedule_slot,
        "schedule_result": schedule_slot,
    }
    # Judge QA: fetch actual chat history for this emrid
    judge_chat_history: list = []
    if emrid is not None and emrid % 5 == 0:
        try:
            from app.models.chat_history import ChatHistory
            async with AsyncSessionLocal() as db_j:
                ch_row = await db_j.execute(
                    select(ChatHistory).where(ChatHistory.emrid == emrid)
                )
                ch = ch_row.scalar_one_or_none()
                if ch and ch.messages:
                    judge_chat_history = [
                        m for m in ch.messages
                        if m.get("role") in ("user", "assistant") and m.get("content")
                    ]
        except Exception as _exc:
            logger.warning(f"[PostBooking] judge chat_history fetch failed emrid={emrid}: {_exc}")

    judge_payload = {
        "triage_result": triage_info,
        "triage_info": triage_info,
        "chat_history": judge_chat_history,
        "chart_result": chart_result if not isinstance(chart_result, Exception) else None,
    }

    def make_updater(tid: str):
        def update_step(step: str) -> None:
            _task_store[tid]["step"] = step
        return update_step

    # Chart + Validation 독립 병렬 실행 — 한 쪽 실패가 다른 쪽에 영향 주지 않도록 return_exceptions=True
    _task_store[chart_task_id] = {"status": "running", "step": "차트 초안 생성 중..."}
    _task_store[validation_task_id] = {"status": "running", "step": "정합성 검증 중..."}
    chart_result, validation_result = await asyncio.gather(
        RUNNERS["chart"](chart_payload, make_updater(chart_task_id), emrid, scheduleid),
        RUNNERS["validation"](validation_payload, make_updater(validation_task_id), emrid, scheduleid),
        return_exceptions=True,
    )

    # Chart Post-processing Isolation
    if isinstance(chart_result, Exception):
        logger.error(f"[PostBooking] chart failed emrid={emrid}: {chart_result}", exc_info=chart_result)
        _task_store[chart_task_id] = {"status": "error", "detail": str(chart_result)}
    else:
        try:
            _task_store[chart_task_id] = {"status": "done", "result": chart_result}
            await save_result("chart", chart_result, emrid, scheduleid, user_id)
            logger.info(f"[PostBooking] chart done emrid={emrid}")
        except Exception as e:
            logger.error(f"[PostBooking] save_result chart failed emrid={emrid}: {e}", exc_info=True)
            _task_store[chart_task_id] = {"status": "error", "detail": f"차트 저장 실패: {e}"}

    # Validation Post-processing Isolation
    if isinstance(validation_result, Exception):
        logger.error(f"[PostBooking] validation failed emrid={emrid}: {validation_result}", exc_info=validation_result)
        _task_store[validation_task_id] = {"status": "error", "detail": str(validation_result)}
    else:
        try:
            _task_store[validation_task_id] = {"status": "done", "result": validation_result}
            await save_result("validation", validation_result, emrid, scheduleid, user_id)
            logger.info(f"[PostBooking] validation done emrid={emrid}")
        except Exception as e:
            logger.error(f"[PostBooking] save_result validation failed emrid={emrid}: {e}", exc_info=True)
            _task_store[validation_task_id] = {"status": "error", "detail": f"정합성 검증 저장 실패: {e}"}

    # Judge QA 추적: gpt-4o-mini + 1/5 샘플링, DB 저장 없이 audit logger만 기록
    if emrid is not None and emrid % 5 == 0:
        try:
            judge_result = await RUNNERS["judge"](judge_payload, lambda _: None, emrid, scheduleid)
            audit_logger.info(
                "[JudgeAudit] emrid=%s verdict=%s scores=%s critical=%s",
                emrid,
                judge_result.get("judge_verdict"),
                judge_result.get("judge_scores"),
                judge_result.get("critical_issues"),
            )
        except Exception as exc:
            logger.warning(f"[PostBooking] judge audit failed emrid={emrid}: {exc}")
    _task_store[judge_task_id] = {"status": "done", "result": None}

    logger.info(
        "[PostBooking] pipeline_state=%s emrid=%s",
        PipelineState.COMPLETED, emrid,
    )
    # 내부 orchestration task_ids는 SSE로 소비되지 않으므로 파이프라인 완료 후 단기 TTL 적용
    for _tid in (chart_task_id, validation_task_id, judge_task_id):
        safe_create_task(cleanup_task_after_ttl(_tid, ttl=60), name=f"cleanup:{_tid}")


# 챗봇 예약 확정
@router.post("/confirm", status_code=201)
async def confirm_schedule_api(
    request: ConfirmScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    schedule = await confirm_schedule(
        db=db,
        emrid=request.emrid,
        doctorid=request.doctorid,
        confirmed_time=request.confirmed_time,
        duration_min=request.duration_min
    )

    if schedule is None:
        raise HTTPException(status_code=409, detail="선택하신 시간에 이미 예약이 있습니다.")

    # 수의사 알람 생성 — 챗봇 예약 확정 시도 일반 예약과 동일하게 알람 발송
    try:
        guardian_row = await db.execute(select(Guardian).where(Guardian.emrid == request.emrid))
        guardian = guardian_row.scalar_one_or_none()
        pet_name = "반려동물"
        if guardian:
            pet_row = await db.execute(select(Pet).where(Pet.petid == guardian.petid))
            pet_obj = pet_row.scalar_one_or_none()
            if pet_obj:
                pet_name = pet_obj.petname
        confirmed_kst = schedule.confirmed_time.astimezone(KST)
        await create_alarm(
            db=db,
            doctor_id=request.doctorid,
            schedule_id=schedule.scheduleid,
            alarm_type="reservation_confirmed",
            contents=f"{pet_name} 보호자가 챗봇으로 예약을 확정했습니다. ({confirmed_kst.strftime('%m/%d %H:%M')})",
        )
    except Exception as e:
        logger.warning(f"[Alarm] chatbot confirm alarm failed schedule_id={schedule.scheduleid}: {e}")

    # Chart + Validation + Judge 파이프라인 백그라운드 실행
    chart_task_id = str(uuid.uuid4())
    validation_task_id = str(uuid.uuid4())
    judge_task_id = str(uuid.uuid4())
    for tid in (chart_task_id, validation_task_id, judge_task_id):
        _task_store[tid] = {"status": "queued", "step": ""}

    logger.info(
        "[Confirm] pipeline_state=%s emrid=%s scheduleid=%s",
        PipelineState.SCHEDULE_CONFIRMED, request.emrid, schedule.scheduleid,
    )
    safe_create_task(
        _run_post_booking_agents(
            emrid=request.emrid,
            scheduleid=schedule.scheduleid,
            duration_min=request.duration_min,
            user_id=current_user.userid,
            chart_task_id=chart_task_id,
            validation_task_id=validation_task_id,
            judge_task_id=judge_task_id,
        ),
        task_id=chart_task_id,          # 대표 task_id로 레지스트리 등록
        name="post_booking_agents",
    )
    logger.info(
        f"[Confirm] emrid={request.emrid} scheduleid={schedule.scheduleid} "
        f"chart={chart_task_id[:8]} validation={validation_task_id[:8]} judge={judge_task_id[:8]}"
    )

    return {
        "code": 201,
        "message": "예약이 확정되었습니다.",
        "result": {
            "schedule_id": schedule.scheduleid,
            "confirmed_time": schedule.confirmed_time.astimezone(KST).isoformat() if schedule.confirmed_time else None,
            "confirmed_end_time": schedule.confirmed_end_time.astimezone(KST).isoformat() if schedule.confirmed_end_time else None,
            "status": schedule.status,
            "chart_task_id": chart_task_id,
            "validation_task_id": validation_task_id,
            "judge_task_id": judge_task_id,
        }
    }
