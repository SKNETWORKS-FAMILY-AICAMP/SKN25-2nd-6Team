from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class Followup(Base):
    __tablename__ = "followupDB"

    followupid = Column(Integer, primary_key=True, autoincrement=True)
    emrid = Column(Integer, ForeignKey("guardianDB.emrid"), nullable=False)
    userid = Column(Integer, ForeignKey("userDB.userid"), nullable=False)
    images = Column(JSON, nullable=False)
    message = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    emergency_alert = Column(Boolean, nullable=True, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
