from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class ChatHistory(Base):
    __tablename__ = "chat_historyDB"

    id = Column(Integer, primary_key=True, autoincrement=True)
    userid = Column(Integer, ForeignKey("userDB.userid"), nullable=False)
    petid = Column(Integer, ForeignKey("petDB.petid"), nullable=False)
    emrid = Column(Integer, ForeignKey("guardianDB.emrid"), nullable=True)
    messages = Column(JSON, nullable=True, default=[])
    keywords = Column(JSON, nullable=True, default=[])
    is_complete = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)