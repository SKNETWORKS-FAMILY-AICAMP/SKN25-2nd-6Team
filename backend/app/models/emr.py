from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class EMR(Base):
    __tablename__ = "doctorEMRDB"

    doctor_emrid = Column(Integer, primary_key=True, autoincrement=True)
    petid = Column(Integer, ForeignKey("petDB.petid"), nullable=False)
    doctorid = Column(Integer, ForeignKey("doctorDB.doctorid"), nullable=False)
    scheduleid = Column(Integer, ForeignKey("scheduleDB.scheduleid"), nullable=False)
    vet_note = Column(String, nullable=True)
    attachments = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)