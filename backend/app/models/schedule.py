from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class Schedule(Base):
    __tablename__ = "scheduleDB"

    scheduleid = Column(Integer, primary_key=True, autoincrement=True)
    emrid = Column(Integer, ForeignKey("guardianDB.emrid"), nullable=False)
    doctorid = Column(Integer, ForeignKey("doctorDB.doctorid"), nullable=False)
    duration_min = Column(Integer, nullable=False)
    confirmed_time = Column(DateTime(timezone=True), nullable=True)
    confirmed_end_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="예약대기")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)