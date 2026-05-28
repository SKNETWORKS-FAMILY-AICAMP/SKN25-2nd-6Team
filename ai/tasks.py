"""AI 에이전트 BackgroundTask 오케스트레이터.

각 에이전트를 실행하고 결과를 DB에 저장합니다.

개선사항:
  - TaskStatus(str, Enum): 상태 타입 안전화. 기존 문자열 비교 코드와 100% 호환.
  - PipelineState(str, Enum): booking pipeline 상태 머신. DB 저장 없이 런타임 추적.
  - TASK_REGISTRY: asyncio.Task 레퍼런스 추적 → graceful shutdown / orphan 방지.
  - safe_create_task(): asyncio.create_task의 안전한 래퍼.
    · 예외 자동 로깅 (unhandled task exception 방지)
    · CancelledError 상태 전파
    · TASK_REGISTRY 등록/해제 자동화
  - cancel_all_tasks(): 서버 종료 시 실행 중인 모든 태스크를 정상 취소.
  - cleanup_orphan_tasks(): TTL 정리가 실패한 경우를 대비한 주기적 고아 태스크 정리.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from enum import Enum
from typing import Any, Coroutine

logger = logging.getLogger(__name__)

# ── 상태 Enum ─────────────────────────────────────────────────────────────────

class TaskStatus(str, Enum):
    """_task_store["status"] 값. str 서브클래스이므로 기존 문자열 비교와 100% 호환.

    예) task["status"] == "queued"  →  True  (TaskStatus.QUEUED == "queued")
         json.dumps({"status": TaskStatus.DONE})  →  '{"status": "done"}'
    """
    QUEUED    = "queued"
    RUNNING   = "running"
    DONE      = "done"
    ERROR     = "error"
    CANCELLED = "cancelled"
    TIMEOUT   = "timeout"


class PipelineState(str, Enum):
    """전체 booking pipeline 상태 머신.

    DB 저장 없이 런타임에서만 관리하므로 migration 불필요.
    운영자가 로그에서 'pipeline_state' 키로 현재 단계를 추적할 수 있다.

    전환 흐름:
      TRIAGE_STARTED
        → TRIAGE_COMPLETED
          → SCHEDULE_PENDING
            → SCHEDULE_CONFIRMED
              → CHART_GENERATING  ──┐
              → VALIDATION_RUNNING ─┤
                                    ↓
                               COMPLETED | FAILED | PARTIAL
    """
    TRIAGE_STARTED     = "triage_started"
    TRIAGE_COMPLETED   = "triage_completed"
    SCHEDULE_PENDING   = "schedule_pending"
    SCHEDULE_CONFIRMED = "schedule_confirmed"
    CHART_GENERATING   = "chart_generating"
    VALIDATION_RUNNING = "validation_running"
    COMPLETED          = "completed"
    FAILED             = "failed"
    PARTIAL            = "partial"   # 일부 에이전트만 성공한 부분 완료


# ── in-memory task store ───────────────────────────────────────────────────────

# TODO: 멀티 워커(Gunicorn --workers N) 환경에서는 Redis/persistent queue로 교체 필요.
#       현재는 단일 프로세스 uvicorn(asyncio 단일 스레드) 기준 인메모리 dict 사용.
#       단일 프로세스에서 asyncio는 단일 스레드이므로 dict 접근 자체는 thread-safe.
_task_store: dict[str, dict] = {}

_TASK_TTL_SEC = 300  # 5분: SSE 미접속 task 자동 정리

# asyncio.Task 레퍼런스 추적: graceful shutdown + 고아 태스크 방지
# key: task_id 또는 임의 레이블, value: asyncio.Task 객체
TASK_REGISTRY: dict[str, asyncio.Task] = {}


# ── 태스크 수명 관리 헬퍼 ────────────────────────────────────────────────────

async def cleanup_task_after_ttl(task_id: str, ttl: int = _TASK_TTL_SEC) -> None:
    """완료/에러 task를 TTL 후 자동 삭제.

    SSE 핸들러가 먼저 pop하면 이 호출은 no-op이 된다.
    SSE가 절대 접속하지 않거나 연결이 끊겨도 메모리 누수 방지.
    """
    await asyncio.sleep(ttl)
    _task_store.pop(task_id, None)
    TASK_REGISTRY.pop(f"cleanup:{task_id}", None)


def safe_create_task(
    coro: Coroutine,
    *,
    task_id: str | None = None,
    name: str | None = None,
) -> asyncio.Task:
    """asyncio.create_task의 안전한 래퍼.

    기존 asyncio.create_task 호출을 이 함수로 교체하면:
      1. 예외 발생 시 자동으로 로그 기록 (unhandled task exception 방지)
      2. CancelledError 발생 시 _task_store 상태를 'cancelled'로 업데이트
      3. TASK_REGISTRY에 등록 → graceful shutdown 시 cancel_all_tasks()로 정리 가능
      4. asyncio.create_task가 현재 context를 복사하므로 request_id contextvars도 전파됨

    Args:
        coro:    실행할 코루틴
        task_id: _task_store 키. 제공 시 예외/취소 상태를 자동 기록.
        name:    asyncio.Task 이름 (디버깅용)
    """
    label = task_id or name or f"anon-{uuid.uuid4().hex[:6]}"

    async def _guarded() -> Any:
        try:
            return await coro
        except asyncio.CancelledError:
            if task_id and task_id in _task_store:
                _task_store[task_id]["status"] = TaskStatus.CANCELLED
            logger.info("[Task] cancelled label=%s", label)
            raise
        except Exception as exc:
            if task_id and task_id in _task_store:
                _task_store[task_id]["status"] = TaskStatus.ERROR
                _task_store[task_id]["detail"] = str(exc)
            logger.exception("[Task] unhandled exception label=%s", label)
            # re-raise 하지 않음: 이미 로깅됐고 상위 루프에 크래시를 유발하지 않음
        finally:
            TASK_REGISTRY.pop(label, None)

    task = asyncio.create_task(_guarded(), name=name or label)
    TASK_REGISTRY[label] = task
    return task


async def cancel_all_tasks(timeout: float = 10.0) -> None:
    """Graceful shutdown: TASK_REGISTRY의 모든 실행 중인 태스크를 취소하고 완료를 기다린다.

    app lifespan shutdown hook에서 호출:
        @asynccontextmanager
        async def lifespan(app):
            yield
            await cancel_all_tasks()
    """
    active = {k: t for k, t in TASK_REGISTRY.items() if not t.done()}
    if not active:
        return
    logger.info("[Shutdown] Cancelling %d background tasks: %s", len(active), list(active.keys()))
    for t in active.values():
        t.cancel()
    try:
        await asyncio.wait_for(
            asyncio.gather(*active.values(), return_exceptions=True),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        logger.warning("[Shutdown] Timeout waiting for %d tasks to cancel", len(active))
    logger.info("[Shutdown] Background tasks cleanup complete")


async def cleanup_orphan_tasks(max_age_sec: int = 600) -> None:
    """TTL cleanup이 실패한 고아 태스크 제거.

    선택적으로 주기적 백그라운드 루프에서 호출할 수 있다.
    현재는 명시적 호출 없이 cleanup_task_after_ttl에 의존.
    """
    now = time.monotonic()
    # _task_store 항목에는 created_at이 없으므로 TASK_REGISTRY 기준으로 done 태스크만 제거
    done_labels = [k for k, t in list(TASK_REGISTRY.items()) if t.done()]
    for label in done_labels:
        TASK_REGISTRY.pop(label, None)
    if done_labels:
        logger.debug("[Orphan] Removed %d done tasks from TASK_REGISTRY", len(done_labels))


# ── monitor_agent 데코레이터 ──────────────────────────────────────────────────

def monitor_agent(agent_name: str):
    def decorator(func):
        async def wrapper(payload: dict, update_step, emrid: int | None, scheduleid: int | None, *args, **kwargs):
            from app.middleware.request_id import get_request_id
            request_id = get_request_id() or str(uuid.uuid4())[:8]
            start_time = time.perf_counter()
            success = False
            failure_reason = None

            # Extract metadata from payload
            pet_id = None
            session_id = None
            reservation_id = scheduleid

            if isinstance(payload, dict):
                pet_id = (
                    payload.get("pet_id")
                    or payload.get("pet", {}).get("pet_id")
                    or payload.get("pet", {}).get("id")
                )
                if not pet_id:
                    p_ctx = payload.get("patient_context", {})
                    if isinstance(p_ctx, dict) and "patient_context" in p_ctx:
                        p_ctx = p_ctx["patient_context"]
                    if isinstance(p_ctx, dict):
                        pet_id = p_ctx.get("patient_profile", {}).get("pet_id")

                session_id = payload.get("session_id") or payload.get("chat_session_id")
                if not reservation_id:
                    reservation_id = (
                        payload.get("schedule_id")
                        or payload.get("schedule_result", {}).get("scheduleid")
                        or payload.get("schedule_slot", {}).get("scheduleid")
                    )

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
                        logger.warning("[monitor_agent] DB lookup failed: %s", db_exc)

            try:
                result = await func(payload, update_step, emrid, scheduleid, *args, **kwargs)
                success = True
                return result
            except Exception as e:
                failure_reason = str(e)
                raise
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
                logger.info("[AGENT_MONITOR] %s", json.dumps(log_data, ensure_ascii=False))
        return wrapper
    return decorator


# ── 에이전트 러너 ─────────────────────────────────────────────────────────────

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


# ── DB 저장 ───────────────────────────────────────────────────────────────────

async def save_result(
    agent_type: str,
    result: dict,
    emrid: int | None,
    scheduleid: int | None,
    user_id: int,
) -> None:
    """에이전트 실행 결과를 DB에 저장.

    - chart      → reportDB (ai_draft_json) + doctor_alarmDB
    - validation → validation_resultDB
    - triage     → triage_resultDB
    - followup   → 로그만 기록 (followupDB는 보호자 사진/메시지 전용)
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
                logger.info("[SaveResult] chart → reportDB emrid=%s", emrid)
            except Exception as e:
                await db.rollback()
                logger.error("[SaveResult] chart DB 저장 실패 emrid=%s: %s", emrid, e)

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
                logger.info("[SaveResult] validation → validation_resultDB emrid=%s", emrid)
            except Exception as e:
                await db.rollback()
                logger.error("[SaveResult] validation DB 저장 실패 emrid=%s: %s", emrid, e)

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
                logger.info("[SaveResult] triage → triage_resultDB emrid=%s", emrid)
            except Exception as e:
                await db.rollback()
                logger.error("[SaveResult] triage DB 저장 실패 emrid=%s: %s", emrid, e)

    # followup: followupDB는 보호자 사진/메시지 전용이므로 로그만 기록
    elif agent_type == "followup":
        emergency = result.get("emergency_alert", False)
        logger.info("[SaveResult] followup summary emrid=%s emergency=%s", emrid, emergency)
