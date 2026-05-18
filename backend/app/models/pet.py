from sqlalchemy import Column, Integer, String, Date, Numeric, Boolean, Text, ForeignKey
from app.db.base import Base

class Pet(Base):
    __tablename__ = "petDB"

    petid = Column(Integer, primary_key=True, autoincrement=True)
    userid = Column(Integer, ForeignKey("userDB.userid"), nullable=False)
    profile_image = Column(String, nullable=True)
    species = Column(String, nullable=True)
    breed = Column(String, nullable=True)
    petname = Column(String, nullable=False)
    gender = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    weight_kg = Column(Numeric, nullable=True)
    is_neutered = Column(Boolean, nullable=True)
    notes = Column(Text, nullable=True)