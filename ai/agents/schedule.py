"""Schedule Agent — 증상/체중/이력 기반 최적 진료시간 결정.

VTL Level을 slot_window 하한선으로 사용하며,
증상 복잡도·체중·재진 여부로 진료시간을 세밀하게 조정합니다.
"""
from __future__ import annotations

import json
import logging
from collections.abc import Callable

from .base import call_openai_once

logger = logging.getLogger(__name__)


def build_schedule_prompt(pet: dict, triage_result: dict, emr_history: list | None = None) -> str:
    is_initial = triage_result.get("is_initial_visit", True)
    has_history = bool(emr_history)
    species = "고양이" if pet.get("species") == "cat" else "개"

    history_section = (
        "재진 — 최근 2회 기록:\n" + json.dumps(emr_history[-2:], ensure_ascii=False, indent=2)
        if has_history else "초진 — 이전 기록 없음"
    )

    return f"""당신은 MediPaw 수의학 예약 관리 AI입니다.
트리아지 결과·반려동물 신체 조건·EMR 이력을 종합하여 임상적으로 최적의 진료 시간을 결정합니다.

[반려동물 정보]
이름: {pet.get('name')} / 종: {species} / 품종: {pet.get('breed', '알 수 없음')}
나이: {pet.get('age', '?')}세 / 체중: {pet.get('weight', '?')}kg / 성별: {pet.get('gender', '미상')}
진료 구분: {'초진 (기본 시간 +10min)' if is_initial else '재진'}

[트리아지 결과]
응급도: {triage_result.get('urgency_level')} (Level {triage_result.get('urgency_level_num')})
VTL 판단 근거: {triage_result.get('vtl_basis', '없음')}
Red Flags: {', '.join(triage_result.get('red_flags') or []) or '없음'}
주증상: {triage_result.get('chief_complaint', '')}
증상 키워드: {', '.join(triage_result.get('symptom_keywords') or [])}
증상 시작: {triage_result.get('symptom_onset', '알 수 없음')}
의심 질환: {', '.join(triage_result.get('suspected_diseases') or [])}
증상 요약: {triage_result.get('symptom_summary', '')}

[진료 이력]
{history_section}

[진료 시간 결정 지침]
VTL Level은 slot_window의 하한선(hard floor)이며 하향 금지.

1) VTL Level → slot_window 하한선
   Level 1 → "immediate"        (0분 이내)
   Level 2 → "emergency_today"  (당일)
   Level 3 → "urgent_24h"       (24~48h)
   Level 4 → "semi_urgent_48h"  (48~96h)
   Level 5 → "routine_72h"      (72h+)

   종별 강제 상향:
   - 고양이 + 배뇨불가/요도폐색 → "emergency_today" 강제
   - 고양이 + 개구호흡/역설호흡 → "immediate" 강제
   - 개 + GDV(위확장염전) 의심  → "immediate" 강제

2) 체중 기반 진료 시간 보정 ("Basic triage" 논문 기준)
   <5kg   : 채혈·IV 접근 어려움 → +5~10min
   5~30kg : 표준
   >30kg  : X-ray 포지셔닝·억제 → +5~10min

3) 증상 복잡도별 추가 시간
   복부 팽만·GDV·장중첩 의심 : +20min
   경련·발작 (신경계)          : +15min
   안구 이상 (각막궤양·포도막염): +15min
   다발성 외상 (교통사고·추락) : +20min
   요도폐색 (고양이)            : +15min
   중독·이물 섭취              : +10min
   혈변·혈구토 (반복)           : +10min
   피부 병변 (단순)             : +0~5min
   구토·설사 (경증, 1~2회)     : +5min
   정기 검진·예방접종           : 기본 시간

4) 재진 이력 반영
   동일 질환 재발/만성 관리 재진 → -5min
   새 증상으로 재진              → 초진 준하여 처리

5) 기본 시간 산출
   base = Level별 기본 [L1:40, L2:40, L3:30, L4:20, L5:20]
        + 초진 +10 + 체중 보정 + 증상 복잡도 - 재진 동일질환 -5

[응답 형식 - JSON만 출력]
{{
  "thinking": "체중·증상·이력 기반 임상 판단 근거 (내부용)",
  "estimated_duration_min": 40,
  "is_initial_visit": true,
  "slot_window": "urgent_24h",
  "priority_reason": "판단 근거 한 문장",
  "complexity_factors": ["추가 시간 적용 항목 목록"],
  "pre_visit_instructions": ["보호자 내원 전 준비 사항 (없으면 빈 배열)"]
}}"""


async def run_schedule(
    payload: dict,
    update_step: Callable[[str], None],
    emrid: int | None,
    scheduleid: int | None,
) -> dict:
    """Schedule Agent 실행."""
    pet = payload.get("pet", {})
    triage_result = payload.get("triage_result", {})
    emr_history = payload.get("emr_history")

    # fallback: LLM 실패 시 응급도 기반 기본값
    urgency_num = triage_result.get("urgency_level_num", 3)
    is_initial = triage_result.get("is_initial_visit", True)
    duration_map = {1: 40, 2: 40, 3: 30, 4: 20, 5: 20}
    window_map = {
        1: "immediate", 2: "emergency_today", 3: "urgent_24h",
        4: "semi_urgent_48h", 5: "routine_72h",
    }
    fallback = {
        "estimated_duration_min": duration_map.get(urgency_num, 30) + (10 if is_initial else 0),
        "is_initial_visit": is_initial,
        "slot_window": window_map.get(urgency_num, "urgent_24h"),
        "priority_reason": f"VTL Level {urgency_num} fallback",
        "complexity_factors": [],
        "pre_visit_instructions": [],
    }

    update_step("진료 시간 계산 중...")
    try:
        system = build_schedule_prompt(pet, triage_result, emr_history)
        result = await call_openai_once("최적 진료 일정을 결정해주세요.", system, max_tokens=800)
        if result.get("slot_window") and result.get("estimated_duration_min"):
            schedule_res = result
        else:
            schedule_res = fallback
    except Exception as e:
        logger.warning(f"[Schedule] LLM 실패, fallback 사용: {e}")
        schedule_res = fallback

    update_step("예약 슬롯 확정 중...")
    logger.info(f"[Schedule] emrid={emrid} slot_window={schedule_res.get('slot_window')}")

    return {"agent": "schedule", "emrid": emrid, "scheduleid": scheduleid, **schedule_res}
