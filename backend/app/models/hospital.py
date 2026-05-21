from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class Hospital(Base):
    __tablename__ = "hospitalDB"

    hospitalid = Column(Integer, primary_key=True, autoincrement=True)
    doctorid = Column(Integer, ForeignKey("doctorDB.doctorid"), nullable=False)
    scheduleid = Column(Integer, ForeignKey("scheduleDB.scheduleid"), nullable=False)
    hospital_name = Column(String, nullable=False)
    hospital_address = Column(String, nullable=False)
    hospital_number = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)