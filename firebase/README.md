# Firebase configuration

Create a Firebase project on the Spark plan, enable Email/Password under Authentication, and create a Firestore database. Add a Firebase Web App and copy its config into `frontend/.env` using `.env.example` as a template. Publish rules and indexes from this directory with `firebase deploy --only firestore:rules,firestore:indexes`. The browser app accesses Firestore directly; its rules require authentication and scope every record to its `ownerId`. No service account key is used or needed.

