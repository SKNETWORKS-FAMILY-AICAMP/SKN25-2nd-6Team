from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.models.doctor import Doctor

security = HTTPBearer()

def get_current_doctor(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
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

    doctor = db.query(Doctor).filter(Doctor.doctorid == int(doctor_id)).first()

    if doctor is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return doctor