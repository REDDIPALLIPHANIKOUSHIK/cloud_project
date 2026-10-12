"""
Model Evaluation Verification Script
Loads the serialized model artifact and validates inference on test cases.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model_artifacts", "heart_disease_model.joblib")
METADATA_PATH = os.path.join(BASE_DIR, "model_metadata.json")


def run_evaluation_check():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model artifact not found at {MODEL_PATH}. Run train_model.py first.")

    model = joblib.load(MODEL_PATH)
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    print("=== MODEL EVALUATION SUMMARY ===")
    print(f"Model: {meta['model_name']} v{meta['version']}")
    print(f"Trained: {meta['trained_at']}")
    print(f"Accuracy: {meta['metrics']['accuracy'] * 100:.2f}%")
    print(f"F1-Score: {meta['metrics']['f1_score'] * 100:.2f}%")
    print(f"ROC-AUC:  {meta['metrics']['roc_auc'] * 100:.2f}%")
    print(f"Confusion Matrix: {meta['metrics']['confusion_matrix']}")

    # Test sample inference (Positive and Negative clinical test cases)
    # High risk case: older male, typical angina, elevated BP, high cholesterol, low max HR, ST depression
    high_risk_input = pd.DataFrame([{
        "age": 67.0,
        "sex": 1.0,
        "cp": 4.0,  # asymptomatic/severe ischemic type
        "trestbps": 160.0,
        "chol": 286.0,
        "fbs": 0.0,
        "restecg": 2.0,
        "thalach": 108.0,
        "exang": 1.0,
        "oldpeak": 2.5,
        "slope": 2.0,
        "ca": 3.0,
        "thal": 7.0
    }])

    # Low risk case: young adult, no angina, normal BP and cholesterol, high max HR, no ST depression
    low_risk_input = pd.DataFrame([{
        "age": 35.0,
        "sex": 0.0,
        "cp": 2.0,
        "trestbps": 115.0,
        "chol": 175.0,
        "fbs": 0.0,
        "restecg": 0.0,
        "thalach": 175.0,
        "exang": 0.0,
        "oldpeak": 0.0,
        "slope": 1.0,
        "ca": 0.0,
        "thal": 3.0
    }])

    pred_high = model.predict(high_risk_input)[0]
    prob_high = model.predict_proba(high_risk_input)[0][1]

    pred_low = model.predict(low_risk_input)[0]
    prob_low = model.predict_proba(low_risk_input)[0][1]

    print("\n--- SAMPLE INFERENCE VERIFICATION ---")
    print(f"High-Risk Test Case: Predicted Class={pred_high}, Probability={prob_high:.4f} (Expected: 1)")
    print(f"Low-Risk Test Case:  Predicted Class={pred_low}, Probability={prob_low:.4f} (Expected: 0)")

    assert pred_high == 1, "High-risk case should predict 1"
    assert pred_low == 0, "Low-risk case should predict 0"
    print("\nInference verification PASSED successfully.")


if __name__ == "__main__":
    run_evaluation_check()
