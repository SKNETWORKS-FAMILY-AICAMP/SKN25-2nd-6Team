"""
CatBoost 노쇼 예측 모델 학습 파이프라인
- 공통 데이터 파이프라인 사용 (data_pipeline.py)
- CatBoost 학습 + Threshold 튜닝
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib as mpl
from catboost import CatBoostClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, ConfusionMatrixDisplay,
)

from data_pipeline import load_and_split, evaluate

# ── 한글 폰트 설정 (macOS) ──
mpl.rcParams["font.family"] = "AppleGothic"
mpl.rcParams["axes.unicode_minus"] = False

def train(X_train, y_train, X_valid, y_valid):
    """CatBoost 모델 학습 후 모델 반환"""
    model = CatBoostClassifier(
        iterations=1000,
        learning_rate=0.05,
        depth=6,
        auto_class_weights="Balanced",
        random_state=42,
        verbose=100,
        early_stopping_rounds=30,
    )
    model.fit(X_train, y_train, eval_set=[(X_valid, y_valid)])
    return model

def evaluate_all(model, X_train, y_train, X_valid, y_valid, X_test, y_test):
    """Train / Validation / Test 평가 + Confusion Matrix"""
    train_r = evaluate(model, X_train, y_train, "Train")
    valid_r = evaluate(model, X_valid, y_valid, "Validation")
    test_r  = evaluate(model, X_test,  y_test,  "Test")

    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    for ax, (X, y, title) in zip(axes, [
        (X_train, y_train, "Train"),
        (X_valid, y_valid, "Validation"),
        (X_test,  y_test,  "Test"),
    ]):
        ConfusionMatrixDisplay.from_predictions(
            y, model.predict(X), display_labels=["방문", "노쇼"],
            cmap="Oranges", ax=ax,
        )
        ax.set_title(f"{title} Confusion Matrix", fontsize=13)
    plt.tight_layout()
    plt.show()

    return train_r, valid_r, test_r

# Threshold 튜닝
def tune_threshold(model, X_valid, y_valid, X_test, y_test):
    """Validation F1 기준 최적 Threshold 탐색 → Test 비교"""
    y_valid_prob = model.predict_proba(X_valid)[:, 1]

    records = []
    for th in np.arange(0.10, 0.70, 0.01):
        yp = (y_valid_prob >= th).astype(int)
        records.append({
            "threshold": th,
            "f1": f1_score(y_valid, yp),
            "precision": precision_score(y_valid, yp, zero_division=0),
            "recall": recall_score(y_valid, yp),
        })

    res_df = pd.DataFrame(records)
    best_row = res_df.loc[res_df["f1"].idxmax()]
    best_th = best_row["threshold"]

    print(f"\n🎯 CatBoost 최적 Threshold = {best_th:.2f}")
    print(f"   F1={best_row['f1']:.4f}  Precision={best_row['precision']:.4f}  Recall={best_row['recall']:.4f}")

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(res_df["threshold"], res_df["f1"], label="F1-Score", linewidth=2)
    ax.plot(res_df["threshold"], res_df["precision"], label="Precision", linestyle="--")
    ax.plot(res_df["threshold"], res_df["recall"], label="Recall", linestyle="--")
    ax.axvline(best_th, color="red", linestyle=":", linewidth=1.5, label=f"Best = {best_th:.2f}")
    ax.axvline(0.50, color="gray", linestyle=":", linewidth=1, alpha=0.5, label="Default = 0.50")
    ax.set_xlabel("Threshold")
    ax.set_ylabel("Score")
    ax.set_title("CatBoost Threshold 튜닝 (Validation)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()

    # ── Test: 기본 vs 최적 비교 ──
    y_test_prob = model.predict_proba(X_test)[:, 1]
    y_test_opt = (y_test_prob >= best_th).astype(int)
    y_test_def = model.predict(X_test)

    print(f"\n📊 CatBoost Test 성능: 기본(0.50) vs 최적({best_th:.2f})")
    print(f"{'='*55}")
    print(f"{'지표':<12} {'기본(0.50)':>10} {'최적':>10} {'변화':>10}")
    print(f"{'-'*55}")
    for name, func in [("Accuracy", accuracy_score), ("Precision", precision_score),
                        ("Recall", recall_score), ("F1-Score", f1_score)]:
        v_def = func(y_test, y_test_def)
        v_opt = func(y_test, y_test_opt)
        print(f"{name:<12} {v_def:>10.4f} {v_opt:>10.4f} {v_opt - v_def:>+10.4f}")
    auc_val = roc_auc_score(y_test, y_test_prob)
    print(f"{'ROC-AUC':<12} {auc_val:>10.4f} {auc_val:>10.4f} {'(확률기반)':>10}")

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    for ax, (yp, title) in zip(axes, [
        (y_test_def, "기본 Threshold (0.50)"),
        (y_test_opt, f"최적 Threshold ({best_th:.2f})"),
    ]):
        ConfusionMatrixDisplay.from_predictions(
            y_test, yp, display_labels=["방문", "노쇼"],
            cmap="Oranges", ax=ax,
        )
        ax.set_title(title, fontsize=13)
    plt.suptitle("CatBoost Test Set: Threshold 비교", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.show()

    return best_th

if __name__ == "__main__":
    X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL = load_and_split()

    model = train(X_train, y_train, X_valid, y_valid)
    evaluate_all(model, X_train, y_train, X_valid, y_valid, X_test, y_test)
    best_th = tune_threshold(model, X_valid, y_valid, X_test, y_test)
