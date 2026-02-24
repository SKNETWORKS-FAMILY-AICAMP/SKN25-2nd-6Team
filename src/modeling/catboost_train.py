import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib as mpl
import joblib
import shap
from catboost import CatBoostClassifier, Pool
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, ConfusionMatrixDisplay,
)

from data_pipeline import load_and_split, evaluate, step_log
import time

"""
CatBoost no-show prediction model training pipeline
- Uses shared data pipeline (data_pipeline.py)
- CatBoost training + Threshold tuning
"""

# Korean font settings (macOS)
mpl.rcParams["font.family"] = "AppleGothic"
mpl.rcParams["axes.unicode_minus"] = False

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "img", "catboost")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def train(X_train, y_train, X_valid, y_valid):
    """Train a CatBoost model and return it."""
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
    """Evaluate on Train / Validation / Test + Confusion Matrix."""
    train_r = evaluate(model, X_train, y_train, "Train")
    valid_r = evaluate(model, X_valid, y_valid, "Validation")
    test_r  = evaluate(model, X_test,  y_test,  "Test")

    # save metrics text
    with open(os.path.join(OUTPUT_DIR, "catboost_metrics.txt"), "w", encoding="utf-8") as f:
        f.write("CatBoost 모델 평가 결과\n")
        f.write("=" * 60 + "\n\n")
        for r in [train_r, valid_r, test_r]:
            f.write(r["text"] + "\n\n")

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
    fig.savefig(os.path.join(OUTPUT_DIR, "catboost_confusion_matrix.png"), dpi=150, bbox_inches="tight")
    plt.show()

    return train_r, valid_r, test_r

# Threshold tuning
def tune_threshold(model, X_valid, y_valid, X_test, y_test):
    """Search for the optimal threshold (max F1 on Validation) → compare on Test."""
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
    fig.savefig(os.path.join(OUTPUT_DIR, "catboost_threshold_tuning.png"), dpi=150, bbox_inches="tight")
    plt.show()

    # ── Test: default vs optimal comparison ──
    y_test_prob = model.predict_proba(X_test)[:, 1]
    y_test_opt = (y_test_prob >= best_th).astype(int)
    y_test_def = model.predict(X_test)

    for name, func in [("Accuracy", accuracy_score), ("Precision", precision_score),
                        ("Recall", recall_score), ("F1-Score", f1_score)]:
        v_def = func(y_test, y_test_def)
        v_opt = func(y_test, y_test_opt)
        print(f"{name:<12} {v_def:>10.4f} {v_opt:>10.4f} {v_opt - v_def:>+10.4f}")
    auc_val = roc_auc_score(y_test, y_test_prob)

    # save Threshold comparison results text (임시)
    with open(os.path.join(OUTPUT_DIR, "catboost_threshold_comparison.txt"), "w", encoding="utf-8") as f:
        f.write(f"CatBoost Threshold 비교 결과\n")
        f.write(f"{'='*55}\n")
        f.write(f"최적 Threshold = {best_th:.2f}\n")
        f.write(f"F1={best_row['f1']:.4f}  Precision={best_row['precision']:.4f}  Recall={best_row['recall']:.4f}\n\n")
        f.write(f"Test 성능 비교: 기본(0.50) vs 최적({best_th:.2f})\n")
        f.write(f"{'='*55}\n")
        f.write(f"{'지표':<12} {'기본(0.50)':>10} {'최적':>10} {'변화':>10}\n")
        f.write(f"{'-'*55}\n")
        for name, func in [("Accuracy", accuracy_score), ("Precision", precision_score),
                            ("Recall", recall_score), ("F1-Score", f1_score)]:
            v_def = func(y_test, y_test_def)
            v_opt = func(y_test, y_test_opt)
            f.write(f"{name:<12} {v_def:>10.4f} {v_opt:>10.4f} {v_opt - v_def:>+10.4f}\n")
        f.write(f"{'ROC-AUC':<12} {auc_val:>10.4f} {auc_val:>10.4f} {'(확률기반)':>10}\n")

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
    fig.savefig(os.path.join(OUTPUT_DIR, "catboost_threshold_comparison.png"), dpi=150, bbox_inches="tight")
    plt.show()

    return best_th

def run_shap(model, X_test, features):
    # CatBoost native SHAP: (n_samples, n_features + 1), last col = bias
    raw = model.get_feature_importance(data=Pool(X_test), type="ShapValues")
    shap_values = raw[:, :-1]
    expected_value = float(raw[0, -1])
    mean_abs_shap = np.abs(shap_values).mean(axis=0)

    # 4-1. Feature Importance (Bar)
    plt.figure(figsize=(12, 10))
    shap.summary_plot(shap_values, X_test, plot_type="bar", show=False, max_display=len(features))
    plt.title("SHAP Feature Importance (CatBoost)", fontsize=16, pad=15)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "catboost_shap_importance.png"), dpi=150, bbox_inches="tight")
    plt.show()

    # 4-2. Beeswarm
    plt.figure(figsize=(12, 10))
    shap.summary_plot(shap_values, X_test, show=False, max_display=len(features))
    plt.title("SHAP Beeswarm Plot (CatBoost)", fontsize=16, pad=15)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "catboost_shap_beeswarm.png"), dpi=150, bbox_inches="tight")
    plt.show()

    # 4-3. Dependence (Top 6)
    top6_idx = np.argsort(mean_abs_shap)[::-1][:6]
    top6_feat = [features[i] for i in top6_idx]

    fig, axes = plt.subplots(2, 3, figsize=(20, 12))
    for ax, feat in zip(axes.flatten(), top6_feat):
        shap.dependence_plot(feat, shap_values, X_test, ax=ax, show=False)
        ax.set_title(feat, fontsize=13, fontweight="bold")
    plt.suptitle("SHAP Dependence Plot - Top 6 Features", fontsize=16, y=1.02)
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, "catboost_shap_dependence.png"), dpi=150, bbox_inches="tight")
    plt.show()

    # 4-4. Force Plot (highest no-show / visit cases)
    shap.initjs()
    y_prob = model.predict_proba(X_test)[:, 1]
    noshow_idx = int(np.argmax(y_prob))
    visit_idx  = int(np.argmin(y_prob))

    for idx, title, fname in [(noshow_idx, "Highest No-show Probability", "noshow"), (visit_idx, "Highest Visit Probability", "visit")]:
        shap.force_plot(expected_value, shap_values[idx],
                        X_test.iloc[idx], matplotlib=True, show=False)
        plt.gcf().set_size_inches(18, 4)
        plt.title(f"Force Plot: {title} Case", fontsize=14, pad=40)
        plt.tight_layout()
        plt.savefig(os.path.join(OUTPUT_DIR, f"catboost_shap_force_{fname}.png"), dpi=150, bbox_inches="tight")
        plt.show()

    # 4-5. Interaction (Top 3)
    try:
        explainer = shap.TreeExplainer(model)
        shap_interaction = explainer.shap_interaction_values(X_test)
        top3_feat = [features[i] for i in np.argsort(mean_abs_shap)[::-1][:3]]
        pairs = [
            (top3_feat[0], top3_feat[1]),
            (top3_feat[0], top3_feat[2]),
            (top3_feat[1], top3_feat[2]),
        ]

        fig, axes = plt.subplots(1, 3, figsize=(21, 6))
        for ax, (f1, f2) in zip(axes, pairs):
            i1, i2 = features.index(f1), features.index(f2)
            ax.scatter(X_test[f1], shap_interaction[:, i1, i2],
                       c=X_test[f2], cmap="coolwarm", alpha=0.3, s=5)
            ax.set_xlabel(f1, fontsize=11)
            ax.set_ylabel(f"SHAP interaction\n({f1} x {f2})", fontsize=10)
            ax.set_title(f"{f1} × {f2}", fontsize=12, fontweight="bold")
            cbar = plt.colorbar(ax.collections[0], ax=ax)
            cbar.set_label(f2, fontsize=9)
        plt.suptitle("SHAP Interaction Plot - Top 3 Feature Pairs", fontsize=16, y=1.03)
        plt.tight_layout()
        fig.savefig(os.path.join(OUTPUT_DIR, "catboost_shap_interaction.png"), dpi=150, bbox_inches="tight")
        plt.show()
    except Exception as e:
        print(f"⚠️  Interaction plot skipped: {e}")

    return shap_values, mean_abs_shap

if __name__ == "__main__":
    TOTAL = 5
    t0 = time.time()

    step_log(1, TOTAL, "Loading & splitting data...")
    X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL = load_and_split()

    step_log(2, TOTAL, "Training CatBoost...")
    model = train(X_train, y_train, X_valid, y_valid)

    step_log(3, TOTAL, "Evaluating model...")
    evaluate_all(model, X_train, y_train, X_valid, y_valid, X_test, y_test)

    step_log(4, TOTAL, "Threshold tuning...")
    best_th = tune_threshold(model, X_valid, y_valid, X_test, y_test)

    step_log(5, TOTAL, "SHAP analysis...")
    shap_values, mean_abs_shap = run_shap(model, X_test, FEATURES_FINAL)

    # Save model
    MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "results", "final_model")
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "catboost_model.joblib")
    joblib.dump(model, model_path)
    print(f"\n💾 Model saved: results/final_model/catboost_model.joblib")

    elapsed = time.time() - t0
    print(f"\n{'='*50}")
    print(f"🏁 CatBoost pipeline complete ({elapsed:.1f}s)")
    print(f"   Best threshold: {best_th:.2f}")
    print(f"{'='*50}")
