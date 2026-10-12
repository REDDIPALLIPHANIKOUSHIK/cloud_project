# Security & Privacy Governance: Cloud-Based Healthcare Data Management System

**Repository:** [https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project](https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project)  
**Security Classification:** Protected Health Information (PHI) & Clinical Access Governance  

---

## 1. Threat Model & Security Posture

In clinical applications, data integrity, confidentiality, and access control are critical. MediCloud AI enforces strict defense-in-depth across the client, API, and cloud storage layers:

| Risk Vector | Threat Scenario | Implemented Mitigation |
| :--- | :--- | :--- |
| **Cross-Patient Data Leakage** | Patient A attempts to query Patient B's records or predictions. | Server-side token scope verification (`request.current_user['uid'] == target_patient_id`) and Firestore security rules. |
| **Unauthorized Doctor Access** | Doctor queries records of a patient without patient permission. | Strict verification of active consent records in `doctor_access`. Immediate 403 Forbidden if not authorized. |
| **Delayed Revocation Bypass** | Doctor caches or accesses patient chart after consent revocation. | Real-time grant check on every clinical query (`status == 'active'`). Revocation takes effect instantly. |
| **Client Privilege Escalation** | Patient attempts to alter their role to `admin` or `doctor`. | Server-side role transition controls. Client payloads containing role changes are rejected with 403 Forbidden. |
| **Public Document Exposure** | Arbitrary internet users accessing uploaded lab reports. | Private storage paths (`patients/{uid}/documents/*`) protected by storage rules; no public URL sharing permitted. |
| **Untracked Clinical Inquiries** | Unauthorized or suspicious viewing of health records. | Append-only immutable audit trail in `audit_logs` logging actor, action, timestamp, and resource ID. |
| **Dangerous Misdiagnosis** | Severe acute emergency obscured by statistical model score. | Independent rule-based emergency safety layer that prompts emergency care (112 / 911) and cannot be downgraded by ML. |

---

## 2. Role-Based Access Control Matrix

| Role | Own Profile | Own Records & Files | Run AI Prediction | Other Patients' Records | Doctor Directory | Submit Clinical Notes | Admin Metrics & Audit Logs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Patient** | Full (CRUD) | Full (CRUD) | Yes (Own Data) | ❌ Denied | Read Only | ❌ Denied | ❌ Denied |
| **Doctor** | Read / Update | Read Only (Own) | Yes (Authorized) | Read Only (Active Consent Only) | Read Only | Yes (Authorized Patients) | ❌ Denied |
| **Admin** | Read / Update | ❌ Denied (Least Privilege) | ❌ Denied | ❌ Denied (Clinical records isolated) | Full | ❌ Denied | Full (Role Control & Audit Stream) |

---

## 3. Least-Privilege Administrative Policy

Administrators maintain platform stability, user account statuses, and doctor credential verifications. Under the least-privilege clinical privacy model:
- Administrators **cannot** inspect or browse raw clinical patient records, vitals, or private diagnostic scans without explicit clinical justification and audited logging.
- Role modifications and doctor verifications require server-side privileged authentication and are captured in the append-only audit stream.

---

## 4. Cloud Security Rules Enforcement

### Firestore Security (`firebase/firestore.rules`)
- Default deny: `match /{document=**} { allow read, write: if false; }`
- Records and lab reports:
  ```javascript
  match /medical_records/{recordId} {
    allow read: if isOwner(resource.data.patientId) || hasDoctorAccess(resource.data.patientId) || isAdmin();
    allow create: if isAuthenticated() && (isOwner(request.resource.data.patientId) || isDoctor());
    allow update, delete: if isOwner(resource.data.patientId) || isAdmin();
  }
  ```
- Immutable audit log: write permitted for authenticated events; `update` and `delete` strictly set to `false`.

### Firebase Storage Security (`firebase/storage.rules`)
- Only authenticated patients can upload to their specific path (`patients/{patientId}/documents/{fileName}`).
- Enforces content-type validation: `application/pdf`, `image/jpeg`, `image/png`, `image/jpg`.
- File size capped at 15 MB. Public object reading disabled.

---

## 5. Regulatory & Compliance Context

While designed as an engineering demonstration project, production deployment into clinical healthcare environments necessitates compliance with:
- **HIPAA (Health Insurance Portability and Accountability Act):** Execution of Business Associate Agreements (BAAs) with Google Cloud / Firebase and Vercel; encryption in transit (TLS 1.3) and at rest (AES-256).
- **DPDPA (Digital Personal Data Protection Act, India) & GDPR:** Patient consent management, right to erasure, explicit purpose specification, and data localization.
- **SaMD (Software as a Medical Device):** AI prediction modules must be classified under regulatory medical device frameworks (e.g. FDA 510(k) or CDSCO) prior to clinical diagnostic use.
