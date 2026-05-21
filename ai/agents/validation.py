"""Validation Agent — 트리아지/예약 정합성 Cross Validation.

LLM-as-Judge (Zheng et al. 2023) Point-wise Evaluation 기반으로
문진 요약, 응급도 분류, 예약 정보의 일관성을 검증합니다.
"""
from __future__ import annotations

import logging
from collections.abc import Callable

from .base import call_openai_once

logger = logging.getLogger(__name__)


def build_validation_prompt(pet: dict, triage_result: dict, schedule_result: dict) -> str:
    preds = triage_result.get("photo_predictions") or []
    skin_preds = [p["prediction"] for p in preds if p.get("model_type") != "eye" and p.get("prediction")]
    eye_preds = [p["prediction"] for p in preds if p.get("model_type") == "eye" and p.get("prediction")]
    cnn_parts = []
    if skin_preds:
        cnn_parts.append(f"피부[{'/'.join(skin_preds)}]")
    if eye_preds:
        cnn_parts.append(f"안구[{'/'.join(eye_preds)}]")
    cnn_section = " / ".join(cnn_parts) if cnn_parts else "없음"

    return f"""당신은 MediPaw Cross Validation Agent입니다.
문진 요약, 응급도 분류, 예약 정보의 정합성을 검증합니다.

[검증 대상]
반려동물: {pet.get('name')} ({pet.get('breed', '?')}, {pet.get('age', '?')}세)
응급도: {triage_result.get('urgency_level')} / Level {triage_result.get('urgency_level_num')}
VTL 근거: {triage_result.get('vtl_basis', '없음')}
주요 증상: {', '.join(triage_result.get('symptom_keywords') or [])}
의심 질환: {', '.join(triage_result.get('suspected_diseases') or [])}
Red Flags: {', '.join(triage_result.get('red_flags') or []) or '없음'}
AI CNN 모델 분석: {cnn_section}
예약 창: {schedule_result.get('slot_window', '미정')}
예상 진료시간: {schedule_result.get('estimated_duration_min', 0)}분
초진여부: {'초진' if schedule_result.get('is_initial_visit') else '재진'}

[검증 항목 - Cross Validation Agent Orchestration]
1) 정보 일관성: 문진 증상 ↔ 응급도 Level 논리적 일치 여부
2) 일정 충돌: 응급도 Level에 맞는 예약 창 적절성
3) 누락 정보: 필수 수집 항목(증상/기간/강도) 완전성
4) 안전성: Red Flag 존재 시 즉각 조치 권고 여부

[LLM-as-a-Judge 평가 기준 - Zheng et al. 2023 Point-wise Evaluation]
- completeness(완전성): 필수 문진 항목 모두 수집됐는가 (0-10)
- accuracy(정확성): 응급도가 증상과 논리적으로 일치하는가 (0-10)
- consistency(일관성): 예약 창이 응급도에 적절한가 (0-10)

[응답 형식 - JSON만 출력]
{{
  "overall": "OK 또는 WARNING",
  "checks": [
    {{"item": "정보 일관성", "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}},
    {{"item": "일정 충돌",   "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}},
    {{"item": "누락 정보",   "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}},
    {{"item": "안전성",      "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}}
  ],
  "scores": {{
    "completeness": 8.5,
    "accuracy": 9.0,
    "consistency": 8.0
  }},
  "summary": "검증 결과 요약 1-2문장"
}}"""


def normalize_validation(raw: dict | None) -> dict | None:
    """프론트/백엔드 응답 포맷 차이를 흡수하는 정규화 함수."""
    if not raw:
        return raw
    return {
        **raw,
        "overall": raw.get("overall") or raw.get("status") or "OK",
        "checks": raw.get("checks") or [
            {"item": w, "status": "WARN", "detail": w}
            for w in (raw.get("warnings") or [])
        ],
        "scores": raw.get("scores") or {
            "completeness": raw.get("completeness", 0),
            "accuracy": raw.get("accuracy", 0),
            "consistency": raw.get("consistency", 0),
        },
    }


async def run_validation(
    payload: dict,
    update_step: Callable[[str], None],
    emrid: int | None,
    scheduleid: int | None,
) -> dict:
    """Validation Agent 실행 — gpt-4o 사용."""
    pet = payload.get("pet", {})
    triage_result = payload.get("triage_result", {})
    schedule_result = payload.get("schedule_result", {})

    update_step("일관성 검증 중...")
    system = build_validation_prompt(pet, triage_result, schedule_result)
    raw = await call_openai_once("검증해주세요.", system, model="gpt-4o", max_tokens=1200)
    result = normalize_validation(raw) or {}

    if result.get("overall") == "WARNING":
        warn_items = [c for c in result.get("checks", []) if c.get("status") == "WARN"]
        logger.warning(f"[Validation] WARNING: {[c['item'] for c in warn_items]}")

    update_step("검증 보고서 생성 중...")
    logger.info(f"[Validation] emrid={emrid} overall={result.get('overall')}")

    return {"agent": "validation", "emrid": emrid, "scheduleid": scheduleid, **result}
