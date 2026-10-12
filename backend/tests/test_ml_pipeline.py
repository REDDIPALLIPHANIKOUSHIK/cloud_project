import os
import json
import pytest
import pandas as pd
import joblib

from backend.app.config import config
from backend.app.services.model_service import model_service
from backend.app.schemas.prediction import HeartDiseaseInput


def test_model_artifact_exists():
    assert os.path.exists(config.MODEL_ARTIFACT_PATH), "Model artifact must exist on disk"


def test_model_metadata_validity():
    assert os.path.exists(config.MODEL_METADATA_PATH), "Model metadata must exist on disk"
    with open(config.MODEL_METADATA_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)
    assert "metrics" in meta
    assert meta["metrics"]["accuracy"] >= 0.80
    assert meta["metrics"]["f1_score"] >= 0.80
    assert len(meta["features"]) == 13


def test_model_prediction_low_risk():
    low_risk = HeartDiseaseInput(
        age=32.0,
        sex=0.0,
        cp=2.0,
        trestbps=110.0,
        chol=165.0,
        fbs=0.0,
        restecg=0.0,
        thalach=175.0,
        exang=0.0,
        oldpeak=0.0,
        slope=1.0,
        ca=0.0,
        thal=3.0,
        reported_symptoms=["None"]
    )
    result = model_service.predict_heart_disease(low_risk, "patient_test_01")
    assert result.hasDiseaseRisk is False
    assert result.riskCategory in ["Low Risk", "Moderate Risk"]
    assert result.specialistRecommendation.specialty is not None


def test_model_prediction_high_risk():
    high_risk = HeartDiseaseInput(
        age=68.0,
        sex=1.0,
        cp=4.0,
        trestbps=165.0,
        chol=295.0,
        fbs=1.0,
        restecg=2.0,
        thalach=105.0,
        exang=1.0,
        oldpeak=3.2,
        slope=2.0,
        ca=3.0,
        thal=7.0,
        reported_symptoms=["Exertional chest tightness"]
    )
    result = model_service.predict_heart_disease(high_risk, "patient_test_02")
    assert result.hasDiseaseRisk is True
    assert result.riskCategory in ["Elevated Risk", "High Risk"]
    assert "Cardiologist" in result.specialistRecommendation.specialty
