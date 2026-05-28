"""Triage live regression — 실제 OpenAI 호출. pytest -m live 로만 실행.

사용법:
  cd backend
  OPENAI_API_KEY=sk-... pytest tests/triage_regression/test_triage_live.py -m live -v

주의: 케이스당 1회 OpenAI 호출 발생. 비용 최소화를 위해 gpt-4o-mini 강제.
"""
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

sys.path.insert(0, str(Path(__file__).parents[2]))

pytestmark = pytest.mark.live

CASES_DIR = Path(__file__).parent / "cases"


def load_cases():
    return [json.loads(p.read_text()) for p in sorted(CASES_DIR.glob("*.json"))]


def make_mock_pet(spec: dict[str, Any]):
    from datetime import date
    birth_year = date.today().year - spec.get("age", 3)
    return SimpleNamespace(
        petname="테스트",
        species=spec.get("species", "dog"),
        breed=spec.get("breed", "알 수 없음"),
        birth_date=date(birth_year, 1, 1),
        gender=spec.get("gender", "female"),
        weight_kg=spec.get("weight_kg", 5.0),
    )


@pytest.fixture(scope="session")
def openai_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("OPENAI_API_KEY 없음 — live 테스트 건너뜀")
    from openai import OpenAI
    return OpenAI(api_key=api_key)


def call_triage(client, pet, user_message: str) -> dict:
    from app.prompts.triage_prompt import _build_triage_system_prompt
    prompt = _build_triage_system_prompt(pet)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        max_tokens=800,
        temperature=0.2,
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


@pytest.mark.parametrize("case", load_cases(), ids=[c["name"] for c in load_cases()])
def test_triage_live(case, openai_client):
    pet = make_mock_pet(case.get("pet", {}))
    user_msg = case["conversation"][0]["content"]
    expected = case["expected"]

    result = call_triage(openai_client, pet, user_msg)

    message: str = result.get("message", "")
    collected = result.get("collected_info")
    suggestions: list = result.get("suggestions", [])

    # 1) 금지어 검사
    for word in expected["forbidden_words"]:
        assert word not in message, f"[{case['name']}] 금지어 '{word}' 가 message에 포함됨:\n{message}"

    # 2) 질문 개수 (물음표 기준 근사치)
    question_count = message.count("?") + message.count("？")
    assert question_count <= expected["max_questions_per_turn"], (
        f"[{case['name']}] 질문이 {question_count}개 — 최대 {expected['max_questions_per_turn']}개 제한"
    )

    # 3) suggestions 개수 (최대 3개)
    assert len(suggestions) <= 3, f"[{case['name']}] suggestions {len(suggestions)}개 — 최대 3개"

    # 4) 문진 완료 시 urgency + keywords 검사
    if collected and collected.get("is_triage_complete"):
        num = collected.get("urgency_level_num")
        lo, hi = expected["urgency_level_num_range"]
        assert lo <= num <= hi, (
            f"[{case['name']}] urgency_level_num={num}, 기대 범위 [{lo},{hi}]"
        )

        keywords = collected.get("symptom_keywords", [])
        assert len(keywords) <= expected["max_symptom_keywords"], (
            f"[{case['name']}] symptom_keywords {len(keywords)}개 — 최대 {expected['max_symptom_keywords']}개"
        )

    # 5) need_followup 기대값 (완료 케이스만)
    if collected and collected.get("is_triage_complete"):
        if "need_followup" in expected:
            assert collected.get("need_followup") == expected["need_followup"], (
                f"[{case['name']}] need_followup 불일치"
            )

    # 6) required_phrases (있으면)
    if "required_phrases_any" in expected:
        found = any(p in message for p in expected["required_phrases_any"])
        assert found, (
            f"[{case['name']}] 권장 완화 표현 없음. message:\n{message}"
        )
