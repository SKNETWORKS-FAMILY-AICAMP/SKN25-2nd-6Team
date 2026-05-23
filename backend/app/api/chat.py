from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
import asyncio
import logging
import uuid
from datetime import date
from openai import AsyncOpenAI
from app.db.session import get_db
from app.schemas.chat import ChatSessionCreate, ChatMessageRequest
from app.crud.chat import (
    create_chat_session, get_chat_session, get_chat_sessions_by_petid,
    add_message, delete_chat_session, update_session_complete,
    create_triage_guardian, update_session_emrid,
)
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.pet import Pet
from app.models.triage_result import TriageResult
from app.prompts.triage_prompt import _build_triage_system_prompt
from ai.tasks import RUNNERS, _task_store, cleanup_task_after_ttl

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


async def _run_schedule_background(
    task_id: str,
    emrid: int,
    pet_payload: dict,
    triage_info: dict,
    patient_context: dict,
) -> None:
    """triage_complete 직후 asyncio.create_task로 실행되는 Schedule Agent 백그라운드 러너."""
    logger.info(f"[Schedule BG] start task_id={task_id} emrid={emrid}")
    _task_store[task_id] = {"status": "running", "step": "예약 슬롯 계산 중..."}

    def update_step(step: str) -> None:
        _task_store[task_id]["step"] = step

    try:
        payload = {
            "pet": pet_payload,
            "triage_info": triage_info,
            "triage_result": triage_info,
            "patient_context": patient_context,
            "existing_bookings": [],
        }
        result = await RUNNERS["schedule"](payload, update_step, emrid, None)
        _task_store[task_id] = {"status": "done", "result": result}
        logger.info(f"[Schedule BG] done task_id={task_id} slot_window={result.get('slot_window')}")
    except Exception as exc:
        logger.error(f"[Schedule BG] failed task_id={task_id}: {exc}", exc_info=True)
        _task_store[task_id] = {"status": "error", "detail": str(exc)}
    finally:
        asyncio.create_task(cleanup_task_after_ttl(task_id))


# 챗봇 세션 시작
@router.post("/sessions", status_code=201)
async def start_chat_session(
    request: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Pet).where(Pet.petid == request.pet_id, Pet.userid == current_user.userid)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    session = await create_chat_session(db, current_user.userid, request.pet_id)
    return {
        "code": 201,
        "result": {
            "session_id": session.id,
            "pet_name": pet.petname,
            "profile_image": pet.profile_image,
        },
    }


# 챗봇 메시지 전송 (SSE 스트리밍)
@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: int,
    request: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not request.content:
        raise HTTPException(status_code=400, detail="메시지를 입력해주세요.")

    session = await get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 세션을 찾을 수 없습니다.")

    pet_result = await db.execute(select(Pet).where(Pet.petid == session.petid))
    pet = pet_result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    await add_message(db, session, "user", request.content, request.image_url)

    from app.crud.patient import build_patient_context
    
    patient_context_data = await build_patient_context(db, session.petid)
    emr_history = patient_context_data["patient_context"]["emr_history"] # For backward compatibility with Triage prompt until we update it

    openai_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in (session.messages or [])
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]

    turn_count = sum(1 for m in openai_messages if m["role"] == "assistant")
    force_complete = turn_count >= 5

    system_prompt = _build_triage_system_prompt(pet, patient_context=patient_context_data, force_complete=force_complete)

    # event_stream 클로저에서 사용할 반려동물 정보 딕셔너리
    pet_age = (date.today().year - pet.birth_date.year) if pet.birth_date else None
    pet_payload = {
        "name": pet.petname,
        "species": pet.species or "dog",
        "breed": pet.breed or "알 수 없음",
        "age": pet_age,
        "gender": pet.gender,
        "weight": float(pet.weight_kg) if pet.weight_kg else None,
    }

    async def event_stream():
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            # JSON 모드로 전체 응답 수신
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-4o",
                messages=[{"role": "system", "content": system_prompt}] + openai_messages,
                response_format={"type": "json_object"},
                max_tokens=800,
                temperature=0.3,
            )

            raw = response.choices[0].message.content or ""

            # JSON 파싱 (마크다운 래핑 제거)
            clean = raw.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            try:
                parsed = json.loads(clean)
            except json.JSONDecodeError:
                parsed = {"message": raw, "suggestions": [], "collected_info": None}

            message_text = parsed.get("message", "")
            suggestions = parsed.get("suggestions") or []
            collected_info = parsed.get("collected_info")

            # AI 응답 DB 저장
            await add_message(db, session, "assistant", message_text)

            # message 텍스트를 청크로 스트리밍
            chunk_size = 10
            for i in range(0, len(message_text), chunk_size):
                chunk = message_text[i:i + chunk_size]
                yield f"data: {json.dumps({'type': 'message', 'content': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.02)

            # 에이전트가 제시한 선택지 전송
            if suggestions:
                yield f"data: {json.dumps({'type': 'quick_replies', 'options': suggestions}, ensure_ascii=False)}\n\n"

            # 문진 완료 처리
            if collected_info and collected_info.get("is_triage_complete"):
                keywords = collected_info.get("symptom_keywords") or []
                await update_session_complete(db, session, keywords)

                # ① Guardian 생성 → emrid 확보
                guardian = await create_triage_guardian(db, session.petid)
                emrid = guardian.emrid

                # ② ChatHistory.emrid 업데이트 (NULL → emrid, 1회만)
                await update_session_emrid(db, session, emrid)

                # ③ TriageResult INSERT
                try:
                    db.add(TriageResult(
                        emrid=emrid,
                        urgency_level=collected_info.get("urgency_level", ""),
                        urgency_level_num=int(collected_info.get("urgency_level_num", 3)),
                        vtl_basis=collected_info.get("vtl_basis"),
                        red_flags=collected_info.get("red_flags"),
                        chief_complaint=collected_info.get("chief_complaint"),
                        symptom_onset=collected_info.get("symptom_onset"),
                        symptom_keywords=collected_info.get("symptom_keywords"),
                        suspected_diseases=collected_info.get("suspected_diseases"),
                        symptom_summary=collected_info.get("symptom_summary"),
                        recommended_action=collected_info.get("recommended_action"),
                        need_photo=collected_info.get("need_photo", False),
                    ))
                    await db.commit()
                    logger.info(f"[TriageResult] saved emrid={emrid}")
                except Exception as e:
                    await db.rollback()
                    logger.error(f"[TriageResult] save failed emrid={emrid}: {e}")

                # ④ Schedule Agent 백그라운드 실행
                schedule_task_id = str(uuid.uuid4())
                _task_store[schedule_task_id] = {"status": "queued", "step": ""}
                asyncio.create_task(
                    _run_schedule_background(schedule_task_id, emrid, pet_payload, collected_info, patient_context_data)
                )
                logger.info(f"[Schedule BG] queued task_id={schedule_task_id} emrid={emrid}")

                yield f"data: {json.dumps({'type': 'triage_complete', 'data': collected_info, 'emrid': emrid, 'schedule_task_id': schedule_task_id}, ensure_ascii=False)}\n\n"
            else:
                if collected_info:
                    yield f"data: {json.dumps({'type': 'triage_complete', 'data': collected_info}, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# 이미지 업로드 URL 발급
@router.get("/upload/presigned-url")
async def get_presigned_url(
    file_name: str = Query(...),
    content_type: str = Query(...),
    file_size: int = Query(...),
    current_user=Depends(get_current_user),
):
    allowed_types = ["image/jpeg", "image/png", "video/mp4"]
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="이미지(JPG, PNG) 또는 영상(MP4) 파일만 업로드 가능합니다.")

    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="파일 크기는 5MB 이하만 업로드 가능합니다.")

    # TODO: AWS S3 Presigned URL 발급 예정
    return {
        "code": 200,
        "result": {
            "presigned_url": "https://s3.amazonaws.com/temp",
            "cloudfront_url": "https://cloudfront-url/temp",
        },
    }


# 상담 기록 목록 조회
@router.get("/sessions")
async def get_chat_sessions(
    pet_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sessions = await get_chat_sessions_by_petid(db, current_user.userid, pet_id)
    return {
        "code": 200,
        "result": [
            {
                "session_id": session.id,
                "keywords": session.keywords or [],
                "created_at": str(session.created_at.date()),
                "status": "진료완료" if session.is_complete else "상담중",
            }
            for session in sessions
        ],
    }


# 특정 세션 상세 조회
@router.get("/sessions/{session_id}")
async def get_chat_session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = await get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다.")

    return {
        "code": 200,
        "result": {
            "session_id": session.id,
            "pet_id": session.petid,
            "messages": session.messages or [],
            "keywords": session.keywords or [],
            "is_complete": session.is_complete,
            "created_at": str(session.created_at),
        },
    }


# 상담 기록 삭제
@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = await get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다.")

    if session.userid != current_user.userid:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    await delete_chat_session(db, session)
    return {"code": 200, "message": "상담 기록이 삭제되었습니다."}
