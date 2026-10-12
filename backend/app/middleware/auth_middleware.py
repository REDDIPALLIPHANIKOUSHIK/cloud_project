"""
Authentication & Role-Based Access Control Middleware
Verifies Firebase ID tokens or structured mock tokens for local testing.
Enforces role-based permissions and explicit patient data ownership.
"""

from functools import wraps
from typing import List, Optional, Dict, Any
from flask import request, jsonify, g
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
    Supports real Firebase ID tokens and structured local/demo tokens.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split("Bearer ", 1)[1].strip()
    if not token:
        return None

    # 1. Attempt live Firebase ID token verification if configured
    if FIREBASE_AVAILABLE and db.is_cloud:
        try:
            decoded = firebase_auth.verify_id_token(token)
            uid = decoded.get("uid")
            email = decoded.get("email", "")
            # Fetch user record from database to retrieve authoritative role
            user_doc = db.get("users", uid)
            role = user_doc.get("role", "patient") if user_doc else "patient"
            return {
                "uid": uid,
                "email": email,
                "role": role,
                "accountStatus": user_doc.get("accountStatus", "active") if user_doc else "active"
            }
        except Exception as e:
            # Token may be local mock token
            pass

    # 2. Local / Development / Demo token verification
    # Supports "demo-patient", "demo-doctor", "demo-admin", or JSON payload
    if token.startswith("demo-"):
        role_part = token.replace("demo-", "")
        if role_part in ["patient", "doctor", "admin"]:
            uid = f"uid_demo_{role_part}"
            user_doc = db.get("users", uid)
            if not user_doc:
                # Seed mock user on-the-fly
                user_doc = {
                    "uid": uid,
                    "email": f"{role_part}@cloudproject.demo",
                    "fullName": f"Demo {role_part.capitalize()}",
                    "role": role_part,
                    "accountStatus": "active"
                }
                db.set("users", uid, user_doc)
            return user_doc

    # Supports base64 or JSON token encoding for testing: {"uid": "...", "role": "..."}
    try:
        data = json.loads(token)
        if isinstance(data, dict) and "uid" in data:
            uid = data["uid"]
            user_doc = db.get("users", uid)
            role = data.get("role", user_doc.get("role", "patient") if user_doc else "patient")
            return {
                "uid": uid,
                "email": data.get("email", f"{uid}@test.local"),
                "role": role,
                "accountStatus": "active"
            }
    except Exception:
        pass

    # If the token is a simple UID string
    user_doc = db.get("users", token)
    if user_doc:
        return user_doc

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
