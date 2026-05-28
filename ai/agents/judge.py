"""Judge Agent — 독립 품질 심사 (LLM-as-a-Judge).

Triage Agent와 동일 인스턴스를 쓰면 self-bias가 발생하므로
완전히 독립된 호출로 평가합니다.

참고: Zheng et al. 2023 Point-wise Evaluation
"""
from __future__ import annotations

import json
import logging
from collections.abc import Callable

from .base import call_openai_once

logger = logging.getLogger(__name__)


def build_judge_prompt(
    triage_result: dict | None,
    chat_history: list[dict],
    chart_result: dict | None = None,
) -> str:
    history_text = "\n".join(
        f"[{'AI' if m.get('type') == 'bot' or m.get('role') == 'assistant' else '보호자'}] {m.get('text') or m.get('content', '')}"
        for m in chat_history
    )

    has_triage = bool(
        triage_result
        and triage_result.get("urgency_level")
        and triage_result.get("symptom_summary")
    )

    return f"""당신은 MediPaw 독립 품질 심사 AI(LLM-as-a-Judge)입니다.
다른 AI 에이전트(Triage Agent)가 생성한 결과물을 독립적으로 평가합니다.

[평가 원칙 - Zheng et al. 2023]
- Point-wise Evaluation: 단일 결과물을 절대 기준으로 평가
- 절대 자기 강화(Self-enhancement) 편향 없이 객관적으로 평가
- 수의학 전문 지식과 논문 기반 기준으로만 평가
- 모호한 경우 반드시 보수적(conservative)으로 판단 — 확신 없으면 낮게 평가

[!!중요 선결 조건!!]
트리아지 결과(collected_info)가 null이거나 urgency_level/symptom_summary 등 핵심 필드가 없는 경우:
- completeness: 0~2, accuracy: 0, consistency: 0
- judge_verdict: "REVIEW_NEEDED"
- critical_issues에 "트리아지 결과 없음 — collected_info 미반환" 명시

[평가 대상: 트리아지 결과]
{json.dumps(triage_result, ensure_ascii=False, indent=2)}

[평가 대상: 채팅 히스토리]
{history_text}

{f'[평가 대상: 차트 초안]{chr(10)}{json.dumps(chart_result.get("soap"), ensure_ascii=False, indent=2)}' if chart_result else ''}

{'[주의] 트리아지 결과가 null 또는 불완전합니다. 선결 조건에 따라 낮은 점수를 부여하세요.' if not has_triage else ''}

[평가 기준 - "Basic triage in dogs and cats" 논문 기반]
1) 완전성(0-10): collected_info에 다음 항목이 명시적으로 채워졌는가?
   - chief_complaint: 비어 있으면 -3점
   - symptom_onset: 비어 있으면 -2점
   - symptom_keywords: 2개 미만이면 -2점
   - symptom_summary: 비어 있으면 -3점
   - suspected_diseases: 비어 있으면 -1점
   채팅 히스토리에 언급된 것만으로는 점수를 올릴 수 없음

2) 정확성(0-10): Modified VTL 5단계 분류가 올바른가?
   - urgency_level/urgency_level_num이 없으면 0점
   - vtl_basis가 논문 기준과 일치하는지 검증

3) 일관성(0-10): 전체 흐름이 논리적으로 일관되는가?
   - 채팅 내용과 collected_info 결론이 모순 없는가?
   - 차트 내용(있는 경우)이 트리아지와 일치하는가?

[응답 형식 - JSON만 출력]
{{
  "judge_scores": {{
    "completeness": 8.5,
    "accuracy": 9.0,
    "consistency": 8.8
  }},
  "score_breakdown": {{
    "completeness_detail": [
      "chief_complaint: '실제값 또는 미기재' — 기재됨/미기재 (감점: -N점)",
      "symptom_onset: '실제값 또는 미기재' — 기재됨/미기재 (감점: -N점)",
      "symptom_keywords: ['실제값'] — N개, 2개 이상/미달 (감점: -N점)",
      "symptom_summary: '실제값 앞 30자...' — 기재됨/미기재 (감점: -N점)",
      "suspected_diseases: ['실제값'] — 기재됨/미기재 (감점: -N점)"
    ],
    "accuracy_detail": "urgency_level_num=N — vtl_basis 인용 — Level N 기준과 일치/불일치",
    "consistency_detail": "채팅 언급 증상 → collected_info 반영 여부 / 차트와 일치 여부"
  }},
  "judge_verdict": "PASS 또는 REVIEW_NEEDED",
  "critical_issues": [],
  "improvement_points": ["개선 권장 사항 (없으면 빈 배열)"],
  "judge_reasoning": "완전성/정확성/일관성 실제 값 인용 기반 종합 판정 이유"
}}

judge_verdict 기준:
- PASS: 세 점수 모두 8.0 이상 AND triageResult의 핵심 필드가 모두 채워짐
- REVIEW_NEEDED: 한 항목이라도 8.0 미만, triageResult가 null/불완전, 또는 critical_issues 존재"""


async def run_judge(
    payload: dict,
    update_step: Callable[[str], None],
    emrid: int | None,
    scheduleid: int | None,
) -> dict:
    """Judge Agent 실행."""
    triage_result = payload.get("triage_result")
    chat_history = payload.get("chat_history", [])
    chart_result = payload.get("chart_result")

    update_step("품질 심사 중...")
    system = build_judge_prompt(triage_result, chat_history, chart_result)
    result = await call_openai_once(
        "평가를 시작합니다.",
        system,
        model="gpt-4o-mini",
        max_tokens=1500,
    )

    update_step("심사 보고서 생성 중...")
    logger.info(
        f"[Judge] emrid={emrid} verdict={result.get('judge_verdict')} "
        f"scores={result.get('judge_scores')}"
    )

    return {"agent": "judge", "emrid": emrid, **result}
