from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import Base

class Prescription(Base):
    __tablename__ = "prescriptionDB"

    prescriptionid = Column("id", Integer, primary_key=True, autoincrement=True)
    doctor_emrid = Column(Integer, ForeignKey("doctorEMRDB.doctor_emrid"), nullable=False)
    drug_id = Column(Integer, ForeignKey("drugsDB.drugid"), nullable=False)
    form = Column(String, nullable=True)  
    dosage = Column(String, nullable=True)  
    duration_days = Column(Integer, nullable=True)  
