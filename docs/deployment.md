# Deployment guide

## Firebase

1. Create a Firebase project; enable Authentication → Email/Password, create Firestore, enable Cloud Storage, and register a web app.
2. Add the `VITE_FIREBASE_*` values from `frontend/.env.example` to the frontend host's environment variables. The sample values in that file are for the configured project `health-care-system-c84b3`.
3. Install Firebase CLI (`npm install -g firebase-tools`) and authenticate with `firebase login`.
4. From the repository root, deploy the private Firestore and Storage rules plus all required query indexes:

```bash
firebase deploy --config firebase/firebase.json --only firestore:rules,firestore:indexes,storage --project health-care-system-c84b3
```

Replace the project ID when targeting another Firebase project, and ensure the signed-in CLI account has deployment access. Wait for the medical-record index to finish building before querying that collection. Do not put a Firebase Admin service-account key in frontend variables.

## Backend on Render

Use the repository's root `render.yaml` blueprint (or create a Python web service with root `backend`, build command `pip install -r requirements.txt && python train_model.py`, start command `gunicorn --bind 0.0.0.0:$PORT app:app`). Set `CORS_ORIGINS` to the exact deployed frontend origin. Build downloads the documented training dataset and saves the model artifact; no model binary or credentials are committed. Verify `/api/health` reports `model_loaded: true`.

## Frontend on Vercel or Firebase Hosting

### Vercel Services

The repository root `vercel.json` defines a Vite frontend service and Flask backend service. In the Vercel import screen, leave the project root at the repository root, choose the **Services** preset, and refresh after the config is on `main`. Vercel routes `/api/*` to Flask and other requests to the frontend; each app keeps its own build settings. Add the `VITE_FIREBASE_*` variables to the Vercel project. `VITE_API_BASE_URL` can stay unset because the frontend uses the same Vercel origin in production and `http://localhost:5000` in local development. Services are currently a Vercel beta, so confirm the feature is available to your account.

Vite includes Firebase Web App configuration in the browser build; access is enforced by Firestore and Storage rules. For Firebase Hosting, put the variables in `frontend/.env`, then from `firebase/` run `npm --prefix ../frontend install`, `npm --prefix ../frontend run build`, and `firebase deploy --only hosting`. The Hosting rewrite supports React Router.

## Production checks

Use HTTPS origins, ensure backend CORS includes the exact frontend origin, confirm Firebase rules and indexes are published, then verify registration/login, patient creation, medical-record text save, attachment upload/download/delete, and one heart-risk assessment. Configure Firebase Auth authorized domains to include the deployed frontend host. Keep local `.env` files and service-account credentials out of Git; this architecture does not require a backend service account.
