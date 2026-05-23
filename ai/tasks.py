"""AI 에이전트 BackgroundTask 오케스트레이터.

각 에이전트를 실행하고 결과를 DB에 저장합니다.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# TODO: 멀티 워커(Gunicorn) 환경에서는 Redis/persistent queue로 교체 필요.
#       현재는 단일 프로세스 uvicorn 기준 인메모리 dict 사용.
#       교체 시: redis-py / aioredis + task_id 기반 key expiry 적용.
_task_store: dict[str, dict] = {}

_TASK_TTL_SEC = 300  # 5분: SSE 미접속 task 자동 정리


async def cleanup_task_after_ttl(task_id: str, ttl: int = _TASK_TTL_SEC) -> None:
    """완료/에러 task를 TTL 후 자동 삭제.

    SSE 핸들러가 먼저 pop하면 이 호출은 no-op이 된다.
    SSE가 절대 접속하지 않거나 연결이 끊겨도 메모리 누수 방지.
    """
    await asyncio.sleep(ttl)
    _task_store.pop(task_id, None)


import time
import uuid

def monitor_agent(agent_name: str):
    def decorator(func):
        async def wrapper(payload: dict, update_step, emrid: int | None, scheduleid: int | None, *args, **kwargs):
            request_id = str(uuid.uuid4())
            start_time = time.perf_counter()
            success = False
            failure_reason = None
            
            # Extract metadata from payload
            pet_id = None
            session_id = None
            reservation_id = scheduleid
            
            if isinstance(payload, dict):
                pet_id = payload.get("pet_id") or payload.get("pet", {}).get("pet_id") or payload.get("pet", {}).get("id")
                if not pet_id:
                    p_ctx = payload.get("patient_context", {})
                    if isinstance(p_ctx, dict) and "patient_context" in p_ctx:
                        p_ctx = p_ctx["patient_context"]
                    if isinstance(p_ctx, dict):
                        pet_id = p_ctx.get("patient_profile", {}).get("pet_id")
                
                session_id = payload.get("session_id") or payload.get("chat_session_id")
                if not reservation_id:
                    reservation_id = payload.get("schedule_id") or payload.get("schedule_result", {}).get("scheduleid") or payload.get("schedule_slot", {}).get("scheduleid")

            # Database fallback if emrid is available and metadata is missing
            if emrid and (not pet_id or not session_id):
                from app.db.session import AsyncSessionLocal
                from sqlalchemy import select
                from app.models.guardian import Guardian
                from app.models.chat_history import ChatHistory
                
                async with AsyncSessionLocal() as db:
                    try:
                        g_res = await db.execute(select(Guardian).where(Guardian.emrid == emrid))
                        guardian = g_res.scalar_one_or_none()
                        if guardian:
                            if not pet_id:
                                pet_id = guardian.petid
                            
                            c_res = await db.execute(
                                select(ChatHistory)
                                .where(ChatHistory.emrid == emrid)
                                .order_by(ChatHistory.created_at.desc())
                            )
                            chat = c_res.scalars().first()
                            if chat and not session_id:
                                session_id = chat.id
                    except Exception as db_exc:
                        logger.warning(f"[monitor_agent] DB lookup failed: {db_exc}")

            try:
                result = await func(payload, update_step, emrid, scheduleid, *args, **kwargs)
                success = True
                return result
            except Exception as e:
                failure_reason = str(e)
                raise e
            finally:
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                log_data = {
                    "request_id": request_id,
                    "session_id": session_id,
                    "pet_id": pet_id,
                    "reservation_id": reservation_id,
                    "agent_name": agent_name,
                    "latency_ms": round(latency_ms, 2),
                    "success": success,
                    "failure_reason": failure_reason,
                }
                logger.info(f"[AGENT_MONITOR] {json.dumps(log_data, ensure_ascii=False)}")
        return wrapper
    return decorator


@monitor_agent("triage")
async def run_triage(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.triage import run_triage as _run
    return await _run(payload, update_step, emrid, scheduleid)


@monitor_agent("schedule")
async def run_schedule(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.schedule import run_schedule as _run
    return await _run(payload, update_step, emrid, scheduleid)


@monitor_agent("chart")
async def run_chart(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.chart import run_chart as _run
    return await _run(payload, update_step, emrid, scheduleid)


@monitor_agent("validation")
async def run_validation(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.validation import run_validation as _run
    return await _run(payload, update_step, emrid, scheduleid)


@monitor_agent("judge")
async def run_judge(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.judge import run_judge as _run
    return await _run(payload, update_step, emrid, scheduleid)


@monitor_agent("followup")
async def run_followup(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.followup import run_followup as _run
    return await _run(payload, update_step, emrid, scheduleid)


RUNNERS: dict[str, Any] = {
    "triage":     run_triage,
    "schedule":   run_schedule,
    "chart":      run_chart,
    "validation": run_validation,
    "judge":      run_judge,
    "followup":   run_followup,
}


async def save_result(
    agent_type: str,
    result: dict,
    emrid: int | None,
    scheduleid: int | None,
    user_id: int,
) -> None:
    """에이전트 실행 결과를 DB에 저장.

    - chart → reportDB (ai_draft_json) + doctor_alarmDB
    - validation → validation_resultDB
    - triage → triage_resultDB
    - followup → 로그만 기록 (followupDB는 보호자 사진/메시지 전용)
    """
    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal

    # chart → reportDB + doctor_alarmDB
    if agent_type == "chart" and emrid and scheduleid:
        from app.models.report import Report
        from app.models.alarm import DoctorAlarm
        from app.models.schedule import Schedule

        async with AsyncSessionLocal() as db:
            try:
                existing = await db.execute(
                    select(Report).where(
                        Report.emrid == emrid,
                        Report.scheduleid == scheduleid,
                    )
                )
                report = existing.scalar_one_or_none()
                if report:
                    report.ai_draft_json = result
                    report.status = "complete"
                else:
                    db.add(Report(
                        emrid=emrid,
                        scheduleid=scheduleid,
                        ai_draft_json=result,
                        status="complete",
                    ))

                sched_row = await db.execute(
                    select(Schedule).where(Schedule.scheduleid == scheduleid)
                )
                sched = sched_row.scalar_one_or_none()
                if sched:
                    # 동일 schedule + type + unread 알람 중복 방지 (application-level 체크)
                    dup = await db.execute(
                        select(DoctorAlarm).where(
                            DoctorAlarm.scheduleid == scheduleid,
                            DoctorAlarm.type == "chart_ready",
                            DoctorAlarm.is_read.is_(False),
                        )
                    )
                    if not dup.scalar_one_or_none():
                        db.add(DoctorAlarm(
                            doctorid=sched.doctorid,
                            scheduleid=scheduleid,
                            type="chart_ready",
                            contents="새 환자의 AI 차트 초안이 준비되었습니다.",
                        ))

                await db.commit()
                logger.info(f"[SaveResult] chart → reportDB emrid={emrid}")
            except Exception as e:
                await db.rollback()
                logger.error(f"[SaveResult] chart DB 저장 실패: {e}")

    # validation → validation_resultDB
    elif agent_type == "validation" and emrid:
        from app.models.validation_result import ValidationResult

        scores = result.get("scores") or {}
        async with AsyncSessionLocal() as db:
            try:
                db.add(ValidationResult(
                    emrid=emrid,
                    scheduleid=scheduleid,
                    overall=result.get("overall", "OK"),
                    checks=result.get("checks"),
                    completeness_score=scores.get("completeness"),
                    accuracy_score=scores.get("accuracy"),
                    consistency_score=scores.get("consistency"),
                    summary=result.get("summary"),
                    raw_llm_output=json.dumps(result, ensure_ascii=False),
                    score_breakdown=scores,
                    emr_alignment_reason=result.get("emr_alignment_reason"),
                    prescription_risk_reason=result.get("prescription_risk_reason"),
                ))
                await db.commit()
                logger.info(f"[SaveResult] validation → validation_resultDB emrid={emrid}")
            except Exception as e:
                await db.rollback()
                logger.error(f"[SaveResult] validation DB 저장 실패: {e}")

    # triage → triage_resultDB
    elif agent_type == "triage" and emrid:
        from app.models.triage_result import TriageResult

        info = result.get("collected_info") or result
        async with AsyncSessionLocal() as db:
            try:
                db.add(TriageResult(
                    emrid=emrid,
                    urgency_level=info.get("urgency_level", ""),
                    urgency_level_num=int(info.get("urgency_level_num", 3)),
                    vtl_basis=info.get("vtl_basis"),
                    red_flags=info.get("red_flags"),
                    chief_complaint=info.get("chief_complaint"),
                    symptom_onset=info.get("symptom_onset"),
                    symptom_keywords=info.get("symptom_keywords"),
                    suspected_diseases=info.get("suspected_diseases"),
                    symptom_summary=info.get("symptom_summary"),
                    recommended_action=info.get("recommended_action"),
                    need_photo=info.get("need_photo", False),
                ))
                await db.commit()
                logger.info(f"[SaveResult] triage → triage_resultDB emrid={emrid}")
            except Exception as e:
                await db.rollback()
                logger.error(f"[SaveResult] triage DB 저장 실패: {e}")

    # followup: followupDB는 보호자 사진/메시지 전용이므로 로그만 기록
    elif agent_type == "followup":
        emergency = result.get("emergency_alert", False)
        logger.info(
            f"[SaveResult] followup summary emrid={emrid} emergency={emergency}"
        )
