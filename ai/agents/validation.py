"""Validation Agent — 트리아지/예약 정합성 Cross Validation.

LLM-as-Judge (Zheng et al. 2023) Point-wise Evaluation 기반으로
문진 요약, 응급도 분류, 예약 정보의 일관성을 검증합니다.
"""
from __future__ import annotations

import logging
from collections.abc import Callable

from .base import call_openai_once

logger = logging.getLogger(__name__)


def build_validation_prompt(pet: dict, triage_result: dict, schedule_result: dict, patient_context: dict | None = None) -> str:
    preds = triage_result.get("photo_predictions") or []
    skin_preds = [p["prediction"] for p in preds if p.get("model_type") != "eye" and p.get("prediction")]
    eye_preds = [p["prediction"] for p in preds if p.get("model_type") == "eye" and p.get("prediction")]
    cnn_parts = []
    if skin_preds:
        cnn_parts.append(f"피부[{'/'.join(skin_preds)}]")
    if eye_preds:
        cnn_parts.append(f"안구[{'/'.join(eye_preds)}]")
    cnn_section = ", ".join(cnn_parts) if cnn_parts else "분석 이력 없음"
    if patient_context and patient_context.get("patient_context", {}).get("emr_history"):
        history_section = (
            f"[과거 임상 컨텍스트]\n" + __import__("json").dumps(
                patient_context, ensure_ascii=False, indent=2
            )
        )
    else:
        history_section = "[과거 진료 기록 없음 - 초진]"

    return f"""당신은 MediPaw Cross Validation Agent입니다.
문진 요약, 응급도 분류, 예약 정보, 그리고 과거 EMR 이력의 정합성을 검증합니다.

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

{history_section}

[검증 항목 - Cross Validation Agent Orchestration]
1) 정보 일관성 (EMR Alignment): 문진 증상과 과거 동일 질환 재발 여부, EMR 기록과의 논리적 일치 여부
2) 처방 안전성 (Prescription Safety): 최근 처방약 기반 중복 처방 가능성, 만성질환 연관성 및 위험도
3) 일정 충돌 (Scheduling Consistency): 응급도 Level에 맞는 예약 창 및 진료시간의 적절성
4) 누락 정보: 필수 수집 항목(증상/기간/강도) 완전성
5) 안전성: Red Flag 존재 시 즉각 조치 권고 여부

[LLM-as-a-Judge 평가 기준 (0-10 점)]
- completeness: 필수 문진 항목 모두 수집됐는가
- accuracy: 응급도가 증상과 논리적으로 일치하는가
- consistency: 기존의 포괄적인 일관성 점수
- emr_alignment_score: 과거 병력 및 재발 여부와 현재 문진 내용이 얼마나 부합하는가
- prescription_safety_score: 과거 처방 이력 고려 시 금기증이나 중복 처방 위험이 없는가
- scheduling_consistency_score: 환자의 과거 병력 복잡도를 고려했을 때 배정된 진료 시간이 적절한가

[응답 형식 - JSON만 출력]
{{
  "overall": "OK 또는 WARNING",
  "checks": [
    {{"item": "정보 일관성", "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}},
    {{"item": "일정 충돌",   "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}},
    {{"item": "누락 정보",   "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}},
    {{"item": "안전성",      "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}},
    {{"item": "처방 안전성", "status": "PASS 또는 WARN", "detail": "검증 상세 내용"}}
  ],
  "scores": {{
    "completeness": 8.5,
    "accuracy": 9.0,
    "consistency": 8.0,
    "emr_alignment_score": 9.0,
    "prescription_safety_score": 10.0,
    "scheduling_consistency_score": 8.5
  }},
  "emr_alignment_reason": "과거 병력 및 재발 여부와의 정합성에 대한 상세 판단 근거",
  "prescription_risk_reason": "과거 처방 약물과 중복되거나 만성질환으로 인한 약물 투여 위험에 대한 상세 판단 근거",
  "summary": "검증 결과 요약 1-2문장"
}}"""


def normalize_validation(raw: dict | None) -> dict | None:
    """프론트/백엔드 응답 포맷 차이를 흡수하는 정규화 함수."""
    if not raw:
        return raw
    scores_dict = raw.get("scores") or {}
    return {
        **raw,
        "overall": raw.get("overall") or raw.get("status") or "OK",
        "checks": raw.get("checks") or [
            {"item": w, "status": "WARN", "detail": w}
            for w in (raw.get("warnings") or [])
        ],
        "scores": {
            "completeness": scores_dict.get("completeness") or raw.get("scores", {}).get("completeness", 0),
            "accuracy": scores_dict.get("accuracy") or raw.get("scores", {}).get("accuracy", 0),
            "consistency": scores_dict.get("consistency") or raw.get("scores", {}).get("consistency", 0),
            "emr_alignment_score": scores_dict.get("emr_alignment_score") or raw.get("scores", {}).get("emr_alignment_score", 0),
            "prescription_safety_score": scores_dict.get("prescription_safety_score") or raw.get("scores", {}).get("prescription_safety_score", 0),
            "scheduling_consistency_score": scores_dict.get("scheduling_consistency_score") or raw.get("scores", {}).get("scheduling_consistency_score", 0),
        },
        "emr_alignment_reason": raw.get("emr_alignment_reason") or "",
        "prescription_risk_reason": raw.get("prescription_risk_reason") or "",
    }


async def run_validation(
    payload: dict,
    update_step: Callable[[str], None],
    emrid: int | None,
    scheduleid: int | None,
) -> dict:
    """Validation Agent 실행 — gpt-4o 사용."""
    pet = payload.get("pet", {})
    triage_result = payload.get("triage_result") or payload.get("triage_info") or {}
    schedule_result = payload.get("schedule_result") or payload.get("schedule_slot") or {}
    patient_context = payload.get("patient_context", {})

    update_step("일관성 검증 중...")
    system = build_validation_prompt(pet, triage_result, schedule_result, patient_context)
    raw = await call_openai_once("검증해주세요.", system, model="gpt-4o", max_tokens=1200)
    result = normalize_validation(raw) or {}

    if result.get("overall") == "WARNING":
        warn_items = [c for c in result.get("checks", []) if c.get("status") == "WARN"]
        logger.warning(f"[Validation] WARNING: {[c['item'] for c in warn_items]}")

    update_step("검증 보고서 생성 중...")
    logger.info(f"[Validation] emrid={emrid} overall={result.get('overall')}")

    return {"agent": "validation", "emrid": emrid, "scheduleid": scheduleid, **result}
