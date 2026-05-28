from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class TriageResult(Base):
    __tablename__ = "triage_resultDB"

    id = Column(Integer, primary_key=True, autoincrement=True)
    emrid = Column(Integer, ForeignKey("guardianDB.emrid"), nullable=False)
    urgency_level = Column(String, nullable=False)
    urgency_level_num = Column(Integer, nullable=False)
    vtl_basis = Column(Text, nullable=True)
    red_flags = Column(JSON, nullable=True)
    chief_complaint = Column(String, nullable=True)
    symptom_onset = Column(String, nullable=True)
    symptom_keywords = Column(JSON, nullable=True)
    suspected_diseases = Column(JSON, nullable=True)
    symptom_summary = Column(Text, nullable=True)
    recommended_action = Column(String, nullable=True)
    need_photo = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)