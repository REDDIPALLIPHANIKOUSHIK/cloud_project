# Heart Disease Risk Prediction and Patient Management System

An educational healthcare workspace for managing patient records, running machine-learning-assisted heart-risk assessments, and reviewing account-private history. A prediction is not a diagnosis or a substitute for professional medical advice.

## Problem and objectives

Heart-health measurements can be difficult to review consistently. This project demonstrates a complete web workflow that captures patient context, applies a reproducible classification pipeline, and keeps predictions available for later review. It is designed as an explainable internship project, not a clinical product.

## Features

- Firebase email/password registration, sign-in, persistent session, and protected pages.
- Account-scoped patient management, search, patient detail, and deletion of linked history.
- 13-feature assessment form with validation and a Flask prediction endpoint.
- Saved model output and probability, history, patient-level history, and workspace summaries.
- Analytics using actual assessment documents and the model's measured metadata when available.
- Responsive interface with accessible labels and a persistent medical disclaimer.

## Architecture and stack

React 18, Vite, React Router, Firebase Web SDK and Cloud Firestore; Flask, scikit-learn, pandas, NumPy, joblib and Gunicorn. See [architecture](docs/architecture.md), [API](docs/api.md), and [deployment](docs/deployment.md).

## Machine learning and dataset

`backend/train_model.py` loads `backend/data/heart.csv` if supplied; otherwise it downloads the UCI Cleveland Heart Disease data (processed Cleveland file) from the URL in the script. It splits stratified train/test partitions with random seed 42, imputes missing values, scales numeric features, one-hot encodes categorical features, and fits class-weighted logistic regression. The preprocessing and estimator are saved together as `backend/model/heart_disease_pipeline.joblib`. Accuracy, precision, recall, F1, ROC-AUC, confusion matrix, dataset size, and training date are measured and written to `backend/model/metadata.json` when training is run.

Measured once on the fixed 20% stratified holdout (61 rows): accuracy **86.9%**, precision **81.3%**, recall **92.9%**, F1 **86.7%**, ROC-AUC **96.6%**; confusion matrix `[[27, 6], [2, 26]]`. These are educational results from a small public dataset and one split; they do not establish clinical performance.

Feature encodings match the original Cleveland dataset columns: `age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal`; categories retain dataset codes (including chest pain 1–4, slope 1–3, and thal 3/6/7) and are one-hot encoded by the pipeline. Dataset encodings are educational and not validated clinical definitions.

## Project structure

```text
backend/       Flask inference API and model training
frontend/      React app, auth, Firestore access, dashboard and assessment workflow
firebase/      Firestore security rules, indexes and Hosting rewrite
docs/          Architecture, API and deployment guides
```

## Firebase setup

Create a Spark-plan Firebase project, enable Authentication → Email/Password, create Firestore, and register a web app. Copy the web configuration values to `frontend/.env` based on `frontend/.env.example`. From `firebase/`, deploy `firestore.rules` and `firestore.indexes.json` using Firebase CLI. The browser client requires no service account key. Rules require authenticated access and matching `ownerId` on patient and assessment records.

## Run locally

Backend (Python 3.10–3.12, matching the deployment runtime):

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python train_model.py
python app.py
```

Frontend, in a second terminal:

```bash
cd frontend
copy .env.example .env   # Windows; on macOS/Linux use cp
# Fill Firebase values and VITE_API_BASE_URL=http://localhost:5000
npm install
npm run dev
```

Open the local Vite address shown in the terminal. Without Firebase values the app deliberately shows configuration guidance rather than pretending authentication or storage works.

## Environment variables

Frontend: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_API_BASE_URL`. Backend: `CORS_ORIGINS` (comma-separated exact origins), optional `MODEL_PATH`, and platform-provided `PORT`.

## API and Firestore

See [API reference](docs/api.md). Implemented backend routes: `GET /api/health`, `GET /api/model-metadata`, `POST /api/predict`. Patient and assessment read/write operations go directly through Firestore SDK, guarded by security rules and owner filters. Collections: `users/{uid}`, `patients/{patientId}`, and `assessments/{assessmentId}`. Only user-owned patient/assessment documents are accessible.

## Deployment

Backend: Render blueprint at root `render.yaml`. Frontend: Vercel project root `frontend`, build `npm run build`, output `dist`; or Firebase Hosting using the provided rewrite. See [step-by-step deployment](docs/deployment.md). Render build trains the model; configure `CORS_ORIGINS` and frontend Firebase/API variables in hosting settings. Free plan availability and limits depend on the provider's current terms.

## Tests and evaluation

Backend tests are in `backend/tests`; run `pytest` after installing requirements. Frontend utility tests use Node's built-in test runner (`npm test`), and the production bundle is checked with `npm run build`. Run `python train_model.py` to generate evaluation values and model files. Training requires network access on the first run unless the dataset is provided locally. At runtime, the dashboard reads model metrics from the generated metadata file; the figures above are from the measured development run.

## Screenshots

Add screenshots of the dashboard, patient directory, and model result here after configuring Firebase and running the application.

## Future improvements

Add clinician-reviewed thresholds, stronger audit trails, role provisioning, richer trend analysis, and external validation on representative populations before any real-world healthcare use.

## Medical disclaimer

This application is an educational machine-learning decision-support tool. Predictions are based on a public dataset and trained model; they are not a medical diagnosis and must not replace professional medical advice or decisions by qualified healthcare professionals.

