import pytest
from backend.app import create_app
from backend.app.services.db_service import db


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_cross_patient_access_forbidden(client):
    # Patient tries to view another patient's medical records
    res = client.get(
        "/api/v1/medical-records?patientId=other_patient_999",
        headers={"Authorization": "Bearer demo-patient"}
    )
    assert res.status_code == 403
    data = res.get_json()
    assert data["error"] == "Forbidden"


def test_unauthorized_doctor_access_forbidden(client):
    # Doctor tries to access patient who has NOT granted access
    res = client.get(
        "/api/v1/doctor/patients/unauthorized_patient_888",
        headers={"Authorization": "Bearer demo-doctor"}
    )
    assert res.status_code == 403


def test_revoked_doctor_access_blocks_immediately(client):
    # Grant access to doctor first
    grant_res = client.post(
        "/api/v1/doctor-access",
        headers={"Authorization": "Bearer demo-patient"},
        json={"doctorId": "uid_demo_doctor", "purpose": "Testing revocation"}
    )
    assert grant_res.status_code in [200, 201]
    grant_data = grant_res.get_json()
    access_id = grant_data.get("accessGrant", {}).get("accessId")

    # Doctor can now access demo-patient
    access_res = client.get(
        "/api/v1/doctor/patients/uid_demo_patient",
        headers={"Authorization": "Bearer demo-doctor"}
    )
    assert access_res.status_code == 200

    # Now Patient revokes access
    revoke_res = client.delete(
        f"/api/v1/doctor-access/{access_id}",
        headers={"Authorization": "Bearer demo-patient"}
    )
    assert revoke_res.status_code == 200

    # Doctor is now blocked
    blocked_res = client.get(
        "/api/v1/doctor/patients/uid_demo_patient",
        headers={"Authorization": "Bearer demo-doctor"}
    )
    assert blocked_res.status_code == 403


def test_patient_self_promotion_to_admin_blocked(client):
    res = client.post(
        "/api/v1/sync-user",
        headers={"Authorization": "Bearer demo-patient"},
        json={"role": "admin"}
    )
    assert res.status_code == 403


def test_admin_endpoints_require_admin_role(client):
    # Patient attempting admin route
    res = client.get(
        "/api/v1/admin/stats",
        headers={"Authorization": "Bearer demo-patient"}
    )
    assert res.status_code == 403

    # Admin accessing admin route
    res_admin = client.get(
        "/api/v1/admin/stats",
        headers={"Authorization": "Bearer demo-admin"}
    )
    assert res_admin.status_code == 200
    data = res_admin.get_json()
    assert "totalUsers" in data
    assert "roleDistribution" in data
