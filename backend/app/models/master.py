from sqlalchemy import Column, Integer, String
from app.db.base import Base

class TriageMaster(Base):
    __tablename__ = "triage_masterDB"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(Integer, nullable=False, unique=True)
    label = Column(String, nullable=False)

class CategoryMaster(Base):
    __tablename__ = "category_masterDB"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(Integer, nullable=False, unique=True)
    label = Column(String, nullable=False)