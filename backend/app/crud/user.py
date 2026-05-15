from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password

# loginid 중복 확인
def get_user_by_loginid(db: Session, loginid: str):
    return db.query(User).filter(User.loginid == loginid).first()

# phone 중복 확인
def get_user_by_phone(db: Session, phone: str):
    return db.query(User).filter(User.phone == phone).first()

# 회원가입
def create_user(db: Session, user: UserCreate):
    hashed_pw = hash_password(user.password)
    db_user = User(
        loginid=user.loginid,
        password=hashed_pw,
        name=user.name,
        phone=user.phone,
        address=user.address,
        birth_date=user.birth_date,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user