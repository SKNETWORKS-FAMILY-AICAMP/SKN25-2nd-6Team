from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import secrets
import string
from app.db.session import get_db
from app.schemas.doctor import DoctorLoginRequest, DoctorTokenResponse, DoctorPasswordChangeRequest, DoctorPasswordResetRequest
from app.crud.doctor import get_doctor_by_loginid, update_doctor_password, reset_doctor_password
from app.core.security import verify_password, create_access_token, create_refresh_token, hash_password
from app.core.dependencies import get_current_doctor

router = APIRouter(prefix="/doctor/auth", tags=["doctor-auth"])

# 수의사 로그인
@router.post("/login", response_model=DoctorTokenResponse)
async def doctor_login(request: DoctorLoginRequest, db: AsyncSession = Depends(get_db)):
    doctor = await get_doctor_by_loginid(db, request.loginid)

    if not doctor or not verify_password(request.password, doctor.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다."
        )

    access_token = create_access_token({"sub": str(doctor.doctorid), "type": "doctor"})
    refresh_token = create_refresh_token({"sub": str(doctor.doctorid), "type": "doctor"})

    return DoctorTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        is_initial_password=doctor.is_initial_password
    )

# 비밀번호 변경
@router.put("/password/change")
async def change_password(
    request: DoctorPasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_doctor = Depends(get_current_doctor)
):
    # 새 비밀번호 일치 확인
    if request.new_password != request.new_password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="새 비밀번호가 일치하지 않습니다."
        )

    # 현재 비밀번호 확인
    if not verify_password(request.current_password, current_doctor.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 올바르지 않습니다."
        )

    await update_doctor_password(db, current_doctor, request.new_password)
    return {"code": 200, "message": "비밀번호가 변경되었습니다."}

# 비밀번호 재설정
@router.post("/password/reset")
async def reset_password(request: DoctorPasswordResetRequest, db: AsyncSession = Depends(get_db)):
    doctor = await reset_doctor_password(db, request.loginid, request.doctor_name, request.business_number)

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="입력하신 정보와 일치하는 계정을 찾을 수 없습니다."
        )

    # 임시 비밀번호 생성
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits + "!@#$%") for _ in range(10))
    await update_doctor_password(db, doctor, temp_password)
    doctor.is_initial_password = True
    await db.commit()

    return {"code": 200, "message": "임시 비밀번호가 발급되었습니다.", "result": {"temp_password": temp_password}}
