import pytest
import json
from backend.app import create_app
from backend.app.services.db_service import db


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_check_endpoint(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "model" in data
    assert data["model"]["accuracy"] is not None


def test_unauthorized_request_rejected(client):
    res = client.get("/api/v1/me")
    assert res.status_code == 401


def test_authenticated_profile_and_sync(client):
    res = client.get("/api/v1/me", headers={"Authorization": "Bearer demo-patient"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["user"]["role"] == "patient"


def test_prediction_endpoint_with_valid_data(client):
    valid_payload = {
        "age": 55.0,
        "sex": 1.0,
        "cp": 2.0,
        "trestbps": 130.0,
        "chol": 220.0,
        "fbs": 0.0,
        "restecg": 0.0,
        "thalach": 145.0,
        "exang": 0.0,
        "oldpeak": 0.8,
        "slope": 2.0,
        "ca": 0.0,
        "thal": 3.0,
        "reported_symptoms": ["Mild palpitations"]
    }
    res = client.post(
        "/api/v1/predict",
        headers={"Authorization": "Bearer demo-patient"},
        json=valid_payload
    )
    assert res.status_code == 201
    data = res.get_json()
    assert "predictionId" in data
    assert "specialistRecommendation" in data
    assert "probability" in data
    assert "disclaimer" in data


def test_prediction_endpoint_validation_failure(client):
    # Missing required clinical fields
    invalid_payload = {
        "age": 150.0,  # exceeds max human age 120
        "sex": 1.0
    }
    res = client.post(
        "/api/v1/predict",
        headers={"Authorization": "Bearer demo-patient"},
        json=invalid_payload
    )
    assert res.status_code == 422
    data = res.get_json()
    assert data["error"] == "Validation Error"


def test_medical_records_crud(client):
    payload = {
        "symptoms": ["Dyspnea on exertion"],
        "allergies": ["Sulfa"],
        "medications": ["Metoprolol 25mg"],
        "vitalSigns": {
            "bloodPressureSystolic": 135,
            "bloodPressureDiastolic": 85,
            "heartRate": 68
        },
        "notes": "Patient follow-up check."
    }
    create_res = client.post(
        "/api/v1/medical-records",
        headers={"Authorization": "Bearer demo-patient"},
        json=payload
    )
    assert create_res.status_code == 201
    rec = create_res.get_json()
    assert rec["recordId"] is not None

    list_res = client.get(
        "/api/v1/medical-records",
        headers={"Authorization": "Bearer demo-patient"}
    )
    assert list_res.status_code == 200
    list_data = list_res.get_json()
    assert list_data["count"] >= 1
