from pydantic import BaseModel
from typing import Optional


# 예약 생성 요청
class ReservationCreate(BaseModel):
    pet_id: int
    date: str
    time: str
    doctor_name: Optional[str] = None
    memo: Optional[str] = None


# 예약 수정 요청
class ReservationUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    doctor_name: Optional[str] = None
    memo: Optional[str] = None


# 예약 상태 변경 요청
class ReservationStatusUpdate(BaseModel):
    status: str
    vet_memo: Optional[str] = None
    attachments: Optional[list[dict]] = None


# 예약 목록 항목 응답
class ReservationItem(BaseModel):
    schedule_id: int
    petid: int
    pet_name: str
    species: str
    breed: str
    birth_date: str
    age: str
    weight_kg: float
    gender: str
    is_neutered: bool
    profile_image: Optional[str]
    last_checkup_date: str
    owner_name: str
    phone: str
    doctor_name: str
    visit_reason: str
    triage: str
    date: str
    start: str
    end: str
    duration_min: int
    memo: str
    status: str
