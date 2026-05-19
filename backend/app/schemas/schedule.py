from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 정기검진 예약 요청
class CheckupScheduleRequest(BaseModel):
    pet_id: int
    date: str
    time: str
    memo: Optional[str] = None

# 예약 응답
class ScheduleResponse(BaseModel):
    schedule_id: int
    pet_name: str
    category: str
    date: str
    time: str
    status: str
    memo: Optional[str] = None