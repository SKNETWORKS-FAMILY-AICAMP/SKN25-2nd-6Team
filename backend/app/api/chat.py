from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
import asyncio
from openai import AsyncOpenAI
from app.db.session import get_db
from app.schemas.chat import ChatSessionCreate, ChatMessageRequest
from app.crud.chat import create_chat_session, get_chat_session, get_chat_sessions_by_petid, add_message, delete_chat_session
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.pet import Pet
from app.models.followup import Followup
from app.models.schedule import Schedule

router = APIRouter(prefix="/chat", tags=["chat"])


def _build_triage_system_prompt(pet: Pet) -> str:
    from datetime import date
    age = None
    if pet.birth_date:
        age = date.today().year - pet.birth_date.year

    return f"""당신은 MediPaw 동물병원의 AI 증상 상담사입니다.
보호자가 반려동물의 증상을 설명하면 진단에 필요한 정보를 대화로 수집합니다.

[반려동물 정보]
이름: {pet.petname}
종: {pet.species or "미상"}
품종: {pet.breed or "미상"}
나이: {f"{age}세" if age else "미상"}
체중: {f"{pet.weight_kg}kg" if pet.weight_kg else "미상"}
중성화: {pet.is_neutered if pet.is_neutered is not None else "미상"}

[대화 지침]
- 보호자의 말에 직접 반응하세요. 처음 인사를 반복하지 마세요.
- 한 번에 질문 하나만 하세요.
- 수집할 핵심 정보: 주요 증상, 증상 시작 시점, 심각도(1~10), 동반 증상(구토·설사·식욕저하 등)
- 3~5번 대화 후 증상을 한 문장으로 요약하고 진료 예약을 권유하세요.
- 응급 증상(호흡곤란·의식저하·과다출혈·경련)이 언급되면 즉시 응급실 방문을 권고하세요.
- 2~4문장으로 간결하게 답변하세요. 한국어로만 답변하세요."""

# 챗봇 세션 시작
@router.post("/sessions", status_code=201)
async def start_chat_session(
    request: ChatSessionCreate,
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

    session = await create_chat_session(db, current_user.userid, request.pet_id)

    return {
        "code": 201,
        "result": {
            "session_id": session.id,
            "pet_name": pet.petname,
            "profile_image": pet.profile_image
        }
    }

# 챗봇 메시지 전송 (SSE 스트리밍)
@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: int,
    request: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not request.content:
        raise HTTPException(status_code=400, detail="메시지를 입력해주세요.")

    session = await get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 세션을 찾을 수 없습니다.")

    # 반려동물 정보 조회
    pet_result = await db.execute(
        select(Pet).where(Pet.petid == session.petid)
    )
    pet = pet_result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    # 보호자 메시지 저장
    await add_message(db, session, "user", request.content, request.image_url)

    # OpenAI 메시지 히스토리 구성 (저장된 메시지 전체 포함)
    openai_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in (session.messages or [])
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]

    system_prompt = _build_triage_system_prompt(pet)
    turn_count = sum(1 for m in openai_messages if m["role"] == "assistant")

    async def event_stream():
        full_response = ""
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            stream = await client.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-4o",
                messages=[{"role": "system", "content": system_prompt}] + openai_messages,
                stream=True,
                max_tokens=400,
                temperature=0.7,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_response += delta
                    yield f"data: {json.dumps({'type': 'message', 'content': delta}, ensure_ascii=False)}\n\n"

            # AI 응답 DB 저장
            await add_message(db, session, "assistant", full_response)

            # 초반 대화(0~1턴)에는 빠른 선택 버튼 제공
            if turn_count <= 1:
                quick_replies = ["구토·설사가 있어요", "식욕이 없어요", "기침·호흡이 이상해요", "피부가 가렵거나 털이 빠져요", "다리를 절거나 움직이기 싫어해요"]
                yield f"data: {json.dumps({'type': 'quick_replies', 'options': quick_replies}, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

# 이미지 업로드 URL 발급
@router.get("/upload/presigned-url")
async def get_presigned_url(
    file_name: str = Query(...),
    content_type: str = Query(...),
    file_size: int = Query(...),
    current_user = Depends(get_current_user)
):
    # 파일 형식 확인
    allowed_types = ["image/jpeg", "image/png", "video/mp4"]
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="이미지(JPG, PNG) 또는 영상(MP4) 파일만 업로드 가능합니다."
        )

    # 파일 크기 확인 (5MB)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="파일 크기는 5MB 이하만 업로드 가능합니다."
        )

    # TODO: AWS S3 Presigned URL 발급 예정
    return {
        "code": 200,
        "result": {
            "presigned_url": "https://s3.amazonaws.com/temp",
            "cloudfront_url": "https://cloudfront-url/temp"
        }
    }

# 상담 기록 목록 조회
@router.get("/sessions")
async def get_chat_sessions(
    pet_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sessions = await get_chat_sessions_by_petid(db, current_user.userid, pet_id)

    return {
        "code": 200,
        "result": [
            {
                "session_id": session.id,
                "keywords": session.keywords or [],
                "created_at": str(session.created_at.date()),
                "status": "진료완료" if session.is_complete else "상담중"
            }
            for session in sessions
        ]
    }

# 특정 세션 상세 조회
@router.get("/sessions/{session_id}")
async def get_chat_session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
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
            "created_at": str(session.created_at)
        }
    }

# 상담 기록 삭제
@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session = await get_chat_session(db, session_id, current_user.userid)

    if not session:
        raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다.")

    if session.userid != current_user.userid:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    await delete_chat_session(db, session)

    return {"code": 200, "message": "상담 기록이 삭제되었습니다."}
