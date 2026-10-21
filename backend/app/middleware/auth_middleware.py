"""
Authentication & Role-Based Access Control Middleware
Verifies live Firebase ID tokens or registered database session tokens.
Enforces role-based permissions and explicit patient data ownership.
"""

from functools import wraps
from typing import List, Optional, Dict, Any
from flask import request, jsonify, g, current_app
import json

from backend.app.config import config
from backend.app.services.db_service import db

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False


def get_current_user_from_token() -> Optional[Dict[str, Any]]:
    """
    Extracts and validates the authentication token from request headers.
    Supports real Firebase ID tokens and verified database session tokens.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split("Bearer ", 1)[1].strip()
    if not token:
        return None

    # 1. Attempt live Firebase ID token verification if cloud Firebase is configured
    if FIREBASE_AVAILABLE and db.is_cloud:
        try:
            decoded = firebase_auth.verify_id_token(token)
            uid = decoded.get("uid")
            email = decoded.get("email", "")
            # Fetch authoritative user document from Firestore / DB
            user_doc = db.get("users", uid)
            role = user_doc.get("role", "patient") if user_doc else "patient"
            return {
                "uid": uid,
                "email": email,
                "role": role,
                "fullName": user_doc.get("fullName", "User") if user_doc else "User",
                "accountStatus": user_doc.get("accountStatus", "active") if user_doc else "active"
            }
        except Exception:
            pass

    # 2. Check Database Session Tokens (for standard REST API authentication)
    session_doc = db.get("sessions", token)
    if session_doc:
        uid = session_doc.get("uid")
        user_doc = db.get("users", uid)
        if user_doc and user_doc.get("accountStatus") == "active":
            return {
                "uid": user_doc["uid"],
                "email": user_doc.get("email", ""),
                "fullName": user_doc.get("fullName", "User"),
                "role": user_doc.get("role", "patient"),
                "accountStatus": user_doc.get("accountStatus", "active")
            }

    # 3. Isolated Automated Testing Mode Only
    # Synthetic tokens are strictly permitted within testing fixtures when current_app.config["TESTING"] is True
    is_testing = False
    try:
        is_testing = current_app and current_app.config.get("TESTING", False)
    except Exception:
        is_testing = False

    if is_testing:
        if token.startswith("test-"):
            role_part = token.replace("test-", "")
            if role_part in ["patient", "doctor", "admin"]:
                uid = f"uid_test_{role_part}"
                user_doc = db.get("users", uid)
                if not user_doc:
                    user_doc = {
                        "uid": uid,
                        "email": f"test_{role_part}@test.local",
                        "fullName": f"Test {role_part.capitalize()}",
                        "role": role_part,
                        "accountStatus": "active"
                    }
                    db.set("users", uid, user_doc)
                return user_doc

        try:
            data = json.loads(token)
            if isinstance(data, dict) and "uid" in data:
                return {
                    "uid": data["uid"],
                    "email": data.get("email", f"{data['uid']}@test.local"),
                    "fullName": data.get("fullName", "Test User"),
                    "role": data.get("role", "patient"),
                    "accountStatus": "active"
                }
        except Exception:
            pass

    return None


def token_required(f):
    """Requires a valid authenticated user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user = get_current_user_from_token()
        if not current_user:
            return jsonify({
                "error": "Unauthorized",
                "message": "A valid Bearer authentication token is required to access this resource."
            }), 401

        g.current_user = current_user
        return f(*args, **kwargs)
    return decorated


def require_roles(allowed_roles: List[str]):
    """Requires that the authenticated user possesses one of the allowed roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            current_user = get_current_user_from_token()
            if not current_user:
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Authentication required."
                }), 401

            user_role = current_user.get("role", "patient")
            if user_role not in allowed_roles:
                return jsonify({
                    "error": "Forbidden",
                    "message": f"Access denied. Required roles: {allowed_roles}. Your role: {user_role}."
                }), 403

            g.current_user = current_user
            return f(*args, **kwargs)
        return decorated
    return decorator


def verify_patient_access(patient_id: str, doctor_uid: str) -> bool:
    """
    Checks if a doctor currently has active access granted by the specified patient.
    """
    active_grants = db.query(
        "doctor_access",
        [
            ("patientId", "==", patient_id),
            ("doctorId", "==", doctor_uid),
            ("status", "==", "active")
        ]
    )
    return len(active_grants) > 0
