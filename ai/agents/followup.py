"""Followup Monitoring Agent — 예약 확정 후 경과 모니터링.

발작·반복 구토 등 need_followup=true 케이스에만 활성화됩니다.
보호자가 텍스트·사진으로 경과를 보고하면 누적 요약을 수의사에게 전달합니다.
"""
from __future__ import annotations

import logging
from collections.abc import Callable

from .base import call_openai

logger = logging.getLogger(__name__)


def build_followup_prompt(
    pet: dict,
    triage_info: dict,
    appointment_slot: dict | None = None,
    accumulated_summary: str | None = None,
    patient_context: dict | None = None,
) -> str:
    appt_date = (appointment_slot or {}).get("date") or "예약일"

    return f"""당신은 MediPaw 경과 모니터링 AI입니다.
예약 확정 후 보호자가 전송하는 경과 보고(텍스트·사진)를 분석하여 응답하고,
수의사에게 전달할 누적 요약을 업데이트합니다.

[반려동물 정보]
이름: {pet.get('name')} / 품종: {pet.get('breed', '알 수 없음')} / 나이: {pet.get('age', '?')}세 / 체중: {pet.get('weight', '?')}kg

[초기 문진 요약]
주증상: {triage_info.get('chief_complaint', '')}
응급도: {triage_info.get('urgency_level')} (Level {triage_info.get('urgency_level_num')})
증상 키워드: {', '.join(triage_info.get('symptom_keywords') or [])}
의심 질환: {', '.join(triage_info.get('suspected_diseases') or [])}
모니터링 이유: {triage_info.get('followup_reason', '')}

[예약 정보]
예약일: {appt_date}

[과거 병력 컨텍스트]
{__import__('json').dumps(patient_context, ensure_ascii=False) if patient_context else '초진 (과거 기록 없음)'}

[누적 경과 요약 — 이전 대화에서 추출된 임상 메모]
{accumulated_summary or '아직 경과 보고 없음 — 이번이 첫 보고입니다.'}
※ medical_summary 갱신 시 위 누적 요약에 새 내용을 추가·통합하여 반환하세요. 이미 기재된 내용은 반복하지 마세요.

[역할]
1. 보호자의 경과 보고를 공감적으로 수신하고 간단히 응답한다 (guardian_message)
2. 새 증상·악화 징후가 감지되면 내원이 필요한지 부드럽게 판단한다 (followup_recommended)
3. 상황에 맞는 후속 행동을 추천한다 (recommended_actions: "call_hospital", "keep_schedule", "fast_booking" 중 선택)
4. 임상적으로 의미 있는 내용만 medical_summary에 누적 요약한다

[medical_summary 작성 기준 — 수의사용 임상 메모]
포함 O: 증상 변화(발작 빈도·지속시간, 구토·설사 횟수, 출혈), 새 신체 징후, 식욕·수분·배변 변화, 투약 반응, 사진 시각 소견
포함 X: 보호자 감정 표현, 일상 호소, 의학 무관 맥락, 이전 요약 반복

[보호자 guardian_message 금지 사항]
- 질환명 진단, 증상 원인 추정, 예후 평가, 경중 판단 금지
- 강한 어조("응급입니다", "위험합니다", "즉시 내원하세요", "생명 위협") 절대 사용 금지.
- 완화된 표현 허용: "빠른 확인이 필요해 보여요", "증상이 심해질 수 있으니 병원에 문의해보시는 걸 권장드려요"

[응답 형식 - JSON만 출력]
일반 경과 보고:
{{
  "guardian_message": "보호자 응답 (공감적, 1~2문장, 진단·권유 금지)",
  "followup_recommended": false,
  "recommended_actions": ["keep_schedule"],
  "medical_summary": "지금까지 보고된 임상 경과 누적 요약 (수의사용, 시간순)"
}}

내원/전화 문의 필요 시 (악화 징후 감지):
{{
  "guardian_message": "증상이 조금 걱정되네요. 병원에 전화로 먼저 문의해보시는 걸 권장해 드려요.",
  "followup_recommended": true,
  "recommended_actions": ["call_hospital"],
  "medical_summary": "상태 변화 감지 — [임상 경과 요약]. 병원 문의 권장됨."
}}"""


async def run_followup(
    payload: dict,
    update_step: Callable[[str], None],
    emrid: int | None,
    scheduleid: int | None,
) -> dict:
    """Followup Agent 실행."""
    pet = payload.get("pet", {})
    triage_info = payload.get("triage_info") or payload.get("triage_result") or {}
    appointment_slot = payload.get("appointment_slot")
    accumulated_summary = payload.get("accumulated_summary")
    patient_context = payload.get("patient_context")
    messages = payload.get("messages", [])

    update_step("경과 보고 분석 중...")
    system = build_followup_prompt(pet, triage_info, appointment_slot, accumulated_summary, patient_context)

    # 롤링 6턴 윈도우 — 오래된 대화는 누적 요약으로 대체
    MAX_TURNS = 6
    trimmed = messages[-MAX_TURNS:] if len(messages) > MAX_TURNS else messages

    result = await call_openai(trimmed, system, model="gpt-4o-mini", max_tokens=800)

    if not result.get("medical_summary") and result.get("followup_summary"):
        result["medical_summary"] = result["followup_summary"]

    update_step("경과 요약 업데이트 중...")
    logger.info(
        f"[Followup] emrid={emrid} followup_recommended={result.get('followup_recommended', False)}"
    )

    return {"agent": "followup", "emrid": emrid, **result}
