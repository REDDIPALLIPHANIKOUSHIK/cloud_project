import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BrainCircuit,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Clock,
  Download
} from 'lucide-react';
import { api } from '../../lib/api';
import { HeartDiseaseInputForm, PredictionResponse } from '../../types/prediction';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmergencyBanner } from '../../components/common/EmergencyBanner';

const DEFAULT_INPUTS: HeartDiseaseInputForm = {
  age: 55,
  sex: 1,
  cp: 2,
  trestbps: 130,
  chol: 220,
  fbs: 0,
  restecg: 0,
  thalach: 145,
  exang: 0,
  oldpeak: 0.8,
  slope: 2,
  ca: 0,
  thal: 3,
  reported_symptoms: [],
  additional_notes: '',
};

export const PatientPrediction: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<HeartDiseaseInputForm>(DEFAULT_INPUTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null);

  const [symptomInput, setSymptomInput] = useState('');


  const handleAddSymptom = () => {
    if (symptomInput.trim()) {
      setFormData({
        ...formData,
        reported_symptoms: [...(formData.reported_symptoms || []), symptomInput.trim()],
      });
      setSymptomInput('');
    }
  };

  const handleRemoveSymptom = (index: number) => {
    const updated = [...(formData.reported_symptoms || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, reported_symptoms: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.runPrediction(formData);
      setPredictionResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to execute model prediction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Scope Advisory */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-clinical-700 bg-clinical-50 px-2.5 py-1 rounded-full mb-1">
            <BrainCircuit className="w-3.5 h-3.5" />
            AI Decision-Support System
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900">Cardiovascular Risk Screening</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate compatible structured clinical indicators using a trained Random Forest classifier.
          </p>
        </div>
      </div>

      {/* Scope Disclaimer Box */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Supported Model Scope:</span> This model is validated specifically for adult cardiovascular risk stratification based on 13 compatible clinical metrics. It is not designed to diagnose other systemic diseases (such as oncology, infectious disease, or neurological disorders).
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
          <strong>Evaluation Error:</strong> {error}
        </div>
      )}

      {/* Prediction Results Card if Available */}
      {predictionResult && (
        <div className="clinical-card p-6 border-2 border-clinical-300 bg-gradient-to-b from-white to-clinical-50/20 shadow-md">
          {/* Emergency Alert Banner if triggered */}
          {predictionResult.emergencyAlert?.is_emergency && (
            <EmergencyBanner alert={predictionResult.emergencyAlert} />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
            <div>
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Evaluation Result</span>
              <h2 className="text-xl font-black text-navy-900 mt-0.5">{predictionResult.predictedCondition}</h2>
              <span className="text-xs text-slate-500 mt-1 block">
                Model: {predictionResult.modelName} (v{predictionResult.modelVersion}) • Generated at {new Date(predictionResult.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={predictionResult.riskCategory} type="risk" />
              <div className="text-right">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Risk Probability</span>
                <span className="text-2xl font-black text-navy-900">
                  {(predictionResult.probability * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Specialist Routing Engine Recommendation Card */}
          <div className="bg-white border border-clinical-200 rounded-xl p-5 shadow-xs mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-clinical-600 text-white rounded-xl shadow-xs">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-clinical-700 uppercase tracking-wider">
                    Recommended Clinical Specialty
                  </span>
                  <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-clinical-100 text-clinical-800">
                    Priority: {predictionResult.specialistRecommendation.urgency}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-navy-900 mt-1">
                  {predictionResult.specialistRecommendation.specialty}
                </h3>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                  {predictionResult.specialistRecommendation.reason}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold">Evidence Basis:</span>
                  {predictionResult.specialistRecommendation.basedOn.map((b) => (
                    <span key={b} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                      {b.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Warnings if any */}
          {predictionResult.warnings && predictionResult.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Clinical Observation Notes
              </h4>
              <ul className="text-xs text-amber-800 space-y-1">
                {predictionResult.warnings.map((w, idx) => (
                  <li key={idx}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mandatory Statutory Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-500 mb-6">
            <span className="font-bold text-slate-700 block mb-0.5">Clinical Decision-Support Disclaimer</span>
            {predictionResult.disclaimer}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              to="/patient/predictions"
              className="text-xs font-bold text-clinical-700 hover:text-clinical-800 flex items-center gap-1"
            >
              View in Prediction History
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={() => {
                setPredictionResult(null);
                setFormData(DEFAULT_INPUTS);
              }}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Form
            </button>
          </div>
        </div>
      )}

      {/* Clinical Feature Input Form */}
      <form onSubmit={handleSubmit} className="clinical-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-navy-900">Enter Structured Clinical Parameters</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            All 13 features are required by the trained model pipeline for calibrated inference.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Age */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Age (Years)
            </label>
            <input
              type="number"
              required
              min={18}
              max={120}
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
            <span className="text-[11px] text-slate-400">Range: 18 - 120</span>
          </div>

          {/* 2. Biological Sex */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Biological Sex
            </label>
            <select
              value={formData.sex}
              onChange={(e) => setFormData({ ...formData, sex: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value={1}>Male (1)</option>
              <option value={0}>Female (0)</option>
            </select>
            <span className="text-[11px] text-slate-400">Baseline demographic</span>
          </div>

          {/* 3. Chest Pain Type (cp) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Chest Pain Type
            </label>
            <select
              value={formData.cp}
              onChange={(e) => setFormData({ ...formData, cp: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value={1}>Typical Angina (1)</option>
              <option value={2}>Atypical Angina (2)</option>
              <option value={3}>Non-anginal Pain (3)</option>
              <option value={4}>Asymptomatic (4)</option>
            </select>
            <span className="text-[11px] text-slate-400">Clinical symptom presentation</span>
          </div>

          {/* 4. Resting Blood Pressure (trestbps) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Resting BP (mm Hg)
            </label>
            <input
              type="number"
              required
              min={70}
              max={260}
              value={formData.trestbps}
              onChange={(e) => setFormData({ ...formData, trestbps: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
            <span className="text-[11px] text-slate-400">Normal: 90 - 120 mmHg</span>
          </div>

          {/* 5. Serum Cholesterol (chol) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Serum Cholesterol (mg/dl)
            </label>
            <input
              type="number"
              required
              min={100}
              max={600}
              value={formData.chol}
              onChange={(e) => setFormData({ ...formData, chol: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
            <span className="text-[11px] text-slate-400">Optimal: &lt; 200 mg/dl</span>
          </div>

          {/* 6. Fasting Blood Sugar (fbs) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Fasting Blood Sugar &gt; 120 mg/dl
            </label>
            <select
              value={formData.fbs}
              onChange={(e) => setFormData({ ...formData, fbs: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value={0}>False / Normal (&le; 120 mg/dl)</option>
              <option value={1}>True / Elevated (&gt; 120 mg/dl)</option>
            </select>
            <span className="text-[11px] text-slate-400">Glycemic status</span>
          </div>

          {/* 7. Resting ECG (restecg) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Resting ECG Results
            </label>
            <select
              value={formData.restecg}
              onChange={(e) => setFormData({ ...formData, restecg: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value={0}>Normal (0)</option>
              <option value={1}>ST-T Wave Abnormality (1)</option>
              <option value={2}>Left Ventricular Hypertrophy (2)</option>
            </select>
            <span className="text-[11px] text-slate-400">Resting electrocardiogram</span>
          </div>

          {/* 8. Maximum Heart Rate (thalach) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Max Heart Rate Achieved (bpm)
            </label>
            <input
              type="number"
              required
              min={50}
              max={240}
              value={formData.thalach}
              onChange={(e) => setFormData({ ...formData, thalach: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
            <span className="text-[11px] text-slate-400">Exercise stress peak HR</span>
          </div>

          {/* 9. Exercise-Induced Angina (exang) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Exercise-Induced Angina
            </label>
            <select
              value={formData.exang}
              onChange={(e) => setFormData({ ...formData, exang: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value={0}>No (0)</option>
              <option value={1}>Yes (1)</option>
            </select>
            <span className="text-[11px] text-slate-400">Pain upon physical exertion</span>
          </div>

          {/* 10. ST Depression (oldpeak) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              ST Depression (Oldpeak mm)
            </label>
            <input
              type="number"
              step="0.1"
              required
              min={0}
              max={10}
              value={formData.oldpeak}
              onChange={(e) => setFormData({ ...formData, oldpeak: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500"
            />
            <span className="text-[11px] text-slate-400">Exercise relative to rest</span>
          </div>

          {/* 11. Slope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Peak ST Segment Slope
            </label>
            <select
              value={formData.slope}
              onChange={(e) => setFormData({ ...formData, slope: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value={1}>Upsloping (1)</option>
              <option value={2}>Flat (2)</option>
              <option value={3}>Downsloping (3)</option>
            </select>
            <span className="text-[11px] text-slate-400">Electrocardiographic slope</span>
          </div>

          {/* 12. Major Vessels Colored (ca) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Major Vessels Colored (0-3)
            </label>
            <select
              value={formData.ca}
              onChange={(e) => setFormData({ ...formData, ca: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value={0}>0 Vessels</option>
              <option value={1}>1 Vessel</option>
              <option value={2}>2 Vessels</option>
              <option value={3}>3 Vessels</option>
            </select>
            <span className="text-[11px] text-slate-400">Fluoroscopy coronary vessels</span>
          </div>

          {/* 13. Thalassemia Stress Test (thal) */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Thallium Stress Test Result (Thal)
            </label>
            <select
              value={formData.thal}
              onChange={(e) => setFormData({ ...formData, thal: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-clinical-500"
            >
              <option value={3}>3 = Normal Perfusion</option>
              <option value={6}>6 = Fixed Defect (Previous Infarct Scar)</option>
              <option value={7}>7 = Reversible Defect (Inducible Ischemia)</option>
            </select>
            <span className="text-[11px] text-slate-400">Nuclear cardiology perfusion scintigraphy</span>
          </div>
        </div>

        {/* Optional Symptoms & Clinical Context */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase">
            Reported Symptoms & Context (Assists Specialist Routing)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              placeholder="e.g. exertional breathlessness, palpitations, dizziness"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSymptom();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddSymptom}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
            >
              Add Symptom
            </button>
          </div>

          {formData.reported_symptoms && formData.reported_symptoms.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {formData.reported_symptoms.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveSymptom(idx)}
                    className="text-slate-400 hover:text-red-500 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-clinical-600 hover:bg-clinical-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Evaluating Clinical Inference & Specialist Routing...
            </>
          ) : (
            <>
              <BrainCircuit className="w-5 h-5" />
              Evaluate AI Disease Prediction & Specialist Referral
            </>
          )}
        </button>
      </form>
    </div>
  );
};
