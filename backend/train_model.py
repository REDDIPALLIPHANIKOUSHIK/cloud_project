"""Train and evaluate a reproducible Cleveland heart disease classifier."""
from __future__ import annotations

import json
import io
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parent
DATA_URL = "https://archive.ics.uci.edu/static/public/45/heart+disease.zip"
DATA_PATH = ROOT / "data" / "heart.csv"
FEATURES = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
            "thalach", "exang", "oldpeak", "slope", "ca", "thal"]
CATEGORICAL = ["sex", "cp", "fbs", "restecg", "exang", "slope", "ca", "thal"]


def load_data() -> pd.DataFrame:
    """Use a committed dataset when supplied; otherwise fetch the documented public CSV."""
    path = DATA_PATH
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(DATA_URL, headers={"User-Agent": "heart-risk-demo/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            archive = zipfile.ZipFile(io.BytesIO(response.read()))
        with archive.open("processed.cleveland.data") as csv_file:
            frame = pd.read_csv(csv_file, header=None, names=FEATURES + ["target"], na_values="?")
        frame.to_csv(path, index=False)
    else:
        frame = pd.read_csv(path)
    frame.columns = [str(c).strip().lower() for c in frame.columns]
    if "target" not in frame.columns or any(c not in frame.columns for c in FEATURES):
        raise ValueError(f"Dataset must include features {FEATURES} and target")
    frame = frame[FEATURES + ["target"]].apply(pd.to_numeric, errors="coerce")
    frame = frame.dropna(subset=["target"])
    frame["target"] = (frame["target"] > 0).astype(int)
    return frame


def main() -> None:
    data = load_data()
    x, y = data[FEATURES], data["target"]
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y)
    numeric = [feature for feature in FEATURES if feature not in CATEGORICAL]
    prep = ColumnTransformer([
        ("numeric", Pipeline([("impute", SimpleImputer(strategy="median")),
                              ("scale", StandardScaler())]), numeric),
        ("categorical", Pipeline([("impute", SimpleImputer(strategy="most_frequent")),
                                  ("encode", OneHotEncoder(handle_unknown="ignore"))]), CATEGORICAL),
    ])
    pipeline = Pipeline([("preprocess", prep),
                         ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced"))])
    pipeline.fit(x_train, y_train)
    pred = pipeline.predict(x_test)
    prob = pipeline.predict_proba(x_test)[:, 1]
    metrics = {
        "model": "LogisticRegression with median/mode imputation, standard scaling, and one-hot encoding",
        "dataset": f"Public heart.csv (source: {DATA_URL})",
        "training_date": date.today().isoformat(), "rows": int(len(data)),
        "features": FEATURES, "accuracy": float(accuracy_score(y_test, pred)),
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
        "f1": float(f1_score(y_test, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, prob)),
        "confusion_matrix": confusion_matrix(y_test, pred).tolist(),
    }
    model_dir = ROOT / "model"
    model_dir.mkdir(exist_ok=True)
    joblib.dump(pipeline, model_dir / "heart_disease_pipeline.joblib")
    (model_dir / "metadata.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()

