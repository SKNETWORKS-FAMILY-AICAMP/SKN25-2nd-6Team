import os
import argparse
import joblib
import numpy as np
import pandas as pd

import mlflow
import mlflow.sklearn

from sklearn.metrics import (
    roc_auc_score, average_precision_score,
    precision_recall_curve, classification_report
)

TARGET = "y_noshow"
DROP_COLS = [
    "appt_id","patient_id","nhood_id",
    "scheduled_at","scheduled_date","appt_date",
    "nhood_name","weather_desc", "is_noshow"
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

def main(args):
    df = pd.read_csv(args.csv_path)
    df["appt_date"] = pd.to_datetime(df["appt_date"], errors="coerce")
    df = df.dropna(subset=["appt_date"]).copy()

    # 1 = noshow
    df["y_noshow"] = 1 - df["is_noshow"].astype(int)

    _, valid, test = time_split_70_15_15(df)
    X_valid, y_valid = make_xy(valid)
    X_test,  y_test  = make_xy(test)

    model = joblib.load(args.model_path)

    p_valid = model.predict_proba(X_valid)[:, 1]
    p_test  = model.predict_proba(X_test)[:, 1]

    val_roc = roc_auc_score(y_valid, p_valid)
    val_pr  = average_precision_score(y_valid, p_valid)
    test_roc = roc_auc_score(y_test, p_test)
    test_pr  = average_precision_score(y_test, p_test)

    prec, rec, thr = precision_recall_curve(y_valid, p_valid)
    prec_t, rec_t = prec[1:], rec[1:]
    f1 = 2 * prec_t * rec_t / (prec_t + rec_t + 1e-9)
    best_idx = int(np.argmax(f1))
    best_thr = float(thr[best_idx])

    y_pred_test = (p_test >= best_thr).astype(int)
    report_dict = classification_report(y_test, y_pred_test, digits=4, output_dict=True)

    noshow_precision = float(report_dict["1"]["precision"])
    noshow_recall    = float(report_dict["1"]["recall"])
    noshow_f1        = float(report_dict["1"]["f1-score"])

    # mlflow logging 
    mlflow.set_tracking_uri(args.tracking_uri)  
    mlflow.set_experiment(args.experiment)

    run_name = f"{args.model_type}_{os.path.basename(args.model_path)}"

    with mlflow.start_run(run_name=run_name):
        mlflow.set_tag("model_type", args.model_type)
        mlflow.set_tag("split", "time_sorted_70_15_15")
        mlflow.log_param("model_file", os.path.basename(args.model_path))

        mlflow.log_metric("valid_roc_auc", float(val_roc))
        mlflow.log_metric("valid_pr_auc",  float(val_pr))
        mlflow.log_metric("test_roc_auc",  float(test_roc))
        mlflow.log_metric("test_pr_auc",   float(test_pr))

        mlflow.log_metric("best_thr_valid_f1", best_thr)
        mlflow.log_metric("noshow_precision_test", noshow_precision)
        mlflow.log_metric("noshow_recall_test",    noshow_recall)
        mlflow.log_metric("noshow_f1_test",        noshow_f1)

        report_df = pd.DataFrame(report_dict).T
        os.makedirs("results/artifacts", exist_ok=True)
        report_path = os.path.join("results", "artifacts", "classification_report_test.csv")
        report_df.to_csv(report_path, index=True)
        mlflow.log_artifact(report_path)

        mlflow.log_artifact(args.model_path)

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
    parser.add_argument("--model_type", required=True, choices=["logistic", "lightgbm", "xgboost"])
    parser.add_argument("--tracking_uri", default="sqlite:///mlflow.db")
    parser.add_argument("--experiment", default="noshow_project")
    args = parser.parse_args()
    main(args)