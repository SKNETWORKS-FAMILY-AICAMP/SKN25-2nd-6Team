import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib as mpl
import xgboost as xgb
import shap
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, ConfusionMatrixDisplay,
)

from data_pipeline import load_and_split, evaluate

mpl.rcParams["font.family"] = "AppleGothic"
mpl.rcParams["axes.unicode_minus"] = False

def train(X_train, y_train, X_valid, y_valid):
    """XGBoost 모델 학습 후 모델 반환"""
    neg, pos = (y_train == 0).sum(), (y_train == 1).sum()

    model = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=neg / pos,
        eval_metric="logloss",
        random_state=42,
        early_stopping_rounds=30,
        n_jobs=-1,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_valid, y_valid)],
        verbose=50,
    )
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
            cmap="Blues", ax=ax,
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

    print(f"\n🎯 최적 Threshold = {best_th:.2f}")
    print(f"   F1={best_row['f1']:.4f}  Precision={best_row['precision']:.4f}  Recall={best_row['recall']:.4f}")

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(res_df["threshold"], res_df["f1"], label="F1-Score", linewidth=2)
    ax.plot(res_df["threshold"], res_df["precision"], label="Precision", linestyle="--")
    ax.plot(res_df["threshold"], res_df["recall"], label="Recall", linestyle="--")
    ax.axvline(best_th, color="red", linestyle=":", linewidth=1.5, label=f"Best = {best_th:.2f}")
    ax.axvline(0.50, color="gray", linestyle=":", linewidth=1, alpha=0.5, label="Default = 0.50")
    ax.set_xlabel("Threshold")
    ax.set_ylabel("Score")
    ax.set_title("XGBoost Threshold 튜닝 (Validation)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()

    # Test 성능 비교
    y_test_prob = model.predict_proba(X_test)[:, 1]
    y_test_opt = (y_test_prob >= best_th).astype(int)
    y_test_def = model.predict(X_test)

    print(f"\n📊 Test 성능 비교: 기본(0.50) vs 최적({best_th:.2f})")
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
            cmap="Blues", ax=ax,
        )
        ax.set_title(title, fontsize=13)
    plt.suptitle("XGBoost Test Set: Threshold 비교", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.show()

    return best_th

def run_shap(model, X_test, features):
    """SHAP 분석 7종 실행"""
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test)
    mean_abs_shap = np.abs(shap_values).mean(axis=0)

    # 4-1. Feature Importance (Bar)
    plt.figure(figsize=(12, 10))
    shap.summary_plot(shap_values, X_test, plot_type="bar", show=False, max_display=len(features))
    plt.title("SHAP Feature Importance (XGBoost)", fontsize=16, pad=15)
    plt.tight_layout()
    plt.show()

    # 4-2. Beeswarm
    plt.figure(figsize=(12, 10))
    shap.summary_plot(shap_values, X_test, show=False, max_display=len(features))
    plt.title("SHAP Beeswarm Plot (XGBoost)", fontsize=16, pad=15)
    plt.tight_layout()
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
    plt.show()

    # 4-4. Force Plot (노쇼 최고 / 방문 최고)
    shap.initjs()
    y_prob = model.predict_proba(X_test)[:, 1]
    noshow_idx = np.argmax(y_prob)
    visit_idx = np.argmin(y_prob)

    for idx, title in [(noshow_idx, "노쇼 확률 최고"), (visit_idx, "방문 확률 최고")]:
        shap.force_plot(explainer.expected_value, shap_values[idx],
                        X_test.iloc[idx], matplotlib=True, show=False)
        plt.gcf().set_size_inches(18, 4)
        plt.title(f"Force Plot: {title} 케이스", fontsize=14, pad=40)
        plt.tight_layout()
        plt.show()

    # 4-5. Waterfall
    shap_exp = shap.Explanation(
        values=shap_values,
        base_values=np.full(len(shap_values), explainer.expected_value),
        data=X_test.values,
        feature_names=features,
    )
    fig, axes = plt.subplots(1, 2, figsize=(24, 8))
    for ax, idx, title in [
        (axes[0], noshow_idx, "Waterfall: 노쇼 확률 최고"),
        (axes[1], visit_idx,  "Waterfall: 방문 확률 최고"),
    ]:
        plt.sca(ax)
        shap.plots.waterfall(shap_exp[idx], max_display=15, show=False)
        ax.set_title(title, fontsize=13)
    plt.tight_layout()
    plt.show()

    # 4-6. Interaction (Top 3)
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
        ax.set_ylabel(f"SHAP interaction\n({f1} × {f2})", fontsize=10)
        ax.set_title(f"{f1} × {f2}", fontsize=12, fontweight="bold")
        cbar = plt.colorbar(ax.collections[0], ax=ax)
        cbar.set_label(f2, fontsize=9)
    plt.suptitle("SHAP Interaction Plot - Top 3 피처 조합", fontsize=16, y=1.03)
    plt.tight_layout()
    plt.show()

    return shap_values, mean_abs_shap

if __name__ == "__main__":
    X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL = load_and_split()

    model = train(X_train, y_train, X_valid, y_valid)
    evaluate_all(model, X_train, y_train, X_valid, y_valid, X_test, y_test)
    best_th = tune_threshold(model, X_valid, y_valid, X_test, y_test)
    shap_values, mean_abs_shap = run_shap(model, X_test, FEATURES_FINAL)
