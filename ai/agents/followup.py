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

[누적 경과 요약 — 이전 대화에서 추출된 임상 메모]
{accumulated_summary or '아직 경과 보고 없음 — 이번이 첫 보고입니다.'}
※ medical_summary 갱신 시 위 누적 요약에 새 내용을 추가·통합하여 반환하세요. 이미 기재된 내용은 반복하지 마세요.

[역할]
1. 보호자의 경과 보고를 공감적으로 수신하고 간단히 응답한다
2. 새 증상·악화 징후가 감지되면 즉각 내원이 필요한지 판단한다
3. 임상적으로 의미 있는 내용만 medical_summary에 누적 요약한다

[medical_summary 작성 기준 — 수의사용 임상 메모]
포함 O: 증상 변화(발작 빈도·지속시간, 구토·설사 횟수, 출혈), 새 신체 징후, 식욕·수분·배변 변화, 투약 반응, 사진 시각 소견
포함 X: 보호자 감정 표현, 일상 호소, 의학 무관 맥락, 이전 요약 반복

[보호자 message 금지 사항]
- 질환명 진단, 증상 원인 추정, 내원 권유(emergency_alert=true 제외), 예후 평가, 경중 판단 금지
- 허용: 공감 표현, 경과 수신 확인, 추가 관찰 요청

[응답 형식 - JSON만 출력]
일반 경과 보고:
{{
  "message": "보호자 응답 (공감적, 1~2문장, 진단·권유 금지)",
  "emergency_alert": false,
  "medical_summary": "지금까지 보고된 임상 경과 누적 요약 (수의사용, 시간순)"
}}

즉각 위험 징후 감지 시 (의식 상실·호흡 정지·심한 출혈·지속 발작 5분 이상):
{{
  "message": "지금 바로 가까운 동물응급센터로 이동해 주세요.",
  "emergency_alert": true,
  "medical_summary": "응급 상황 발생 — [임상 경과 요약]. 보호자 즉각 내원 안내됨."
}}"""


async def run_followup(
    payload: dict,
    update_step: Callable[[str], None],
    emrid: int | None,
    scheduleid: int | None,
) -> dict:
    """Followup Agent 실행."""
    pet = payload.get("pet", {})
    triage_info = payload.get("triage_info", {})
    appointment_slot = payload.get("appointment_slot")
    accumulated_summary = payload.get("accumulated_summary")
    messages = payload.get("messages", [])

    update_step("경과 보고 분석 중...")
    system = build_followup_prompt(pet, triage_info, appointment_slot, accumulated_summary)

    # 롤링 6턴 윈도우 — 오래된 대화는 누적 요약으로 대체
    MAX_TURNS = 6
    trimmed = messages[-MAX_TURNS:] if len(messages) > MAX_TURNS else messages

    result = await call_openai(trimmed, system, model="gpt-4o-mini", max_tokens=800)

    if not result.get("medical_summary") and result.get("followup_summary"):
        result["medical_summary"] = result["followup_summary"]

    update_step("경과 요약 업데이트 중...")
    logger.info(
        f"[Followup] emrid={emrid} emergency_alert={result.get('emergency_alert', False)}"
    )

    return {"agent": "followup", "emrid": emrid, **result}
