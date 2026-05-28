"""AI 에이전트 Pydantic 스키마.

사용처: ai/router.py (FastAPI 엔드포인트 입출력)
backend 통합 시: backend/app/schemas/agent.py 로 복사 후
  from app.schemas.agent import AgentRunIn, AgentRunOut, ChatProxyIn
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ChatProxyIn(BaseModel):
    """POST /api/agent/chat — OpenAI API 프록시 요청 바디."""
    messages: list[dict]
    model: str = "gpt-4o-mini"
    max_tokens: int = 1000
    temperature: float = 0.3
    json_mode: bool = True


class AgentRunIn(BaseModel):
    """POST /api/agent/run — 에이전트 실행 요청 바디.

    agent_type:
      "triage"     → Triage Agent
      "schedule"   → Schedule Agent
      "chart"      → Chart Agent
      "validation" → Cross Validation Agent
      "judge"      → Judge Agent
      "followup"   → Followup Monitoring Agent

    payload 예시:
      triage:     {"pet": {...}, "messages": [...], "rules": {...}}
      schedule:   {"pet": {...}, "triage_result": {...}}
      chart:      {"pet": {...}, "triage_result": {...}, "chat_history": [...]}
      validation: {"pet": {...}, "triage_result": {...}, "schedule_result": {...}}
      judge:      {"triage_result": {...}, "chat_history": [...], "chart_result": {...}}
      followup:   {"pet": {...}, "triage_info": {...}, "messages": [...], "accumulated_summary": "..."}
    """
    agent_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    emrid: int | None = None
    scheduleid: int | None = None


class AgentRunOut(BaseModel):
    """POST /api/agent/run 응답."""
    task_id: str
    agent_type: str


AGENT_TYPES = {"triage", "schedule", "chart", "validation", "judge", "followup"}
