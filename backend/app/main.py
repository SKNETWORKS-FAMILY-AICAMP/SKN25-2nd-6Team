import logging
import logging.config
import logging.handlers  # RotatingFileHandler
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

# ── 로그 디렉터리 초기화 ───────────────────────────────────────────
_LOG_DIR = Path(__file__).parents[2] / "logs"
_LOG_DIR.mkdir(exist_ok=True)

# logging 설정은 미들웨어 임포트보다 먼저 완료해야
# RequestIDLogFilter가 올바르게 등록될 수 있다.
logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        # 모든 핸들러에 부착 → 모든 로그에 request_id 필드 자동 주입
        "request_id": {
            "()": "app.middleware.request_id.RequestIDLogFilter",
        }
    },
    "formatters": {
        "default": {
            "format": "%(asctime)s [%(levelname)s] [req=%(request_id)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "filters": ["request_id"],
        },
        "app": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOG_DIR / "app.log"),
            "maxBytes": 10_000_000,
            "backupCount": 3,
            "formatter": "default",
            "filters": ["request_id"],
        },
        "triage": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOG_DIR / "triage.log"),
            "maxBytes": 5_000_000,
            "backupCount": 2,
            "formatter": "default",
            "filters": ["request_id"],
        },
        "validation": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOG_DIR / "validation.log"),
            "maxBytes": 5_000_000,
            "backupCount": 2,
            "formatter": "default",
            "filters": ["request_id"],
        },
        "followup": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOG_DIR / "followup.log"),
            "maxBytes": 5_000_000,
            "backupCount": 2,
            "formatter": "default",
            "filters": ["request_id"],
        },
        "audit": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOG_DIR / "audit.log"),
            "maxBytes": 5_000_000,
            "backupCount": 5,
            "formatter": "default",
            "filters": ["request_id"],
        },
    },
    "loggers": {
        "app.api.chat":         {"handlers": ["triage", "app"],    "propagate": False, "level": "INFO"},
        "app.api.followup":     {"handlers": ["followup", "app"],  "propagate": False, "level": "INFO"},
        "app.api.schedules":    {"handlers": ["app"],              "propagate": False, "level": "INFO"},
        "ai.agents.validation": {"handlers": ["validation", "app"],"propagate": False, "level": "INFO"},
        "ai.agents.followup":   {"handlers": ["followup", "app"],  "propagate": False, "level": "INFO"},
        "medipaw.audit":        {"handlers": ["audit"],            "propagate": False, "level": "INFO"},
    },
    "root": {
        "handlers": ["console", "app"],
        "level": os.environ.get("LOG_LEVEL", "INFO"),
    },
})

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.doctor_auth import router as doctor_auth_router
from app.api.pets import router as pets_router
from app.api.schedules import router as schedules_router
from app.api.chat import router as chat_router
from app.api.dashboard import router as dashboard_router
from app.api.patient import router as patient_router
from app.api.doctor_reservation import router as doctor_reservation_router
from app.api.followup import router as followup_router
from app.api.emr import router as emr_router
from app.api.alarm import router as alarm_router
from app.core.config import settings
from app.middleware.request_id import RequestIDMiddleware, get_request_id
from ai.router import router as agent_router

_log = logging.getLogger(__name__)


# ── lifespan (startup / shutdown) ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 훅.

    startup: 현재는 별도 초기화 불필요 (DB 커넥션 풀은 첫 요청 시 지연 생성).
    shutdown: TASK_REGISTRY에 등록된 모든 background task를 정상 취소하여
              진행 중인 AI 에이전트 작업이 orphan으로 남지 않도록 한다.
    """
    _log.info("[Startup] MediPaw API 서버 시작")
    yield
    # Graceful shutdown: 실행 중인 background task 취소 (최대 10초 대기)
    from ai.tasks import cancel_all_tasks
    await cancel_all_tasks(timeout=10.0)
    _log.info("[Shutdown] MediPaw API 서버 종료")


# ── FastAPI 앱 인스턴스 ────────────────────────────────────────────
app = FastAPI(title="MediPaw API", lifespan=lifespan)


# ── 예외 핸들러 ────────────────────────────────────────────────────
# 중요: 예외 핸들러는 add_middleware() 전에 등록해야 한다.
# FastAPI의 ExceptionMiddleware가 이 핸들러들을 사용하고,
# ExceptionMiddleware는 CORSMiddleware 안쪽에 위치하므로
# 핸들러가 반환하는 JSONResponse에 CORSMiddleware가 CORS 헤더를 추가할 수 있다.
# → 500 에러에도 CORS 헤더가 포함됨.

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.status_code,
            "message": exc.detail,
            "request_id": get_request_id(),
        },
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_handler(request: Request, exc: ValidationError) -> JSONResponse:
    _log.warning(
        "[ValidationError] %s %s errors=%d",
        request.method, request.url.path, len(exc.errors()),
    )
    return JSONResponse(
        status_code=422,
        content={
            "code": 422,
            "message": "요청 데이터 형식이 올바르지 않습니다.",
            "request_id": get_request_id(),
            # DEBUG 모드일 때만 상세 오류를 클라이언트에 노출
            **({"detail": exc.errors()} if settings.DEBUG else {}),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """모든 처리되지 않은 예외를 잡아 500으로 반환한다.

    이 핸들러가 없으면 ServerErrorMiddleware가 예외를 처리하는데,
    그 경우 응답이 CORSMiddleware를 통과하지 않아 CORS 헤더가 빠진다.
    이 핸들러를 등록하면 ExceptionMiddleware가 먼저 잡아 JSONResponse를 반환하고,
    해당 응답이 CORSMiddleware를 통과하므로 CORS 헤더가 항상 포함된다.
    """
    _log.exception(
        "[UnhandledException] %s %s req_id=%s",
        request.method, request.url.path, get_request_id(),
    )
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "request_id": get_request_id(),
        },
    )


# ── 미들웨어 등록 ──────────────────────────────────────────────────
# 등록 순서: add_middleware는 LIFO로 래핑된다.
# 바깥 → 안쪽 순서 (처리 순서):
#   RequestIDMiddleware (가장 먼저 request_id 설정)
#   → CORSMiddleware (CORS 헤더 추가)
#   → ExceptionMiddleware (FastAPI 내부)
#   → Router

_allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

# CORSMiddleware를 먼저 add_middleware (나중에 래핑되므로 안쪽에 위치)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RequestIDMiddleware를 나중에 add_middleware (가장 바깥에 위치 → 가장 먼저 실행)
app.add_middleware(RequestIDMiddleware)


# ── 라우터 등록 ────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(doctor_auth_router)
app.include_router(pets_router)
app.include_router(schedules_router)
app.include_router(chat_router)
app.include_router(dashboard_router)
app.include_router(patient_router)
app.include_router(doctor_reservation_router)
app.include_router(followup_router)
app.include_router(emr_router)
app.include_router(alarm_router)
app.include_router(agent_router)
