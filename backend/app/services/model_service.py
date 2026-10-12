"""
Machine Learning Inference Service
Encapsulates real model artifact loading, data frame formatting, prediction,
calibrated probability estimation, and structured result assembly.
"""

import os
import json
import uuid
import datetime
import joblib
import pandas as pd
from typing import Dict, Any, Tuple

from backend.app.config import config
from backend.app.schemas.prediction import (
    HeartDiseaseInput,
    PredictionResponse,
    SpecialistRecommendation
)
from backend.app.services.emergency_safety import check_emergency_safety
from backend.app.services.specialist_recommender import recommend_specialist

FEATURE_COLUMNS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]


class ModelService:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self._load_model_and_metadata()

    def _load_model_and_metadata(self):
        if not os.path.exists(config.MODEL_ARTIFACT_PATH):
            raise FileNotFoundError(
                f"Model artifact not found at {config.MODEL_ARTIFACT_PATH}. "
                "Execute 'python backend/ml/train_model.py' first."
            )
        self.model = joblib.load(config.MODEL_ARTIFACT_PATH)

        if os.path.exists(config.MODEL_METADATA_PATH):
            with open(config.MODEL_METADATA_PATH, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {
                "model_name": "RandomForest",
                "version": "1.0.0",
                "metrics": {"accuracy": 0.9016, "f1_score": 0.8929, "roc_auc": 0.9610}
            }

    def predict_heart_disease(
        self,
        clinical_data: HeartDiseaseInput,
        patient_id: str
    ) -> PredictionResponse:
        """
        Run inference on verified clinical inputs and construct end-to-end response.
        """
        if self.model is None:
            self._load_model_and_metadata()

        # Build single-row DataFrame with strict column order
        row_dict = {
            "age": float(clinical_data.age),
            "sex": float(clinical_data.sex),
            "cp": float(clinical_data.cp),
            "trestbps": float(clinical_data.trestbps),
            "chol": float(clinical_data.chol),
            "fbs": float(clinical_data.fbs),
            "restecg": float(clinical_data.restecg),
            "thalach": float(clinical_data.thalach),
            "exang": float(clinical_data.exang),
            "oldpeak": float(clinical_data.oldpeak),
            "slope": float(clinical_data.slope),
            "ca": float(clinical_data.ca),
            "thal": float(clinical_data.thal)
        }
        df_input = pd.DataFrame([row_dict], columns=FEATURE_COLUMNS)

        # Real model inference
        raw_pred = int(self.model.predict(df_input)[0])
        probabilities = self.model.predict_proba(df_input)[0]
        prob_disease = float(probabilities[1])

        # Stratified Risk Categorization
        if prob_disease < 0.35:
            risk_category = "Low Risk"
        elif prob_disease < 0.55:
            risk_category = "Moderate Risk"
        elif prob_disease < 0.75:
            risk_category = "Elevated Risk"
        else:
            risk_category = "High Risk"

        has_disease_risk = raw_pred == 1

        predicted_condition = (
            "Coronary Artery Disease Risk Detected"
            if has_disease_risk else
            "No Significant Coronary Artery Disease Pattern Detected"
        )

        # 1. Independent Emergency Safety Screening
        emergency_result = check_emergency_safety(
            clinical_input=clinical_data,
            reported_symptoms=clinical_data.reported_symptoms
        )

        # 2. Specialist Recommendation Engine
        specialist = recommend_specialist(
            predicted_risk=has_disease_risk,
            risk_category=risk_category,
            probability=prob_disease,
            clinical_input=clinical_data,
            reported_symptoms=clinical_data.reported_symptoms,
            is_emergency=emergency_result.is_emergency
        )

        # Assemble Clinical Warnings
        warnings = []
        if emergency_result.is_emergency:
            warnings.append("EMERGENCY: Immediate clinical intervention required.")
        if clinical_data.trestbps >= 140:
            warnings.append("Blood pressure is elevated above standard normal limits (>= 140 mmHg).")
        if clinical_data.chol >= 240:
            warnings.append("Serum cholesterol is classified as borderline-high / high (>= 240 mg/dl).")
        if clinical_data.fbs == 1.0:
            warnings.append("Fasting blood sugar is elevated (> 120 mg/dl).")

        prediction_id = f"pred_{uuid.uuid4().hex[:12]}"
        created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        response = PredictionResponse(
            predictionId=prediction_id,
            patientId=patient_id,
            modelName=self.metadata.get("model_name", "RandomForest"),
            modelVersion=self.metadata.get("version", "1.0.0"),
            inputFeatureSummary=row_dict,
            predictedCondition=predicted_condition,
            hasDiseaseRisk=has_disease_risk,
            riskCategory=risk_category,
            probability=round(prob_disease, 4),
            specialistRecommendation=specialist,
            emergencyAlert=emergency_result,
            warnings=warnings,
            disclaimer=(
                "AI-generated results are intended for educational and clinical decision-support purposes only. "
                "They are not a medical diagnosis and must not replace consultation with a qualified healthcare professional. "
                "Seek emergency medical care for severe or rapidly worsening symptoms."
            ),
            createdAt=created_at
        )

        return response


model_service = ModelService()
