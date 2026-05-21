from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.doctor import Doctor
from app.core.security import hash_password

# loginid로 수의사 조회
async def get_doctor_by_loginid(db: AsyncSession, loginid: str):
    result = await db.execute(select(Doctor).where(Doctor.loginid == loginid))
    return result.scalar_one_or_none()

# 비밀번호 변경
async def update_doctor_password(db: AsyncSession, doctor: Doctor, new_password: str):
    doctor.password = hash_password(new_password)
    doctor.is_initial_password = False
    await db.commit()
    await db.refresh(doctor)
    return doctor

# 임시 비밀번호 발급
async def reset_doctor_password(db: AsyncSession, loginid: str, doctor_name: str, business_number: str):
    result = await db.execute(
        select(Doctor).where(
            Doctor.loginid == loginid,
            Doctor.doctor_name == doctor_name,
            Doctor.business_number == business_number,
        )
    )
    return result.scalar_one_or_none()
