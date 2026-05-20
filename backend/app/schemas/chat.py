from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# 세션 시작 요청
class ChatSessionCreate(BaseModel):
    pet_id: int

# 세션 시작 응답
class ChatSessionResponse(BaseModel):
    session_id: int
    pet_name: str
    profile_image: Optional[str] = None

# 메시지 전송 요청
class ChatMessageRequest(BaseModel):
    content: str
    image_url: Optional[str] = None

# 상담 기록 목록 응답
class ChatSessionListResponse(BaseModel):
    session_id: int
    keywords: Optional[List[str]] = []
    created_at: str
    status: Optional[str] = None