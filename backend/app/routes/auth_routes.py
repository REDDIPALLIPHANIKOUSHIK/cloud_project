from flask import Blueprint, jsonify, request, g
import datetime
from backend.app.middleware.auth_middleware import token_required
from backend.app.services.db_service import db
from backend.app.services.audit_service import log_audit_event

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user_profile():
    user = g.current_user
    uid = user["uid"]
    role = user.get("role", "patient")

    role_data = None
    if role == "patient":
        role_data = db.get("patients", uid)
    elif role == "doctor":
        role_data = db.get("doctors", uid)

    return jsonify({
        "user": user,
        "profile": role_data
    }), 200


@auth_bp.route("/sync-user", methods=["POST"])
@token_required
def sync_user():
    user = g.current_user
    uid = user["uid"]
    payload = request.get_json() or {}

    role = payload.get("role", user.get("role", "patient"))
    # Protect against self-escalation to admin
    if role == "admin" and user.get("role") != "admin":
        return jsonify({"error": "Forbidden", "message": "Admin privileges cannot be self-assigned."}), 403

    existing_user = db.get("users", uid)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if not existing_user:
        user_doc = {
            "uid": uid,
            "email": payload.get("email", user.get("email")),
            "fullName": payload.get("fullName", user.get("fullName", "User")),
            "role": role,
            "accountStatus": "active",
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
        db.set("users", uid, user_doc)
    else:
        user_doc = existing_user
        # Keep verified role unless admin changed it
        role = existing_user.get("role", role)

    # Initialize role-specific collection if needed
    if role == "patient" and not db.get("patients", uid):
        db.set("patients", uid, {
            "patientId": uid,
            "userId": uid,
            "fullName": user_doc.get("fullName"),
            "dateOfBirth": payload.get("dateOfBirth", "1990-01-01"),
            "gender": payload.get("gender", "Unspecified"),
            "bloodGroup": payload.get("bloodGroup", "Unknown"),
            "phone": payload.get("phone", ""),
            "createdAt": now_iso
        })
    elif role == "doctor" and not db.get("doctors", uid):
        db.set("doctors", uid, {
            "doctorId": uid,
            "userId": uid,
            "fullName": user_doc.get("fullName"),
            "specialization": payload.get("specialization", "General Medicine"),
            "medicalLicenseNumber": payload.get("medicalLicenseNumber", "LIC-" + uid[:6].upper()),
            "verificationStatus": "verified" if user.get("email", "").endswith("@cloudproject.demo") else "unverified",
            "hospitalAffiliation": payload.get("hospitalAffiliation", "City General Hospital"),
            "createdAt": now_iso
        })

    log_audit_event(uid, "USER_LOGIN_SYNC", "users", uid, "SUCCESS")

    return jsonify({
        "message": "User synchronized successfully",
        "user": user_doc
    }), 200
