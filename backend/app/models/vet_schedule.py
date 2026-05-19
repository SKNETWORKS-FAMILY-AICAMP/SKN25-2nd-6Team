from sqlalchemy import Column, Integer, Boolean, Date, Time, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class VetSchedule(Base):
    __tablename__ = "vet_scheduleDB"

    vetscheduleid = Column(Integer, primary_key=True, autoincrement=True)
    doctorid = Column(Integer, ForeignKey("doctorDB.doctorid"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, nullable=False)