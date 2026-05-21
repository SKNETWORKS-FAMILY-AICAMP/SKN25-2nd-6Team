"""AI 에이전트 FastAPI 라우터.

엔드포인트:
  POST /api/agent/chat          → OpenAI API 프록시 (API 키 서버 보관)
  POST /api/agent/run           → BackgroundTasks 에이전트 실행, task_id 반환
  GET  /api/agent/sse/{task_id} → SSE 실시간 진행 스트리밍
  POST /api/agent/vision/skin   → 피부질환 CNN 분석
  POST /api/agent/vision/eye    → 안구질환 CNN 분석

backend 통합:
  1. 이 파일을 backend/app/api/agent.py 로 복사
  2. backend/app/main.py 에 아래 두 줄 추가:
       from app.api.agent import router as agent_router
       app.include_router(agent_router)
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid

import httpx
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/agent", tags=["AI 에이전트"])
logger = logging.getLogger(__name__)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

# 인메모리 태스크 상태 (멀티 워커 환경에서는 Redis로 교체)
_task_store: dict[str, dict] = {}


# ── OpenAI 프록시 ─────────────────────────────────────────────────
@router.post("/chat")
async def proxy_chat(body: dict):
    """OpenAI Chat Completions 프록시 — API 키를 클라이언트에 노출하지 않습니다."""
    from app.core.config import settings

    if not settings.OPENAI_API_KEY:
        raise HTTPException(500, "OpenAI API 키가 서버에 설정되지 않았습니다.")

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model":       body.get("model", "gpt-4o-mini"),
                "max_tokens":  body.get("max_tokens", 1000),
                "temperature": body.get("temperature", 0.3),
                "messages":    body.get("messages", []),
                **({"response_format": {"type": "json_object"}} if body.get("json_mode", True) else {}),
            },
        )

    if not res.is_success:
        raise HTTPException(res.status_code, f"OpenAI 오류: {res.text[:200]}")

    return res.json()


# ── BackgroundTasks 기반 에이전트 실행 ────────────────────────────
@router.post("/run")
async def run_agent(body: dict, background_tasks: BackgroundTasks):
    """에이전트를 BackgroundTasks로 비동기 실행합니다.

    agent_type: triage | schedule | chart | validation | judge | followup
    """
    from ai.schemas import AGENT_TYPES

    agent_type = body.get("agent_type", "")
    if agent_type not in AGENT_TYPES:
        raise HTTPException(400, f"알 수 없는 에이전트 타입: {agent_type}")

    task_id = str(uuid.uuid4())
    _task_store[task_id] = {"status": "queued", "step": ""}

    background_tasks.add_task(
        _execute_agent,
        task_id,
        agent_type,
        body.get("payload", {}),
        body.get("emrid"),
        body.get("scheduleid"),
        body.get("user_id"),
    )
    return {"task_id": task_id, "agent_type": agent_type}


async def _execute_agent(
    task_id: str,
    agent_type: str,
    payload: dict,
    emrid: int | None,
    scheduleid: int | None,
    user_id: int | None,
) -> None:
    from ai.tasks import RUNNERS, save_result

    _task_store[task_id] = {"status": "running", "step": "시작 중..."}

    def update_step(step: str) -> None:
        if task_id in _task_store:
            _task_store[task_id]["step"] = step

    try:
        runner = RUNNERS.get(agent_type)
        if not runner:
            raise ValueError(f"Runner 없음: {agent_type}")

        result = await runner(payload, update_step, emrid, scheduleid)

        if user_id:
            await save_result(agent_type, result, emrid, scheduleid, user_id)

        _task_store[task_id] = {"status": "done", "result": result}
        logger.info(f"[Task] {agent_type} 완료 task_id={task_id}")
    except Exception as exc:
        logger.error(f"[Task] {agent_type} 실패 task_id={task_id}: {exc}", exc_info=True)
        _task_store[task_id] = {"status": "error", "detail": str(exc)}


# ── SSE 실시간 스트리밍 ───────────────────────────────────────────
@router.get("/sse/{task_id}")
async def agent_sse(task_id: str):
    """SSE로 에이전트 실행 결과를 스트리밍합니다.

    이벤트 형식:
      data: {"status": "running", "step": "증상 키워드 추출 중..."}
      data: {"status": "done", "result": {...}}
      data: {"status": "error", "detail": "..."}
    """
    async def event_stream():
        yield f"data: {json.dumps({'status': 'connecting', 'task_id': task_id})}\n\n"

        for _ in range(120):  # 최대 2분
            task = _task_store.get(task_id)
            if task is None:
                yield f"data: {json.dumps({'status': 'error', 'detail': 'task not found'})}\n\n"
                return

            status = task["status"]
            if status in ("queued", "running"):
                yield f"data: {json.dumps({'status': status, 'step': task.get('step', '')})}\n\n"
            elif status == "done":
                yield f"data: {json.dumps({'status': 'done', 'result': task.get('result')})}\n\n"
                _task_store.pop(task_id, None)
                return
            elif status == "error":
                yield f"data: {json.dumps({'status': 'error', 'detail': task.get('detail', '')})}\n\n"
                _task_store.pop(task_id, None)
                return

            await asyncio.sleep(1)

        _task_store.pop(task_id, None)
        yield f"data: {json.dumps({'status': 'timeout'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Vision API 공용 업로드 헬퍼 ──────────────────────────────────
async def _save_upload(file: UploadFile) -> tuple[bytes, str]:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, "지원하지 않는 파일 형식입니다. JPEG, PNG, WEBP, GIF만 허용됩니다.")

    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(413, "파일 크기가 10MB를 초과합니다.")

    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    with open(os.path.join(upload_dir, filename), "wb") as f:
        f.write(contents)

    return contents, f"/uploads/{filename}"


# ── 피부질환 CNN 분석 ─────────────────────────────────────────────
@router.post("/vision/skin")
async def analyze_skin_image(file: UploadFile = File(...)):
    """이미지를 저장하고 피부질환 모델(6클래스)로 분석합니다.
    모델 실패 시에도 image_url은 항상 반환합니다.
    """
    try:
        contents, image_url = await _save_upload(file)
        try:
            from ai.services.vision_model import vision_service
            result = vision_service.analyze_skin(contents)
            if "error" not in result:
                return {
                    "prediction":     result["top_1"],
                    "top_class":      result.get("top_class"),
                    "top_confidence": result.get("top_confidence"),
                    "details":        result["details"],
                    "image_url":      image_url,
                    "model_scope":    ["allergy", "dermatitis", "fungal", "healthy", "mange", "ringworm"],
                }
        except Exception as model_err:
            logger.warning(f"[Vision/Skin] 모델 오류 (계속): {model_err}")

        return {"prediction": None, "top_class": None, "top_confidence": None, "details": [], "image_url": image_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── 안구질환 CNN 분석 ─────────────────────────────────────────────
@router.post("/vision/eye")
async def analyze_eye_image(file: UploadFile = File(...)):
    """이미지를 저장하고 안구질환 모델(11클래스, EfficientNet-B0)로 분석합니다.
    모델 실패 시에도 image_url은 항상 반환합니다.
    """
    try:
        contents, image_url = await _save_upload(file)
        try:
            from ai.services.vision_model import vision_service
            result = vision_service.analyze_eye(contents)
            if "error" not in result:
                return {
                    "prediction":     result["top_1"],
                    "top_class":      result.get("top_class"),
                    "top_confidence": result.get("top_confidence"),
                    "details":        result["details"],
                    "image_url":      image_url,
                    "model_scope":    ["결막염", "궤양성각막질환", "백내장", "비궤양성각막질환",
                                       "색소침착성각막염", "안검내반증", "안검염", "안검종양", "유루증", "핵경화", "정상"],
                }
        except Exception as model_err:
            logger.warning(f"[Vision/Eye] 모델 오류 (계속): {model_err}")

        return {"prediction": None, "top_class": None, "top_confidence": None, "details": [], "image_url": image_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
