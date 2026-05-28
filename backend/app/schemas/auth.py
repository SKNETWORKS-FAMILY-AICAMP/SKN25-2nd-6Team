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

# 아이디 찾기 요청
class FindIdRequest(BaseModel):
    name: str
    phone: str

# 아이디 찾기 응답
class FindIdResponse(BaseModel):
    loginid: str

# 비밀번호 찾기 요청
class FindPasswordRequest(BaseModel):
    loginid: str
    name: str
    phone: str