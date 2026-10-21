from flask import Blueprint, jsonify, request, g
import datetime
import hashlib
import secrets
import uuid

from backend.app.middleware.auth_middleware import token_required, get_current_user_from_token
from backend.app.services.db_service import db
from backend.app.services.audit_service import log_audit_event

auth_bp = Blueprint("auth", __name__)


def hash_password(password: str) -> str:
    """Securely hashes a password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()
    return f"{salt}:{pwd_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a plain password against the stored salt:hash string."""
    try:
        salt, expected_hash = stored_hash.split(":", 1)
        pwd_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000
        ).hex()
        return secrets.compare_digest(pwd_hash, expected_hash)
    except Exception:
        return False


def create_session(uid: str, role: str) -> str:
    """Creates and stores a cryptographically secure user session token."""
    token = f"sess_{secrets.token_hex(32)}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db.set("sessions", token, {
        "token": token,
        "uid": uid,
        "role": role,
        "createdAt": now_iso
    })
    return token


@auth_bp.route("/auth/register", methods=["POST"])
def register():
    """Register a new patient or doctor account with credentials."""
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    fullName = payload.get("fullName", "").strip()
    role = payload.get("role", "patient").strip().lower()

    if not email or "@" not in email:
        return jsonify({"error": "Bad Request", "message": "A valid email address is required."}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Bad Request", "message": "Password must be at least 6 characters long."}), 400
    if not fullName:
        return jsonify({"error": "Bad Request", "message": "Full name is required."}), 400

    if role not in ["patient", "doctor"]:
        return jsonify({"error": "Bad Request", "message": "Invalid registration role. Must be 'patient' or 'doctor'."}), 400

    # Ensure email is unique
    existing_users = db.query("users", [("email", "==", email)])
    if existing_users:
        return jsonify({"error": "Conflict", "message": "An account with this email address already exists."}), 409

    uid = f"usr_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    pwd_hash = hash_password(password)

    user_doc = {
        "uid": uid,
        "email": email,
        "fullName": fullName,
        "role": role,
        "passwordHash": pwd_hash,
        "accountStatus": "active",
        "createdAt": now_iso,
        "updatedAt": now_iso
    }
    db.set("users", uid, user_doc)

    profile_data = None
    if role == "patient":
        profile_data = {
            "patientId": uid,
            "userId": uid,
            "fullName": fullName,
            "dateOfBirth": payload.get("dateOfBirth", "1990-01-01"),
            "gender": payload.get("gender", "Not Specified"),
            "bloodGroup": payload.get("bloodGroup", "Unknown"),
            "phone": payload.get("phone", ""),
            "createdAt": now_iso
        }
        db.set("patients", uid, profile_data)
    elif role == "doctor":
        profile_data = {
            "doctorId": uid,
            "userId": uid,
            "fullName": fullName,
            "specialization": payload.get("specialization", "General Physician"),
            "medicalLicenseNumber": payload.get("medicalLicenseNumber", "").strip(),
            "verificationStatus": "unverified",  # Requires Administrator verification
            "hospitalAffiliation": payload.get("hospitalAffiliation", "General Medical Center"),
            "yearsOfExperience": int(payload.get("yearsOfExperience", 5)),
            "bio": payload.get("bio", "Licensed clinical specialist."),
            "createdAt": now_iso
        }
        db.set("doctors", uid, profile_data)

    token = create_session(uid, role)
    log_audit_event(uid, "USER_REGISTER", "users", uid, "SUCCESS", {"role": role, "email": email})

    # Return safe user doc without passwordHash
    safe_user = {k: v for k, v in user_doc.items() if k != "passwordHash"}

    return jsonify({
        "message": "Account created successfully.",
        "token": token,
        "user": safe_user,
        "profile": profile_data
    }), 201


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    """Authenticate a registered user and return an active session."""
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        return jsonify({"error": "Bad Request", "message": "Email and password are required."}), 400

    matching_users = db.query("users", [("email", "==", email)])
    if not matching_users:
        return jsonify({"error": "Unauthorized", "message": "Invalid email or password."}), 401

    user_doc = matching_users[0]
    stored_hash = user_doc.get("passwordHash")

    if not stored_hash or not verify_password(password, stored_hash):
        log_audit_event(user_doc.get("uid", "unknown"), "USER_LOGIN_FAILED", "users", email, "FAILURE")
        return jsonify({"error": "Unauthorized", "message": "Invalid email or password."}), 401

    if user_doc.get("accountStatus") == "suspended":
        return jsonify({"error": "Forbidden", "message": "Your account has been suspended. Contact support."}), 403

    uid = user_doc["uid"]
    role = user_doc.get("role", "patient")
    token = create_session(uid, role)

    profile_data = None
    if role == "patient":
        profile_data = db.get("patients", uid)
    elif role == "doctor":
        profile_data = db.get("doctors", uid)

    log_audit_event(uid, "USER_LOGIN", "users", uid, "SUCCESS")

    safe_user = {k: v for k, v in user_doc.items() if k != "passwordHash"}

    return jsonify({
        "message": "Login successful.",
        "token": token,
        "user": safe_user,
        "profile": profile_data
    }), 200


@auth_bp.route("/auth/forgot-password", methods=["POST"])
def forgot_password():
    """Handle password reset requests securely."""
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Bad Request", "message": "Email is required."}), 400

    matching = db.query("users", [("email", "==", email)])
    if matching:
        log_audit_event(matching[0]["uid"], "PASSWORD_RESET_REQUEST", "users", email, "SUCCESS")

    return jsonify({
        "message": "If an account associated with this email exists, password reset instructions have been logged/dispatched."
    }), 200


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

    safe_user = {k: v for k, v in user.items() if k != "passwordHash"}

    return jsonify({
        "user": safe_user,
        "profile": role_data
    }), 200


@auth_bp.route("/sync-user", methods=["POST", "OPTIONS"])
def sync_user():
    if request.method == "OPTIONS":
        return "", 200

    user = get_current_user_from_token()
    payload = request.get_json() or {}

    uid = user["uid"] if user else payload.get("uid") or f"usr_{uuid.uuid4().hex[:10]}"
    role = payload.get("role", user.get("role", "patient") if user else "patient")

    # Strict protection against self-escalation to admin
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
        role = existing_user.get("role", role)

    # Initialize role-specific collection if needed
    if role == "patient" and not db.get("patients", uid):
        db.set("patients", uid, {
            "patientId": uid,
            "userId": uid,
            "fullName": user_doc.get("fullName"),
            "dateOfBirth": payload.get("dateOfBirth", "1990-01-01"),
            "gender": payload.get("gender", "Not Specified"),
            "bloodGroup": payload.get("bloodGroup", "Unknown"),
            "phone": payload.get("phone", ""),
            "createdAt": now_iso
        })
    elif role == "doctor" and not db.get("doctors", uid):
        db.set("doctors", uid, {
            "doctorId": uid,
            "userId": uid,
            "fullName": user_doc.get("fullName"),
            "specialization": payload.get("specialization", "General Physician"),
            "medicalLicenseNumber": payload.get("medicalLicenseNumber", "").strip(),
            "verificationStatus": "unverified",  # Default to unverified; admin verification workflow required
            "hospitalAffiliation": payload.get("hospitalAffiliation", "General Medical Center"),
            "createdAt": now_iso
        })

    log_audit_event(uid, "USER_LOGIN_SYNC", "users", uid, "SUCCESS")

    safe_user = {k: v for k, v in user_doc.items() if k != "passwordHash"}

    return jsonify({
        "message": "User synchronized successfully",
        "user": safe_user
    }), 200
