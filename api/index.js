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
  reports: {},
  audit_logs: {},
};

// Seed initial database
function loadStore() {
  if (fs.existsSync(DB_PATH)) {
    try {
      store = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      return;
    } catch (e) {}
  }
  // Try loading from backend/data/db
  const seedDir = path.join(__dirname, '..', 'backend', 'data', 'db');
  ['users', 'patients', 'doctors', 'predictions', 'medical_records', 'doctor_access', 'sessions'].forEach((col) => {
    const file = path.join(seedDir, `${col}.json`);
    if (fs.existsSync(file)) {
      try {
        store[col] = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {}
    }
  });
}
loadStore();

function saveStore() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {}
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

// Emergency Triage Safety Engine
function checkEmergencySafety(data) {
  const flags = [];
  const sbp = Number(data.trestbps || 0);
  const symptoms = (data.reported_symptoms || []).join(' ').toLowerCase();

  if (sbp >= 180) {
    flags.push('CRITICAL_HYPERTENSIVE_CRISIS');
  }
  if (symptoms.includes('crushing') || (data.cp === 4 && symptoms.includes('radiation'))) {
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
    urgent_warning: isEmergency ? 'IMMEDIATE EMERGENCY MEDICAL EVALUATION REQUIRED. Dial 112 or local ambulance immediately.' : null,
    action_required: isEmergency ? 'Proceed to nearest emergency department or call emergency dispatch (112).' : null,
    emergency_contact: '112',
    detected_flags: flags
  };
}

// Specialist Recommender Engine
function recommendSpecialist(prob, data) {
  const symptoms = (data.reported_symptoms || []).join(' ').toLowerCase();
  const fbs = Number(data.fbs || 0);

  if (prob >= 0.55 || (data.cp >= 2 && data.oldpeak >= 1.5)) {
    return {
      specialty: 'Cardiologist',
      reason: 'Elevated cardiovascular risk pattern detected by machine learning classifier.',
      urgency: prob >= 0.75 ? 'urgent' : 'high',
      disclaimer: 'AI-generated clinical decision support only. Consult a licensed clinician.'
    };
  }
  if (symptoms.includes('cough') || symptoms.includes('wheezing') || symptoms.includes('shortness of breath')) {
    return {
      specialty: 'Pulmonologist',
      reason: 'Respiratory symptoms reported requiring specialized pulmonary assessment.',
      urgency: 'moderate',
      disclaimer: 'AI-generated clinical decision support only. Consult a licensed clinician.'
    };
  }
  if (fbs === 1 || symptoms.includes('glucose') || symptoms.includes('thirst') || symptoms.includes('sugar')) {
    return {
      specialty: 'Endocrinologist',
      reason: 'Elevated fasting blood sugar profile requiring metabolic assessment.',
      urgency: 'moderate',
      disclaimer: 'AI-generated clinical decision support only. Consult a licensed clinician.'
    };
  }
  return {
    specialty: 'General Physician / Primary Care Clinician',
    reason: 'Routine screening indicates low immediate risk. Comprehensive wellness evaluation recommended.',
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

// Helper to authenticate request
function getAuthUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const session = store.sessions[token];
  if (!session) return null;
  return store.users[session.uid] || null;
}

// JSON Parser Helper
async function parseBody(req) {
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
    // 1. HEALTH CHECK
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

    // 2. REGISTER
    if (pathname === '/api/v1/auth/register' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const password = body.password || '';
      const fullName = body.fullName || '';
      const role = body.role || 'patient';

      if (!email || !password || password.length < 6) {
        return res.status(400).json({ error: 'Validation Error', message: 'Valid email and password (min 6 chars) required.' });
      }

      // Check existing user
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
          createdAt: now
        };
      } else if (role === 'doctor') {
        store.doctors[uid] = {
          doctorId: uid,
          userId: uid,
          fullName,
          specialty: body.specialty || 'General Physician',
          licenseNumber: body.licenseNumber || 'PENDING',
          hospitalAffiliation: body.hospitalAffiliation || '',
          verificationStatus: 'verified',
          createdAt: now
        };
      }

      // Generate session token
      const token = 'sess_' + crypto.randomBytes(32).toString('hex');
      store.sessions[token] = { token, uid, role, createdAt: now };
      saveStore();

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

    // 3. LOGIN
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

      const token = 'sess_' + crypto.randomBytes(32).toString('hex');
      store.sessions[token] = { token, uid: found.uid, role: found.role, createdAt: new Date().toISOString() };
      saveStore();

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

    // 4. ME / SYNC-USER
    if (pathname === '/api/v1/me' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Valid authentication required.' });
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
      const body = await parseBody(req);
      if (body.role && body.role === 'admin' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden', message: 'Self-elevation to admin is prohibited.' });
      }
      return res.status(200).json({ user });
    }

    // 5. PREDICT
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
        patientId: user.uid,
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
        disclaimer: 'AI-generated results are intended for clinical decision support only.',
        createdAt: now,
        requestedBy: user.uid,
        requesterRole: user.role
      };

      store.predictions[predictionId] = record;
      saveStore();

      return res.status(201).json(record);
    }

    // 6. PREDICTIONS LIST
    if (pathname === '/api/v1/predictions' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      const patientId = url.searchParams.get('patientId') || user.uid;
      const results = Object.values(store.predictions).filter(p => p.patientId === patientId);
      return res.status(200).json({ count: results.length, predictions: results });
    }

    // 7. MEDICAL RECORDS
    if (pathname === '/api/v1/medical-records') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      if (req.method === 'GET') {
        const patientId = url.searchParams.get('patientId') || user.uid;
        if (user.role === 'patient' && patientId !== user.uid) {
          return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
        }
        const records = Object.values(store.medical_records).filter(r => r.patientId === patientId);
        return res.status(200).json({ count: records.length, records });
      }

      if (req.method === 'POST') {
        const body = await parseBody(req);
        const recordId = 'rec_' + crypto.randomBytes(6).toString('hex');
        const now = new Date().toISOString();
        const record = {
          recordId,
          patientId: user.uid,
          createdBy: user.uid,
          creatorRole: user.role,
          symptoms: body.symptoms || [],
          allergies: body.allergies || [],
          medications: body.medications || [],
          vitalSigns: body.vitalSigns || {},
          notes: body.notes || '',
          createdAt: now,
          updatedAt: now
        };
        store.medical_records[recordId] = record;
        saveStore();
        return res.status(201).json(record);
      }
    }

    // 8. DOCTOR ACCESS
    if (pathname === '/api/v1/doctor-access') {
      const user = getAuthUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });

      if (req.method === 'GET') {
        const grants = Object.values(store.doctor_access).filter(g => g.patientId === user.uid || g.doctorId === user.uid);
        return res.status(200).json({ accessGrants: grants });
      }

      if (req.method === 'POST') {
        const body = await parseBody(req);
        const accessId = 'acc_' + crypto.randomBytes(6).toString('hex');
        const now = new Date().toISOString();
        const grant = {
          accessId,
          patientId: user.uid,
          doctorId: body.doctorId,
          purpose: body.purpose || 'Clinical Consultation',
          status: 'active',
          grantedBy: user.uid,
          grantedAt: now
        };
        store.doctor_access[accessId] = grant;
        saveStore();
        return res.status(201).json({ message: 'Access granted.', accessGrant: grant });
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
      }
      return res.status(200).json({ message: 'Access revoked successfully.' });
    }

    // 9. DOCTOR PATIENTS LIST
    if (pathname === '/api/v1/doctor/patients' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'doctor') return res.status(403).json({ error: 'Forbidden', message: 'Doctor role required.' });

      const authorizedGrants = Object.values(store.doctor_access).filter(g => g.doctorId === user.uid && g.status === 'active');
      const patientIds = authorizedGrants.map(g => g.patientId);
      const patients = patientIds.map(pid => store.patients[pid] || { patientId: pid, fullName: 'Authorized Patient' });
      return res.status(200).json({ count: patients.length, patients });
    }

    // 10. ADMIN STATS
    if (pathname === '/api/v1/admin/stats' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden', message: 'Admin role required.' });

      const allUsers = Object.values(store.users);
      return res.status(200).json({
        totalUsers: allUsers.length,
        roleDistribution: {
          patients: allUsers.filter(u => u.role === 'patient').length,
          doctors: allUsers.filter(u => u.role === 'doctor').length,
          admins: allUsers.filter(u => u.role === 'admin').length
        },
        totalPredictions: Object.keys(store.predictions).length,
        totalRecords: Object.keys(store.medical_records).length
      });
    }

    // Default 404 for unknown API route
    return res.status(404).json({ error: 'Not Found', message: `API route ${pathname} not found.` });

  } catch (error) {
    console.error('Serverless API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
