from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class DoctorAlarm(Base):
    __tablename__ = "doctor_alarmDB"

    alarmid = Column(Integer, primary_key=True, autoincrement=True)
    doctorid = Column(Integer, ForeignKey("doctorDB.doctorid"), nullable=False)
    scheduleid = Column(Integer, ForeignKey("scheduleDB.scheduleid"), nullable=False)
    type = Column(String, nullable=False)  # 알람 유형 (예: "예약확인", "예약취소")
    contents = Column(String, nullable=False)  # 알람 내용
    is_read = Column(Boolean, nullable=False, default=False)  # 알람 읽음
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)