from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class Drug(Base):
    __tablename__ = "drugsDB"

    drugid = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    ingredient_kr = Column(String, nullable=False)
    ingredient_en = Column(String, nullable=False)
    usage_method = Column(String, nullable=False)
