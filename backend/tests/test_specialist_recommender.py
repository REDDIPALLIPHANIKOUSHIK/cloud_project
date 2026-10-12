import pytest
from backend.app.schemas.prediction import HeartDiseaseInput
from backend.app.services.specialist_recommender import recommend_specialist


def get_base_input():
    return HeartDiseaseInput(
        age=45.0,
        sex=0.0,
        cp=2.0,
        trestbps=120.0,
        chol=190.0,
        fbs=0.0,
        restecg=0.0,
        thalach=150.0,
        exang=0.0,
        oldpeak=0.0,
        slope=1.0,
        ca=0.0,
        thal=3.0
    )


def test_recommends_cardiologist_on_high_cardiac_risk():
    inp = get_base_input()
    rec = recommend_specialist(
        predicted_risk=True,
        risk_category="High Risk",
        probability=0.88,
        clinical_input=inp
    )
    assert rec.specialty == "Cardiologist"
    assert rec.urgency == "priority"
    assert "diagnosis" in rec.disclaimer.lower() or "referral" in rec.disclaimer.lower()


def test_recommends_pulmonologist_on_respiratory_symptoms():
    inp = get_base_input()
    rec = recommend_specialist(
        predicted_risk=False,
        risk_category="Low Risk",
        probability=0.10,
        clinical_input=inp,
        reported_symptoms=["persistent wheezing and chronic cough"]
    )
    assert rec.specialty == "Pulmonologist"
    assert "respiratory" in rec.reason.lower()


def test_recommends_endocrinologist_on_elevated_glucose():
    inp = get_base_input()
    inp.fbs = 1.0
    rec = recommend_specialist(
        predicted_risk=False,
        risk_category="Low Risk",
        probability=0.15,
        clinical_input=inp,
        reported_symptoms=["excessive thirst"]
    )
    assert "Endocrinologist" in rec.specialty


def test_recommends_general_physician_on_routine_low_risk():
    inp = get_base_input()
    rec = recommend_specialist(
        predicted_risk=False,
        risk_category="Low Risk",
        probability=0.08,
        clinical_input=inp,
        reported_symptoms=["routine annual wellness checkup"]
    )
    assert "General Physician" in rec.specialty
    assert rec.urgency == "routine"
