from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.config import settings

from app.models.doctor import Doctor
from app.models.user import User

security = HTTPBearer()

# 토큰 검증 미들웨어
# 수의사 인증
async def get_current_doctor(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        doctor_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if doctor_id is None or token_type != "doctor":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    result = await db.execute(
        select(Doctor).where(Doctor.doctorid == int(doctor_id))
    )
    doctor = result.scalar_one_or_none()

    if doctor is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return doctor

# 보호자 인증
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "user":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    result = await db.execute(
        select(User).where(User.userid == int(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return user
