"""Request ID 미들웨어 및 contextvars 기반 요청 추적.

핵심 설계:
  1. 모든 HTTP 요청에 8자리 hex request_id를 부여한다.
     - X-Request-ID 헤더가 이미 있으면 그 값을 사용 (프록시 연계).
     - 없으면 UUID4 앞 8자리를 자동 생성.
  2. _request_id ContextVar를 설정한다.
     - asyncio.create_task()는 생성 시점의 context를 복사하므로,
       background task 안에서도 동일한 request_id가 유지된다.
  3. 응답 헤더에 X-Request-ID를 추가한다.
  4. RequestIDLogFilter를 모든 logging Handler에 부착하면
     모든 로그 라인에 request_id가 자동으로 포함된다.

사용법:
    # main.py에서
    from app.middleware.request_id import RequestIDMiddleware, RequestIDLogFilter

    app.add_middleware(RequestIDMiddleware)  # 또는 lifespan 기반 등록

    # 어디서든 현재 request_id 조회:
    from app.middleware.request_id import get_request_id
    logger.info("[req=%s] 예약 생성 완료", get_request_id())
"""
from __future__ import annotations

import logging
import uuid
from contextvars import ContextVar
from typing import Callable

from starlette.types import ASGIApp, Receive, Scope, Send

# 프로세스 내 모든 코루틴에서 공유되는 ContextVar.
# asyncio.create_task() 호출 시 자동으로 현재 context가 복사되므로
# background task 안에서도 요청 시점의 request_id가 유지된다.
_request_id: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """현재 실행 컨텍스트의 request_id를 반환한다. 설정되지 않은 경우 빈 문자열."""
    return _request_id.get("")


class RequestIDMiddleware:
    """Pure ASGI 미들웨어 — BaseHTTPMiddleware보다 오버헤드가 낮고 SSE와 호환된다.

    BaseHTTPMiddleware는 내부적으로 StreamingResponse를 버퍼링할 수 있어
    SSE(text/event-stream) 스트리밍이 지연될 수 있다.
    순수 ASGI 방식은 send() 콜백만 래핑하므로 스트리밍에 영향을 주지 않는다.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # X-Request-ID 헤더 추출 또는 신규 생성
        headers: dict[bytes, bytes] = {
            k.lower(): v for k, v in scope.get("headers", [])
        }
        req_id = (
            headers.get(b"x-request-id", b"").decode()
            or uuid.uuid4().hex[:8]
        )

        # ContextVar에 설정 — asyncio.create_task가 이 context를 복사함
        token = _request_id.set(req_id)

        async def _send_with_request_id(message: dict) -> None:
            """응답 헤더에 X-Request-ID를 추가한다."""
            if message["type"] == "http.response.start":
                # headers는 list[tuple[bytes, bytes]] 형태
                existing = list(message.get("headers", []))
                existing.append((b"x-request-id", req_id.encode()))
                message = {**message, "headers": existing}
            await send(message)

        try:
            await self.app(scope, receive, _send_with_request_id)
        finally:
            _request_id.reset(token)


class RequestIDLogFilter(logging.Filter):
    """모든 로그 레코드에 request_id 필드를 주입하는 logging.Filter.

    logging.config.dictConfig의 filters에 등록하고,
    formatter format 문자열에 %(request_id)s를 포함하면
    별도 코드 수정 없이 모든 로그에 request_id가 찍힌다.

    설정 예:
        "filters": {
            "request_id": {
                "()": "app.middleware.request_id.RequestIDLogFilter"
            }
        },
        "formatters": {
            "default": {
                "format": "%(asctime)s [%(levelname)s] [req=%(request_id)s] %(name)s: %(message)s"
            }
        }
    background task의 경우 request_id가 빈 문자열이면 "-"로 표시한다.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True
