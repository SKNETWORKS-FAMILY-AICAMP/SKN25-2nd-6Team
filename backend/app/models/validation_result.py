from sqlalchemy import Column, Integer, String, Text, JSON, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class ValidationResult(Base):
    __tablename__ = "validation_resultDB"

    id = Column(Integer, primary_key=True, autoincrement=True)
    emrid = Column(Integer, ForeignKey("guardianDB.emrid"), nullable=False)
    scheduleid = Column(Integer, ForeignKey("scheduleDB.scheduleid"), nullable=True)
    overall = Column(String, nullable=False)
    checks = Column(JSON, nullable=True)
    completeness_score = Column(Numeric, nullable=True)
    accuracy_score = Column(Numeric, nullable=True)
    consistency_score = Column(Numeric, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Evaluation dataset columns
    raw_llm_output = Column(Text, nullable=True)
    score_breakdown = Column(JSON, nullable=True)
    emr_alignment_reason = Column(Text, nullable=True)
    prescription_risk_reason = Column(Text, nullable=True)