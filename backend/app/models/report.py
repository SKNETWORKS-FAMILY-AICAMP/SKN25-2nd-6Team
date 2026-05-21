from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.db.base import Base

class Report(Base):
    __tablename__ = "reportDB"

    reportid = Column(Integer, primary_key=True, autoincrement=True)
    emrid = Column(Integer, ForeignKey("guardianDB.emrid"), nullable=False)
    scheduleid = Column(Integer, ForeignKey("scheduleDB.scheduleid"), nullable=True)
    medical_analysis = Column(Text, nullable=True)
    ai_draft_json = Column(JSON, nullable=True)
    status = Column(String, nullable=False, default="draft")