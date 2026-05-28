"""공용 OpenAI 비동기 호출 함수 — 모든 에이전트가 공유합니다."""
from __future__ import annotations

import json
import logging

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# 지연 초기화 — import 시점에 settings 로드를 피함
_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        from app.core.config import settings
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def call_openai(
    messages: list[dict],
    system: str,
    model: str = "gpt-4o-mini",
    max_tokens: int = 1200,
    json_mode: bool = True,
    temperature: float = 0.3,
) -> dict | str:
    """OpenAI Chat Completions 비동기 호출. json_mode=True면 JSON 파싱 결과 반환."""
    response = await _get_client().chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, *messages],
        response_format={"type": "json_object"} if json_mode else None,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    text = response.choices[0].message.content or ""
    if json_mode:
        # ```json ... ``` 래핑 제거 후 파싱
        clean = text.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        return json.loads(clean)
    return text


async def call_openai_once(
    user_prompt: str,
    system: str,
    model: str = "gpt-4o-mini",
    max_tokens: int = 1200,
    json_mode: bool = True,
) -> dict | str:
    return await call_openai(
        [{"role": "user", "content": user_prompt}],
        system,
        model=model,
        max_tokens=max_tokens,
        json_mode=json_mode,
    )
