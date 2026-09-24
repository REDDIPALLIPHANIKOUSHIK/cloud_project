# Heart Disease Risk Prediction and Cloud Health Records

An educational healthcare workspace for account-private patient records, medical documents, and machine-learning-assisted heart-risk assessments. The current AI module predicts heart-disease risk from the Cleveland dataset; it does not claim to predict unrelated diseases. Predictions are not diagnoses or a substitute for professional medical advice.

**Live site:** [Cardia Heart Health Workspace](https://cardiac-omega.vercel.app/)

## Features

- Firebase email/password authentication and protected pages.
- Account-scoped patient management, search, and patient-level history.
- Medical records organized by patient: visit notes, lab reports, prescriptions, diagnostic images, discharge summaries, and other records.
- Optional private PDF/image attachments in Firebase Storage (PDF, JPEG, PNG, WebP; maximum 10 MB), with authenticated download and deletion.
- 13-feature heart-risk assessment and Flask prediction endpoint, with saved results and history.
- Workspace summaries and analytics based on saved data.
- Responsive interface and persistent medical disclaimer.

## Architecture and stack

React 18, Vite, React Router, Firebase Web SDK, Cloud Firestore and Storage; Flask, scikit-learn, pandas, NumPy, joblib and Gunicorn. See [architecture](docs/architecture.md), [API](docs/api.md), and [deployment](docs/deployment.md).

## Machine learning and dataset

`backend/train_model.py` loads `backend/data/heart.csv` if supplied; otherwise it downloads the UCI Cleveland Heart Disease data (processed Cleveland file) from the URL in the script. It splits stratified train/test partitions with random seed 42, imputes missing values, scales numeric features, one-hot encodes categorical features, and fits class-weighted logistic regression. The preprocessing and estimator are saved together as `backend/model/heart_disease_pipeline.joblib`. Accuracy, precision, recall, F1, ROC-AUC, confusion matrix, dataset size, and training date are measured and written to `backend/model/metadata.json` when training is run.

Measured once on the fixed 20% stratified holdout (61 rows): accuracy **86.9%**, precision **81.3%**, recall **92.9%**, F1 **86.7%**, ROC-AUC **96.6%**; confusion matrix `[[27, 6], [2, 26]]`. These educational results from a small public dataset and one split do not establish clinical performance.

Feature encodings match the original Cleveland dataset columns: `age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal`. Dataset encodings are educational, not validated clinical definitions.

## Project structure

```text
backend/       Flask inference API and model training
frontend/      React app, auth, Firestore access, records and assessment workflows
firebase/      Firestore and Storage security rules, indexes and Hosting rewrite
docs/          Architecture, API and deployment guides
```

## Firebase setup

Create a Firebase project, enable Authentication → Email/Password, create Firestore and Storage, and register a web app. Copy the web configuration values to `frontend/.env` based on `frontend/.env.example`.

Deploy database rules, query indexes and private file rules from the repository root (replace the project ID if using another Firebase project):

```bash
firebase deploy --config firebase/firebase.json --only firestore:rules,firestore:indexes,storage --project health-care-system-c84b3
```

The Firebase CLI must be logged into an account with access to the configured project. The browser app uses Firebase client credentials; never put an Admin SDK service account key in frontend variables. Firestore and Storage rules restrict patient records and attachments to the authenticated owner. The medical-record list needs its Firestore index; it can take several minutes after deploy to become ready.

## Run locally

Backend (Python 3.10–3.12):

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\Activate.ps1
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

Without Firebase values, the app shows configuration guidance rather than pretending authentication or storage works.

## Environment variables

Frontend: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_API_BASE_URL`. Backend: `CORS_ORIGINS` (comma-separated exact origins), optional `MODEL_PATH`, and platform-provided `PORT`.

## API and data

Implemented backend routes: `GET /api/health`, `GET /api/model-metadata`, and `POST /api/predict`. Patient, assessment and medical-record data is stored in Firestore collections `patients`, `assessments`, and `medicalRecords`; file bytes are stored privately in Firebase Storage. Read/write access is guarded by security rules and owner filters. The AI prediction module currently covers heart-disease risk only.

## Deployment

The project has a Vercel deployment at the live site above. Deploy both services together using the root `vercel.json` and Services preset, or deploy the backend with the Render blueprint in `render.yaml` and frontend with Vercel root `frontend`. Configure Firebase web-app values and backend CORS when hosting separately. Firebase rules and indexes are deployed separately using the command above. See [step-by-step deployment](docs/deployment.md).

## Evaluation and disclaimer

Backend tests are in `backend/tests`; frontend utility tests use Node's built-in test runner (`npm test`). Run `npm run build` to create the frontend production bundle and `python train_model.py` to generate model metrics/files.

This application is an educational machine-learning decision-support tool using a public dataset. It is not a medical diagnosis and must not replace advice or decisions from qualified healthcare professionals.
