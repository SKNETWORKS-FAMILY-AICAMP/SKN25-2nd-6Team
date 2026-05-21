from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

# 상태값 enum
class ScheduleStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

# 정기검진 예약 요청
class CheckupScheduleRequest(BaseModel):
    pet_id: int
    date: str
    time: str
    memo: Optional[str] = None

# 챗봇 예약 확정 요청
class ConfirmScheduleRequest(BaseModel):
    emrid: int
    doctorid: int
    confirmed_time: str
    duration_min: int

# 예약 변경 요청
class UpdateScheduleRequest(BaseModel):
    confirmed_time: str

# 예약 응답
class ScheduleResponse(BaseModel):
    schedule_id: int
    pet_name: str
    category: str
    date: str
    time: str
    status: str
    memo: Optional[str] = None

# 예약 목록 카드 응답
class ScheduleCardResponse(BaseModel):
    schedule_id: int
    pet_name: str
    pet_profile_image: Optional[str] = None
    breed: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    status: str
    confirmed_time: Optional[str] = None
    confirmed_end_time: Optional[str] = None
    duration_min: Optional[int] = None
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    doctorid: Optional[int] = None
    doctor_name: Optional[str] = None

# 페이지네이션
class Pagination(BaseModel):
    page: int
    size: int
    has_next: bool