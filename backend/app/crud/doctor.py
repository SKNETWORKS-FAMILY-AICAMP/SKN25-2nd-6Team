from sqlalchemy.orm import Session
from app.models.doctor import Doctor
from app.core.security import hash_password

# loginid로 수의사 조회
def get_doctor_by_loginid(db: Session, loginid: str):
    return db.query(Doctor).filter(Doctor.loginid == loginid).first()

# 비밀번호 변경
def update_doctor_password(db: Session, doctor: Doctor, new_password: str):
    doctor.password = hash_password(new_password)
    doctor.is_initial_password = False
    db.commit()
    db.refresh(doctor)
    return doctor

# 임시 비밀번호 발급
def reset_doctor_password(db: Session, loginid: str, doctor_name: str, business_number: str):
    doctor = db.query(Doctor).filter(
        Doctor.loginid == loginid,
        Doctor.doctor_name == doctor_name,
        Doctor.business_number == business_number
    ).first()
    return doctor