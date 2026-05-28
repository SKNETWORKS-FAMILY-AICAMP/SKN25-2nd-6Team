from pydantic import BaseModel, model_validator

# 회원가입 요청
class UserCreate(BaseModel):
    name: str
    loginid: str
    password: str
    password_confirm: str
    phone: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.password_confirm:
            raise ValueError("비밀번호가 일치하지 않습니다.")
        return self

# 회원가입 응답
class UserResponse(BaseModel):
    userid: int
    loginid: str
    name: str
    phone: str

    class Config:
        from_attributes = True
