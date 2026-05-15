from pydantic import BaseModel

# 로그인 요청
class LoginRequest(BaseModel):
    loginid: str
    password: str

# 토큰 응답
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"