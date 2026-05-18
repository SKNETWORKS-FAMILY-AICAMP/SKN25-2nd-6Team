from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password

# loginid 중복 확인
def get_user_by_loginid(db: Session, loginid: str):
    return db.query(User).filter(User.loginid == loginid).first()


# 회원가입
def create_user(db: Session, user: UserCreate):
    hashed_pw = hash_password(user.password)
    db_user = User(
        loginid=user.loginid,
        password=hashed_pw,
        name=user.name,
        phone=user.phone,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user