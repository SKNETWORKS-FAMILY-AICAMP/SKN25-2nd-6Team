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
    checkup_date: Optional[date] = None
    is_checkup_unknown: Optional[bool] = False
    weight_kg: float
    notes: Optional[str] = None
    profile_image: Optional[str] = None

    @field_validator("birth_date", "checkup_date", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        return None if v == "" else v

    @field_validator("petname")
    @classmethod
    def petname_max_length(cls, v):
        if len(v) > 10:
            raise ValueError("반려동물 이름은 최대 10자입니다.")
        return v

    @field_validator("notes")
    @classmethod
    def notes_max_length(cls, v):
        if v and len(v) > 200:
            raise ValueError("특이사항은 최대 200자입니다.")
        return v

    @field_validator("profile_image")
    @classmethod
    def profile_image_no_base64(cls, v):
        """base64 데이터 URI는 DB VARCHAR(500) 초과 → 명확한 오류 반환.
        프로필 이미지는 /chat/upload/presigned-url 으로 S3에 업로드 후 CDN URL을 전달해야 합니다."""
        if v and v.startswith("data:"):
            raise ValueError(
                "프로필 이미지는 base64 데이터가 아닌 URL을 전달해주세요. "
                "이미지 업로드 API(/chat/upload/presigned-url)를 먼저 호출하세요."
            )
        if v and len(v) > 500:
            raise ValueError("프로필 이미지 URL은 500자 이내여야 합니다.")
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
    checkup_date: Optional[date] = None
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
    checkup_date: Optional[date] = None
    is_checkup_unknown: Optional[bool] = None
    notes: Optional[str] = None
    profile_image: Optional[str] = None

    @field_validator("profile_image")
    @classmethod
    def profile_image_no_base64(cls, v):
        if v and v.startswith("data:"):
            raise ValueError(
                "프로필 이미지는 base64 데이터가 아닌 URL을 전달해주세요."
            )
        if v and len(v) > 500:
            raise ValueError("프로필 이미지 URL은 500자 이내여야 합니다.")
        return v