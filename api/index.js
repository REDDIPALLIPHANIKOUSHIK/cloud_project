const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load model weights for ML prediction
let modelWeights = null;
try {
  modelWeights = require('./model_weights.json');
} catch (e) {
  try {
    modelWeights = JSON.parse(fs.readFileSync(path.join(__dirname, 'model_weights.json'), 'utf8'));
  } catch (err) {
    console.error('Failed to load model weights:', err);
  }
}

// Secret for cryptographic self-contained auth tokens
const AUTH_SECRET = process.env.AUTH_SECRET || 'medicloud_clinical_auth_secret_2026_key';

// In-Memory & File-backed Store
const DB_PATH = process.env.VERCEL ? '/tmp/medic_db.json' : path.join(__dirname, 'medic_db.json');
let store = {
  users: {},
  patients: {},
  doctors: {},
  sessions: {},
  predictions: {},
  medical_records: {},
  doctor_access: {},
  lab_reports: {},
  clinical_notes: {},
  audit_logs: []
};

// Seed initial database
function loadStore() {
  // 1. Try reading from /tmp/medic_db.json if it exists
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      Object.assign(store, data);
      return;
    } catch (e) {}
  }

  // 2. Read from static medic_db.json bundled in api/
  const staticDb = path.join(__dirname, 'medic_db.json');
  if (fs.existsSync(staticDb)) {
    try {
      const data = JSON.parse(fs.readFileSync(staticDb, 'utf8'));
      Object.assign(store, data);
    } catch (e) {}
  }

  // 3. Try loading from backend/data/db if available
  const seedDir = path.join(__dirname, '..', 'backend', 'data', 'db');
  ['users', 'patients', 'doctors', 'predictions', 'medical_records', 'doctor_access', 'sessions', 'lab_reports', 'clinical_notes', 'audit_logs'].forEach((col) => {
    const file = path.join(seedDir, `${col}.json`);
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(data)) {
          store[col] = (store[col] && Array.isArray(store[col])) ? [...store[col], ...data] : data;
        } else {
          store[col] = Object.assign(store[col] || {}, data);
        }
      } catch (e) {}
    }
  });

  // Ensure default doctor directory is available
  if (!store.doctors || Object.keys(store.doctors).length === 0) {
    store.doctors = {
      doc_cardio_01: {
        doctorId: 'doc_cardio_01',
        fullName: 'Dr. Sarah Jenkins, MD, FACC',
        specialization: 'Cardiologist',
        hospitalAffiliation: 'Metropolitan Heart & Vascular Institute',
        verificationStatus: 'verified',
        yearsOfExperience: 14,
        bio: 'Board-certified adult cardiologist specializing in preventive cardiovascular imaging, lipidology, and ischemic heart disease.'
      },
      doc_pulm_02: {
        doctorId: 'doc_pulm_02',
        fullName: 'Dr. Michael Chang, MD',
        specialization: 'Pulmonologist',
        hospitalAffiliation: 'University Pulmonary & Critical Care Center',
        verificationStatus: 'verified',
        yearsOfExperience: 11,
        bio: 'Specialist in respiratory diagnostics, spirometry, and exertional breathlessness evaluation.'
      },
      doc_endo_03: {
        doctorId: 'doc_endo_03',
        fullName: 'Dr. Elena Rostova, MD',
        specialization: 'Endocrinologist',
        hospitalAffiliation: 'St. Jude Center for Diabetes & Endocrinology',
        verificationStatus: 'verified',
        yearsOfExperience: 16,
        bio: 'Clinical endocrinologist specializing in metabolic syndrome, glycemic calibration, and cardiovascular risk reduction.'
      },
      doc_gp_04: {
        doctorId: 'doc_gp_04',
        fullName: 'Dr. Rajiv Menon, MD',
        specialization: 'General Physician / Primary Care Clinician',
        hospitalAffiliation: 'CityCare Comprehensive Ambulatory Clinic',
        verificationStatus: 'verified',
        yearsOfExperience: 18,
        bio: 'Comprehensive internal medicine clinician providing routine preventative screening and chronic care coordination.'
      }
    };
  }
}
loadStore();

function saveStore() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {}
  if (!process.env.VERCEL) {
    try {
      fs.writeFileSync(path.join(__dirname, 'medic_db.json'), JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {}
  }
}

// PBKDF2 Password Hashing
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, expectedHash] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return hash === expectedHash;
}

// Self-contained, stateless, cryptographically-signed authentication tokens
function createSessionToken(user) {
  const payload = {
    uid: user.uid,
    role: user.role,
    email: user.email,
    fullName: user.fullName || '',
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
  const token = `sess_${data}.${sig}`;

  // Also save in store sessions for fast in-memory lookup
  store.sessions[token] = { token, uid: user.uid, role: user.role, createdAt: new Date().toISOString() };
  saveStore();
  return token;
}

function getAuthUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  // 1. Check in-memory store
  if (store.sessions[token]) {
    const session = store.sessions[token];
    if (store.users[session.uid]) return store.users[session.uid];
  }

  // 2. Check signed token structure
  if (token.startsWith('sess_') && token.includes('.')) {
    const raw = token.slice(5);
    const [data, sig] = raw.split('.');
    if (data && sig) {
      const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
      if (sig === expectedSig) {
        try {
          const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
          if (payload.exp && payload.exp < Date.now()) return null;

          let user = store.users[payload.uid];
          if (!user) {
            user = {
              uid: payload.uid,
              email: payload.email || '',
              fullName: payload.fullName || (payload.email ? payload.email.split('@')[0] : 'User'),
              role: payload.role || 'patient',
              accountStatus: 'active',
              createdAt: new Date().toISOString()
            };
            store.users[payload.uid] = user;
            if (payload.role === 'patient' && !store.patients[payload.uid]) {
              store.patients[payload.uid] = {
                patientId: payload.uid,
                userId: payload.uid,
                fullName: user.fullName,
                dateOfBirth: '1990-01-01',
                gender: 'Male',
                bloodGroup: 'O+',
                phone: '',
                createdAt: new Date().toISOString()
              };
            }
          }
          return user;
        } catch (e) {}
      }
    }
  }

  // 3. Fallback: match by session token property across all sessions
  for (const s of Object.values(store.sessions)) {
    if (s.token === token && store.users[s.uid]) {
      return store.users[s.uid];
    }
  }

  return null;
}

// Emergency Triage Safety Engine
function checkEmergencySafety(data) {
  const flags = [];
  const sbp = Number(data.trestbps || 0);
  const symptoms = (data.reported_symptoms || []).join(' ').toLowerCase();

  if (sbp >= 180) {
    flags.push('CRITICAL_HYPERTENSIVE_CRISIS');
  }
  if (symptoms.includes('crushing') || (Number(data.cp) === 4 && symptoms.includes('radiation'))) {
    flags.push('ACUTE_CORONARY_SYNDROME_SUSPECTED');
  }
  if (symptoms.includes('stroke') || symptoms.includes('facial droop') || symptoms.includes('arm weakness') || symptoms.includes('slurred speech')) {
    flags.push('ACUTE_STROKE_WARNING');
  }
  if (symptoms.includes('dyspnea') && symptoms.includes('rest')) {
    flags.push('SEVERE_RESPIRATORY_DISTRESS');
  }

  const isEmergency = flags.length > 0;
  return {
    is_emergency: isEmergency,
    urgent_warning: isEmergency ? 'IMMEDIATE EMERGENCY MEDICAL EVALUATION REQUIRED. Dial 112 or local emergency dispatch.' : null,
    action_required: isEmergency ? 'Proceed immediately to the nearest emergency department or call emergency services (112).' : null,
    emergency_contact: '112',
    detected_flags: flags
  };
}

// Specialist Recommender Engine with basedOn array
function recommendSpecialist(prob, data) {
  const symptoms = (data.reported_symptoms || []).join(' ').toLowerCase();
  const fbs = Number(data.fbs || 0);
  const cp = Number(data.cp || 0);
  const oldpeak = Number(data.oldpeak || 0);

  if (prob >= 0.55 || (cp >= 2 && oldpeak >= 1.5)) {
    const basedOn = ['trained_ml_model_prediction', 'cardiovascular_risk_stratification'];
    if (cp in [1, 2, 3]) basedOn.push('reported_angina_symptoms');
    if (Number(data.trestbps) >= 140) basedOn.push('stage_2_hypertension');

    return {
      specialty: 'Cardiologist',
      reason: `Calibrated machine learning risk pattern detected (${(prob * 100).toFixed(1)}% cardiovascular probability score). Diagnostic stress testing and coronary evaluation recommended.`,
      basedOn,
      urgency: prob >= 0.75 ? 'priority' : 'routine',
      disclaimer: 'AI-generated clinical decision support only. Consult a licensed clinician.'
    };
  }
  if (symptoms.includes('cough') || symptoms.includes('wheezing') || symptoms.includes('shortness of breath')) {
    return {
      specialty: 'Pulmonologist',
      reason: 'Patient reported respiratory symptoms (dyspnea, wheezing) requiring specialized pulmonary function assessment.',
      basedOn: ['patient_reported_symptoms', 'respiratory_evaluation'],
      urgency: 'routine',
      disclaimer: 'AI-generated clinical decision support only. Consult a licensed clinician.'
    };
  }
  if (fbs === 1 || symptoms.includes('glucose') || symptoms.includes('thirst') || symptoms.includes('sugar')) {
    return {
      specialty: 'Endocrinologist / Diabetologist',
      reason: 'Elevated fasting blood sugar profile (>120 mg/dl) or glycemic symptoms requiring metabolic assessment.',
      basedOn: ['elevated_fasting_blood_glucose', 'metabolic_profile'],
      urgency: 'routine',
      disclaimer: 'AI-generated clinical decision support only. Consult a licensed clinician.'
    };
  }
  return {
    specialty: 'General Physician / Primary Care Clinician',
    reason: 'Routine screening indicates low immediate cardiovascular risk. Comprehensive annual wellness evaluation recommended.',
    basedOn: ['trained_ml_model_prediction', 'routine_wellness_screening'],
    urgency: 'routine',
    disclaimer: 'AI-generated clinical decision support only. Consult a licensed clinician.'
  };
}

// ML Model Inference
function predictHeartDisease(input) {
  if (!modelWeights) {
    throw new Error('Model weights not initialized');
  }
  const featureCols = [
    Number(input.age),
    Number(input.sex),
    Number(input.cp),
    Number(input.trestbps),
    Number(input.chol),
    Number(input.fbs),
    Number(input.restecg),
    Number(input.thalach),
    Number(input.exang),
    Number(input.oldpeak),
    Number(input.slope),
    Number(input.ca),
    Number(input.thal)
  ];

  // Impute and Scale
  const scaled = featureCols.map((val, i) => {
    const v = isNaN(val) ? modelWeights.imputer[i] : val;
    return (v - modelWeights.scaler_mean[i]) / modelWeights.scaler_scale[i];
  });

  // Evaluate Trees
  let totalProb = 0;
  for (const tree of modelWeights.trees) {
    let node = 0;
    while (tree.left[node] !== -1) {
      const feat = tree.feature[node];
      if (scaled[feat] <= tree.threshold[node]) {
        node = tree.left[node];
      } else {
        node = tree.right[node];
      }
    }
    const val = tree.values[node];
    const treeProb = val[1] / (val[0] + val[1]);
    totalProb += treeProb;
  }
  const prob = totalProb / modelWeights.trees.length;
  const rawPred = prob >= 0.5 ? 1 : 0;

  let riskCategory = 'Low Risk';
  if (prob >= 0.75) riskCategory = 'High Risk';
  else if (prob >= 0.55) riskCategory = 'Elevated Risk';
  else if (prob >= 0.35) riskCategory = 'Moderate Risk';

  return {
    hasDiseaseRisk: rawPred === 1,
    probability: Math.round(prob * 10000) / 10000,
    riskCategory,
    predictedCondition: rawPred === 1 ? 'Coronary Artery Disease Pattern Detected' : 'No Significant Coronary Artery Disease Pattern Detected'
  };
}

// Universal Body Parser (handles JSON and multipart/form-data)
async function parseBody(req) {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    return new Promise((resolve) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
          if (!boundaryMatch) return resolve({ fields: {}, files: {} });
          const boundary = boundaryMatch[1] || boundaryMatch[2];
          const boundaryBuffer = Buffer.from(`--${boundary}`);
          const result = { fields: {}, files: {} };

          let start = 0;
          while (start < buffer.length) {
            const idx = buffer.indexOf(boundaryBuffer, start);
            if (idx === -1) break;

            const nextIdx = buffer.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
            const partBuffer = nextIdx !== -1
              ? buffer.slice(idx + boundaryBuffer.length, nextIdx)
              : buffer.slice(idx + boundaryBuffer.length);

            start = nextIdx !== -1 ? nextIdx : buffer.length;

            const headerEnd = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
            if (headerEnd === -1) continue;

            const headerStr = partBuffer.slice(0, headerEnd).toString('utf8');
            let bodyBuffer = partBuffer.slice(headerEnd + 4);
            if (bodyBuffer.length >= 2 && bodyBuffer[bodyBuffer.length - 2] === 13 && bodyBuffer[bodyBuffer.length - 1] === 10) {
              bodyBuffer = bodyBuffer.slice(0, bodyBuffer.length - 2);
            }

            const nameMatch = headerStr.match(/name="([^"]+)"/);
            if (!nameMatch) continue;
            const fieldName = nameMatch[1];
            const filenameMatch = headerStr.match(/filename="([^"]+)"/);

            if (filenameMatch) {
              const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
              result.files[fieldName] = {
                filename: filenameMatch[1],
                contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
                data: bodyBuffer,
                size: bodyBuffer.length
              };
            } else {
              result.fields[fieldName] = bodyBuffer.toString('utf8').trim();
            }
          }
          resolve(result);
        } catch (e) {
          resolve({ fields: {}, files: {} });
        }
      });
    });
  }

  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function logAudit(actorUid, action, resourceType, resourceId, outcome = 'SUCCESS') {
  const event = {
    eventId: 'evt_' + crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    actorUid,
    action,
    resourceType,
    resourceId,
    outcome
  };
  if (!Array.isArray(store.audit_logs)) store.audit_logs = [];
  store.audit_logs.unshift(event);
  if (store.audit_logs.length > 500) store.audit_logs.pop();
}

// Main Vercel Serverless Function Handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname.replace(/\/+$/, '') || '/';

  // Normalize path if /api/index prefix is present
  if (pathname.startsWith('/api/index')) {
    pathname = pathname.replace('/api/index', '/api');
  }

  try {
    // -------------------------------------------------------------
    // 1. HEALTH CHECK
    // -------------------------------------------------------------
    if (pathname === '/api/v1/health' || pathname === '/api/health') {
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Healthcare Platform AI Cloud Backend',
        model: {
          name: 'RandomForest',
          version: '1.0.0',
          accuracy: 0.9016,
          f1_score: 0.8929,
          roc_auc: 0.9610
        }
      });
    }

    // -------------------------------------------------------------
    // 2. AUTHENTICATION (REGISTER / LOGIN / FORGOT-PASSWORD / ME)
    // -------------------------------------------------------------
    if (pathname === '/api/v1/auth/register' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const password = body.password || '';
      const fullName = body.fullName || '';
      const role = body.role || 'patient';

      if (!email || !password || password.length < 6) {
        return res.status(400).json({ error: 'Validation Error', message: 'Valid email and password (min 6 chars) required.' });
      }

      for (const u of Object.values(store.users)) {
        if (u.email === email) {
          return res.status(400).json({ error: 'Conflict', message: 'An account with this email address already exists.' });
        }
      }

      const uid = 'usr_' + crypto.randomBytes(6).toString('hex');
      const passwordHash = hashPassword(password);
      const now = new Date().toISOString();

      const userDoc = {
        uid,
        email,
        fullName,
        role,
        passwordHash,
        accountStatus: 'active',
        createdAt: now,
        updatedAt: now
      };
      store.users[uid] = userDoc;

      if (role === 'patient') {
        store.patients[uid] = {
          patientId: uid,
          userId: uid,
          fullName,
          dateOfBirth: body.dateOfBirth || '1990-01-01',
          gender: body.gender || 'Not Specified',
          bloodGroup: body.bloodGroup || 'Unknown',
          phone: body.phone || '',
          emergencyContact: body.emergencyContact || '',
          address: body.address || '',
          createdAt: now
        };
      } else if (role === 'doctor') {
        store.doctors[uid] = {
          doctorId: uid,
          userId: uid,
          fullName,
          specialization: body.specialization || body.specialty || 'Cardiologist',
          medicalLicenseNumber: body.medicalLicenseNumber || 'LIC-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
          hospitalAffiliation: body.hospitalAffiliation || 'General Medical Hospital',
          yearsOfExperience: Number(body.yearsOfExperience || 10),
          bio: body.bio || 'Practicing clinical medical specialist.',
          verificationStatus: 'verified',
          createdAt: now
        };
      }

      const token = createSessionToken(userDoc);
      logAudit(uid, 'USER_REGISTER', 'users', uid);

      return res.status(201).json({
        message: 'Account successfully registered.',
        token,
        user: {
          uid: userDoc.uid,
          email: userDoc.email,
          fullName: userDoc.fullName,
          role: userDoc.role,
          accountStatus: userDoc.accountStatus
        }
      });
    }

    if (pathname === '/api/v1/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const password = body.password || '';

      let found = null;
      for (const u of Object.values(store.users)) {
        if (u.email === email) {
          found = u;
          break;
        }
      }

      if (!found || !verifyPassword(password, found.passwordHash)) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
      }

      const token = createSessionToken(found);
      logAudit(found.uid, 'USER_LOGIN', 'users', found.uid);

      return res.status(200).json({
        message: 'Login successful.',
        token,
        user: {
          uid: found.uid,
          email: found.email,
          fullName: found.fullName,
          role: found.role,
          accountStatus: found.accountStatus
        }
      });
    }

    if (pathname === '/api/v1/auth/forgot-password' && req.method === 'POST') {
      return res.status(200).json({
        message: 'Password reset link dispatched to your registered email address.'
      });
    }

    if (pathname === '/api/v1/me' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      return res.status(200).json({
        user: {
          uid: user.uid,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          accountStatus: user.accountStatus
        }
      });
    }

    if (pathname === '/api/v1/sync-user' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      return res.status(200).json({ user });
    }

    // -------------------------------------------------------------
    // 3. PATIENTS PROFILE (GET & PUT /api/v1/patients/me)
    // -------------------------------------------------------------
    if (pathname === '/api/v1/patients/me') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      if (req.method === 'GET') {
        let profile = store.patients[user.uid];
        if (!profile) {
          profile = {
            patientId: user.uid,
            userId: user.uid,
            fullName: user.fullName || 'Patient',
            dateOfBirth: '1990-01-01',
            gender: 'Male',
            bloodGroup: 'O+',
            phone: '',
            emergencyContact: '',
            address: '',
            createdAt: new Date().toISOString()
          };
          store.patients[user.uid] = profile;
          saveStore();
        }
        return res.status(200).json(profile);
      }

      if (req.method === 'PUT') {
        const body = await parseBody(req);
        const existing = store.patients[user.uid] || { patientId: user.uid, userId: user.uid };
        const updated = {
          ...existing,
          fullName: body.fullName || existing.fullName || user.fullName,
          dateOfBirth: body.dateOfBirth || existing.dateOfBirth,
          gender: body.gender || existing.gender,
          bloodGroup: body.bloodGroup || existing.bloodGroup,
          phone: body.phone !== undefined ? body.phone : existing.phone,
          emergencyContact: body.emergencyContact !== undefined ? body.emergencyContact : existing.emergencyContact,
          address: body.address !== undefined ? body.address : existing.address,
          updatedAt: new Date().toISOString()
        };
        store.patients[user.uid] = updated;
        if (body.fullName) {
          user.fullName = body.fullName;
          store.users[user.uid].fullName = body.fullName;
        }
        saveStore();
        logAudit(user.uid, 'PATIENT_PROFILE_UPDATE', 'patients', user.uid);
        return res.status(200).json(updated);
      }
    }

    // -------------------------------------------------------------
    // 4. DOCTOR PROFILE
    // -------------------------------------------------------------
    if (pathname === '/api/v1/doctor/profile/me' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'doctor') return res.status(403).json({ error: 'Forbidden', message: 'Doctor role required.' });
      const doc = store.doctors[user.uid] || {
        doctorId: user.uid,
        fullName: user.fullName,
        specialization: 'Cardiologist',
        hospitalAffiliation: 'Metropolitan Medical Center',
        verificationStatus: 'verified'
      };
      return res.status(200).json(doc);
    }

    if (pathname === '/api/v1/doctor/profile' && req.method === 'PUT') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'doctor') return res.status(403).json({ error: 'Forbidden', message: 'Doctor role required.' });
      const body = await parseBody(req);
      const existing = store.doctors[user.uid] || { doctorId: user.uid };
      const updated = {
        ...existing,
        ...body,
        updatedAt: new Date().toISOString()
      };
      store.doctors[user.uid] = updated;
      saveStore();
      return res.status(200).json(updated);
    }

    if (pathname === '/api/v1/doctor/directory' && req.method === 'GET') {
      const docs = Object.values(store.doctors || {});
      return res.status(200).json({ count: docs.length, doctors: docs });
    }

    // -------------------------------------------------------------
    // 5. DOCTOR ACCESS & CONSENT SHARING
    // -------------------------------------------------------------
    if (pathname === '/api/v1/patient/doctor-grants' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      const grants = Object.values(store.doctor_access || {}).filter(g => g.patientId === user.uid);
      return res.status(200).json({ grants });
    }

    if (pathname === '/api/v1/doctor-access') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      if (req.method === 'GET') {
        const grants = Object.values(store.doctor_access || {}).filter(g => g.patientId === user.uid || g.doctorId === user.uid);
        return res.status(200).json({ accessGrants: grants });
      }

      if (req.method === 'POST') {
        const body = await parseBody(req);
        const accessId = 'acc_' + crypto.randomBytes(6).toString('hex');
        const now = new Date().toISOString();
        const docInfo = store.doctors[body.doctorId] || {};
        const grant = {
          accessId,
          patientId: user.uid,
          doctorId: body.doctorId,
          doctorName: docInfo.fullName || 'Clinical Specialist',
          purpose: body.purpose || 'Cardiovascular consultation and clinical assessment',
          status: 'active',
          grantedBy: user.uid,
          grantedAt: now
        };
        store.doctor_access[accessId] = grant;
        saveStore();
        logAudit(user.uid, 'DOCTOR_ACCESS_GRANTED', 'doctor_access', accessId);
        return res.status(201).json({ message: 'Access granted successfully.', accessGrant: grant });
      }
    }

    if (pathname.startsWith('/api/v1/doctor-access/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      const accessId = pathname.split('/').pop();
      if (store.doctor_access[accessId]) {
        store.doctor_access[accessId].status = 'revoked';
        store.doctor_access[accessId].revokedAt = new Date().toISOString();
        saveStore();
        logAudit(user.uid, 'DOCTOR_ACCESS_REVOKED', 'doctor_access', accessId);
      }
      return res.status(200).json({ message: 'Access revoked successfully.' });
    }

    // -------------------------------------------------------------
    // 6. DOCTOR PATIENTS & CLINICAL NOTES
    // -------------------------------------------------------------
    if (pathname === '/api/v1/doctor/patients' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'doctor') return res.status(403).json({ error: 'Forbidden', message: 'Doctor role required.' });

      const authorizedGrants = Object.values(store.doctor_access || {}).filter(g => g.doctorId === user.uid && g.status === 'active');
      const patientIds = [...new Set(authorizedGrants.map(g => g.patientId))];
      // Also include test patient if list is empty for demo convenience
      if (patientIds.length === 0) {
        patientIds.push(...Object.keys(store.patients).slice(0, 3));
      }
      const patients = patientIds.map(pid => store.patients[pid] || { patientId: pid, fullName: 'Authorized Patient', bloodGroup: 'O+', dateOfBirth: '1990-01-01' });
      return res.status(200).json({ count: patients.length, patients });
    }

    if (pathname.startsWith('/api/v1/doctor/patients/') && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'doctor') return res.status(403).json({ error: 'Forbidden', message: 'Doctor role required.' });
      const patientId = pathname.split('/').pop();
      const patient = store.patients[patientId] || { patientId, fullName: 'Patient Profile', dateOfBirth: '1990-01-01', bloodGroup: 'O+', gender: 'Not Specified' };
      const records = Object.values(store.medical_records || {}).filter(r => r.patientId === patientId);
      const predictions = Object.values(store.predictions || {}).filter(p => p.patientId === patientId);
      const reports = Object.values(store.lab_reports || {}).filter(r => r.patientId === patientId);
      const clinicalNotes = Object.values(store.clinical_notes || {}).filter(n => n.patientId === patientId);

      return res.status(200).json({
        patient,
        medicalRecords: records,
        predictions,
        reports,
        clinicalNotes
      });
    }

    if (pathname === '/api/v1/clinical-notes' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'doctor') return res.status(403).json({ error: 'Forbidden', message: 'Doctor role required.' });
      const body = await parseBody(req);
      const noteId = 'not_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();
      const note = {
        noteId,
        patientId: body.patientId,
        doctorId: user.uid,
        doctorName: user.fullName,
        content: body.content,
        diagnosis: body.diagnosis || '',
        prescriptions: body.prescriptions || '',
        followUpDate: body.followUpDate || null,
        createdAt: now
      };
      store.clinical_notes[noteId] = note;
      saveStore();
      logAudit(user.uid, 'CLINICAL_NOTE_CREATE', 'clinical_notes', noteId);
      return res.status(201).json(note);
    }

    if (pathname === '/api/v1/doctor/notes' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'doctor') return res.status(403).json({ error: 'Forbidden', message: 'Doctor role required.' });
      const notes = Object.values(store.clinical_notes || {}).filter(n => n.doctorId === user.uid);
      return res.status(200).json({ count: notes.length, notes });
    }

    // -------------------------------------------------------------
    // 7. MEDICAL RECORDS (GET, POST, DELETE)
    // -------------------------------------------------------------
    if (pathname === '/api/v1/medical-records') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      if (req.method === 'GET') {
        const patientId = url.searchParams.get('patientId') || user.uid;
        const records = Object.values(store.medical_records || {}).filter(r => r.patientId === patientId);
        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.status(200).json({ count: records.length, records });
      }

      if (req.method === 'POST') {
        const body = await parseBody(req);
        const recordId = 'rec_' + crypto.randomBytes(6).toString('hex');
        const now = new Date().toISOString();
        const targetPatientId = body.patientId || user.uid;

        const record = {
          recordId,
          patientId: targetPatientId,
          createdBy: user.uid,
          creatorRole: user.role,
          symptoms: Array.isArray(body.symptoms) ? body.symptoms : [],
          medicalHistory: Array.isArray(body.medicalHistory) ? body.medicalHistory : [],
          allergies: Array.isArray(body.allergies) ? body.allergies : [],
          medications: Array.isArray(body.medications) ? body.medications : [],
          vitalSigns: body.vitalSigns || {
            bloodPressureSystolic: 120,
            bloodPressureDiastolic: 80,
            heartRate: 72,
            oxygenSaturation: 98,
            temperature: 98.6,
            weightKg: 70
          },
          notes: body.notes || '',
          createdAt: now,
          updatedAt: now
        };
        store.medical_records[recordId] = record;
        saveStore();
        logAudit(user.uid, 'MEDICAL_RECORD_CREATE', 'medical_records', recordId);
        return res.status(201).json(record);
      }
    }

    if (pathname.startsWith('/api/v1/medical-records/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      const recordId = pathname.split('/').pop();
      if (store.medical_records[recordId]) {
        delete store.medical_records[recordId];
        saveStore();
        logAudit(user.uid, 'MEDICAL_RECORD_DELETE', 'medical_records', recordId);
      }
      return res.status(200).json({ message: 'Record deleted successfully.' });
    }

    // -------------------------------------------------------------
    // 8. MACHINE LEARNING PREDICTIONS (POST, GET)
    // -------------------------------------------------------------
    if (pathname === '/api/v1/predict' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      const body = await parseBody(req);
      const age = Number(body.age);
      if (isNaN(age) || age < 1 || age > 125) {
        return res.status(422).json({ error: 'Validation Error', message: 'Valid age between 1 and 125 is required.' });
      }

      const emergencyAlert = checkEmergencySafety(body);
      const prediction = predictHeartDisease(body);
      const specialistRec = recommendSpecialist(prediction.probability, body);
      const predictionId = 'pred_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();

      const record = {
        predictionId,
        patientId: body.patientId || user.uid,
        modelName: 'RandomForest',
        modelVersion: '1.0.0',
        inputFeatureSummary: body,
        predictedCondition: prediction.predictedCondition,
        hasDiseaseRisk: prediction.hasDiseaseRisk,
        riskCategory: prediction.riskCategory,
        probability: prediction.probability,
        specialistRecommendation: specialistRec,
        emergencyAlert,
        warnings: emergencyAlert.is_emergency ? [emergencyAlert.urgent_warning] : [],
        disclaimer: 'AI-generated clinical decision support only. Consult a licensed clinician for formal medical evaluation.',
        createdAt: now,
        requestedBy: user.uid,
        requesterRole: user.role
      };

      store.predictions[predictionId] = record;
      saveStore();
      logAudit(user.uid, 'AI_PREDICTION_RUN', 'predictions', predictionId);

      return res.status(201).json(record);
    }

    if (pathname === '/api/v1/predictions' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      const patientId = url.searchParams.get('patientId') || user.uid;
      const results = Object.values(store.predictions || {}).filter(p => p.patientId === patientId);
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json({ count: results.length, predictions: results });
    }

    if (pathname.startsWith('/api/v1/predictions/') && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      const predictionId = pathname.split('/').pop();
      const pred = store.predictions[predictionId];
      if (!pred) return res.status(404).json({ error: 'Not Found', message: 'Prediction record not found.' });
      return res.status(200).json(pred);
    }

    // -------------------------------------------------------------
    // 9. LAB REPORTS & DIAGNOSTIC DOCUMENTS
    // -------------------------------------------------------------
    if (pathname === '/api/v1/reports' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      const patientId = url.searchParams.get('patientId') || user.uid;
      const reports = Object.values(store.lab_reports || {}).filter(r => r.patientId === patientId);
      reports.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const safeReports = reports.map(r => {
        const { fileData, ...rest } = r;
        return rest;
      });
      return res.status(200).json({ count: safeReports.length, reports: safeReports });
    }

    if (pathname === '/api/v1/reports/upload' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      const parsed = await parseBody(req);
      const fields = parsed.fields || parsed;
      const files = parsed.files || {};
      const file = files.file;

      const reportId = 'rep_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();
      const fileName = file ? file.filename : (fields.fileName || 'Diagnostic_Scan.pdf');
      const fileType = file ? file.contentType : (fields.fileType || 'application/pdf');
      const fileSize = file ? file.size : (Number(fields.fileSize) || 120000);
      const description = fields.description || 'Clinical diagnostic document';
      const patientId = fields.patientId || user.uid;

      const reportDoc = {
        reportId,
        patientId,
        fileName,
        fileType,
        fileSize,
        description,
        uploadedBy: user.uid,
        uploaderRole: user.role,
        uploadedAt: now,
        fileData: file && file.data ? file.data.toString('base64') : null
      };

      store.lab_reports[reportId] = reportDoc;
      saveStore();
      logAudit(user.uid, 'DOCUMENT_FILE_UPLOAD', 'lab_reports', reportId);

      const { fileData, ...safeDoc } = reportDoc;
      return res.status(201).json(safeDoc);
    }

    if (pathname === '/api/v1/reports/metadata' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      const body = await parseBody(req);
      const reportId = 'rep_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();
      const reportDoc = {
        reportId,
        patientId: body.patientId || user.uid,
        fileName: body.fileName || 'Lab_Report.pdf',
        fileType: body.fileType || 'application/pdf',
        fileSize: body.fileSize || 50000,
        description: body.description || 'Lab diagnostic report',
        uploadedBy: user.uid,
        uploaderRole: user.role,
        uploadedAt: now
      };
      store.lab_reports[reportId] = reportDoc;
      saveStore();
      return res.status(201).json(reportDoc);
    }

    if (pathname === '/api/v1/reports/summary/download' && req.method === 'GET') {
      const user = getAuthUser(req);
      const targetId = url.searchParams.get('patientId') || (user ? user.uid : 'patient_demo');
      const patient = store.patients[targetId] || { fullName: user ? user.fullName : 'Authorized Patient', bloodGroup: 'O+', dateOfBirth: '1990-01-01' };
      const records = Object.values(store.medical_records || {}).filter(r => r.patientId === targetId);
      const preds = Object.values(store.predictions || {}).filter(p => p.patientId === targetId);

      const summaryText = `========================================================================
MEDICLOUD AI — PATIENT CLINICAL LONGITUDINAL SUMMARY
Generated: ${new Date().toUTCString()}
Confidential Healthcare Data — Strictly Authorized Clinician Review
========================================================================

PATIENT DEMOGRAPHICS:
Full Name:        ${patient.fullName}
Date of Birth:    ${patient.dateOfBirth || '1990-01-01'}
Blood Group:      ${patient.bloodGroup || 'O+'}
Patient ID:       ${targetId}

------------------------------------------------------------------------
AI CARDIOVASCULAR RISK EVALUATIONS (${preds.length} Total Assessments):
------------------------------------------------------------------------
${preds.length === 0 ? 'No prior AI cardiovascular screenings recorded.' : preds.map((p, idx) => `
[Evaluation #${idx + 1}] Date: ${new Date(p.createdAt).toLocaleDateString()}
  Predicted Pattern: ${p.predictedCondition}
  Risk Category:     ${p.riskCategory}
  Risk Probability:  ${(p.probability * 100).toFixed(1)}%
  Specialist Route:  ${p.specialistRecommendation ? p.specialistRecommendation.specialty : 'N/A'}
  Priority:          ${p.specialistRecommendation ? p.specialistRecommendation.urgency : 'routine'}
  Reasoning:         ${p.specialistRecommendation ? p.specialistRecommendation.reason : ''}
`).join('\n')}

------------------------------------------------------------------------
DOCUMENTED MEDICAL RECORDS & VITALS TIMELINE (${records.length} Entries):
------------------------------------------------------------------------
${records.length === 0 ? 'No clinical vitals entries recorded.' : records.map((r, idx) => `
[Record #${idx + 1}] Recorded: ${new Date(r.createdAt).toLocaleString()}
  Symptoms:          ${(r.symptoms || []).join(', ') || 'None reported'}
  Active Meds:       ${(r.medications || []).join(', ') || 'None'}
  Allergies:         ${(r.allergies || []).join(', ') || 'NKDA (No known allergies)'}
  Vitals:            BP: ${r.vitalSigns?.bloodPressureSystolic || 120}/${r.vitalSigns?.bloodPressureDiastolic || 80} mmHg, HR: ${r.vitalSigns?.heartRate || 72} bpm, SpO2: ${r.vitalSigns?.oxygenSaturation || 98}%
  Clinical Notes:    ${r.notes || 'None'}
`).join('\n')}

========================================================================
DISCLAIMER: This document is synthesized for clinical decision support.
MediCloud AI Machine Learning Pipeline v1.0.0. All rights reserved.
========================================================================`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Health_Summary_${new Date().toISOString().slice(0, 10)}.txt"`);
      return res.status(200).send(summaryText);
    }

    if (pathname.startsWith('/api/v1/reports/') && pathname.endsWith('/download') && req.method === 'GET') {
      const reportId = pathname.replace('/api/v1/reports/', '').replace('/download', '');
      const report = store.lab_reports[reportId];
      if (!report) {
        return res.status(404).json({ error: 'Not Found', message: 'Report not found.' });
      }

      res.setHeader('Content-Type', report.fileType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);

      if (report.fileData) {
        const buf = Buffer.from(report.fileData, 'base64');
        return res.status(200).send(buf);
      } else {
        const dummyContent = `MediCloud AI - Diagnostic Report\nID: ${report.reportId}\nDocument: ${report.fileName}\nUploaded: ${report.uploadedAt}\nDescription: ${report.description}\nVerified Clinical Document.`;
      }
    }

    if (pathname.startsWith('/api/v1/reports/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      const reportId = pathname.split('/').pop();
      if (store.lab_reports[reportId]) {
        delete store.lab_reports[reportId];
        saveStore();
        logAudit(user.uid, 'DOCUMENT_DELETE', 'lab_reports', reportId);
      }
      return res.status(200).json({ message: 'Report deleted successfully.' });
    }

    // -------------------------------------------------------------
    // 10. ADMINISTRATOR OPERATIONS
    // -------------------------------------------------------------
    if (pathname === '/api/v1/admin/stats' && req.method === 'GET') {
      const allUsers = Object.values(store.users || {});
      const allPreds = Object.values(store.predictions || {});
      const riskCounts = { 'Low Risk': 0, 'Moderate Risk': 0, 'Elevated Risk': 0, 'High Risk': 0 };
      for (const p of allPreds) {
        const cat = p.riskCategory || 'Low Risk';
        riskCounts[cat] = (riskCounts[cat] || 0) + 1;
      }

      return res.status(200).json({
        totalUsers: allUsers.length,
        roleDistribution: {
          patient: allUsers.filter(u => u.role === 'patient').length,
          doctor: allUsers.filter(u => u.role === 'doctor').length,
          admin: allUsers.filter(u => u.role === 'admin').length
        },
        riskDistribution: riskCounts,
        totalPatients: Object.keys(store.patients || {}).length,
        totalDoctors: Object.keys(store.doctors || {}).length,
        totalPredictions: allPreds.length,
        totalRecords: Object.keys(store.medical_records || {}).length,
        totalDocuments: Object.keys(store.lab_reports || {}).length,
        totalClinicalNotes: Object.keys(store.clinical_notes || {}).length,
        totalAuditEvents: Array.isArray(store.audit_logs) ? store.audit_logs.length : 0
      });
    }

    if (pathname === '/api/v1/admin/users' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden', message: 'Admin role required.' });
      const userList = Object.values(store.users || {}).map(u => ({
        uid: u.uid,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        accountStatus: u.accountStatus || 'active',
        createdAt: u.createdAt,
        doctorProfile: store.doctors[u.uid] || null
      }));
      return res.status(200).json({ count: userList.length, users: userList });
    }

    if (pathname.startsWith('/api/v1/admin/users/') && pathname.endsWith('/role') && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden', message: 'Admin role required.' });
      const targetUid = pathname.replace('/api/v1/admin/users/', '').replace('/role', '');
      const body = await parseBody(req);

      if (store.users[targetUid]) {
        store.users[targetUid].role = body.role || store.users[targetUid].role;
        store.users[targetUid].accountStatus = body.accountStatus || store.users[targetUid].accountStatus;
        if (body.role === 'doctor') {
          if (!store.doctors[targetUid]) {
            store.doctors[targetUid] = {
              doctorId: targetUid,
              fullName: store.users[targetUid].fullName,
              specialization: 'General Physician',
              verificationStatus: body.verificationStatus || 'verified'
            };
          } else {
            store.doctors[targetUid].verificationStatus = body.verificationStatus || 'verified';
          }
        }
        saveStore();
        logAudit(user.uid, 'ADMIN_USER_ROLE_UPDATE', 'users', targetUid);
      }
      return res.status(200).json({ message: 'User role updated successfully.' });
    }

    if (pathname === '/api/v1/admin/audit-logs' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden', message: 'Admin role required.' });
      const limit = Number(url.searchParams.get('limit')) || 100;
      const logs = (Array.isArray(store.audit_logs) ? store.audit_logs : []).slice(0, limit);
      return res.status(200).json({ count: logs.length, logs });
    }

    // Default 404 for unknown API route
    return res.status(404).json({ error: 'Not Found', message: `API route ${pathname} not found.` });

  } catch (error) {
    console.error('Serverless API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
