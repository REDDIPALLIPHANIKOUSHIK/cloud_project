from flask import Blueprint, jsonify, request, g
import uuid
import datetime
from pydantic import ValidationError

from backend.app.middleware.auth_middleware import token_required, require_roles, verify_patient_access
from backend.app.schemas.doctor import DoctorAccessGrantRequest, ClinicalNoteCreate, DoctorProfileUpdate
from backend.app.services.db_service import db
from backend.app.services.audit_service import log_audit_event

doctor_bp = Blueprint("doctor", __name__)


@doctor_bp.route("/doctor/directory", methods=["GET"])
@token_required
def get_doctor_directory():
    """Returns list of active/verified doctors available for consultation."""
    doctors = db.list_all("doctors")
    users = {u["uid"]: u for u in db.list_all("users")}

    directory = []
    for doc in doctors:
        u_info = users.get(doc.get("userId", doc.get("doctorId")), {})
        directory.append({
            "doctorId": doc.get("doctorId", doc.get("userId")),
            "fullName": doc.get("fullName", u_info.get("fullName", "Dr. Clinician")),
            "specialization": doc.get("specialization", "Cardiologist"),
            "hospitalAffiliation": doc.get("hospitalAffiliation", "General Medical Center"),
            "verificationStatus": doc.get("verificationStatus", "verified"),
            "yearsOfExperience": doc.get("yearsOfExperience", 10),
            "bio": doc.get("bio", "Practicing clinical specialist.")
        })

    return jsonify({"count": len(directory), "doctors": directory}), 200


@doctor_bp.route("/doctor-access", methods=["POST"])
@token_required
@require_roles(["patient"])
def grant_doctor_access():
    patient_uid = g.current_user["uid"]
    raw_data = request.get_json() or {}

    try:
        grant_in = DoctorAccessGrantRequest(**raw_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "details": err.errors()}), 422

    # Check if doctor exists
    doctor_doc = db.get("doctors", grant_in.doctorId) or db.get("users", grant_in.doctorId)
    if not doctor_doc:
        return jsonify({"error": "Not Found", "message": "Doctor account does not exist."}), 404

    # Check for existing active grant
    existing_grants = db.query(
        "doctor_access",
        [
            ("patientId", "==", patient_uid),
            ("doctorId", "==", grant_in.doctorId),
            ("status", "==", "active")
        ]
    )
    if existing_grants:
        return jsonify({
            "message": "Doctor already has active authorization.",
            "accessGrant": existing_grants[0]
        }), 200

    access_id = f"acc_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    doc = {
        "accessId": access_id,
        "patientId": patient_uid,
        "doctorId": grant_in.doctorId,
        "purpose": grant_in.purpose,
        "status": "active",
        "grantedBy": patient_uid,
        "grantedAt": now_iso,
        "revokedAt": None
    }

    db.set("doctor_access", access_id, doc)
    log_audit_event(
        actor_uid=patient_uid,
        action="DOCTOR_ACCESS_GRANTED",
        resource_type="doctor_access",
        resource_id=access_id,
        outcome="SUCCESS",
        metadata={"doctorId": grant_in.doctorId}
    )

    return jsonify({"message": "Access granted successfully.", "accessGrant": doc}), 201


@doctor_bp.route("/doctor-access/<access_id>", methods=["DELETE"])
@token_required
@require_roles(["patient"])
def revoke_doctor_access(access_id: str):
    patient_uid = g.current_user["uid"]
    grant = db.get("doctor_access", access_id)
    if not grant:
        return jsonify({"error": "Not Found", "message": "Access grant not found."}), 404

    if grant.get("patientId") != patient_uid:
        return jsonify({"error": "Forbidden", "message": "You can only revoke access granted by your account."}), 403

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db.update("doctor_access", access_id, {
        "status": "revoked",
        "revokedAt": now_iso
    })

    log_audit_event(
        actor_uid=patient_uid,
        action="DOCTOR_ACCESS_REVOKED",
        resource_type="doctor_access",
        resource_id=access_id,
        outcome="SUCCESS",
        metadata={"doctorId": grant.get("doctorId")}
    )

    return jsonify({"message": "Doctor access revoked immediately.", "accessId": access_id}), 200


@doctor_bp.route("/patient/doctor-grants", methods=["GET"])
@token_required
@require_roles(["patient"])
def list_my_doctor_grants():
    patient_uid = g.current_user["uid"]
    grants = db.query("doctor_access", [("patientId", "==", patient_uid)])
    doctors = {d.get("doctorId", d.get("userId")): d for d in db.list_all("doctors")}

    for g_item in grants:
        doc_info = doctors.get(g_item.get("doctorId"), {})
        g_item["doctorName"] = doc_info.get("fullName", "Doctor")
        g_item["doctorSpecialization"] = doc_info.get("specialization", "Specialist")

    return jsonify({"grants": grants}), 200


@doctor_bp.route("/doctor/patients", methods=["GET"])
@token_required
@require_roles(["doctor"])
def list_authorized_patients():
    doctor_uid = g.current_user["uid"]
    # Query only ACTIVE grants for this doctor
    active_grants = db.query(
        "doctor_access",
        [("doctorId", "==", doctor_uid), ("status", "==", "active")]
    )

    patient_ids = [g_doc["patientId"] for g_doc in active_grants]
    patients_list = []

    for pid in patient_ids:
        pat = db.get("patients", pid)
        if not pat:
            u = db.get("users", pid) or {}
            pat = {
                "patientId": pid,
                "fullName": u.get("fullName", "Patient"),
                "dateOfBirth": "1990-01-01",
                "gender": "Not Specified",
                "bloodGroup": "Unknown"
            }
        # Attach last prediction risk summary
        preds = db.query("predictions", [("patientId", "==", pid)])
        preds.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
        latest_pred = preds[0] if preds else None
        pat["latestPrediction"] = latest_pred

        patients_list.append(pat)

    log_audit_event(doctor_uid, "AUTHORIZED_PATIENTS_LIST_VIEW", "patients", doctor_uid, "SUCCESS")

    return jsonify({
        "count": len(patients_list),
        "patients": patients_list
    }), 200


@doctor_bp.route("/doctor/patients/<patient_id>", methods=["GET"])
@token_required
@require_roles(["doctor"])
def get_authorized_patient_detail(patient_id: str):
    doctor_uid = g.current_user["uid"]
    if not verify_patient_access(patient_id, doctor_uid):
        return jsonify({
            "error": "Forbidden",
            "message": "Doctor access has not been granted or has been revoked by this patient."
        }), 403

    patient = db.get("patients", patient_id) or {"patientId": patient_id, "fullName": "Patient"}
    records = db.query("medical_records", [("patientId", "==", patient_id)])
    reports = db.query("lab_reports", [("patientId", "==", patient_id)])
    predictions = db.query("predictions", [("patientId", "==", patient_id)])
    notes = db.query("clinical_notes", [("patientId", "==", patient_id)])

    records.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    reports.sort(key=lambda r: r.get("uploadedAt", ""), reverse=True)
    predictions.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    notes.sort(key=lambda r: r.get("createdAt", ""), reverse=True)

    log_audit_event(doctor_uid, "CLINICAL_PATIENT_RECORD_INSPECT", "patients", patient_id, "SUCCESS")

    return jsonify({
        "patient": patient,
        "records": records,
        "reports": reports,
        "predictions": predictions,
        "clinicalNotes": notes
    }), 200


@doctor_bp.route("/clinical-notes", methods=["POST"])
@token_required
@require_roles(["doctor"])
def add_clinical_note():
    doctor_uid = g.current_user["uid"]
    raw_data = request.get_json() or {}

    try:
        note_in = ClinicalNoteCreate(**raw_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "details": err.errors()}), 422

    if not verify_patient_access(note_in.patientId, doctor_uid):
        return jsonify({"error": "Forbidden", "message": "Cannot create clinical note for unauthorized patient."}), 403

    note_id = f"note_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doctor_doc = db.get("doctors", doctor_uid) or {}

    doc = {
        "noteId": note_id,
        "patientId": note_in.patientId,
        "doctorId": doctor_uid,
        "doctorName": doctor_doc.get("fullName", g.current_user.get("fullName", "Attending Clinician")),
        "specialization": doctor_doc.get("specialization", "Specialist"),
        "content": note_in.content,
        "diagnosis": note_in.diagnosis,
        "prescriptions": note_in.prescriptions,
        "followUpDate": note_in.followUpDate,
        "createdAt": now_iso,
        "updatedAt": now_iso
    }

    db.set("clinical_notes", note_id, doc)
    log_audit_event(
        actor_uid=doctor_uid,
        action="CLINICAL_NOTE_CREATE",
        resource_type="clinical_notes",
        resource_id=note_id,
        outcome="SUCCESS",
        metadata={"patientId": note_in.patientId}
    )

    return jsonify(doc), 201


@doctor_bp.route("/doctor/notes", methods=["GET"])
@token_required
@require_roles(["doctor"])
def list_my_clinical_notes():
    doctor_uid = g.current_user["uid"]
    notes = db.query("clinical_notes", [("doctorId", "==", doctor_uid)])
    notes.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    return jsonify({"count": len(notes), "notes": notes}), 200


@doctor_bp.route("/doctor/profile/me", methods=["GET"])
@token_required
@require_roles(["doctor"])
def get_my_doctor_profile():
    doctor_uid = g.current_user["uid"]
    doc = db.get("doctors", doctor_uid)
    if not doc:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        doc = {
            "doctorId": doctor_uid,
            "userId": doctor_uid,
            "fullName": g.current_user.get("fullName", "Doctor"),
            "specialization": "General Physician",
            "verificationStatus": "unverified",
            "hospitalAffiliation": "General Medical Center",
            "yearsOfExperience": 5,
            "bio": "Licensed clinical specialist.",
            "createdAt": now_iso
        }
        db.set("doctors", doctor_uid, doc)
    return jsonify(doc), 200


@doctor_bp.route("/doctor/profile", methods=["PUT"])
@token_required
@require_roles(["doctor"])
def update_my_doctor_profile():
    doctor_uid = g.current_user["uid"]
    raw_data = request.get_json() or {}
    try:
        schema = DoctorProfileUpdate(**raw_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "details": err.errors()}), 422

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    updates = {k: v for k, v in schema.model_dump().items() if v is not None}
    updates["updatedAt"] = now_iso

    updated_doc = db.update("doctors", doctor_uid, updates)
    if not updated_doc:
        updates["doctorId"] = doctor_uid
        updates["userId"] = doctor_uid
        updates["createdAt"] = now_iso
        updated_doc = db.set("doctors", doctor_uid, updates)

    if schema.fullName:
        db.update("users", doctor_uid, {"fullName": schema.fullName, "updatedAt": now_iso})

    log_audit_event(doctor_uid, "DOCTOR_PROFILE_UPDATE", "doctors", doctor_uid, "SUCCESS")
    return jsonify(updated_doc), 200

