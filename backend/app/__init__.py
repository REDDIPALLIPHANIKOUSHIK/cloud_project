import os
from flask import Flask, jsonify
from flask_cors import CORS

from backend.app.config import config
from backend.app.routes.health import health_bp
from backend.app.routes.auth_routes import auth_bp
from backend.app.routes.predict_routes import predict_bp
from backend.app.routes.records_routes import records_bp
from backend.app.routes.reports_routes import reports_bp
from backend.app.routes.doctor_routes import doctor_bp
from backend.app.routes.admin_routes import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(config)

    # Strict CORS configuration
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Register blueprints under /api/v1
    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/api/v1")
    app.register_blueprint(predict_bp, url_prefix="/api/v1")
    app.register_blueprint(records_bp, url_prefix="/api/v1")
    app.register_blueprint(reports_bp, url_prefix="/api/v1")
    app.register_blueprint(doctor_bp, url_prefix="/api/v1")
    app.register_blueprint(admin_bp, url_prefix="/api/v1")

    # Global Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad Request", "message": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not Found", "message": "The requested endpoint does not exist."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method Not Allowed", "message": "HTTP method not supported for this endpoint."}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal Server Error", "message": "An unexpected server error occurred."}), 500

    return app
