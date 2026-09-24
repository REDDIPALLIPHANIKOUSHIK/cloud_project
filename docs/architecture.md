# Architecture

```text
Healthcare professional
        ↓
React + Vite (Firebase Auth session)
     ↙                   ↘
Cloud Firestore         Flask REST API
(owner scoped rules)     (validated JSON input)
                           ↓
                    saved sklearn pipeline
                           ↓
                prediction + probability
     ↘                   ↙
             patient history / dashboard
```

Firebase Authentication provides email/password identity and persistent sessions. The React client sends patient and assessment records directly to Firestore; rules verify sign-in and that each document belongs to the caller. Composite indexes support listing the caller's newest records. The Flask service is responsible for inference only, keeping the saved scikit-learn preprocessing and classifier together so training and prediction use identical feature transformations. The browser stores the returned prediction in the caller-owned assessment collection.

The training script downloads the documented public heart.csv dataset on first run (or uses `backend/data/heart.csv` when supplied locally), performs stratified holdout evaluation, and writes the serialized pipeline and actual metrics. The model is a simple logistic regression with median/mode imputation, standard scaling for numerical measurements, and one-hot encoding for categorical features. This small public dataset is educational and does not establish clinical validity or generalize to every population.

