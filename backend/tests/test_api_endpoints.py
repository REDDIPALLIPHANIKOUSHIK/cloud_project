import pytest
import io
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
    # Missing required clinical fields and invalid age
    invalid_payload = {
        "age": 150.0,
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


def test_user_registration_and_login(client):
    import uuid
    unique_email = f"test_pat_{uuid.uuid4().hex[:8]}@example.com"
    reg_payload = {
        "email": unique_email,
        "password": "Password123!",
        "fullName": "Jane Doe",
        "role": "patient",
        "bloodGroup": "A+",
        "gender": "Female"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.get_json()
    assert "token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    token = reg_data["token"]

    # Login with same credentials
    login_res = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    assert login_data["user"]["role"] == "patient"

    # Verify session token access
    me_res = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data["user"]["email"] == unique_email


def test_document_upload_and_download(client):
    # Upload test document via multipart
    data = {
        "description": "Routine ECG Scan",
        "file": (io.BytesIO(b"%PDF-1.4 test document content"), "test_scan.pdf")
    }
    upload_res = client.post(
        "/api/v1/reports/upload",
        headers={"Authorization": "Bearer demo-patient"},
        data=data,
        content_type="multipart/form-data"
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.get_json()
    assert upload_data["fileName"] == "test_scan.pdf"
    report_id = upload_data["reportId"]

    # Download uploaded document
    download_res = client.get(
        f"/api/v1/reports/{report_id}/download",
        headers={"Authorization": "Bearer demo-patient"}
    )
    assert download_res.status_code == 200
    assert download_res.data == b"%PDF-1.4 test document content"

    # Delete document
    del_res = client.delete(
        f"/api/v1/reports/{report_id}",
        headers={"Authorization": "Bearer demo-patient"}
    )
    assert del_res.status_code == 200
