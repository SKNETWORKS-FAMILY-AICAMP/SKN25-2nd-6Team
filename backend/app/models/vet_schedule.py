from sqlalchemy import Column, Integer, Date, Time, ForeignKey, Boolean
from app.db.base import Base

class VetSchedule(Base):
    __tablename__ = "vet_scheduleDB"

    vetscheduleid = Column("id", Integer, primary_key=True, autoincrement=True)
    doctorid = Column(Integer, ForeignKey("doctorDB.doctorid"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    # Runtime compatibility flag used by reservation confirm/cancel/delete flows.
    is_available = Column(Boolean, nullable=False, default=True)
