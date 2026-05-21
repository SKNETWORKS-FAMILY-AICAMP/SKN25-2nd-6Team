from datetime import date
from typing import Optional

from pydantic import BaseModel


# 환자(반려동물) 정보 수정 요청
class PatientUpdate(BaseModel):
    petname: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    gender: Optional[str] = None
    is_neutered: Optional[bool] = None
    birth_date: Optional[date] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
