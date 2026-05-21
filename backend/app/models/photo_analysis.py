from sqlalchemy import Column, Integer, String, Text, JSON, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class PhotoAnalysis(Base):
    __tablename__ = "photo_analysisDB"

    id = Column(Integer, primary_key=True, autoincrement=True)
    emrid = Column(Integer, ForeignKey("guardianDB.emrid"), nullable=False)
    image_url = Column(String, nullable=False)
    analysis_type = Column(String, nullable=False)
    model_class = Column(String, nullable=True)
    model_confidence = Column(Numeric, nullable=True)
    prediction = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)