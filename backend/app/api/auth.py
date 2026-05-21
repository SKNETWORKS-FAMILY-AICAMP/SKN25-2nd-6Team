from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from jose import JWTError, jwt

from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, TokenResponse, TokenRefreshRequest, TokenRefreshResponse, FindIdRequest, FindPasswordRequest
from app.crud.user import get_user_by_loginid, create_user
from app.core.security import verify_password, create_access_token, create_refresh_token, hash_password
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User

import secrets
import string

router = APIRouter(prefix="/auth", tags=["auth"])

# 회원가입
@router.post("/signup", response_model=UserResponse, status_code=201)
async def signup(user: UserCreate, db: AsyncSession = Depends(get_db)):

    # loginid 중복 확인
    if await get_user_by_loginid(db, user.loginid):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 로그인 ID입니다."
        )

    return await create_user(db, user)

# 로그인
@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_loginid(db, request.loginid)

    if not user or not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인 ID 또는 비밀번호가 올바르지 않습니다."
        )

    access_token = create_access_token({"sub": str(user.userid), "type": "user"})
    refresh_token = create_refresh_token({"sub": str(user.userid), "type": "user"})

    return {
        "code": 200,
        "message": "로그인 성공",
        "result": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    }

# 토큰 갱신
@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(request: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):

    try:
        # refresh token 검증
        payload = jwt.decode(
            request.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "user":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다."
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 만료되었거나 유효하지 않습니다."
        )

    # 유저 존재 확인
    result = await db.execute(select(User).where(User.userid == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="존재하지 않는 사용자입니다."
        )

    # 새 access token 발급
    new_access_token = create_access_token({"sub": str(user.userid), "type": "user"})

    return TokenRefreshResponse(access_token=new_access_token)

# 로그아웃
@router.post("/logout")
async def logout(current_user = Depends(get_current_user)):
    return {
        "code": 200,
        "message": "로그아웃 되었습니다."
    }

# 아이디 찾기
@router.post("/find-id")
async def find_id(request: FindIdRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            User.name == request.name,
            User.phone == request.phone
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="입력하신 정보와 일치하는 계정을 찾을 수 없습니다."
        )

    return {
        "code": 200,
        "message": "아이디를 찾았습니다.",
        "result": {
            "loginid": user.loginid
        }
    }

# 비밀번호 찾기
@router.post("/find-password")
async def find_password(request: FindPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            User.loginid == request.loginid,
            User.name == request.name,
            User.phone == request.phone
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="입력하신 정보와 일치하는 계정을 찾을 수 없습니다."
        )

    # 임시 비밀번호 생성
    temp_password = ''.join(
        secrets.choice(string.ascii_letters + string.digits + "!@#$%")
        for _ in range(10)
    )

    # 비밀번호 변경
    user.password = hash_password(temp_password)
    await db.commit()

    return {
        "code": 200,
        "message": "임시 비밀번호가 발급되었습니다.",
        "result": {
            "temp_password": temp_password
        }
    }
