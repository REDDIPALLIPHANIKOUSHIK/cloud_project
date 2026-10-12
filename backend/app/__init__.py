import os
from flask import Flask, jsonify
from flask_cors import CORS

from backend.app.config import config
from backend.app.routes.health import health_bp
from backend.app.routes.auth_routes import auth_bp
from backend.app.routes.predict_routes import predict_bp
from backend.app.routes.records_routes import records_bp
from backend.app.routes.reports_routes import reports_bp
from backend.app.routes.doctor_routes import doctor_bp
from backend.app.routes.admin_routes import admin_bp
from backend.app.services.db_service import db


def seed_demo_data_if_empty():
    """Seeds synthetic demo records and doctor accounts if database is empty."""
    # Seed Demo Doctor
    doc_uid = "uid_demo_doctor"
    if not db.get("users", doc_uid):
        db.set("users", doc_uid, {
            "uid": doc_uid,
            "email": "doctor@cloudproject.demo",
            "fullName": "Dr. Sarah Chen, MD",
            "role": "doctor",
            "accountStatus": "active",
            "createdAt": "2026-01-15T09:00:00Z"
        })
        db.set("doctors", doc_uid, {
            "doctorId": doc_uid,
            "userId": doc_uid,
            "fullName": "Dr. Sarah Chen, MD",
            "specialization": "Cardiologist",
            "medicalLicenseNumber": "MD-CARDIO-88921",
            "hospitalAffiliation": "Metro Cardiac Institute",
            "verificationStatus": "verified",
            "yearsOfExperience": 14,
            "bio": "Consultant Cardiologist specializing in preventive cardiology and ischemic heart disease.",
            "createdAt": "2026-01-15T09:00:00Z"
        })

    # Seed Demo Patient
    pat_uid = "uid_demo_patient"
    if not db.get("users", pat_uid):
        db.set("users", pat_uid, {
            "uid": pat_uid,
            "email": "patient@cloudproject.demo",
            "fullName": "Alex Mercer",
            "role": "patient",
            "accountStatus": "active",
            "createdAt": "2026-02-01T10:00:00Z"
        })
        db.set("patients", pat_uid, {
            "patientId": pat_uid,
            "userId": pat_uid,
            "fullName": "Alex Mercer",
            "dateOfBirth": "1978-04-12",
            "gender": "Male",
            "bloodGroup": "O+",
            "phone": "+1-555-0199",
            "createdAt": "2026-02-01T10:00:00Z"
        })

        # Seed initial medical record
        rec_id = "rec_seed_001"
        db.set("medical_records", rec_id, {
            "recordId": rec_id,
            "patientId": pat_uid,
            "createdBy": pat_uid,
            "creatorRole": "patient",
            "symptoms": ["Occasional exertional chest tightness", "Mild fatigue"],
            "medicalHistory": ["Hypertension (mild)", "Hyperlipidemia"],
            "familyHistory": ["Father had myocardial infarction at age 58"],
            "allergies": ["Penicillin"],
            "medications": ["Atorvastatin 20mg daily", "Amlodipine 5mg daily"],
            "vitalSigns": {
                "bloodPressureSystolic": 138,
                "bloodPressureDiastolic": 86,
                "heartRate": 74,
                "oxygenSaturation": 98,
                "temperature": 98.4,
                "weightKg": 79.5,
                "heightCm": 178
            },
            "notes": "Patient reports chest pressure when climbing steep stairs. Blood pressure reasonably controlled on current regimen.",
            "createdAt": "2026-02-10T14:30:00Z"
        })

        # Seed initial doctor access grant
        acc_id = "acc_seed_001"
        db.set("doctor_access", acc_id, {
            "accessId": acc_id,
            "patientId": pat_uid,
            "doctorId": doc_uid,
            "purpose": "Cardiovascular assessment and consultation",
            "status": "active",
            "grantedBy": pat_uid,
            "grantedAt": "2026-02-12T11:00:00Z"
        })

    # Seed Demo Admin
    admin_uid = "uid_demo_admin"
    if not db.get("users", admin_uid):
        db.set("users", admin_uid, {
            "uid": admin_uid,
            "email": "admin@cloudproject.demo",
            "fullName": "System Administrator",
            "role": "admin",
            "accountStatus": "active",
            "createdAt": "2026-01-01T00:00:00Z"
        })


def create_app():
    app = Flask(__name__)
    app.config.from_object(config)

    # Strict CORS configuration
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Register blueprints under /api/v1
    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/api/v1")
    app.register_blueprint(predict_bp, url_prefix="/api/v1")
    app.register_blueprint(records_bp, url_prefix="/api/v1")
    app.register_blueprint(reports_bp, url_prefix="/api/v1")
    app.register_blueprint(doctor_bp, url_prefix="/api/v1")
    app.register_blueprint(admin_bp, url_prefix="/api/v1")

    # Global Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad Request", "message": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not Found", "message": "The requested endpoint does not exist."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method Not Allowed", "message": "HTTP method not supported for this endpoint."}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal Server Error", "message": "An unexpected server error occurred."}), 500

    seed_demo_data_if_empty()

    return app
