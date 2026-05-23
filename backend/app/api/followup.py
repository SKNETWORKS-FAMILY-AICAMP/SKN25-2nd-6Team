from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
import logging
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_doctor
from app.models.followup import Followup
from app.models.guardian import Guardian

router = APIRouter(prefix="/followup", tags=["followup"])
logger = logging.getLogger(__name__)


async def run_followup_sync(followup_id: int, emrid: int, userid: int, message: str) -> dict | None:
    from app.db.session import AsyncSessionLocal
    from app.models.pet import Pet
    from app.models.triage_result import TriageResult
    from app.models.schedule import Schedule
    from app.models.followup import Followup
    from ai.tasks import RUNNERS
    from app.crud.patient import build_patient_context

    async with AsyncSessionLocal() as db:
        try:
            # 1. followup 정보 조회
            f_row = await db.execute(select(Followup).where(Followup.followupid == followup_id))
            followup = f_row.scalar_one_or_none()
            if not followup:
                return

            # 2. guardian 정보 및 pet 정보 조회
            g_row = await db.execute(select(Guardian).where(Guardian.emrid == emrid))
            guardian = g_row.scalar_one_or_none()
            if not guardian:
                return
            
            pet_row = await db.execute(select(Pet).where(Pet.petid == guardian.petid))
            pet = pet_row.scalar_one_or_none()
            if not pet:
                return

            # 3. Triage 결과 조회
            t_row = await db.execute(select(TriageResult).where(TriageResult.emrid == emrid))
            triage = t_row.scalar_one_or_none()
            triage_info = {}
            if triage:
                triage_info = {
                    "chief_complaint": triage.chief_complaint,
                    "urgency_level": triage.urgency_level,
                    "urgency_level_num": triage.urgency_level_num,
                    "symptom_keywords": triage.symptom_keywords or [],
                    "suspected_diseases": triage.suspected_diseases or [],
                    "followup_reason": triage.symptom_summary or "",
                }

            # 4. 예약 정보 조회
            s_row = await db.execute(select(Schedule).where(Schedule.emrid == emrid))
            sched = s_row.scalar_one_or_none()
            appointment_slot = {}
            if sched and sched.confirmed_time:
                appointment_slot = {"date": sched.confirmed_time.date().isoformat()}

            # 5. 이전 누적 요약 조회
            prev_f_row = await db.execute(
                select(Followup)
                .where(Followup.emrid == emrid, Followup.followupid != followup_id, Followup.ai_summary.isnot(None))
                .order_by(Followup.created_at.desc())
            )
            prev_f = prev_f_row.scalars().first()
            accumulated_summary = prev_f.ai_summary if prev_f else ""

            # Payload 빌드
            from datetime import date
            age = (date.today().year - pet.birth_date.year) if pet.birth_date else None
            pet_payload = {
                "name": pet.petname,
                "species": pet.species or "dog",
                "breed": pet.breed or "알 수 없음",
                "age": age,
                "gender": pet.gender,
                "weight": float(pet.weight_kg) if pet.weight_kg else None,
            }

            patient_context_data = await build_patient_context(db, pet.petid)

            payload = {
                "pet": pet_payload,
                "triage_info": triage_info,
                "triage_result": triage_info,
                "appointment_slot": appointment_slot,
                "accumulated_summary": accumulated_summary,
                "patient_context": patient_context_data,
                "messages": [{"role": "user", "content": message}]
            }

            import asyncio
            try:
                result = await asyncio.wait_for(
                    RUNNERS["followup"](payload, lambda _: None, emrid, None),
                    timeout=10.0
                )
            except asyncio.TimeoutError:
                logger.warning(f"[FollowupSync] TimeoutError. Using fallback response.")
                result = {
                    "medical_summary": "경과 보고 분석 시간 초과 (대기 중)",
                    "followup_summary": "경과 보고 분석 시간 초과 (대기 중)",
                    "followup_recommended": False,
                    "guardian_message": "기록되었습니다. (분석 시간이 지연되고 있으나, 이상 징후가 의심되는 경우 병원으로 문의 부탁드립니다.)",
                    "recommended_actions": ["keep_schedule"]
                }
            
            # DB 업데이트
            followup.ai_summary = result.get("medical_summary") or result.get("followup_summary")
            followup.emergency_alert = result.get("followup_recommended", False)
            await db.commit()
            logger.info(f"[FollowupSync] 완료 followup_id={followup_id} emrid={emrid}")
            return result
        except Exception as e:
            logger.error(f"[FollowupSync] 에이전트 실패 emrid={emrid}: {e}", exc_info=True)
            return None


class FollowupCreate(BaseModel):
    emrid: int
    images: List[str]
    message: Optional[str] = None


# 경과사진 등록
@router.post("", status_code=201)
async def create_followup(
    request: FollowupCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Guardian).where(Guardian.emrid == request.emrid))
    guardian = result.scalar_one_or_none()
    if not guardian:
        raise HTTPException(status_code=404, detail="문진 정보를 찾을 수 없습니다.")

    followup = Followup(
        emrid=request.emrid,
        userid=current_user.userid,
        images=request.images,
        message=request.message
    )
    db.add(followup)
    await db.commit()
    await db.refresh(followup)

    ai_response = None
    if request.message:
        ai_response = await run_followup_sync(
            followup.followupid,
            request.emrid,
            current_user.userid,
            request.message
        )

    response_payload = {
        "followup_id": followup.followupid,
    }
    
    if ai_response:
        response_payload.update({
            "followup_recommended": ai_response.get("followup_recommended", False),
            "guardian_message": ai_response.get("guardian_message", "기록되었습니다."),
            "recommended_actions": ai_response.get("recommended_actions", ["keep_schedule"]),
        })

    return {
        "code": 201,
        "message": "경과 사진이 등록되었습니다.",
        "result": response_payload
    }


# 경과사진 목록 조회
@router.get("/{emrid}")
async def get_followups(
    emrid: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(Followup).where(Followup.emrid == emrid).order_by(Followup.created_at.asc())
    )
    followups = result.scalars().all()

    return {
        "code": 200,
        "result": [
            {
                "followup_id": f.followupid,
                "images": f.images,
                "message": f.message,
                "created_at": str(f.created_at)
            }
            for f in followups
        ]
    }


# 이미지 업로드 URL 발급
@router.get("/upload/presigned-url")
async def get_presigned_url(
    file_name: str = Query(...),
    content_type: str = Query(...),
    file_size: int = Query(...),
    current_user = Depends(get_current_user)
):
    allowed_types = ["image/jpeg", "image/png"]
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="이미지(JPG, PNG) 파일만 업로드 가능합니다.")

    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="파일 크기는 5MB 이하만 업로드 가능합니다.")

    # TODO: S3 Presigned URL 발급
    return {
        "code": 200,
        "result": {
            "presigned_url": "https://s3.amazonaws.com/temp",
            "cloudfront_url": "https://cloudfront-url/temp"
        }
    }
