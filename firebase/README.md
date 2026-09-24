# Firebase configuration

Create a Firebase project on the Spark plan, enable Email/Password under Authentication, and create a Firestore database. Add a Firebase Web App and copy its config into `frontend/.env` using `.env.example` as a template. Install the Firebase CLI, run `firebase login`, and from this directory run `firebase use --add` to select your project. Publish rules and indexes with `firebase deploy --only firestore:rules,firestore:indexes`. For Hosting, build the frontend with `npm --prefix ../frontend install` and `npm --prefix ../frontend run build`, then run `firebase deploy --only hosting`. The browser app accesses Firestore directly; its rules require authentication and scope every record to its `ownerId`. No service account key is used or needed.

