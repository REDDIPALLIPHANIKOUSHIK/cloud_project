# Cloud-Based Healthcare Data Management System with AI-Powered Disease Prediction

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project)
[![Model Benchmark](https://img.shields.io/badge/Model%20Accuracy-90.16%25-emerald)](backend/ml/model_metadata.json)
[![ROC--AUC](https://img.shields.io/badge/ROC--AUC-0.961-teal)](backend/ml/model_metadata.json)
[![Pytest Test Suite](https://img.shields.io/badge/Pytest-23%20Passed%20(100%25)-brightgreen)](backend/tests/)
[![Production Build](https://img.shields.io/badge/Vite%20Build-Passing-success)](frontend/)

---

## 1. Executive Summary & Problem Statement

Modern healthcare ecosystems frequently suffer from fragmented patient records, isolated diagnostic reports, and lack of accessible, evidence-based clinical decision support. Patients lack sovereign control over who views their confidential medical data, while clinicians spend excessive time piecing together disparate vitals, laboratory scans, and historical metrics.

**MediCloud AI** solves these challenges by providing:
1. **Sovereign Patient Health Record Management:** Secure, cloud-hosted health timelines, vital signs tracking, and encrypted medical document uploads (PDF, JPG, JPEG, PNG).
2. **Empirical AI Disease Prediction:** A reproducible, calibrated **Random Forest model** trained on the reputable **UCI Cleveland Heart Disease dataset** (303 patient cases, 13 clinical features) yielding **90.16% test accuracy**, **89.29% F1-score**, and **96.10% ROC-AUC**.
3. **Specialist Recommendation Engine:** Deterministic routing mapping model predictions and symptom clusters to appropriate clinical specialties (Cardiologist, Pulmonologist, Endocrinologist, Neurologist, General Physician) with structured reasoning, urgency tiers, and mandatory disclaimers.
4. **Independent Emergency Safety Layer:** Conservative rule-based screening that detects acute life-threatening red flags (crushing chest pain, severe dyspnea, hypertensive crisis, acute stroke signs) and unconditionally prompts emergency care (**112 in India / 911 in US**), never allowing statistical ML outputs to downgrade an identified medical emergency.
5. **Patient-Governed Doctor Access Sharing:** Patients explicitly grant and revoke clinical access to verified doctors. Revocation takes effect immediately at both application and API layers.
6. **Least-Privilege Administrative Governance:** Role-governed administration dashboard with system metrics, user role controls, doctor credential verifications, and an immutable audit log trail.

---

## 2. Technology Stack

### Frontend Client
- **Core:** React 18, Vite, TypeScript
- **Styling & UI:** Tailwind CSS (Custom clinical palette: deep navy, clinical blue, crisp teal), Lucide React icons
- **Routing & State:** React Router 6, React Context API, React Hook Form, Zod validation
- **Data Visualizations:** Recharts (Risk distribution & role composition charts)
- **Deployment:** Vercel (Edge CDN, SPA rewrite routing via `vercel.json`)

### Backend API & Machine Learning
- **Framework:** Python 3, Flask 3, Gunicorn
- **Security & Networking:** Flask-CORS (strict origin allowlist), Bearer token authentication middleware
- **Data Modeling & Validation:** Pydantic v2
- **Machine Learning:** Scikit-learn, Pandas, NumPy, Joblib
- **Storage & Reports:** PyPDF, Firebase Admin SDK
- **Test Framework:** Pytest (100% test coverage on API, authorization, emergency safety, ML pipeline, and recommender)

### Cloud Database & Storage
- **Authentication:** Firebase Authentication (Patient, Doctor, Admin identity)
- **Database:** Google Cloud Firestore (Collections: `users`, `patients`, `doctors`, `medical_records`, `lab_reports`, `predictions`, `doctor_access`, `clinical_notes`, `audit_logs`)
- **Document Blobs:** Firebase Storage (Private patient paths, validated formats, 15 MB threshold)
- **Zero-Config Local Hybrid Mode:** Built-in persistent fallback engine allows immediate offline execution and automated testing without external credentials.

---

## 3. Machine Learning Architecture & Dataset Integrity

### Dataset Specification
- **Dataset:** UCI Cleveland Heart Disease Dataset (UCI Machine Learning Repository)
- **Benchmark Records:** 303 clinical cases, 13 input features + binary target (presence vs absence of significant coronary artery disease &ge; 50% diameter narrowing)
- **Split Methodology:** 80% Train, 20% Holdout Test with Stratification (`stratify=y`, `random_state=42`)
- **Preprocessing Pipeline:** `SimpleImputer(strategy='median')` &rarr; `StandardScaler()` &rarr; `RandomForestClassifier(n_estimators=100, max_depth=4)`

### Supported Clinical Features (13)
| Feature | Parameter Description | Valid Clinical Range |
| :--- | :--- | :--- |
| `age` | Age of patient | 18 - 120 Years |
| `sex` | Biological sex | 1 = Male, 0 = Female |
| `cp` | Chest pain type | 1: Typical Angina, 2: Atypical Angina, 3: Non-Anginal, 4: Asymptomatic |
| `trestbps` | Resting blood pressure | 70 - 260 mm Hg |
| `chol` | Serum cholesterol | 100 - 600 mg/dl |
| `fbs` | Fasting blood sugar &gt; 120 mg/dl | 1 = True (Elevated), 0 = False (Normal) |
| `restecg` | Resting electrocardiographic results | 0 = Normal, 1 = ST-T wave abnormality, 2 = LVH |
| `thalach` | Maximum heart rate achieved | 50 - 240 bpm |
| `exang` | Exercise-induced angina | 1 = Yes, 0 = No |
| `oldpeak` | ST depression induced by exercise | 0.0 - 10.0 mm |
| `slope` | Slope of peak exercise ST segment | 1 = Upsloping, 2 = Flat, 3 = Downsloping |
| `ca` | Number of major coronary vessels colored | 0 - 3 Vessels |
| `thal` | Nuclear thallium stress test | 3 = Normal, 6 = Fixed defect, 7 = Reversible defect |

### Empirical Training & Evaluation Results
```
============================================================
TRAINING & EVALUATION PIPELINE: UCI HEART DISEASE PREDICTION
============================================================
Total Samples: 303 | Features: 13 | Training: 242 | Holdout Test: 61

Candidate A: Logistic Regression Pipeline
  - 5-Fold CV F1-Score: 0.7993 (+/- 0.0431)
  - Holdout Test Accuracy:  86.89%
  - Holdout Test Precision: 81.25%
  - Holdout Test Recall:    92.86%
  - Holdout Test F1-Score:  86.67%
  - Holdout Test ROC-AUC:   95.45%

Candidate B: Random Forest Classifier Pipeline (WINNER)
  - 5-Fold CV F1-Score: 0.8007 (+/- 0.0261)
  - Holdout Test Accuracy:  90.16%
  - Holdout Test Precision: 89.29%
  - Holdout Test Recall:    89.29%
  - Holdout Test F1-Score:  89.29%
  - Holdout Test ROC-AUC:   96.10%
  - Confusion Matrix: [[30, 3], [3, 25]] (30 TN, 25 TP, 3 FP, 3 FN)

Model Artifact Saved: backend/ml/model_artifacts/heart_disease_model.joblib
Metadata Saved: backend/ml/model_metadata.json
```

---

## 4. Specialist Recommendation Engine & Emergency Safety Layer

### Specialist Routing Matrix
- **Cardiologist (Priority / Routine):** Triggered when the validated model classifies positive cardiovascular disease risk or when exertional angina and Stage 2 hypertension are present.
- **Pulmonologist:** Triggered when persistent respiratory symptoms (chronic cough, dyspnea, wheezing) are noted alongside low cardiovascular risk.
- **Endocrinologist / Diabetologist:** Triggered on elevated fasting glucose (`fbs == 1.0`) or diabetic history.
- **Neurologist:** Triggered on persistent neurological symptoms (dizziness, vertigo, recurring migraines, limb tremors).
- **Orthopedist:** Triggered on musculoskeletal or joint distress.
- **General Physician / Primary Care Clinician:** Triggered for low-risk preventive assessments, lifestyle counseling, and routine wellness checkups.

### Urgent Clinical Red-Flag Safety Rules
The emergency layer screens symptoms and vital signs independently of the statistical model. Red flags include:
- Crushing chest pain or pain radiating to left arm, neck, or jaw
- Severe acute dyspnea at rest / inability to speak
- Fast stroke signs (facial drooping, unilateral arm weakness, slurred speech)
- Hypertensive crisis (Resting SBP &ge; 180 mm Hg)
- Extreme resting tachycardia (HR &gt; 190 bpm)
- Severe ischemic markers (OldPeak &ge; 3.5mm with typical angina)

**Emergency Action:** Prominently advises immediate emergency care (**112 in India / 911 in US**). Model probability outputs are strictly forbidden from overriding or downgrading an emergency alert.

---

## 5. Security, Privacy & Role Isolation

1. **Role-Based Access Control (RBAC):** Three distinct roles (**Patient**, **Doctor**, **Admin**).
2. **Patient Data Sovereignty:** Doctors can only query records of patients who have granted active consent. Revoking consent immediately returns 403 Forbidden on subsequent doctor requests.
3. **Least-Privilege Administration:** Administrators monitor operational status and verify doctors but cannot browse clinical records without audited justification.
4. **Private Document Storage:** Medical files (PDF/JPG/PNG) are stored privately with authenticated download URLs and size caps (15 MB). Raw documents are **never** passed to the structured ML model.
5. **Defense Against Self-Escalation:** Client requests attempting to promote an account to `doctor` or `admin` are rejected by the server.
6. **Immutable Audit Trail:** All access grants, record views, prediction evaluations, and role updates are recorded in `audit_logs`.

---

## 6. Repository Layout

```
cloud_project/
├── backend/
│   ├── app/
│   │   ├── config.py                 # Application settings, CORS, and paths
│   │   ├── middleware/
│   │   │   └── auth_middleware.py    # Bearer token verify & role decorators
│   │   ├── routes/
│   │   │   ├── health.py             # GET /api/v1/health
│   │   │   ├── auth_routes.py        # GET /api/v1/me, sync-user
│   │   │   ├── predict_routes.py     # POST /api/v1/predict, predictions
│   │   │   ├── records_routes.py     # GET/POST /api/v1/medical-records
│   │   │   ├── reports_routes.py     # Document metadata, export summary
│   │   │   ├── doctor_routes.py      # Doctor access grants, notes, patients
│   │   │   └── admin_routes.py       # Stats, user role control, audit logs
│   │   ├── schemas/                  # Pydantic schemas (prediction, records)
│   │   └── services/
│   │       ├── emergency_safety.py   # Acute red-flag screening rules
│   │       ├── specialist_recommender.py # Clinical routing engine
│   │       ├── model_service.py      # ML inference pipeline
│   │       ├── db_service.py         # Cloud Firestore & hybrid local engine
│   │       ├── audit_service.py      # Immutable audit trail logger
│   │       └── pdf_service.py        # Clinical summary text/PDF generator
│   ├── ml/
│   │   ├── train_model.py            # Reproducible training & evaluation pipeline
│   │   ├── evaluate_model.py         # Model evaluation assertion runner
│   │   ├── model_metadata.json       # Exported metrics & feature schema
│   │   ├── dataset/                  # Cleveland Heart Disease benchmark CSV
│   │   └── model_artifacts/          # Serialized heart_disease_model.joblib
│   ├── tests/                        # 23 Automated Pytest integration tests
│   ├── requirements.txt              # Backend dependencies
│   ├── run.py                        # Entrypoint script
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, Sidebar, Footer, EmergencyBanner
│   │   ├── context/AuthContext.tsx   # Auth state & 1-click demo role switcher
│   │   ├── lib/                      # api.ts, firebase.ts
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx       # Value proposition, model metrics, demo CTA
│   │   │   ├── LoginPage.tsx         # 1-click test credentials
│   │   │   ├── RegisterPage.tsx      # Patient and Doctor onboarding
│   │   │   ├── patient/              # Dashboard, Profile, Records, Reports,
│   │   │   │                         # Prediction, History, Access Grants, Settings
│   │   │   ├── doctor/               # Dashboard, Patients, Patient Detail Chart,
│   │   │   │                         # Notes, Reports, Settings
│   │   │   └── admin/                # Dashboard (Recharts), Users, Activity, Settings
│   │   ├── types/                    # TypeScript interfaces
│   │   └── App.tsx                   # React Router 6 protected routes
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
├── firebase/
│   ├── firestore.rules               # Production Firestore security rules
│   ├── storage.rules                 # Private medical document storage rules
│   └── firestore.indexes.json        # Composite collection indexes
├── docs/
│   ├── ARCHITECTURE.md               # Detailed system topology & sequence flows
│   ├── SECURITY.md                   # Threat model, RBAC, and HIPAA guidance
│   └── DEPLOYMENT.md                 # Vercel, Render, and Firebase guide
├── vercel.json                       # Vercel SPA build & route rewrite rules
├── PROJECT_IMPLEMENTATION_PLAN.md    # Phase-by-phase implementation plan
├── .gitignore
├── .env.example
└── README.md
```

---

## 7. Local Installation & Development Quickstart

### Prerequisites
- **Node.js:** v18+ (verified on v24.15.0)
- **Python:** v3.10+ (verified on v3.14.4)
- **Git**

### Step 1: Clone Repository
```bash
git clone https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project.git
cd cloud_project
```

### Step 2: Set Up Backend & Train Model
```bash
cd backend
python -m pip install -r requirements.txt

# Run reproducible ML model training
python ml/train_model.py

# Verify model evaluation assertions
python ml/evaluate_model.py

# Run the test suite (All 23 tests should pass)
python -m pytest tests -v

# Start the Flask API server
python run.py
```
*Backend API initializes on `http://localhost:5000`.*

### Step 3: Set Up and Start Frontend
In a separate terminal window:
```bash
cd frontend
npm install

# Build production bundle to verify correctness
npm run build

# Start Vite development server
npm run dev
```
*Frontend web application launches on `http://localhost:5173`.*

---

## 8. Automated Test Execution & Verification

Execute the complete backend test suite:
```bash
python -m pytest backend/tests -v
```

### Verified Test Results (23 Passed, 100% Success)
- `test_health_check_endpoint`: Health status and model loaded verification.
- `test_unauthorized_request_rejected`: Unauthenticated request rejected with 401.
- `test_authenticated_profile_and_sync`: Session retrieval and profile sync.
- `test_prediction_endpoint_with_valid_data`: 13-feature inference and response shape.
- `test_prediction_endpoint_validation_failure`: Schema validation error rejection (422).
- `test_medical_records_crud`: Creation and chronological retrieval of clinical records.
- `test_cross_patient_access_forbidden`: Patient A cannot view Patient B's records (403).
- `test_unauthorized_doctor_access_forbidden`: Doctor cannot access patient without active grant (403).
- `test_revoked_doctor_access_blocks_immediately`: Revoked consent blocks doctor instantly (403).
- `test_patient_self_promotion_to_admin_blocked`: Client self-escalation rejected (403).
- `test_admin_endpoints_require_admin_role`: Non-admin access to admin stats forbidden (403).
- `test_normal_case_no_emergency`: Low-risk clinical input passes without emergency trigger.
- `test_crushing_chest_pain_triggers_emergency`: Crushing chest pain triggers emergency alert (112).
- `test_hypertensive_crisis_triggers_emergency`: SBP &ge; 180 triggers hypertensive crisis warning.
- `test_acute_stroke_signs_triggers_emergency`: FAST stroke signs trigger immediate emergency alert.
- `test_model_artifact_exists`: Validates serialized joblib model pipeline artifact.
- `test_model_metadata_validity`: Validates metadata metrics (Accuracy &ge; 80%, F1 &ge; 80%).
- `test_model_prediction_low_risk`: Predicts class 0 for low-risk inputs.
- `test_model_prediction_high_risk`: Predicts class 1 for high-risk inputs.
- `test_recommends_cardiologist_on_high_cardiac_risk`: Recommends Cardiologist with clinical rationale.
- `test_recommends_pulmonologist_on_respiratory_symptoms`: Recommends Pulmonologist on dyspnea/cough.
- `test_recommends_endocrinologist_on_elevated_glucose`: Recommends Endocrinologist on high FBS.
- `test_recommends_general_physician_on_routine_low_risk`: Recommends General Physician on routine wellness.

---

## 9. One-Click Test Account Demonstration

For frictionless grading and demonstration without manual registration, use the quick role switcher in the navbar or the preset buttons on the login screen:

1. **Demo Patient (Alex Mercer):**
   - Click **Demo Role: Patient**
   - Explore recorded vitals, view existing lab report metadata, launch cardiovascular predictions with pre-loaded high-risk and low-risk test samples, manage doctor consent, and download clinical summary.
2. **Demo Doctor (Dr. Sarah Chen, MD - Cardiologist):**
   - Click **Demo Role: Doctor**
   - Review authorized patients with active consent, inspect clinical charts, review AI predictions and feature breakdowns, and add dated consultation notes.
3. **Demo Administrator:**
   - Click **Demo Role: Admin**
   - Inspect platform analytics, Recharts risk and role distribution charts, manage user roles and doctor verification statuses, and inspect the real-time security audit log stream.

---

## 10. Production Deployment Instructions

### Vercel (Frontend)
1. Import repository `https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project` on Vercel.
2. Root Directory: `frontend` (or repository root with included `vercel.json`).
3. Set environment variables: `VITE_API_BASE_URL=https://your-backend-api.onrender.com/api/v1`.
4. Deploy: The build runs `tsc && vite build` and generates `dist/` with SPA routing rewrites.

### Render / Railway (Backend API)
1. Create a Web Service connected to this repository.
2. Build command: `pip install -r backend/requirements.txt && python backend/ml/train_model.py`
3. Start command: `gunicorn -w 2 -b 0.0.0.0:$PORT backend.run:app`
4. Set environment variables: `FLASK_ENV=production`, `FRONTEND_ORIGIN=https://your-app.vercel.app`.

*(See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete cloud setup instructions).*

---

## 11. Known Limitations & Future Scope

- **Tabular Scope:** The trained model is validated exclusively for adult cardiovascular risk stratification using 13 structured clinical indicators. It does not diagnose oncology, infectious disease, or neurological conditions.
- **Document Text Extraction (OCR):** Uploaded PDF lab reports and scan images are currently stored as secure clinical attachments and are not fed blindly to the tabular ML model. An optional future enhancement includes an OCR pipeline (Tesseract/LLM) that extracts structured values for user review prior to prediction.
- **Multicenter Validation:** Model weights reflect the UCI Cleveland benchmark sample and require multicenter calibration before real-world clinical application.

---

## 12. Mandatory Medical & Legal Disclaimer

> [!WARNING]
> **STATUTORY MEDICAL NOTICE:**  
> AI-generated results and specialist recommendations provided by this application are intended strictly for educational, research, and clinical decision-support purposes. They **do not constitute a medical diagnosis**, clinical prescription, or formal doctor-patient relationship, and must never replace consultation with a qualified, licensed healthcare professional.  
> If you or anyone around you is experiencing severe chest pain, shortness of breath, sudden numbness, or loss of consciousness, immediately contact national emergency services (**Dial 112 in India, 911 in the US**) or visit the nearest hospital emergency department.
