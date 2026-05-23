"""AI 에이전트 BackgroundTask 오케스트레이터.

각 에이전트를 실행하고 결과를 DB에 저장합니다.
"""
from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# TODO: 멀티 워커(Gunicorn) 환경에서는 Redis/persistent queue로 교체 필요.
#       현재는 단일 프로세스 uvicorn 기준 인메모리 dict 사용.
#       교체 시: redis-py / aioredis + task_id 기반 key expiry 적용.
_task_store: dict[str, dict] = {}


async def run_triage(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.triage import run_triage as _run
    return await _run(payload, update_step, emrid, scheduleid)


async def run_schedule(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.schedule import run_schedule as _run
    return await _run(payload, update_step, emrid, scheduleid)


async def run_chart(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.chart import run_chart as _run
    return await _run(payload, update_step, emrid, scheduleid)


async def run_validation(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.validation import run_validation as _run
    return await _run(payload, update_step, emrid, scheduleid)


async def run_judge(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    from ai.agents.judge import run_judge as _run
    return await _run(payload, update_step, emrid, scheduleid)


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
