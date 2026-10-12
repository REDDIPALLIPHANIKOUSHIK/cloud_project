from flask import Blueprint, jsonify, request, g
import datetime
from pydantic import ValidationError

from backend.app.middleware.auth_middleware import token_required, require_roles
from backend.app.schemas.admin import UserRoleUpdateRequest
from backend.app.services.db_service import db
from backend.app.services.audit_service import log_audit_event

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/admin/stats", methods=["GET"])
@token_required
@require_roles(["admin"])
def get_system_stats():
    users = db.list_all("users")
    patients = db.list_all("patients")
    doctors = db.list_all("doctors")
    predictions = db.list_all("predictions")
    reports = db.list_all("lab_reports")
    grants = db.list_all("doctor_access")
    notes = db.list_all("clinical_notes")
    audit_logs = db.list_all("audit_logs")

    role_counts = {"patient": 0, "doctor": 0, "admin": 0}
    for u in users:
        r = u.get("role", "patient")
        role_counts[r] = role_counts.get(r, 0) + 1

    risk_counts = {"Low Risk": 0, "Moderate Risk": 0, "Elevated Risk": 0, "High Risk": 0}
    for p in predictions:
        cat = p.get("riskCategory", "Low Risk")
        risk_counts[cat] = risk_counts.get(cat, 0) + 1

    active_grants_count = len([g_item for g_item in grants if g_item.get("status") == "active"])

    stats = {
        "totalUsers": len(users),
        "roleDistribution": role_counts,
        "totalPatients": len(patients),
        "totalDoctors": len(doctors),
        "totalPredictions": len(predictions),
        "riskDistribution": risk_counts,
        "totalDocuments": len(reports),
        "activeDoctorGrants": active_grants_count,
        "totalClinicalNotes": len(notes),
        "totalAuditEvents": len(audit_logs)
    }

    log_audit_event(g.current_user["uid"], "ADMIN_STATS_VIEW", "admin", "system", "SUCCESS")
    return jsonify(stats), 200


@admin_bp.route("/admin/users", methods=["GET"])
@token_required
@require_roles(["admin"])
def list_all_users():
    users = db.list_all("users")
    doctors = {d.get("doctorId", d.get("userId")): d for d in db.list_all("doctors")}

    user_list = []
    for u in users:
        u_copy = dict(u)
        uid = u.get("uid")
        if uid in doctors:
            u_copy["doctorProfile"] = doctors[uid]
        user_list.append(u_copy)

    log_audit_event(g.current_user["uid"], "ADMIN_USERS_LIST_VIEW", "users", "all", "SUCCESS")
    return jsonify({"count": len(user_list), "users": user_list}), 200


@admin_bp.route("/admin/users/<uid>/role", methods=["POST"])
@token_required
@require_roles(["admin"])
def update_user_role(uid: str):
    raw_data = request.get_json() or {}
    try:
        req_in = UserRoleUpdateRequest(**raw_data)
    except ValidationError as err:
        return jsonify({"error": "Validation Error", "details": err.errors()}), 422

    target_user = db.get("users", uid)
    if not target_user:
        return jsonify({"error": "Not Found", "message": "User not found."}), 404

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    old_role = target_user.get("role")

    updates = {
        "role": req_in.role,
        "accountStatus": req_in.accountStatus or target_user.get("accountStatus", "active"),
        "updatedAt": now_iso
    }

    db.update("users", uid, updates)

    # If updating doctor verification status
    if req_in.role == "doctor":
        doc_profile = db.get("doctors", uid)
        if doc_profile:
            db.update("doctors", uid, {
                "verificationStatus": req_in.verificationStatus or doc_profile.get("verificationStatus", "verified"),
                "updatedAt": now_iso
            })

    log_audit_event(
        actor_uid=g.current_user["uid"],
        action="ADMIN_USER_ROLE_UPDATE",
        resource_type="users",
        resource_id=uid,
        outcome="SUCCESS",
        metadata={
            "oldRole": old_role,
            "newRole": req_in.role,
            "accountStatus": req_in.accountStatus
        }
    )

    return jsonify({"message": "User role updated successfully.", "user": db.get("users", uid)}), 200


@admin_bp.route("/admin/audit-logs", methods=["GET"])
@token_required
@require_roles(["admin"])
def get_audit_logs():
    logs = db.list_all("audit_logs")
    logs.sort(key=lambda l: l.get("timestamp", ""), reverse=True)
    limit = int(request.args.get("limit", 100))
    return jsonify({"count": len(logs), "logs": logs[:limit]}), 200
