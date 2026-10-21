import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BrainCircuit,
  Lock,
  Stethoscope,
  ShieldCheck,
  ArrowRight,
  Database,
  FileCheck2,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user, role } = useAuth();

  const getDashboardPath = () => {
    if (role === 'doctor') return '/doctor/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/patient/dashboard';
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Top Emergency Advisory Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 text-center border-b border-slate-800">
        <span className="font-semibold text-white">Emergency Notice:</span> If you are experiencing crushing chest pain, difficulty breathing, or stroke symptoms, call emergency services immediately (<span className="text-amber-400 font-bold">112</span> in India / <span className="text-amber-400 font-bold">911</span> in US).
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-clinical-50 border border-clinical-200 text-clinical-700 text-xs font-bold mb-6">
              <BrainCircuit className="w-4 h-4 text-clinical-600" />
              Machine Learning Decision Support (90.16% Benchmark Accuracy)
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy-900 tracking-tight leading-tight sm:leading-none">
              Cloud-Based Healthcare Data Management with{' '}
              <span className="bg-gradient-to-r from-clinical-600 to-teal-500 bg-clip-text text-transparent">
                AI Disease Prediction
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
              Empowering patients, clinicians, and health administrators with secure cloud health records, private medical document storage, and validated machine learning decision-support routing.
            </p>

            {/* Quick Action CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {user ? (
                <Link
                  to={getDashboardPath()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all"
                >
                  Enter Your {role.toUpperCase()} Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all"
                  >
                    Patient Registration
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-base shadow-xs transition-all"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Guided Workflow */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">How MediCloud AI Works</h2>
          <p className="text-slate-600 mt-2">Transparent, privacy-first clinical decision support in three streamlined steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="clinical-card p-6 relative">
            <div className="w-10 h-10 rounded-lg bg-clinical-100 text-clinical-700 font-extrabold flex items-center justify-center mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-2">Record Health & Upload Files</h3>
            <p className="text-sm text-slate-600">
              Enter structured clinical features, symptoms, and vital signs. Securely upload lab reports and prescriptions (PDF, JPG, PNG) to isolated cloud storage.
            </p>
          </div>

          <div className="clinical-card p-6 relative">
            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 font-extrabold flex items-center justify-center mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-2">Trained ML Model Inference</h3>
            <p className="text-sm text-slate-600">
              The calibrated Random Forest model (trained on the benchmark UCI dataset) evaluates 13 clinical features and stratifies cardiovascular risk category.
            </p>
          </div>

          <div className="clinical-card p-6 relative">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-2">Specialist Routing & Consent</h3>
            <p className="text-sm text-slate-600">
              Receive clinical rationale and specialist recommendations (Cardiologist, Pulmonologist, etc.). Grant and revoke verified doctors' access to your records at will.
            </p>
          </div>
        </div>
      </section>

      {/* Model & Architecture Credentials */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-4">
                <Database className="w-3.5 h-3.5 text-clinical-600" />
                Empirical Evaluation & Truthful Disclaimers
              </div>
              <h2 className="text-3xl font-extrabold text-navy-900 leading-tight">
                Trained on Real Clinical Benchmark Data
              </h2>
              <p className="text-slate-600 mt-4 leading-relaxed">
                Unlike synthetic toys, our prediction pipeline uses a reproducible Random Forest model trained on the standard UCI Cleveland Heart Disease dataset.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 text-sm">90.16% Holdout Test Accuracy</span>
                    <p className="text-xs text-slate-500">89.29% Precision, 89.29% Recall, and 96.10% ROC-AUC on holdout test set.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 text-sm">Explicit Emergency Safety Layer</span>
                    <p className="text-xs text-slate-500">Conservative rule checks detect red flags (crushing chest pain, dyspnea, stroke signs) independently without ML downgrading.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 text-sm">Granular Doctor Consent Mechanism</span>
                    <p className="text-xs text-slate-500">Patients retain sovereign ownership. Doctors can only view records when an active grant is verified.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl border border-slate-800">
              <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div>
                  <span className="text-xs uppercase text-slate-400 font-mono tracking-wider">Model Architecture</span>
                  <div className="text-xl font-bold text-white mt-1">Random Forest Pipeline v1.0.0</div>
                </div>
                <div className="px-2.5 py-1 rounded bg-teal-900/60 text-teal-300 text-xs font-mono border border-teal-700">
                  VERIFIED
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 my-6">
                <div>
                  <div className="text-3xl font-extrabold text-teal-400">90.16%</div>
                  <div className="text-xs text-slate-400 mt-1">Test Accuracy</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-clinical-400">0.961</div>
                  <div className="text-xs text-slate-400 mt-1">ROC-AUC Score</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white">89.29%</div>
                  <div className="text-xs text-slate-400 mt-1">Clinical Recall</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white">89.29%</div>
                  <div className="text-xs text-slate-400 mt-1">F1-Score</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
                Features: Age, Sex, Chest Pain (CP), Resting BP, Cholesterol, FBS, RestECG, Max HR, ExAngina, OldPeak, Slope, Major Vessels (CA), Thalassemia.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Personas Overview */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">Tailored Role Portals</h2>
          <p className="text-slate-600 mt-2">Purpose-built interfaces enforcing least-privilege security boundaries.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="clinical-card p-6">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-2">Patient Portal</h3>
            <ul className="text-xs text-slate-600 space-y-2 mb-6">
              <li>• Manage personal health timeline & vital signs</li>
              <li>• Upload lab reports, scans & prescriptions</li>
              <li>• Run real-time AI disease predictions</li>
              <li>• Grant & revoke doctor access in 1 click</li>
              <li>• Download full clinical health summaries</li>
            </ul>
            <Link
              to="/register"
              className="w-full inline-flex items-center justify-center py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors"
            >
              Register as Patient
            </Link>
          </div>

          <div className="clinical-card p-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-2">Doctor Portal</h3>
            <ul className="text-xs text-slate-600 space-y-2 mb-6">
              <li>• Inspect permitted patients with active consent</li>
              <li>• Review AI decision-support & risk scores</li>
              <li>• View uploaded patient lab documents</li>
              <li>• Add dated clinical notes & prescriptions</li>
              <li>• Professional verification status management</li>
            </ul>
            <Link
              to="/register"
              className="w-full inline-flex items-center justify-center py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
            >
              Register as Clinician
            </Link>
          </div>

          <div className="clinical-card p-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-navy-900 mb-2">Administrator Portal</h3>
            <ul className="text-xs text-slate-600 space-y-2 mb-6">
              <li>• System-wide statistics & risk distribution</li>
              <li>• User account & role status management</li>
              <li>• Doctor credential verification workflow</li>
              <li>• Real-time immutable security audit stream</li>
              <li>• Strict non-clinical privilege isolation</li>
            </ul>
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors"
            >
              Sign In to Admin Console
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
