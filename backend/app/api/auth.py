from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, TokenResponse
from app.crud.user import get_user_by_loginid, create_user
from app.core.security import verify_password, create_access_token, create_refresh_token

router = APIRouter(prefix="/auth", tags=["auth"])

# 회원가입
@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, db: Session = Depends(get_db)):

    # loginid 중복 확인
    if get_user_by_loginid(db, user.loginid):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 로그인 ID입니다."
        )

    return create_user(db, user)

# 로그인
@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):

    # 유저 조회
    user = get_user_by_loginid(db, request.loginid)

    # 유저 없거나 비밀번호 틀리면
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인 ID 또는 비밀번호가 올바르지 않습니다."
        )

    # 토큰 생성
    access_token = create_access_token({"sub": str(user.userid), "type": "user"})
    refresh_token = create_refresh_token({"sub": str(user.userid), "type": "user"})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )