"""Flask inference API. Patient data and identity are managed in Firestore by the client."""
from __future__ import annotations

import json
import os
from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
FEATURES = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
            "thalach", "exang", "oldpeak", "slope", "ca", "thal"]
RANGES = {"age": (18, 120), "sex": (0, 1), "cp": (1, 4), "trestbps": (50, 250),
          "chol": (80, 700), "fbs": (0, 1), "restecg": (0, 2), "thalach": (50, 250),
          "exang": (0, 1), "oldpeak": (0, 10), "slope": (1, 3), "ca": (0, 3), "thal": (3, 7)}
ALLOWED_CODES = {"sex": {0, 1}, "cp": {1, 2, 3, 4}, "fbs": {0, 1}, "restecg": {0, 1, 2},
                 "exang": {0, 1}, "slope": {1, 2, 3}, "ca": {0, 1, 2, 3}, "thal": {3, 6, 7}}


def create_app(model=None, load_default=True):
    app = Flask(__name__)
    origins = [origin.strip() for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}})
    if model is None and load_default:
        model_path = Path(os.getenv("MODEL_PATH", BASE_DIR / "model/heart_disease_pipeline.joblib"))
        try:
            model = joblib.load(model_path) if model_path.exists() else None
        except Exception:
            app.logger.exception("Model failed to load")
            model = None
    app.config["PREDICTION_MODEL"] = model

    @app.get("/api/health")
    def health():
        return jsonify(success=True, status="ok", model_loaded=app.config["PREDICTION_MODEL"] is not None)

    @app.get("/api/model-metadata")
    def model_metadata():
        path = BASE_DIR / "model" / "metadata.json"
        if not path.exists():
            return jsonify(success=False, error="Model metadata is not available until the model is trained."), 404
        try:
            return jsonify(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            return jsonify(success=False, error="Model metadata could not be read."), 500

    @app.post("/api/predict")
    def predict():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(success=False, error="A JSON object is required."), 400
        missing = [name for name in FEATURES if name not in payload]
        if missing:
            return jsonify(success=False, error="Required fields are missing.", fields=missing), 400
        values = {}
        for name, (low, high) in RANGES.items():
            try:
                value = float(payload[name])
                if not (low <= value <= high) or (name in ALLOWED_CODES and value not in ALLOWED_CODES[name]):
                    raise ValueError
                values[name] = value
            except (TypeError, ValueError):
                return jsonify(success=False, error="One or more values are outside the accepted range.", field=name), 400
        model = app.config["PREDICTION_MODEL"]
        if model is None:
            return jsonify(success=False, error="Prediction model is not available. Train it with python train_model.py."), 503
        try:
            probability = float(model.predict_proba(pd.DataFrame([values], columns=FEATURES))[0][1])
            prediction = int(probability >= 0.5)
            return jsonify(success=True, prediction=prediction,
                           risk_level="High" if prediction else "Low", probability=probability,
                           message="Model predicts elevated cardiovascular risk." if prediction
                           else "Model predicts lower cardiovascular risk.")
        except Exception:
            app.logger.exception("Prediction failed")
            return jsonify(success=False, error="The prediction could not be completed."), 500

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(success=False, error="Endpoint not found."), 404

    @app.errorhandler(500)
    def internal_error(_error):
        return jsonify(success=False, error="An internal error occurred."), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)

