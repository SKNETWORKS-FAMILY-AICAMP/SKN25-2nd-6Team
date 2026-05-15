from pydantic import BaseModel
from typing import Optional
from datetime import date

# 회원가입 요청
class UserCreate(BaseModel):
    loginid: str
    password: str
    name: str
    phone: str
    address: Optional[str] = None
    birth_date: Optional[date] = None

# 회원가입 응답
class UserResponse(BaseModel):
    userid: int
    loginid: str
    name: str
    phone: str

    class Config:
        from_attributes = True
