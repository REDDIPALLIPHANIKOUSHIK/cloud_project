import numpy as np
import pytest

from app import FEATURES, create_app


class ModelStub:
    def predict_proba(self, frame):
        assert list(frame.columns) == FEATURES
        return np.array([[0.2, 0.8]])


@pytest.fixture
def client():
    return create_app(ModelStub()).test_client()


def valid_payload():
    return {"age": 52, "sex": 1, "cp": 1, "trestbps": 125, "chol": 212,
            "fbs": 0, "restecg": 1, "thalach": 168, "exang": 0,
            "oldpeak": 1.0, "slope": 3, "ca": 0, "thal": 3}


def test_health_reports_loaded_model(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json["model_loaded"] is True


def test_valid_prediction_uses_positive_class_probability(client):
    response = client.post("/api/predict", json=valid_payload())
    assert response.status_code == 200
    assert response.json["risk_level"] == "High"
    assert response.json["probability"] == 0.8


def test_missing_values_are_rejected(client):
    response = client.post("/api/predict", json={"age": 52})
    assert response.status_code == 400
    assert "fields" in response.json


@pytest.mark.parametrize("field,value", [("age", 17), ("sex", 2), ("cp", 0), ("slope", 0), ("thal", 2), ("chol", "bad")])
def test_invalid_values_are_rejected(client, field, value):
    payload = valid_payload()
    payload[field] = value
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400


def test_non_json_body_is_rejected(client):
    response = client.post("/api/predict", data="no")
    assert response.status_code == 400


def test_prediction_requires_model():
    response = create_app(load_default=False).test_client().post("/api/predict", json=valid_payload())
    assert response.status_code == 503

