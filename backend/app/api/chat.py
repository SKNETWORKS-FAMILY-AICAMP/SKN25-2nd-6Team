from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
import asyncio
from app.db.session import get_db
from app.schemas.chat import ChatSessionCreate, ChatMessageRequest
from app.crud.chat import create_chat_session, get_chat_session, get_chat_sessions_by_petid, add_message, delete_chat_session
from app.core.dependencies import get_current_user
from app.models.pet import Pet

router = APIRouter(prefix="/chat", tags=["chat"])

# 챗봇 세션 시작
@router.post("/sessions", status_code=201)
def start_chat_session(
    request: ChatSessionCreate,
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

    session = create_chat_session(db, current_user.userid, request.pet_id)

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
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not request.content:
        raise HTTPException(status_code=400, detail="메시지를 입력해주세요.")

    session = get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 세션을 찾을 수 없습니다.")

    # 보호자 메시지 저장
    add_message(db, session, "user", request.content, request.image_url)

    # AI 응답 미리 생성
    test_response = "안녕하세요! 반려동물의 증상에 대해 말씀해 주세요."

    # AI 응답 먼저 DB에 저장
    add_message(db, session, "assistant", test_response)

    async def event_stream():
        try:
            # 텍스트 스트리밍
            for char in test_response:
                yield f"data: {json.dumps({'type': 'message', 'content': char}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.05)

            # 빠른 선택 버튼
            quick_replies = ["구토가 있어요", "식욕이 없어요", "기침을 해요", "피부가 가려워요"]
            yield f"data: {json.dumps({'type': 'quick_replies', 'options': quick_replies}, ensure_ascii=False)}\n\n"

            # 완료
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
def get_presigned_url(
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
def get_chat_sessions(
    pet_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sessions = get_chat_sessions_by_petid(db, current_user.userid, pet_id)

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

# 상담 기록 삭제
@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session = get_chat_session(db, session_id, current_user.userid)

    if not session:
        raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다.")

    if session.userid != current_user.userid:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    delete_chat_session(db, session)

    return {"code": 200, "message": "상담 기록이 삭제되었습니다."}