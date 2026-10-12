from flask import Blueprint, jsonify, request, g
from pydantic import ValidationError

from backend.app.middleware.auth_middleware import token_required, verify_patient_access
from backend.app.schemas.prediction import HeartDiseaseInput
from backend.app.services.model_service import model_service
from backend.app.services.db_service import db
from backend.app.services.audit_service import log_audit_event

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict", methods=["POST"])
@token_required
def run_prediction():
    user = g.current_user
    uid = user["uid"]
    role = user.get("role", "patient")

    raw_data = request.get_json() or {}

    # Target patient identification
    target_patient_id = raw_data.get("patientId", uid)
    if role == "doctor":
        # Ensure doctor is authorized by this patient
        if not verify_patient_access(target_patient_id, uid):
            return jsonify({
                "error": "Forbidden",
                "message": "You are not authorized by this patient to perform clinical AI evaluations."
            }), 403
    elif role == "patient" and target_patient_id != uid:
        return jsonify({
            "error": "Forbidden",
            "message": "Patients can only run predictions for their own profile."
        }), 403

    # Schema Validation
    try:
        clinical_input = HeartDiseaseInput(**raw_data)
    except ValidationError as err:
        return jsonify({
            "error": "Validation Error",
            "message": "The supplied clinical features failed schema validation.",
            "details": err.errors()
        }), 422
    except Exception as e:
        return jsonify({"error": "Bad Request", "message": str(e)}), 400

    # Model Inference & Specialist Recommendation
    try:
        response = model_service.predict_heart_disease(
            clinical_data=clinical_input,
            patient_id=target_patient_id
        )
    except Exception as e:
        return jsonify({
            "error": "Inference Error",
            "message": f"Failed to compute model inference: {str(e)}"
        }), 500

    # Persist prediction to database
    prediction_record = response.model_dump()
    prediction_record["requestedBy"] = uid
    prediction_record["requesterRole"] = role
    db.set("predictions", response.predictionId, prediction_record)

    log_audit_event(
        actor_uid=uid,
        action="AI_PREDICTION_RUN",
        resource_type="predictions",
        resource_id=response.predictionId,
        outcome="SUCCESS",
        metadata={
            "patientId": target_patient_id,
            "condition": response.predictedCondition,
            "riskCategory": response.riskCategory,
            "specialty": response.specialistRecommendation.specialty
        }
    )

    return jsonify(response.model_dump()), 201


@predict_bp.route("/predictions", methods=["GET"])
@token_required
def get_prediction_history():
    user = g.current_user
    uid = user["uid"]
    role = user.get("role", "patient")

    target_patient_id = request.args.get("patientId", uid)

    if role == "doctor":
        if not verify_patient_access(target_patient_id, uid):
            return jsonify({"error": "Forbidden", "message": "Doctor access not authorized for this patient."}), 403
    elif role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Access restricted to your own predictions."}), 403

    records = db.query("predictions", [("patientId", "==", target_patient_id)])
    # Sort descending by createdAt
    records.sort(key=lambda r: r.get("createdAt", ""), reverse=True)

    log_audit_event(uid, "PREDICTION_HISTORY_VIEW", "predictions", target_patient_id, "SUCCESS")

    return jsonify({
        "patientId": target_patient_id,
        "count": len(records),
        "predictions": records
    }), 200


@predict_bp.route("/predictions/<prediction_id>", methods=["GET"])
@token_required
def get_prediction_detail(prediction_id: str):
    user = g.current_user
    uid = user["uid"]
    role = user.get("role", "patient")

    pred = db.get("predictions", prediction_id)
    if not pred:
        return jsonify({"error": "Not Found", "message": "Prediction record not found."}), 404

    target_patient_id = pred.get("patientId")
    if role == "patient" and target_patient_id != uid:
        return jsonify({"error": "Forbidden", "message": "Unauthorized access to prediction."}), 403
    elif role == "doctor" and not verify_patient_access(target_patient_id, uid):
        return jsonify({"error": "Forbidden", "message": "Unauthorized to view this patient's prediction."}), 403

    return jsonify(pred), 200
