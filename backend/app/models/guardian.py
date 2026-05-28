from sqlalchemy import Column, Integer, Text, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class Guardian(Base):
    __tablename__ = "guardianDB"

    emrid = Column(Integer, primary_key=True, autoincrement=True)
    petid = Column(Integer, ForeignKey("petDB.petid"), nullable=False)
    category_id = Column(Integer, ForeignKey("category_masterDB.id"), nullable=False)
    triage_id = Column(Integer, ForeignKey("triage_masterDB.id"), nullable=True)
    date = Column(Date, nullable=True)
    memo = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # 소프트 삭제(의료 데이터): NULL = 활성, 값이 있으면 삭제된 시각
    deleted_at = Column(DateTime(timezone=True), nullable=True)