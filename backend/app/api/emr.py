"""수의사 EMR 관련 엔드포인트 모음.

1순위: GET /doctor/emr/queue            - 오늘의 대기/완료 큐
        GET /doctor/emr/queue/{id}       - EMR 상세
3순위: GET /doctor/emr/{id}/report      - AI SOAP 초안 (reportDB)
4순위: GET /doctor/emr/{id}/triage      - 트리아지 결과
5순위: GET /doctor/emr/{id}/validation  - 검증 결과
6순위: GET /doctor/emr/followup/{emrid} - 경과 모니터링 (수의사 뷰)
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_doctor
from app.db.session import get_db
from app.models.doctor import Doctor
from app.models.followup import Followup
from app.crud.emr_queue import (
    get_emr_queue,
    get_emr_detail,
    get_report_by_schedule,
    get_triage_by_schedule,
    get_validation_by_schedule,
)

router = APIRouter(prefix="/doctor/emr", tags=["doctor-emr"])


# ──────────────────────────────────────────────
# 1순위: EMR Queue
# ──────────────────────────────────────────────

@router.get("/queue", status_code=200)
async def emr_queue(
    target_date: date = Query(default_factory=date.today, alias="date"),
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """오늘의 진료 대기/완료 큐를 반환한다."""
    waiting, completed = await get_emr_queue(db, current_doctor.doctorid, target_date)
    return {
        "code": 200,
        "result": {
            "waiting": waiting,
            "completed": completed,
        },
    }


@router.get("/queue/{schedule_id}", status_code=200)
async def emr_detail(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """schedule_id 기준 EMR 상세 정보.

    환자 정보 + 트리아지 요약 (증상 키워드, 첨부 이미지, 메모)
    + 과거 진료 기록(doctorEMRDB + prescriptionDB) 반환.
    """
    detail = await get_emr_detail(db, schedule_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="해당 예약을 찾을 수 없습니다.")
    return {"code": 200, "result": detail}


# ──────────────────────────────────────────────
# 3순위: AI SOAP 초안 (reportDB)
# ──────────────────────────────────────────────

@router.get("/{schedule_id}/report", status_code=200)
async def emr_report(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """AI Chart 에이전트가 생성한 SOAP 초안을 반환한다."""
    report = await get_report_by_schedule(db, schedule_id)
    if report is None:
        return {"code": 200, "result": None}
    return {
        "code": 200,
        "result": {
            "reportid": report.reportid,
            "emrid": report.emrid,
            "scheduleid": report.scheduleid,
            "medical_analysis": report.medical_analysis,
            "ai_draft_json": report.ai_draft_json,
            "status": report.status,
        },
    }


# ──────────────────────────────────────────────
# 4순위: 트리아지 결과
# ──────────────────────────────────────────────

@router.get("/{schedule_id}/triage", status_code=200)
async def emr_triage(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """보호자 문진 AI 트리아지 결과를 반환한다."""
    triage = await get_triage_by_schedule(db, schedule_id)
    if triage is None:
        return {"code": 200, "result": None}
    return {
        "code": 200,
        "result": {
            "id": triage.id,
            "emrid": triage.emrid,
            "urgency_level": triage.urgency_level,
            "urgency_level_num": triage.urgency_level_num,
            "vtl_basis": triage.vtl_basis,
            "red_flags": triage.red_flags,
            "chief_complaint": triage.chief_complaint,
            "symptom_onset": triage.symptom_onset,
            "symptom_keywords": triage.symptom_keywords,
            "suspected_diseases": triage.suspected_diseases,
            "symptom_summary": triage.symptom_summary,
            "recommended_action": triage.recommended_action,
            "need_photo": triage.need_photo,
            "created_at": triage.created_at.isoformat() if triage.created_at else None,
        },
    }


# ──────────────────────────────────────────────
# 5순위: 검증 결과
# ──────────────────────────────────────────────

@router.get("/{schedule_id}/validation", status_code=200)
async def emr_validation(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """Validation + Judge 에이전트 결과를 반환한다."""
    validation = await get_validation_by_schedule(db, schedule_id)
    if validation is None:
        return {"code": 200, "result": None}
    return {
        "code": 200,
        "result": {
            "id": validation.id,
            "emrid": validation.emrid,
            "scheduleid": validation.scheduleid,
            "overall": validation.overall,
            "checks": validation.checks,
            "completeness_score": float(validation.completeness_score) if validation.completeness_score else None,
            "accuracy_score": float(validation.accuracy_score) if validation.accuracy_score else None,
            "consistency_score": float(validation.consistency_score) if validation.consistency_score else None,
            "summary": validation.summary,
            "emr_alignment_reason": validation.emr_alignment_reason,
            "prescription_risk_reason": validation.prescription_risk_reason,
            "score_breakdown": validation.score_breakdown,
            "created_at": validation.created_at.isoformat() if validation.created_at else None,
        },
    }


# ──────────────────────────────────────────────
# 6순위: 경과 모니터링 (수의사 뷰)
# ──────────────────────────────────────────────

@router.get("/followup/{emrid}", status_code=200)
async def doctor_followup(
    emrid: int,
    db: AsyncSession = Depends(get_db),
    current_doctor: Doctor = Depends(get_current_doctor),
):
    """보호자가 등록한 경과 사진/메시지를 수의사가 조회한다."""
    result = await db.execute(
        select(Followup)
        .where(Followup.emrid == emrid)
        .order_by(Followup.created_at.asc())
    )
    followups = result.scalars().all()
    return {
        "code": 200,
        "result": [
            {
                "followup_id": f.followupid,
                "emrid": f.emrid,
                "images": f.images,
                "message": f.message,
                "ai_summary": f.ai_summary,
                "emergency_alert": f.emergency_alert,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in followups
        ],
    }
