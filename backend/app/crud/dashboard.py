from sqlalchemy.orm import Session
from app.models.schedule import Schedule

def get_today_schedules(db: Session, doctor_id: int):
    return (
        db.query(Schedule)
        .filter(Schedule.doctorid == doctor_id)
        .all()
    )