from flask import Blueprint, jsonify, request, g, Response, send_file
import uuid
import datetime
import os

from backend.app.middleware.auth_middleware import token_required, verify_patient_access
from backend.app.config import config
from backend.app.services.db_service import db
from backend.app.services.audit_service import log_audit_event
from backend.app.services.pdf_service import generate_clinical_summary_text

reports_bp = Blueprint("reports", __name__)


def _get_storage_dir(patient_id: str) -> str:
    path = os.path.join(config.BASE_DIR, "data", "storage", "patients", patient_id)
    os.makedirs(path, exist_ok=True)
    return path


@reports_bp.route("/reports/upload", methods=["POST"])
@token_required
def upload_report_file():
    """Securely uploads and validates a private medical document (PDF, JPG, JPEG, PNG)."""
    uid = g.current_user["uid"]
    role = g.current_user.get("role", "patient")

    target_patient_id = request.form.get("patientId", uid)
    if role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Cannot upload documents for other patients."}), 403

    if "file" not in request.files:
        return jsonify({"error": "Bad Request", "message": "No file payload provided in request."}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Bad Request", "message": "Uploaded file must have a valid filename."}), 400

    file_name = file.filename
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if ext not in config.ALLOWED_EXTENSIONS:
        return jsonify({
            "error": "Invalid File Type",
            "message": f"Allowed extensions are: {', '.join(config.ALLOWED_EXTENSIONS)}"
        }), 400

    # Read content to verify file size (max 10MB)
    file_bytes = file.read()
    file_size = len(file_bytes)
    max_bytes = 10 * 1024 * 1024
    if file_size > max_bytes:
        return jsonify({
            "error": "File Too Large",
            "message": "Document file size exceeds maximum limit of 10 MB."
        }), 413

    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    description = request.form.get("description", "Medical clinical report").strip()
    file_type = file.content_type or ("application/pdf" if ext == "pdf" else f"image/{ext}")

    # Persist in private storage directory
    patient_dir = _get_storage_dir(target_patient_id)
    secure_filename = f"{report_id}_{file_name}"
    local_path = os.path.join(patient_dir, secure_filename)

    with open(local_path, "wb") as f_out:
        f_out.write(file_bytes)

    doc = {
        "reportId": report_id,
        "patientId": target_patient_id,
        "fileName": file_name,
        "fileType": file_type,
        "fileSize": file_size,
        "storagePath": f"patients/{target_patient_id}/documents/{secure_filename}",
        "localFilePath": local_path,
        "description": description,
        "uploadedBy": uid,
        "uploaderRole": role,
        "uploadedAt": now_iso
    }

    db.set("lab_reports", report_id, doc)
    log_audit_event(uid, "DOCUMENT_FILE_UPLOAD", "lab_reports", report_id, "SUCCESS", {
        "fileName": file_name,
        "fileSize": file_size,
        "patientId": target_patient_id
    })

    safe_doc = {k: v for k, v in doc.items() if k != "localFilePath"}
    return jsonify(safe_doc), 201


@reports_bp.route("/reports/metadata", methods=["POST"])
@token_required
def create_report_metadata():
    uid = g.current_user["uid"]
    role = g.current_user.get("role", "patient")
    payload = request.get_json() or {}

    target_patient_id = payload.get("patientId", uid)
    if role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Cannot upload documents for other patients."}), 403

    file_name = payload.get("fileName", "document.pdf")
    file_type = payload.get("fileType", "application/pdf")
    file_size = payload.get("fileSize", 0)
    description = payload.get("description", "Medical lab test report")
    storage_path = payload.get("storagePath", f"patients/{target_patient_id}/documents/{file_name}")

    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if ext not in config.ALLOWED_EXTENSIONS:
        return jsonify({
            "error": "Invalid File Type",
            "message": f"Allowed extensions are: {', '.join(config.ALLOWED_EXTENSIONS)}"
        }), 400

    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    doc = {
        "reportId": report_id,
        "patientId": target_patient_id,
        "fileName": file_name,
        "fileType": file_type,
        "fileSize": file_size,
        "storagePath": storage_path,
        "description": description,
        "uploadedBy": uid,
        "uploaderRole": role,
        "uploadedAt": now_iso
    }

    db.set("lab_reports", report_id, doc)
    log_audit_event(uid, "DOCUMENT_METADATA_SAVE", "lab_reports", report_id, "SUCCESS")

    return jsonify(doc), 201


@reports_bp.route("/reports", methods=["GET"])
@token_required
def list_reports():
    uid = g.current_user["uid"]
    role = g.current_user.get("role", "patient")
    target_patient_id = request.args.get("patientId", uid)

    if role == "doctor":
        if not verify_patient_access(target_patient_id, uid):
            return jsonify({"error": "Forbidden", "message": "Doctor access not authorized for this patient."}), 403
    elif role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Access restricted to your own documents."}), 403

    reports = db.query("lab_reports", [("patientId", "==", target_patient_id)])
    reports.sort(key=lambda r: r.get("uploadedAt", ""), reverse=True)

    # Exclude internal local file paths from API response
    sanitized_reports = []
    for r in reports:
        safe_r = {k: v for k, v in r.items() if k != "localFilePath"}
        sanitized_reports.append(safe_r)

    log_audit_event(uid, "DOCUMENT_LIST_VIEW", "lab_reports", target_patient_id, "SUCCESS")
    return jsonify({
        "patientId": target_patient_id,
        "count": len(sanitized_reports),
        "reports": sanitized_reports
    }), 200


@reports_bp.route("/reports/<report_id>/download", methods=["GET"])
@token_required
def download_report_file(report_id: str):
    """Securely downloads a private medical document with strict authorization check."""
    uid = g.current_user["uid"]
    role = g.current_user.get("role", "patient")

    report = db.get("lab_reports", report_id)
    if not report:
        return jsonify({"error": "Not Found", "message": "Document record not found."}), 404

    target_patient_id = report.get("patientId")
    if role == "doctor":
        if not verify_patient_access(target_patient_id, uid):
            return jsonify({"error": "Forbidden", "message": "Doctor access not authorized for this patient."}), 403
    elif role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Cannot download another patient's documents."}), 403

    local_path = report.get("localFilePath")
    if not local_path or not os.path.exists(local_path):
        return jsonify({"error": "Not Found", "message": "Stored document file is not present on storage volume."}), 404

    log_audit_event(uid, "DOCUMENT_DOWNLOAD", "lab_reports", report_id, "SUCCESS")
    return send_file(
        local_path,
        mimetype=report.get("fileType", "application/octet-stream"),
        as_attachment=True,
        download_name=report.get("fileName", "medical_report.pdf")
    )


@reports_bp.route("/reports/<report_id>", methods=["DELETE"])
@token_required
def delete_report(report_id: str):
    uid = g.current_user["uid"]
    report = db.get("lab_reports", report_id)
    if not report:
        return jsonify({"error": "Not Found", "message": "Report not found."}), 404

    if report.get("patientId") != uid and g.current_user.get("role") != "admin":
        return jsonify({"error": "Forbidden", "message": "You can only delete your own documents."}), 403

    # Clean up local file if present
    local_path = report.get("localFilePath")
    if local_path and os.path.exists(local_path):
        try:
            os.remove(local_path)
        except Exception:
            pass

    db.delete("lab_reports", report_id)
    log_audit_event(uid, "DOCUMENT_DELETE", "lab_reports", report_id, "SUCCESS")

    return jsonify({"message": "Report document deleted successfully.", "reportId": report_id}), 200


@reports_bp.route("/reports/summary/download", methods=["GET"])
@token_required
def download_clinical_summary():
    uid = g.current_user["uid"]
    role = g.current_user.get("role", "patient")
    target_patient_id = request.args.get("patientId", uid)

    if role == "doctor":
        if not verify_patient_access(target_patient_id, uid):
            return jsonify({"error": "Forbidden", "message": "Doctor access not authorized for this patient."}), 403
    elif role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Access restricted to your own summary."}), 403

    patient = db.get("patients", target_patient_id) or {"patientId": target_patient_id, "fullName": "Patient"}
    records = db.query("medical_records", [("patientId", "==", target_patient_id)])
    predictions = db.query("predictions", [("patientId", "==", target_patient_id)])

    records.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    predictions.sort(key=lambda r: r.get("createdAt", ""), reverse=True)

    summary_text = generate_clinical_summary_text(
        patient=patient,
        records=records,
        predictions=predictions,
        requester_role=role
    )

    log_audit_event(uid, "CLINICAL_SUMMARY_EXPORT", "reports", target_patient_id, "SUCCESS")

    return Response(
        summary_text,
        mimetype="text/plain",
        headers={"Content-Disposition": f"attachment; filename=Health_Summary_{target_patient_id[:8]}.txt"}
    )
