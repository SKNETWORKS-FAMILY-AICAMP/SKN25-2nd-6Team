from sqlalchemy import Column, Integer, Date, Time, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class VetSchedule(Base):
    __tablename__ = "vet_scheduleDB"

    vetscheduleid = Column(Integer, primary_key=True, autoincrement=True)
    doctorid = Column(Integer, ForeignKey("doctorDB.doctorid"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    lunch_start_time = Column(Time, nullable=True)
    lunch_end_time = Column(Time, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    