from flask import Blueprint, jsonify
import datetime
from backend.app.config import config
from backend.app.services.model_service import model_service
from backend.app.services.db_service import db

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Cloud-Based Healthcare Data Management & AI Prediction API",
        "version": "1.0.0",
        "environment": config.ENV,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database": "Cloud Firestore" if db.is_cloud else "Local Persistent Storage Engine",
        "model": {
            "name": model_service.metadata.get("model_name", "RandomForest"),
            "version": model_service.metadata.get("version", "1.0.0"),
            "status": "loaded" if model_service.model is not None else "unloaded",
            "accuracy": model_service.metadata.get("metrics", {}).get("accuracy")
        }
    }), 200
