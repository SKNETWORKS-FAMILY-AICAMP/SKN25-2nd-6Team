"""
    from data_pipeline import load_and_split
    X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL = load_and_split()
"""

import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report,
)

DATA_PATH = "../../data/Train_table_full.csv"
TARGET = "y_noshow"

def compute_patient_stats(history_df, target_col):
    """완료된 기간의 환자별 통계 집계"""
    stats = history_df.groupby("patient_id").agg(
        patient_appt_count=(target_col, "count"),
        patient_noshow_count=(target_col, "sum"),
    )
    stats["patient_noshow_rate"] = stats["patient_noshow_count"] / stats["patient_appt_count"]
    return stats

def apply_patient_features(target_df, stats, global_rate):
    """환자 통계를 대상 DataFrame에 매핑 (미등장 환자 = 전체 평균)"""
    target_df["patient_appt_count"] = target_df["patient_id"].map(stats["patient_appt_count"]).fillna(0).astype(int)
    target_df["patient_noshow_count"] = target_df["patient_id"].map(stats["patient_noshow_count"]).fillna(0).astype(int)
    target_df["patient_noshow_rate"] = target_df["patient_id"].map(stats["patient_noshow_rate"]).fillna(global_rate)
    target_df["is_first_visit"] = (target_df["patient_appt_count"] == 0).astype(int)
    return target_df

def evaluate(model, X, y, label=""):
    """분류 모델 평가 함수"""
    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]

    acc = accuracy_score(y, y_pred)
    prec = precision_score(y, y_pred)
    rec = recall_score(y, y_pred)
    f1 = f1_score(y, y_pred)
    auc = roc_auc_score(y, y_prob)

    print(f"\n{'='*50}")
    print(f"📊 {label} 성능")
    print(f"{'='*50}")
    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-Score  : {f1:.4f}")
    print(f"  ROC-AUC   : {auc:.4f}")
    print(f"\n{classification_report(y, y_pred, target_names=['방문(0)', '노쇼(1)'])}")

    return {"label": label, "accuracy": acc, "precision": prec,
            "recall": rec, "f1": f1, "auc": auc, "y_pred": y_pred}


# 메인 파이프라인
def load_and_split(data_path=DATA_PATH):
    """
    데이터 로딩 → 전처리 → 피처 엔지니어링 → 시간 기반 분할

    Returns:
        X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL
    """

    df = pd.read_csv(data_path)
    df = df.drop(columns=["scheduled_at"])

    # TARGET
    df["y_noshow"] = 1 - df["is_noshow"].astype(int)

    df["appt_date"] = pd.to_datetime(df["appt_date"])
    df["scheduled_date"] = pd.to_datetime(df["scheduled_date"])
    df["gender"] = (df["gender"] == "M").astype(int)
    df["scheduled_time"] = pd.to_datetime(df["scheduled_time"], format="%H:%M").dt.hour

    # features
    DROP_COLS = [
        "appt_id", "patient_id", "nhood_id",
        "scheduled_date", "appt_date", "scheduled_time",
        "nhood_name", "nhood_freq", "is_noshow",
        TARGET,
    ]
    FEATURES = [c for c in df.columns if c not in DROP_COLS]

    # 같은 날 동일 환자 예약 건수
    df["same_day_appts"] = df.groupby(["patient_id", "appt_date"])[TARGET].transform("count")

    # 시간 순 분할 (70:15:15)
    df = df.sort_values("appt_date").reset_index(drop=True)
    n = len(df)
    train_end = int(n * 0.70)
    valid_end = int(n * 0.85)

    train_df = df.iloc[:train_end].copy()
    valid_df = df.iloc[train_end:valid_end].copy()
    test_df = df.iloc[valid_end:].copy()

    # Feature engineering (누수 방지)
    # 지역 기반 피처
    nhood_noshow_rate = train_df.groupby("nhood_id")[TARGET].mean()
    global_noshow_rate = train_df[TARGET].mean()

    train_df["nhood_noshow_rate"] = train_df["nhood_id"].map(nhood_noshow_rate)
    valid_df["nhood_noshow_rate"] = valid_df["nhood_id"].map(nhood_noshow_rate).fillna(global_noshow_rate)
    test_df["nhood_noshow_rate"] = test_df["nhood_id"].map(nhood_noshow_rate).fillna(global_noshow_rate)

    # 환자 기반 피처
    # Train: 내부 시간순 누적 (shift로 현재 행 제외)
    train_df = train_df.sort_values("appt_date").reset_index(drop=True)
    train_df["patient_noshow_count"] = (
        train_df.groupby("patient_id")[TARGET]
        .transform(lambda s: s.shift(1).expanding().sum())
        .fillna(0)
        .astype(int)
    )
    train_df["patient_appt_count"] = train_df.groupby("patient_id").cumcount()
    train_df["patient_noshow_rate"] = np.where(
        train_df["patient_appt_count"] > 0,
        train_df["patient_noshow_count"] / train_df["patient_appt_count"],
        global_noshow_rate,
    )
    train_df["is_first_visit"] = (train_df["patient_appt_count"] == 0).astype(int)

    # Valid: Train 전체 집계 → 매핑
    train_stats = compute_patient_stats(train_df, TARGET)
    valid_df = apply_patient_features(valid_df, train_stats, global_noshow_rate)

    # Test: Train+Valid 전체 집계 → 매핑
    train_valid_stats = compute_patient_stats(
        pd.concat([train_df[["patient_id", TARGET]], valid_df[["patient_id", TARGET]]]),
        TARGET,
    )
    test_df = apply_patient_features(test_df, train_valid_stats, global_noshow_rate)

    # 최종 피처 리스트
    POST_SPLIT_FEATURES = [
        "nhood_noshow_rate",
        "patient_appt_count", "patient_noshow_count",
        "patient_noshow_rate", "is_first_visit",
        "same_day_appts",
    ]
    FEATURES_FINAL = FEATURES + POST_SPLIT_FEATURES

    X_train, y_train = train_df[FEATURES_FINAL], train_df[TARGET]
    X_valid, y_valid = valid_df[FEATURES_FINAL], valid_df[TARGET]
    X_test, y_test = test_df[FEATURES_FINAL], test_df[TARGET]

    return X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL
