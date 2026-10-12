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


@auth_bp.route("/sync-user", methods=["POST", "OPTIONS"])
def sync_user():
    if request.method == "OPTIONS":
        return "", 200

    from backend.app.middleware.auth_middleware import get_current_user_from_token
    import uuid

    user = get_current_user_from_token()
    payload = request.get_json() or {}

    uid = user["uid"] if user else payload.get("uid") or f"usr_{uuid.uuid4().hex[:10]}"
    role = payload.get("role", user.get("role", "patient") if user else "patient")

    # Protect against self-escalation to admin
    if role == "admin" and (not user or user.get("role") != "admin"):
        return jsonify({"error": "Forbidden", "message": "Admin privileges cannot be self-assigned."}), 403

    existing_user = db.get("users", uid)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if not existing_user:
        user_doc = {
            "uid": uid,
            "email": payload.get("email") or (user.get("email") if user else ""),
            "fullName": payload.get("fullName") or (user.get("fullName") if user else "User"),
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
            "verificationStatus": "verified" if ((user and user.get("email", "")) or payload.get("email", "")).endswith("@cloudproject.demo") else "unverified",
            "hospitalAffiliation": payload.get("hospitalAffiliation", "City General Hospital"),
            "createdAt": now_iso
        })

    log_audit_event(uid, "USER_LOGIN_SYNC", "users", uid, "SUCCESS")

    return jsonify({
        "message": "User synchronized successfully",
        "user": user_doc
    }), 200
