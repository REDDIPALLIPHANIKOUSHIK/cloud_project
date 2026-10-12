from flask import Blueprint, jsonify, request, g
import uuid
import datetime
from pydantic import ValidationError

from backend.app.middleware.auth_middleware import token_required, verify_patient_access
from backend.app.schemas.records import MedicalRecordCreate, PatientProfileUpdate
from backend.app.services.db_service import db
from backend.app.services.audit_service import log_audit_event

records_bp = Blueprint("records", __name__)


@records_bp.route("/patients/me", methods=["GET"])
@token_required
def get_my_patient_profile():
    uid = g.current_user["uid"]
    patient = db.get("patients", uid)
    if not patient:
        # Create default empty profile if missing
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        patient = {
            "patientId": uid,
            "userId": uid,
            "fullName": g.current_user.get("fullName", "Patient"),
            "dateOfBirth": "1990-01-01",
            "gender": "Not Specified",
            "bloodGroup": "Unknown",
            "phone": "",
            "createdAt": now_iso
        }
        db.set("patients", uid, patient)
    return jsonify(patient), 200


@records_bp.route("/patients/me", methods=["PUT"])
@token_required
def update_my_patient_profile():
    uid = g.current_user["uid"]
    raw_data = request.get_json() or {}
    try:
        update_schema = PatientProfileUpdate(**raw_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "details": err.errors()}), 422

    updates = {k: v for k, v in update_schema.model_dump().items() if v is not None}
    updates["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    updated_doc = db.update("patients", uid, updates)
    if not updated_doc:
        updates["patientId"] = uid
        updates["userId"] = uid
        updated_doc = db.set("patients", uid, updates)

    log_audit_event(uid, "PATIENT_PROFILE_UPDATE", "patients", uid, "SUCCESS")
    return jsonify(updated_doc), 200


@records_bp.route("/medical-records", methods=["POST"])
@token_required
def create_medical_record():
    uid = g.current_user["uid"]
    role = g.current_user.get("role", "patient")

    raw_data = request.get_json() or {}
    target_patient_id = raw_data.get("patientId", uid)

    if role == "doctor":
        if not verify_patient_access(target_patient_id, uid):
            return jsonify({"error": "Forbidden", "message": "Doctor access not authorized for this patient."}), 403
    elif role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Cannot submit records for other patients."}), 403

    try:
        record_in = MedicalRecordCreate(**raw_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "details": err.errors()}), 422

    record_id = f"rec_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    doc = {
        "recordId": record_id,
        "patientId": target_patient_id,
        "createdBy": uid,
        "creatorRole": role,
        "symptoms": record_in.symptoms,
        "medicalHistory": record_in.medicalHistory,
        "familyHistory": record_in.familyHistory,
        "allergies": record_in.allergies,
        "medications": record_in.medications,
        "vitalSigns": record_in.vitalSigns.model_dump() if record_in.vitalSigns else {},
        "notes": record_in.notes or "",
        "createdAt": now_iso,
        "updatedAt": now_iso
    }

    db.set("medical_records", record_id, doc)
    log_audit_event(uid, "MEDICAL_RECORD_CREATE", "medical_records", record_id, "SUCCESS")

    return jsonify(doc), 201


@records_bp.route("/medical-records", methods=["GET"])
@token_required
def get_medical_records():
    uid = g.current_user["uid"]
    role = g.current_user.get("role", "patient")

    target_patient_id = request.args.get("patientId", uid)

    if role == "doctor":
        if not verify_patient_access(target_patient_id, uid):
            return jsonify({"error": "Forbidden", "message": "Doctor access not authorized for this patient."}), 403
    elif role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Access restricted to your own records."}), 403

    records = db.query("medical_records", [("patientId", "==", target_patient_id)])
    records.sort(key=lambda r: r.get("createdAt", ""), reverse=True)

    log_audit_event(uid, "MEDICAL_RECORDS_LIST", "medical_records", target_patient_id, "SUCCESS")

    return jsonify({
        "patientId": target_patient_id,
        "count": len(records),
        "records": records
    }), 200
