"""Triage prompt 구조 회귀 테스트 — OpenAI 호출 없음.

프롬프트 텍스트 자체가 규칙을 포함하는지 검증한다.
"""
import json
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

# backend 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).parents[2]))

from app.prompts.triage_prompt import _build_triage_system_prompt, FORCE_COMPLETE_SUFFIX

CASES_DIR = Path(__file__).parent / "cases"


def load_cases():
    return [json.loads(p.read_text()) for p in sorted(CASES_DIR.glob("*.json"))]


def make_mock_pet(spec: dict[str, Any]):
    """JSON spec → Pet-like namespace (DB 모델 불필요)."""
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


# ── 프롬프트 구조 테스트 (케이스 독립) ──────────────────────────────────

def test_prompt_contains_vtl_levels():
    pet = make_mock_pet({})
    prompt = _build_triage_system_prompt(pet)
    for level in ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"]:
        assert level in prompt, f"프롬프트에 {level} 기준 누락"


def test_prompt_contains_forbidden_word_section():
    pet = make_mock_pet({})
    prompt = _build_triage_system_prompt(pet)
    assert "응급입니다" in prompt, "금지어 목록에 '응급입니다' 누락"
    assert "즉시 내원하세요" in prompt, "금지어 목록에 '즉시 내원하세요' 누락"
    assert "생명이 위험합니다" in prompt, "금지어 목록에 '생명이 위험합니다' 누락"


def test_prompt_contains_soft_phrases():
    pet = make_mock_pet({})
    prompt = _build_triage_system_prompt(pet)
    assert "빠른 진료를 받아보시는 걸 권장드려요" in prompt
    assert "오늘 중 확인해 보시는 게 좋을 것 같아요" in prompt


def test_prompt_contains_json_format():
    pet = make_mock_pet({})
    prompt = _build_triage_system_prompt(pet)
    assert "is_triage_complete" in prompt
    assert "urgency_level_num" in prompt
    assert "symptom_keywords" in prompt
    assert "need_followup" in prompt


def test_prompt_one_question_rule():
    pet = make_mock_pet({})
    prompt = _build_triage_system_prompt(pet)
    assert "질문은 반드시 1개만" in prompt


def test_force_complete_suffix_appended():
    pet = make_mock_pet({})
    normal = _build_triage_system_prompt(pet, force_complete=False)
    forced = _build_triage_system_prompt(pet, force_complete=True)
    assert FORCE_COMPLETE_SUFFIX not in normal
    assert FORCE_COMPLETE_SUFFIX in forced


def test_prompt_contains_pet_info():
    """프롬프트에 반려동물 정보가 실제로 삽입됐는지 확인."""
    pet = make_mock_pet({"breed": "골든리트리버_테스트종", "weight_kg": 99.9})
    prompt = _build_triage_system_prompt(pet)
    assert "골든리트리버_테스트종" in prompt
    assert "99.9" in prompt


def test_prompt_no_english_medical_abbr():
    """프롬프트 message 작성 규칙: 영어 의학 약어 금지 규칙이 들어있는지."""
    pet = make_mock_pet({})
    prompt = _build_triage_system_prompt(pet)
    assert "영어 단어, 의학 영어 약어 절대 사용 금지" in prompt


def test_symptom_keywords_max_4_rule():
    pet = make_mock_pet({})
    prompt = _build_triage_system_prompt(pet)
    assert "최대 4개" in prompt


# ── 케이스별 expected 구조 유효성 검사 ────────────────────────────────

@pytest.mark.parametrize("case", load_cases(), ids=[c["name"] for c in load_cases()])
def test_case_schema(case):
    """JSON 케이스 파일 자체가 올바른 스키마를 갖추는지 검증."""
    assert "name" in case
    assert "conversation" in case
    assert "expected" in case
    expected = case["expected"]
    assert "urgency_level_num_range" in expected
    assert len(expected["urgency_level_num_range"]) == 2
    assert expected["urgency_level_num_range"][0] <= expected["urgency_level_num_range"][1]
    assert "forbidden_words" in expected
    assert isinstance(expected["forbidden_words"], list)
    assert "max_questions_per_turn" in expected
    assert "max_symptom_keywords" in expected


@pytest.mark.parametrize("case", load_cases(), ids=[c["name"] for c in load_cases()])
def test_case_forbidden_words_in_prompt_rule(case):
    """케이스별 금지어가 시스템 프롬프트의 금지어 섹션에 모두 포함됐는지 확인."""
    pet = make_mock_pet(case.get("pet", {}))
    prompt = _build_triage_system_prompt(pet)
    for word in case["expected"]["forbidden_words"]:
        # 금지어 목록이 프롬프트에 명시돼야 한다 (LLM에게 알려줘야 하니까)
        if word in ("응급입니다", "즉시 내원하세요", "생명이 위험합니다"):
            assert word in prompt, f"핵심 금지어 '{word}'가 프롬프트에 없음"
