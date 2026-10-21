import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Config:
    BASE_DIR = BASE_DIR
    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = ENV == "development"
    PORT = int(os.getenv("PORT", 5000))

    # CORS origins: Frontend origin whitelist
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
    CORS_ORIGINS = [orig.strip() for orig in FRONTEND_ORIGIN.split(",") if orig.strip()]

    # ML Artifacts
    MODEL_ARTIFACT_PATH = os.getenv(
        "MODEL_ARTIFACT_PATH",
        os.path.join(BASE_DIR, "ml", "model_artifacts", "heart_disease_model.joblib")
    )
    MODEL_METADATA_PATH = os.getenv(
        "MODEL_METADATA_PATH",
        os.path.join(BASE_DIR, "ml", "model_metadata.json")
    )

    # Firebase Admin Configuration
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

    # Storage uploads
    MAX_CONTENT_LENGTH = 15 * 1024 * 1024  # 15 MB
    ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
    IS_SERVERLESS = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    LOCAL_UPLOADS_DIR = os.getenv(
        "LOCAL_UPLOADS_DIR",
        "/tmp/data/uploads" if IS_SERVERLESS else os.path.join(BASE_DIR, "data", "uploads")
    )
    LOCAL_DB_DIR = os.getenv(
        "LOCAL_DB_DIR",
        "/tmp/data/db" if IS_SERVERLESS else os.path.join(BASE_DIR, "data", "db")
    )


config = Config()
