"""
UCI Heart Disease Model Training and Evaluation Pipeline
Reproducible training script comparing Logistic Regression and Random Forest.
Exports the best performing pipeline to model_artifacts/heart_disease_model.joblib
and records comprehensive metrics and feature schema to model_metadata.json.
"""

import os
import json
import urllib.request
import datetime
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "model_artifacts")
DATASET_PATH = os.path.join(DATASET_DIR, "cleveland_heart_disease.csv")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "heart_disease_model.joblib")
METADATA_PATH = os.path.join(BASE_DIR, "model_metadata.json")

UCI_URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data"

FEATURE_NAMES = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal"
]

ALL_COLUMNS = FEATURE_NAMES + ["target"]

FEATURE_DEFINITIONS = {
    "age": "Age of patient in years (29 - 77)",
    "sex": "Biological sex (1 = male, 0 = female)",
    "cp": "Chest pain type (1 = typical angina, 2 = atypical angina, 3 = non-anginal pain, 4 = asymptomatic)",
    "trestbps": "Resting blood pressure in mm Hg on hospital admission (94 - 200)",
    "chol": "Serum cholesterol level in mg/dl (126 - 564)",
    "fbs": "Fasting blood sugar > 120 mg/dl (1 = true, 0 = false)",
    "restecg": "Resting electrocardiographic results (0 = normal, 1 = ST-T wave abnormality, 2 = left ventricular hypertrophy)",
    "thalach": "Maximum heart rate achieved during exercise (71 - 202)",
    "exang": "Exercise induced angina (1 = yes, 0 = no)",
    "oldpeak": "ST depression induced by exercise relative to rest (0.0 - 6.2)",
    "slope": "Slope of the peak exercise ST segment (1 = upsloping, 2 = flat, 3 = downsloping)",
    "ca": "Number of major vessels (0-3) colored by fluoroscopy",
    "thal": "Thallium stress test result (3 = normal, 6 = fixed defect, 7 = reversible defect)"
}


def download_or_load_dataset() -> pd.DataFrame:
    """Download UCI Cleveland Heart Disease dataset if not already present, and return as DataFrame."""
    os.makedirs(DATASET_DIR, exist_ok=True)
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    if not os.path.exists(DATASET_PATH):
        print(f"Downloading UCI Cleveland dataset from {UCI_URL}...")
        try:
            urllib.request.urlretrieve(UCI_URL, DATASET_PATH)
            print(f"Saved dataset to {DATASET_PATH}")
        except Exception as e:
            print(f"Error downloading from UCI: {e}. Checking for local copy...")
            if not os.path.exists(DATASET_PATH):
                raise RuntimeError(f"Failed to obtain dataset: {e}")

    df = pd.read_csv(DATASET_PATH, names=ALL_COLUMNS, na_values="?")
    print(f"Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns.")
    return df


def preprocess_data(df: pd.DataFrame):
    """
    Map target: in Cleveland dataset, 0 means absence of heart disease,
    1, 2, 3, 4 mean presence of heart disease.
    Binary target: 0 = No Disease, 1 = Presence of Disease.
    """
    df = df.copy()
    # Map target > 0 to 1
    y = (df["target"] > 0).astype(int)
    X = df[FEATURE_NAMES]
    return X, y


def train_and_evaluate():
    print("=" * 60)
    print("TRAINING & EVALUATION PIPELINE: UCI HEART DISEASE PREDICTION")
    print("=" * 60)

    df = download_or_load_dataset()
    X, y = preprocess_data(df)

    print(f"Target distribution: {np.bincount(y)} (0: No Heart Disease, 1: Heart Disease Present)")

    # Stratified 80/20 train/test split to prevent data leakage
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Training set: {X_train.shape[0]} samples | Test set: {X_test.shape[0]} samples")

    # Define Candidate Pipelines
    pipelines = {
        "LogisticRegression": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42, C=0.5))
        ]),
        "RandomForest": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("classifier", RandomForestClassifier(
                n_estimators=100,
                max_depth=4,
                min_samples_split=4,
                random_state=42
            ))
        ])
    }

    results = {}
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for name, pipeline in pipelines.items():
        print(f"\n--- Evaluating {name} ---")
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1")
        print(f"5-Fold CV F1-Score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

        # Fit on full training set
        pipeline.fit(X_train, y_train)

        # Predict on holdout test set
        y_pred = pipeline.predict(X_test)
        y_prob = pipeline.predict_proba(X_test)[:, 1]

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        auc = float(roc_auc_score(y_test, y_prob))
        cm = confusion_matrix(y_test, y_pred).tolist()

        print(f"Test Accuracy:  {acc:.4f}")
        print(f"Test Precision: {prec:.4f}")
        print(f"Test Recall:    {rec:.4f}")
        print(f"Test F1-Score:  {f1:.4f}")
        print(f"Test ROC-AUC:   {auc:.4f}")
        print(f"Confusion Matrix [TN, FP], [FN, TP]: {cm}")

        results[name] = {
            "pipeline": pipeline,
            "cv_f1_mean": float(cv_scores.mean()),
            "cv_f1_std": float(cv_scores.std()),
            "test_accuracy": acc,
            "test_precision": prec,
            "test_recall": rec,
            "test_f1": f1,
            "test_roc_auc": auc,
            "confusion_matrix": cm,
            "classification_report": classification_report(y_test, y_pred, output_dict=True)
        }

    # Select best model based on holdout F1-Score (balances precision and recall for clinical screening)
    best_name = max(results, key=lambda k: results[k]["test_f1"])
    best_result = results[best_name]
    best_pipeline = best_result["pipeline"]

    print(f"\n==========================================")
    print(f"WINNING MODEL: {best_name} (F1 = {best_result['test_f1']:.4f})")
    print(f"==========================================")

    # Export model artifact
    joblib.dump(best_pipeline, MODEL_PATH)
    print(f"Exported model artifact to: {MODEL_PATH}")

    # Build comprehensive metadata document
    metadata = {
        "model_name": best_name,
        "version": "1.0.0",
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "dataset": {
            "name": "UCI Cleveland Heart Disease Dataset",
            "source": UCI_URL,
            "total_samples": int(len(df)),
            "features_count": len(FEATURE_NAMES),
            "target_classes": {
                "0": "No Significant Coronary Disease (< 50% narrowing)",
                "1": "Presence of Coronary Disease (>= 50% narrowing)"
            }
        },
        "features": [
            {
                "name": feat,
                "description": FEATURE_DEFINITIONS[feat],
                "type": "numeric" if feat in ["age", "trestbps", "chol", "thalach", "oldpeak"] else "categorical",
                "sample_min": float(df[feat].min(skipna=True)),
                "sample_max": float(df[feat].max(skipna=True)),
                "sample_median": float(df[feat].median(skipna=True))
            }
            for feat in FEATURE_NAMES
        ],
        "training_methodology": {
            "train_test_split": "80/20 Stratified",
            "cross_validation": "5-Fold Stratified K-Fold",
            "imputation": "SimpleImputer (strategy='median')",
            "scaling": "StandardScaler"
        },
        "metrics": {
            "accuracy": best_result["test_accuracy"],
            "precision": best_result["test_precision"],
            "recall": best_result["test_recall"],
            "f1_score": best_result["test_f1"],
            "roc_auc": best_result["test_roc_auc"],
            "cv_f1_mean": best_result["cv_f1_mean"],
            "cv_f1_std": best_result["cv_f1_std"],
            "confusion_matrix": best_result["confusion_matrix"]
        },
        "all_model_evaluations": {
            name: {
                "test_accuracy": res["test_accuracy"],
                "test_precision": res["test_precision"],
                "test_recall": res["test_recall"],
                "test_f1": res["test_f1"],
                "test_roc_auc": res["test_roc_auc"],
                "cv_f1_mean": res["cv_f1_mean"]
            }
            for name, res in results.items()
        },
        "clinical_limitations": [
            "Model is validated exclusively for adult cardiovascular risk categorization on compatible structured clinical parameters.",
            "Cannot diagnose other medical conditions such as cancer, diabetes, neurology, or orthopedics.",
            "Probability outputs reflect mathematical model calibration on the benchmark sample and are not standalone clinical diagnoses.",
            "Must be interpreted exclusively by or in consultation with licensed healthcare professionals."
        ]
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata to: {METADATA_PATH}")

    return metadata


if __name__ == "__main__":
    train_and_evaluate()
