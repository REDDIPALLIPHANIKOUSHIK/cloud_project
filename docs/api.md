# API reference

Base URL is configured with `VITE_API_BASE_URL` in the frontend and is the deployed backend origin. All endpoints return JSON. CORS origins are set in backend `CORS_ORIGINS`.

## `GET /api/health`

Liveness and model readiness. Returns `{"success":true,"status":"ok","model_loaded":true}`. A false model flag means the backend is up but cannot predict.

## `GET /api/model-metadata`

Returns training metadata and measured holdout metrics after training. Returns 404 before a metadata file exists.

## `POST /api/predict`

Predicts from the Cleveland-style features below. Example request:

```json
{"age":52,"sex":1,"cp":1,"trestbps":125,"chol":212,"fbs":0,"restecg":1,"thalach":168,"exang":0,"oldpeak":1.0,"slope":3,"ca":0,"thal":3}
```

Returns `success`, integer `prediction` (0/1), `risk_level` (`Low`/`High`), model `probability` (positive class), and a cautious message. Missing, non-numeric, or out-of-range values return 400. A model that has not been trained returns 503. Server failures return a generic message and never expose a traceback.

Feature domains: age 18–120; sex {0,1}; cp {1,2,3,4}; trestbps 50–250; chol 80–700; fbs {0,1}; restecg {0,1,2}; thalach 50–250; exang {0,1}; oldpeak 0–10; slope {1,2,3}; ca {0,1,2,3}; thal {3,6,7}. These are the original Cleveland dataset encodings consumed by training and inference.

## Data persistence

Patient and assessment CRUD uses Firebase Web SDK and authenticated Firestore directly, guarded by `firebase/firestore.rules`; no unauthenticated backend CRUD endpoints exist. Each query is scoped to `ownerId` and uses the two composite indexes in `firebase/firestore.indexes.json`.

