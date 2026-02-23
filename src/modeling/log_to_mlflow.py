import os
import sys
import argparse
import joblib
import numpy as np
import pandas as pd

import mlflow
import mlflow.sklearn

from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_recall_curve,
    classification_report,
)

TARGET = "y_noshow"
DROP_COLS = [
    "appt_id", "patient_id", "nhood_id",
    "scheduled_at", "scheduled_date", "appt_date",
    "nhood_name", "weather_desc", "is_noshow"
]


def make_xy(data: pd.DataFrame):
    X = data.drop(columns=[c for c in DROP_COLS if c in data.columns] + [TARGET], errors="ignore")
    y = data[TARGET].astype(int)
    return X, y


def time_split_70_15_15(df: pd.DataFrame):
    df = df.sort_values("appt_date").reset_index(drop=True)
    n = len(df)
    train_end = int(n * 0.70)
    valid_end = int(n * 0.85)
    train = df.iloc[:train_end].copy()
    valid = df.iloc[train_end:valid_end].copy()
    test  = df.iloc[valid_end:].copy()
    return train, valid, test


def pick_best_threshold_by_f1(y_true: np.ndarray, p: np.ndarray) -> float:
    prec, rec, thr = precision_recall_curve(y_true, p)
    prec_t, rec_t = prec[1:], rec[1:]
    f1 = 2 * prec_t * rec_t / (prec_t + rec_t + 1e-9)
    best_idx = int(np.argmax(f1))
    return float(thr[best_idx])


def load_data_for_eval(args):
    """
    - xgboost/catboost: data_pipeline.load_and_split() 사용 (engineered features)
    - logistic/lightgbm: raw_make_xy 사용 (원본 컬럼)
    """
    if args.model_type in ("xgboost", "catboost"):
        this_dir = os.path.dirname(os.path.abspath(__file__))
        if this_dir not in sys.path:
            sys.path.insert(0, this_dir)

        from data_pipeline import load_and_split  # src/modeling/data_pipeline.py

        X_train, y_train, X_valid, y_valid, X_test, y_test, FEATURES_FINAL = load_and_split(args.csv_path)

        print(f"[{args.model_type}] Using data_pipeline.load_and_split()")
        print(f"[{args.model_type}] FEATURES_FINAL: {len(FEATURES_FINAL)}")
        print(f"[{args.model_type}] X_valid: {X_valid.shape}, X_test: {X_test.shape}")

        return X_valid, y_valid, X_test, y_test, {
            "feature_source": "data_pipeline",
            "n_features": len(FEATURES_FINAL)
        }

    # logistic/lightgbm => raw
    df = pd.read_csv(args.csv_path)
    df["appt_date"] = pd.to_datetime(df["appt_date"], errors="coerce")
    df = df.dropna(subset=["appt_date"]).copy()

    df[TARGET] = 1 - df["is_noshow"].astype(int)

    _, valid, test = time_split_70_15_15(df)
    X_valid, y_valid = make_xy(valid)
    X_test,  y_test  = make_xy(test)

    print(f"[{args.model_type}] Using raw_make_xy()")
    print(f"[{args.model_type}] X_valid: {X_valid.shape}, X_test: {X_test.shape}")

    return X_valid, y_valid, X_test, y_test, {
        "feature_source": "raw_make_xy",
        "n_features": int(X_valid.shape[1])
    }


def logistic_transform_like_notebook(X_valid: pd.DataFrame, X_test: pd.DataFrame, scaler, feature_cols):
    """
    노트북 방식 재현:
    - categorical cols = ["gender","nhood_name","dow","month"] 중 존재하는 것
    - pd.get_dummies(drop_first=True)
    - train 기준 feature_cols로 reindex(fill_value=0)
    - scaler.transform
    """
    categorical_cols = [c for c in ["gender", "nhood_name", "dow", "month"] if c in X_valid.columns]

    X_valid_d = pd.get_dummies(X_valid, columns=categorical_cols, drop_first=True)
    X_test_d  = pd.get_dummies(X_test,  columns=categorical_cols, drop_first=True)

    X_valid_d = X_valid_d.reindex(columns=feature_cols, fill_value=0)
    X_test_d  = X_test_d.reindex(columns=feature_cols, fill_value=0)

    X_valid_in = scaler.transform(X_valid_d)
    X_test_in  = scaler.transform(X_test_d)

    return X_valid_in, X_test_in


def main(args):
    # 1) data
    X_valid, y_valid, X_test, y_test, extra_info = load_data_for_eval(args)

    # 2) model
    model = joblib.load(args.model_path)
    if not hasattr(model, "predict_proba"):
        raise ValueError(f"Loaded model has no predict_proba(): {type(model)}")

    # 3) predict (model_type별 분기)
    if args.model_type == "logistic":
        # pipeline 없이 106피처 모델이면, scaler+feature_cols로 전처리 재현 필수
        if not args.logistic_scaler_path or not args.logistic_feature_cols_path:
            raise ValueError(
                "For logistic WITHOUT Pipeline, you must provide:\n"
                "  --logistic_scaler_path <scaler.joblib>\n"
                "  --logistic_feature_cols_path <feature_cols.joblib>\n"
            )

        scaler = joblib.load(args.logistic_scaler_path)
        feature_cols = joblib.load(args.logistic_feature_cols_path)

        X_valid_in, X_test_in = logistic_transform_like_notebook(X_valid, X_test, scaler, feature_cols)

        p_valid = model.predict_proba(X_valid_in)[:, 1]
        p_test  = model.predict_proba(X_test_in)[:, 1]

        # 로지스틱은 실제 입력 피처 수(=len(feature_cols))로 로그 남기기
        extra_info["feature_source"] = "raw_make_xy + get_dummies + scaler"
        extra_info["n_features"] = int(len(feature_cols))

    else:
        p_valid = model.predict_proba(X_valid)[:, 1]
        p_test  = model.predict_proba(X_test)[:, 1]

    # 4) metrics
    val_roc  = roc_auc_score(y_valid, p_valid)
    val_pr   = average_precision_score(y_valid, p_valid)
    test_roc = roc_auc_score(y_test, p_test)
    test_pr  = average_precision_score(y_test, p_test)

    best_thr = pick_best_threshold_by_f1(y_valid, p_valid)

    y_pred_test = (p_test >= best_thr).astype(int)
    report_dict = classification_report(y_test, y_pred_test, digits=4, output_dict=True)

    noshow_precision = float(report_dict["1"]["precision"])
    noshow_recall    = float(report_dict["1"]["recall"])
    noshow_f1        = float(report_dict["1"]["f1-score"])

    # 5) mlflow logging
    mlflow.set_tracking_uri(args.tracking_uri)
    mlflow.set_experiment(args.experiment)

    run_name = f"{args.model_type}_{os.path.basename(args.model_path)}"

    with mlflow.start_run(run_name=run_name):
        mlflow.set_tag("model_type", args.model_type)
        mlflow.set_tag("split", "time_sorted_70_15_15")
        mlflow.set_tag("feature_source", extra_info.get("feature_source", "unknown"))

        mlflow.log_param("model_file", os.path.basename(args.model_path))
        mlflow.log_param("feature_source", extra_info.get("feature_source", "unknown"))
        mlflow.log_param("n_features_eval", int(extra_info.get("n_features", -1)))
        mlflow.log_param("is_pipeline", str(hasattr(model, "named_steps")))

        if args.model_type == "logistic":
            mlflow.log_param("logistic_scaler_file", os.path.basename(args.logistic_scaler_path))
            mlflow.log_param("logistic_feature_cols_file", os.path.basename(args.logistic_feature_cols_path))

        mlflow.log_metric("valid_roc_auc", float(val_roc))
        mlflow.log_metric("valid_pr_auc",  float(val_pr))
        mlflow.log_metric("test_roc_auc",  float(test_roc))
        mlflow.log_metric("test_pr_auc",   float(test_pr))

        mlflow.log_metric("best_thr_valid_f1", float(best_thr))
        mlflow.log_metric("noshow_precision_test", noshow_precision)
        mlflow.log_metric("noshow_recall_test",    noshow_recall)
        mlflow.log_metric("noshow_f1_test",        noshow_f1)

        os.makedirs("results/artifacts", exist_ok=True)
        report_df = pd.DataFrame(report_dict).T
        report_path = os.path.join("results", "artifacts", f"classification_report_{args.model_type}.csv")
        report_df.to_csv(report_path, index=True)
        mlflow.log_artifact(report_path)

        mlflow.log_artifact(args.model_path)
        if args.model_type == "logistic":
            mlflow.log_artifact(args.logistic_scaler_path)
            mlflow.log_artifact(args.logistic_feature_cols_path)

        try:
            mlflow.sklearn.log_model(model, artifact_path="model")
        except Exception as e:
            mlflow.log_param("mlflow_model_log_error", str(e))

    print("Logged to MLflow:", run_name)
    print("VALID ROC/PR:", val_roc, val_pr)
    print("TEST  ROC/PR:", test_roc, test_pr)
    print("TEST noshow precision/recall/f1:", noshow_precision, noshow_recall, noshow_f1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv_path", default="data/Train_table_full.csv")
    parser.add_argument("--model_path", required=True)
    parser.add_argument("--model_type", required=True, choices=["logistic", "lightgbm", "xgboost", "catboost"])
    parser.add_argument("--tracking_uri", default="sqlite:///mlflow.db")
    parser.add_argument("--experiment", default="noshow_project")

    # logistic 전용 (pipeline 없이 106피처 재현용)
    parser.add_argument("--logistic_scaler_path", default=None)
    parser.add_argument("--logistic_feature_cols_path", default=None)

    args = parser.parse_args()
    main(args)