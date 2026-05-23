"""수의사 알람 엔드포인트.

2순위:
  GET   /doctor/alarm/list     - 알람 목록 (최근 50건)
  PATCH /doctor/alarm/read-all - 전체 읽음 처리
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_doctor
from app.db.session import get_db
from app.models.doctor import Doctor
from app.crud.alarm import get_alarms, mark_all_read

router = APIRouter(prefix="/doctor/alarm", tags=["doctor-alarm"])


@router.get("/list", status_code=200)
async def alarm_list(
    page: int = 1,
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """수의사 알람 목록을 반환한다 (최근 50건)."""
    alarms = await get_alarms(db, current_doctor.doctorid)
    return {
        "code": 200,
        "result": {
            "alarm_list": [
                {
                    "alarmid": a.alarmid,
                    "type": a.type,
                    "contents": a.contents,
                    "scheduleid": a.scheduleid,
                    "is_read": a.is_read,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in alarms
            ]
        },
    }


@router.patch("/read-all", status_code=200)
async def alarm_read_all(
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """수의사의 모든 미읽 알람을 읽음 처리한다."""
    count = await mark_all_read(db, current_doctor.doctorid)
    return {"code": 200, "message": f"{count}건의 알람을 읽음 처리했습니다."}
