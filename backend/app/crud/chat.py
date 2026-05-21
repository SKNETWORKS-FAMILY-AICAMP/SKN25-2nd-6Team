from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
import asyncio
from app.db.session import get_db
from app.schemas.chat import ChatSessionCreate, ChatMessageRequest
from app.crud.chat import create_chat_session, get_chat_session, get_chat_sessions_by_petid, add_message, delete_chat_session
from app.core.dependencies import get_current_user
from app.models.pet import Pet
from app.models.followup import Followup
from app.models.schedule import Schedule

router = APIRouter(prefix="/chat", tags=["chat"])

# 챗봇 세션 시작
@router.post("/sessions", status_code=201)
async def start_chat_session(
    request: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
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

    # 보호자 메시지 저장
    await add_message(db, session, "user", request.content, request.image_url)

    # 예약 확정 이후 이미지 있으면 followupDB에도 저장
    if request.image_url and session.emrid:
        confirmed_result = await db.execute(
            select(Schedule).where(
                Schedule.emrid == session.emrid,
                Schedule.status == "CONFIRMED"
            )
        )
        confirmed = confirmed_result.scalar_one_or_none()
        if confirmed:
            followup = Followup(
                emrid=session.emrid,
                userid=current_user.userid,
                images=[request.image_url],
                message=request.content
            )
            db.add(followup)
            await db.commit()

    # AI 응답 미리 생성
    test_response = "안녕하세요! 반려동물의 증상에 대해 말씀해 주세요."

    # AI 응답 DB에 저장
    await add_message(db, session, "assistant", test_response)

    async def event_stream():
        try:
            for char in test_response:
                yield f"data: {json.dumps({'type': 'message', 'content': char}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.05)

            quick_replies = ["구토가 있어요", "식욕이 없어요", "기침을 해요", "피부가 가려워요"]
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
    allowed_types = ["image/jpeg", "image/png", "video/mp4"]
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="이미지(JPG, PNG) 또는 영상(MP4) 파일만 업로드 가능합니다."
        )

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

# 챗봇 세션 완료 처리
@router.patch("/sessions/{session_id}/complete")
async def complete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session = await get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다.")

    session.is_complete = True
    await db.commit()
    return {"code": 200, "message": "상담이 완료되었습니다."}
