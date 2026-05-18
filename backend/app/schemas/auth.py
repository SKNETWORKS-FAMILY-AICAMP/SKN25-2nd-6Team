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

# 토큰 갱신 요청
class TokenRefreshRequest(BaseModel):
    refresh_token: str

# 토큰 갱신 응답
class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"