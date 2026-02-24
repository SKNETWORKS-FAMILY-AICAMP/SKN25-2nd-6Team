import re
import joblib
import pandas as pd
from datetime import datetime
from pathlib import Path

import streamlit as st

MODEL_FEATURES = [
    "sms_received", "lead_time_days", "gender", "age", "has_hypertension",
    "has_diabetes", "has_alcoholism", "has_handicap", "scholarship",
    "dow", "month", "is_weekend", "is_holiday", "is_before_holiday", "is_after_holiday",
    "max_temp", "min_temp", "precip_mm", "weather", "temp_range", "is_rainy",
    "nhood_noshow_rate", "patient_appt_count", "patient_noshow_count",
    "patient_noshow_rate", "is_first_visit", "same_day_appts",
]

# 차트에 표시할 사람이 읽기 쉬운 feature 이름
FEATURE_LABELS = {
    "sms_received":        "SMS Received",
    "lead_time_days":      "Lead Time (days)",
    "gender":              "Gender",
    "age":                 "Age",
    "has_hypertension":    "Hypertension",
    "has_diabetes":        "Diabetes",
    "has_alcoholism":      "Alcoholism",
    "has_handicap":        "Handicap",
    "scholarship":         "Scholarship",
    "dow":                 "Day of Week",
    "month":               "Month",
    "is_weekend":          "Weekend",
    "is_holiday":          "Holiday",
    "is_before_holiday":   "Pre-Holiday",
    "is_after_holiday":    "Post-Holiday",
    "max_temp":            "Max Temp (°C)",
    "min_temp":            "Min Temp (°C)",
    "precip_mm":           "Precipitation (mm)",
    "weather":             "Weather Condition",
    "temp_range":          "Temp Range (°C)",
    "is_rainy":            "Rainy Day",
    "nhood_noshow_rate":   "Neighbourhood No-show Rate",
    "patient_appt_count":  "Past Appointments",
    "patient_noshow_count":"Past No-shows",
    "patient_noshow_rate": "Personal No-show Rate",
    "is_first_visit":      "First Visit",
    "same_day_appts":      "Same-day Appointments",
}

DEFAULT_WEATHER = {
    "max_temp": 28.0, "min_temp": 22.0, "precip_mm": 0.0,
    "weather": 0, "temp_range": 6.0, "is_rainy": 0,
}


def _int(v, default=0) -> int:
    """NaN-safe int cast."""
    try:
        return int(v) if v == v else default  # v != v  ↔  NaN
    except (TypeError, ValueError):
        return default


@st.cache_resource
def load_model():
    model_path = (
        Path(__file__).parent.parent.parent
        / "results" / "final_model" / "catboost_model.joblib"
    )
    return joblib.load(model_path)


def prepare_features(
    patient_row: dict,
    weather_detail: dict | None = None,
) -> pd.DataFrame:
    """단일 환자 dict → 모델 입력 DataFrame."""
    wd = weather_detail or DEFAULT_WEATHER
    now = datetime.now()

    features = {
        "sms_received":       _int(patient_row.get("sms_received"), 0),
        "lead_time_days":     _int(patient_row.get("lead_time_days"), 0),
        "gender":             1 if patient_row.get("gender") == "M" else 0,
        "age":                _int(patient_row.get("age"), 30),
        "has_hypertension":   _int(patient_row.get("has_hypertension"), 0),
        "has_diabetes":       _int(patient_row.get("has_diabetes"), 0),
        "has_alcoholism":     _int(patient_row.get("has_alcoholism"), 0),
        "has_handicap":       _int(patient_row.get("has_handicap"), 0),
        "scholarship":        _int(patient_row.get("scholarship"), 0),
        "dow":                now.weekday(),
        "month":              now.month,
        "is_weekend":         1 if now.weekday() >= 5 else 0,
        "is_holiday":         0,
        "is_before_holiday":  0,
        "is_after_holiday":   0,
        "max_temp":           wd["max_temp"],
        "min_temp":           wd["min_temp"],
        "precip_mm":          wd["precip_mm"],
        "weather":            wd["weather"],
        "temp_range":         wd["temp_range"],
        "is_rainy":           wd["is_rainy"],
        "nhood_noshow_rate":  0.2,
        "patient_appt_count": 0,
        "patient_noshow_count": 0,
        "patient_noshow_rate": 0.2,
        "is_first_visit":     1,
        "same_day_appts":     1,
    }
    return pd.DataFrame([features])[MODEL_FEATURES]


# Emergency prediction

# BERT 체크포인트 경로 (emergency_train.py)
_CKPT_PATH = Path(__file__).resolve().parents[3] / "checkpoints" / "best.pt"
_BERT_MODEL_NAME = "bert-base-uncased"
_TOKEN_MAX_LEN = 64

# 응급 키워드 패턴
# 기준: KTAS ≤ 3 (Resuscitation / Emergency / Urgent)
# 학습 데이터(emergency_preprocessor.py)에서 KTAS_expert <= 3 = emergency_label=1

_EMERGENCY_PATTERNS = re.compile(
    # ── KTAS 1-2: 즉각 처치 필요 ──────────────────────────────────────────────
    r"chest\s*pain|chest\s*discomfort|heart\s*attack|cardiac\s*arrest|"
    r"stroke|cerebrovascular|"
    r"can'?t\s*breathe|shortness\s+of\s+breath|breathing\s*difficult|dyspnea|"
    r"unconscious|unresponsive|loss\s+of\s+consciousness|"
    r"severe\s+bleeding|heavy\s+bleeding|coughing\s+blood|vomit(?:ing)?\s*blood|hematemes|"
    r"seizure|convuls|"
    r"anaphyla|severe\s+allergic|"
    r"paralys|sudden\s+weakness|sudden\s+numbness|motor\s+weakness|"
    r"sudden\s+vision\s+loss|sudden\s+speech|facial\s+droop|"
    r"overdose|poisoning|"
    r"major\s+trauma|head\s+injur|severe\s+burn|"
    r"choking|drowning|electric\s+shock|"

    # ── KTAS 3: Urgent - 30분 내 처치 ─────────────────────────────────────────
    r"fever|febrile|high\s+temperature|"           # 발열 (단독도 KTAS 3)
    r"chill|rigors|shiver|"                         # 오한
    r"throat\s+pain|sore\s+throat|pharyngitis|tonsil|"  # 인후통
    r"palpitation|rapid\s+heart|tachycardia|"       # 심계항진
    r"syncope|faint(?:ing|ed|ness)|collapse|"       # 실신
    r"severe\s+(?:abdominal|stomach|belly)\s+pain|"
    r"acute\s+(?:abdominal|stomach)|abdominal\s+pain|abd\s*pain|"
    r"epigastric\s+pain|RUQ\s+pain|LLQ\s+pain|RLQ\s+pain|"
    r"persistent\s+vomit|vomiting|nausea\s+and\s+vomit|"
    r"severe\s+headache|sudden\s+headache|worst\s+headache|migraine|"
    r"dizziness|vertigo|"                           # 어지러움
    r"hematochezia|melena|blood\s+in\s+stool|rectal\s+bleed|"  # 혈변
    r"hematuria|blood\s+in\s+urine|"               # 혈뇨
    r"open\s+wound|laceration|deep\s+cut|"          # 개방 외상
    r"fracture|broken\s+bone|dislocat|"             # 골절
    r"severe\s+back\s+pain|low\s+back\s+pain|flank\s+pain|"
    r"difficulty\s+swallowing|dysphagia|"           # 연하곤란
    r"rash\s+with\s+fever|skin\s+rash\s+fever|"    # 발진+발열
    r"severe\s+pain|acute\s+pain|extreme\s+pain|"  # 중등도 이상 통증

    # ── 한국어 ─────────────────────────────────────────────────────────────────
    r"고열|발열|열이|오한|인후통|목\s*아파|인후|"
    r"흉통|호흡\s*곤란|심정지|뇌졸중|경련|발작|"
    r"심계항진|두근|실신|어지|현기증|"
    r"복통|구토|구역질|두통|"
    r"혈변|혈뇨|과다출혈|의식\s*불명|骨折",
    re.IGNORECASE,
)


def _keyword_emergency(symptoms: str) -> int:
    """키워드 기반 응급 판별"""
    return 1 if _EMERGENCY_PATTERNS.search(symptoms) else 0

@st.cache_resource(show_spinner=False)
def _load_bert_emergency():
    """BERT 응급 모델 + 토크나이저를 캐시 로드. 없으면 None 반환."""
    if not _CKPT_PATH.exists():
        return None, None
    try:
        import sys, torch
        src_path = Path(__file__).resolve().parents[3] / "src"
        if str(src_path) not in sys.path:
            sys.path.insert(0, str(src_path))
        from models.bert_with_tabular import BertWithTabular
        from transformers import AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(_BERT_MODEL_NAME)
        model = BertWithTabular(
            model_name=_BERT_MODEL_NAME, tab_dim=2, num_labels=2
        )
        state = torch.load(_CKPT_PATH, map_location="cpu")
        model.load_state_dict(state)
        model.eval()
        return model, tokenizer
    except Exception:
        return None, None


def predict_emergency(symptoms: str, age: int, gender: str) -> int:
    """
    증상 텍스트 + 나이/성별 → emergency 0 or 1 예측

    - BERT 체크포인트(checkpoints/best.pt)가 존재하면 BertWithTabular 추론을 시도함
    - 없으면 키워드 기반 fallback
    """
    model, tokenizer = _load_bert_emergency()

    if model is None or tokenizer is None:
        # fallback: keyword heuristic
        return _keyword_emergency(symptoms)

    try:
        import torch

        # tabular features: age_norm (0~1), sex (F=0, M=1)
        age_norm = min(max(age / 100.0, 0.0), 1.0)
        sex = 1.0 if gender == "M" else 0.0

        enc = tokenizer(
            symptoms,
            padding="max_length",
            truncation=True,
            max_length=_TOKEN_MAX_LEN,
            return_tensors="pt",
        )
        tab = torch.tensor([[age_norm, sex]], dtype=torch.float)

        with torch.no_grad():
            _, logits = model(
                enc["input_ids"], enc["attention_mask"], tab
            )
        pred = int(torch.argmax(logits, dim=1).item())
        return pred

    except Exception:
        return _keyword_emergency(symptoms)

# SHAP
def compute_shap_values(
    model,
    X: pd.DataFrame,
    top_n: int = 8,
) -> tuple[list[str], list[float]]:
    """
    단일 환자 DataFrame X에 대해 CatBoost 내장 SHAP 값을 계산한다

    Returns
    -------
    labels  : 상위 top n feature의 사람이 읽기 쉽게 feature 이름 처리
    values  : 해당 SHAP 기여값 (+: 노쇼 위험 증가, -: 감소)

    CatBoost는 별도 shap 패키지 없이
    model.get_feature_importance(Pool(X), type='ShapValues') 를 지원한다.
    반환 형태: (n_samples, n_features + 1), 마지막 열은 기댓값(bias).
    """
    try:
        from catboost import Pool

        pool = Pool(X)
        shap_raw = model.get_feature_importance(pool, type="ShapValues")
        # binary: shape (1, n_features + 1)
        contributions = shap_raw[0, :-1]          # 마지막 bias 열 제거
        feature_names = list(X.columns)

        # 절댓값 내림차순으로 top_n feature 선택
        ranked = sorted(
            zip(feature_names, contributions),
            key=lambda t: abs(t[1]),
            reverse=True,
        )[:top_n]

        # 화면 표시는 중요도 오름차순으로 재정렬
        ranked = ranked[::-1]
        labels = [FEATURE_LABELS.get(f, f) for f, _ in ranked]
        values = [float(v) for _, v in ranked]
        return labels, values

    except Exception:
        return [], []