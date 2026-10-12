# Production Deployment Guide: MediCloud AI Platform

**Repository:** [https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project](https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project)  
**Target Topology:**  
- **Frontend:** Vercel (React + Vite + TypeScript)  
- **Backend API & ML:** Render / Railway / Google Cloud Run (Python + Flask + Gunicorn)  
- **Database & Storage:** Google Cloud Firestore + Firebase Authentication + Firebase Storage  

---

## 1. Frontend Deployment on Vercel

### Step 1: Connect GitHub Repository
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New Project** and select `REDDIPALLIPHANIKOUSHIK/cloud_project`.
3. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend` (or leave as root with the included `vercel.json`)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Step 2: Configure Vercel Environment Variables
Add the following production environment variables in **Project Settings > Environment Variables**:

| Variable Name | Example / Production Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://your-backend-api.onrender.com/api/v1` | URL of your deployed Python Flask API |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | `your-project` | Google Cloud project ID |
| `VITE_FIREBASE_STORAGE_BUCKET`| `your-project.appspot.com` | Firebase Storage bucket URI |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789012` | FCM Sender ID |
| `VITE_FIREBASE_APP_ID` | `1:123456789012:web:...` | Firebase App ID |

### Step 3: Deploy & Verify
- Click **Deploy**. Vercel will install dependencies, execute `tsc && vite build`, and deploy the production bundle to edge CDN.
- The included `vercel.json` ensures all deep client routes (e.g. `/patient/prediction`, `/doctor/patients`) reload cleanly without 404 errors.

---

## 2. Backend Deployment on Render / Railway / Cloud Run

### Option A: Render (Recommended for Free / Low-Cost Tier)
1. Go to [Render](https://render.com) and click **New > Web Service**.
2. Connect `https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project`.
3. Configure build parameters:
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r backend/requirements.txt && python backend/ml/train_model.py`
   - **Start Command:** `gunicorn -w 2 -b 0.0.0.0:$PORT backend.run:app`
4. Add Environment Variables:
   - `FLASK_ENV`: `production`
   - `PORT`: `10000`
   - `FRONTEND_ORIGIN`: `https://your-app.vercel.app,http://localhost:5173`
   - `FIREBASE_PROJECT_ID`: `your-firebase-project-id`
   - `FIREBASE_CREDENTIALS_PATH`: `/etc/secrets/firebase-service-account.json` (attach secret file via Render Secret Files).

### Option B: Google Cloud Run (Containerized)
1. Build container:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/medicloud-api
   ```
2. Deploy service:
   ```bash
   gcloud run deploy medicloud-api \
     --image gcr.io/YOUR_PROJECT_ID/medicloud-api \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars FRONTEND_ORIGIN=https://your-app.vercel.app
   ```

---

## 3. Cloud Firebase Setup Guide

### Step 1: Create Firebase Project
1. Visit [Firebase Console](https://console.firebase.google.com/) and create a project named `medicloud-healthcare`.
2. Disable Google Analytics if not needed for development.

### Step 2: Enable Firebase Authentication
1. Go to **Build > Authentication > Sign-in method**.
2. Enable **Email/Password**.

### Step 3: Create Cloud Firestore
1. Go to **Build > Firestore Database > Create database**.
2. Choose **Start in production mode** (security rules default deny).
3. Select your preferred database region (e.g., `asia-south1` for India or `us-central1`).

### Step 4: Enable Firebase Storage
1. Go to **Build > Storage > Get Started**.
2. Select your default Cloud Storage location.

### Step 5: Deploy Security Rules & Indexes
Install the Firebase CLI and deploy the included configuration files:
```bash
npm install -g firebase-tools
firebase login
firebase use --add your-firebase-project-id

# Deploy verified rules and composite indexes
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

### Step 6: Generate Service Account Key (For Backend API)
1. Go to **Project Settings > Service Accounts**.
2. Click **Generate new private key**.
3. Save the JSON key securely and supply its path to the backend via `FIREBASE_CREDENTIALS_PATH`.

> [!TIP]
> **Zero-Config Local Development:** If you do not have active Firebase credentials yet, the application automatically runs in local hybrid mode with an embedded atomic storage engine, zero external billing, and 100% full feature availability!
