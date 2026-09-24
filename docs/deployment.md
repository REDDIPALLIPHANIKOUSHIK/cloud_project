# Deployment guide

## Firebase

1. Create a Firebase project on the Spark plan; enable Authentication Email/Password and create Firestore.
2. Add a web app and configure all `VITE_FIREBASE_*` variables from `frontend/.env.example`.
3. Install the Firebase CLI (`npm install -g firebase-tools`), authenticate with `firebase login`, then from `firebase/` run `firebase use --add` and select your project.
4. From `firebase/`, publish security rules and indexes with `firebase deploy --only firestore:rules,firestore:indexes`.

## Backend on Render

Use the repository's root `render.yaml` blueprint (or create a Python web service with root `backend`, build command `pip install -r requirements.txt && python train_model.py`, start command `gunicorn --bind 0.0.0.0:$PORT app:app`). Set `CORS_ORIGINS` to the exact deployed frontend origin. Build downloads the documented training dataset and saves the model artifact; no model binary or credentials are committed. Verify `/api/health` reports `model_loaded: true`.

## Frontend on Vercel or Firebase Hosting

Set the project root to `frontend`, build command `npm run build`, output directory `dist`. Configure `VITE_API_BASE_URL` to the backend origin and all Firebase Web App variables. Vite bakes these public web-app configuration values into the browser build; Firestore security is enforced by rules, not by hiding the Firebase config. For Firebase Hosting, put the same values in `frontend/.env`, then from `firebase/` run `npm --prefix ../frontend install`, `npm --prefix ../frontend run build`, and `firebase deploy --only hosting`. The included rewrite supports React Router.

## Production checks

Use HTTPS origins, ensure the backend CORS list exactly includes the frontend origin, confirm Firestore rules and indexes are published, test registration/login and an account-owned record, then check backend health and submit one assessment. Configure Firebase Auth's authorized domains to include the deployed frontend host. Keep service account keys and local `.env` files out of Git; this architecture does not need a backend service account.

