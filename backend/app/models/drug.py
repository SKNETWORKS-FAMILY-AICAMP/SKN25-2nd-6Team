from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class Drug(Base):
    __tablename__ = "drugsDB"

    drugid = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    ingredient_kr = Column(String, nullable=True)
    dosage = Column(String, nullable=True)
    usage_method = Column(String, nullable=True)
    duration_days = Column(Integer, nullable=True)
    sales_volume = Column(Integer, nullable=True)