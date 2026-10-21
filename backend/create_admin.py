"""
CLI Administrator Provisioning Utility
Creates a secure administrator account directly in the database.
Enforces that administrator accounts cannot be self-registered via public forms.
"""

import sys
import os
import argparse
import datetime
import uuid

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.services.db_service import db
from backend.app.routes.auth_routes import hash_password
from backend.app.services.audit_service import log_audit_event


def provision_admin(email: str, password: str, full_name: str = "System Administrator"):
    email = email.strip().lower()
    if not email or "@" not in email:
        print("[Error] A valid email address is required.")
        sys.exit(1)

    if not password or len(password) < 8:
        print("[Error] Administrator password must be at least 8 characters long.")
        sys.exit(1)

    existing = db.query("users", [("email", "==", email)])
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if existing:
        user = existing[0]
        uid = user["uid"]
        db.update("users", uid, {
            "role": "admin",
            "passwordHash": hash_password(password),
            "accountStatus": "active",
            "fullName": full_name,
            "updatedAt": now_iso
        })
        print(f"[Success] Updated existing user '{email}' (UID: {uid}) with Administrator privileges.")
    else:
        uid = f"admin_{uuid.uuid4().hex[:10]}"
        user_doc = {
            "uid": uid,
            "email": email,
            "fullName": full_name,
            "role": "admin",
            "passwordHash": hash_password(password),
            "accountStatus": "active",
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
        db.set("users", uid, user_doc)
        print(f"[Success] Created new Administrator account '{email}' (UID: {uid}).")

    log_audit_event(uid, "ADMIN_ACCOUNT_PROVISIONED", "users", uid, "SUCCESS", {"email": email})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision a MediCloud AI Administrator Account.")
    parser.add_argument("--email", required=True, help="Administrator email address")
    parser.add_argument("--password", required=True, help="Secure password (minimum 8 characters)")
    parser.add_argument("--name", default="System Administrator", help="Full name of administrator")

    args = parser.parse_args()
    provision_admin(args.email, args.password, args.name)
