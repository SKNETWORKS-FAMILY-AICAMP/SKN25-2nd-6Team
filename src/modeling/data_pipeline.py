import pandas as pd
import numpy as np
import sys
import time
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report,
)

"""
    from data_pipeline import load_and_split
    X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL = load_and_split()
"""

DATA_PATH = "../../data/Train_table_full.csv"
TARGET = "y_noshow"

# ── Progress bar utility ──
def progress_bar(current, total, prefix="", bar_len=40):
    """Print a single-line progress bar to stdout."""
    frac = current / total
    filled = int(bar_len * frac)
    bar = "█" * filled + "░" * (bar_len - filled)
    sys.stdout.write(f"\r  {prefix} |{bar}| {current}/{total} ({frac*100:.0f}%)")
    sys.stdout.flush()
    if current == total:
        print()

def step_log(step, total, msg):
    """Print a step header with step counter."""
    print(f"\n[{step}/{total}] ▶ {msg}")

def compute_patient_stats(history_df, target_col):
    """Compute per-patient statistics from historical data."""
    stats = history_df.groupby("patient_id").agg(
        patient_appt_count=(target_col, "count"),
        patient_noshow_count=(target_col, "sum"),
    )
    stats["patient_noshow_rate"] = stats["patient_noshow_count"] / stats["patient_appt_count"]
    return stats

def apply_patient_features(target_df, stats, global_rate):
    """Map patient statistics to target DataFrame (first-visit patients → global mean)."""
    target_df["patient_appt_count"] = target_df["patient_id"].map(stats["patient_appt_count"]).fillna(0).astype(int)
    target_df["patient_noshow_count"] = target_df["patient_id"].map(stats["patient_noshow_count"]).fillna(0).astype(int)
    target_df["patient_noshow_rate"] = target_df["patient_id"].map(stats["patient_noshow_rate"]).fillna(global_rate)
    target_df["is_first_visit"] = (target_df["patient_appt_count"] == 0).astype(int)
    return target_df

def evaluate(model, X, y, label=""):
    """Evaluate a classification model and return metrics with printable text."""
    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]

    acc = accuracy_score(y, y_pred)
    prec = precision_score(y, y_pred)
    rec = recall_score(y, y_pred)
    f1 = f1_score(y, y_pred)
    auc = roc_auc_score(y, y_prob)

    report = classification_report(y, y_pred, target_names=['Visit(0)', 'No-Show(1)'])
    lines = [
        f"{'='*50}",
        f"📊 {label} performance",
        f"{'='*50}",
        f"  Accuracy  : {acc:.4f}",
        f"  Precision : {prec:.4f}",
        f"  Recall    : {rec:.4f}",
        f"  F1-Score  : {f1:.4f}",
        f"  ROC-AUC   : {auc:.4f}",
        "",
        report,
    ]
    text = "\n".join(lines)
    print(text)

    return {"label": label, "accuracy": acc, "precision": prec,
            "recall": rec, "f1": f1, "auc": auc, "y_pred": y_pred, "text": text}


# main pipeline function
def load_and_split(data_path=DATA_PATH):
    """
    Load data → preprocess → feature engineering → time-based split.

    Returns:
        X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL
    """
    TOTAL = 5
    t0 = time.time()

    step_log(1, TOTAL, "Loading data...")
    df = pd.read_csv(data_path)
    df = df.drop(columns=["scheduled_at"])
    print(f"    ✓ shape: {df.shape}")

    step_log(2, TOTAL, "Preprocessing (type conversion)...")

    # TARGET
    df["y_noshow"] = 1 - df["is_noshow"].astype(int)
    df["appt_date"] = pd.to_datetime(df["appt_date"])
    df["scheduled_date"] = pd.to_datetime(df["scheduled_date"])
    df["gender"] = (df["gender"] == "M").astype(int)
    df["scheduled_time"] = pd.to_datetime(df["scheduled_time"], format="%H:%M").dt.hour

    # features
    step_log(3, TOTAL, "Feature selection...")
    DROP_COLS = [
        "appt_id", "patient_id", "nhood_id",
        "scheduled_date", "appt_date", "scheduled_time",
        "nhood_name", "nhood_freq", "is_noshow",
        TARGET,
    ]
    FEATURES = [c for c in df.columns if c not in DROP_COLS]

    # Same-day appointment count per patient
    df["same_day_appts"] = df.groupby(["patient_id", "appt_date"])[TARGET].transform("count")

    # Time-based split (70:15:15)
    step_log(4, TOTAL, "Time-based split (70:15:15)...")
    df = df.sort_values("appt_date").reset_index(drop=True)
    n = len(df)
    train_end = int(n * 0.70)
    valid_end = int(n * 0.85)

    train_df = df.iloc[:train_end].copy()
    valid_df = df.iloc[train_end:valid_end].copy()
    test_df = df.iloc[valid_end:].copy()

    # Feature engineering (leakage prevention)
    step_log(5, TOTAL, "Feature engineering (leakage-safe)...")
    # Neighbourhood-based feature
    nhood_noshow_rate = train_df.groupby("nhood_id")[TARGET].mean()
    global_noshow_rate = train_df[TARGET].mean()

    train_df["nhood_noshow_rate"] = train_df["nhood_id"].map(nhood_noshow_rate)
    valid_df["nhood_noshow_rate"] = valid_df["nhood_id"].map(nhood_noshow_rate).fillna(global_noshow_rate)
    test_df["nhood_noshow_rate"] = test_df["nhood_id"].map(nhood_noshow_rate).fillna(global_noshow_rate)

    # Patient-based features
    # Train: cumulative stats in chronological order (shift to exclude current row)
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

    # Valid: map aggregated stats from Train
    train_stats = compute_patient_stats(train_df, TARGET)
    valid_df = apply_patient_features(valid_df, train_stats, global_noshow_rate)

    # Test: map aggregated stats from Train+Valid
    train_valid_stats = compute_patient_stats(
        pd.concat([train_df[["patient_id", TARGET]], valid_df[["patient_id", TARGET]]]),
        TARGET,
    )
    test_df = apply_patient_features(test_df, train_valid_stats, global_noshow_rate)

    # Final feature list
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

    elapsed = time.time() - t0
    print(f"Data pipeline complete ({elapsed:.1f}s)")
    print(f"Train: {len(X_train):,} | Valid: {len(X_valid):,} | Test: {len(X_test):,}")
    print(f"Features: {len(FEATURES_FINAL)}")

    return X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL
