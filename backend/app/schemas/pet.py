from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date

# 등록 요청
class PetCreate(BaseModel):
    petname: str
    species: str
    breed: Optional[str] = None
    gender: str
    is_neutered: Optional[str] = None
    birth_date: Optional[date] = None
    is_birth_unknown: Optional[bool] = False
    weight_kg: float
    notes: Optional[str] = None
    profile_image: Optional[str] = None

    @field_validator("petname")
    def petname_max_length(cls, v):
        if len(v) > 10:
            raise ValueError("반려동물 이름은 최대 10자입니다.")
        return v

    @field_validator("notes")
    def notes_max_length(cls, v):
        if v and len(v) > 200:
            raise ValueError("특이사항은 최대 200자입니다.")
        return v

# 목록 응답
class PetListResponse(BaseModel):
    pet_id: int
    petname: str
    species: Optional[str]
    breed: Optional[str]
    gender: Optional[str]
    profile_image: Optional[str]

    class Config:
        from_attributes = True

# 상세 응답
class PetDetailResponse(BaseModel):
    pet_id: int
    petname: str
    species: Optional[str]
    breed: Optional[str]
    gender: Optional[str]
    is_neutered: Optional[bool]
    birth_date: Optional[date]
    weight_kg: Optional[float]
    notes: Optional[str]
    profile_image: Optional[str]

    class Config:
        from_attributes = True

# 수정 요청 
class PetUpdate(BaseModel):
    petname: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    gender: Optional[str] = None
    is_neutered: Optional[str] = None
    birth_date: Optional[date] = None
    is_birth_unknown: Optional[bool] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
    profile_image: Optional[str] = None