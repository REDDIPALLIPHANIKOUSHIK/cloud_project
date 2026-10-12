import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  HeartPulse,
  BrainCircuit,
  UploadCloud,
  FileText,
  Share2,
  Download,
  AlertCircle,
  Plus,
  Stethoscope,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmergencyBanner } from '../../components/common/EmergencyBanner';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<any>(null);
  const [activeGrants, setActiveGrants] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileData, recordsData, reportsData, predsData, grantsData] = await Promise.all([
          api.getPatientProfile().catch(() => null),
          api.getMedicalRecords().catch(() => ({ records: [] })),
          api.getReports().catch(() => ({ reports: [] })),
          api.getPredictions().catch(() => ({ predictions: [] })),
          api.getMyDoctorGrants().catch(() => ({ grants: [] }))
        ]);

        if (profileData) setPatientProfile(profileData);
        if (recordsData?.records) setRecentRecords(recordsData.records);
        if (reportsData?.reports) setRecentReports(reportsData.reports);
        if (predsData?.predictions && predsData.predictions.length > 0) {
          setLatestPrediction(predsData.predictions[0]);
        }
        if (grantsData?.grants) setActiveGrants(grantsData.grants.filter((g: any) => g.status === 'active'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const latestVitals = recentRecords[0]?.vitalSigns || {};

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-clinical-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-clinical-200 text-xs font-semibold mb-3">
            <HeartPulse className="w-3.5 h-3.5 text-teal-400" />
            Patient Clinical Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.fullName || 'Patient'}
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Manage your personal healthcare timeline, review AI cardiovascular screening, and share encrypted records with your clinical specialists.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/patient/prediction"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <BrainCircuit className="w-4 h-4" />
              Start New AI Prediction
            </Link>
            <Link
              to="/patient/records"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Vitals / Symptoms
            </Link>
            <a
              href={api.getDownloadSummaryUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Clinical Summary
            </a>
          </div>
        </div>
      </div>

      {/* Emergency alert if applicable */}
      {latestPrediction?.emergencyAlert?.is_emergency && (
        <EmergencyBanner alert={latestPrediction.emergencyAlert} />
      )}

      {/* Vital Signs Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="clinical-card p-4">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Blood Pressure</span>
          <div className="text-xl sm:text-2xl font-extrabold text-navy-900">
            {latestVitals.bloodPressureSystolic && latestVitals.bloodPressureDiastolic
              ? `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}`
              : '120/80'}
            <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
          </div>
          <span className="text-[11px] text-teal-600 font-semibold mt-1 block">Recent Recording</span>
        </div>

        <div className="clinical-card p-4">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Heart Rate</span>
          <div className="text-xl sm:text-2xl font-extrabold text-navy-900">
            {latestVitals.heartRate || 72}
            <span className="text-xs font-normal text-slate-400 ml-1">bpm</span>
          </div>
          <span className="text-[11px] text-teal-600 font-semibold mt-1 block">Normal Range</span>
        </div>

        <div className="clinical-card p-4">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Blood Oxygen (SpO2)</span>
          <div className="text-xl sm:text-2xl font-extrabold text-navy-900">
            {latestVitals.oxygenSaturation || 98}
            <span className="text-xs font-normal text-slate-400 ml-1">%</span>
          </div>
          <span className="text-[11px] text-teal-600 font-semibold mt-1 block">Adequate</span>
        </div>

        <div className="clinical-card p-4">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Doctor Grants</span>
          <div className="text-xl sm:text-2xl font-extrabold text-navy-900">
            {activeGrants.length}
            <span className="text-xs font-normal text-slate-400 ml-1">Active</span>
          </div>
          <Link to="/patient/access" className="text-[11px] text-clinical-600 font-semibold mt-1 block hover:underline">
            Manage Consent
          </Link>
        </div>
      </div>

      {/* Main Grid: Latest Prediction & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest AI Prediction Result Card (Takes 2 columns) */}
        <div className="lg:col-span-2 clinical-card p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-clinical-600" />
              <h2 className="font-bold text-base text-navy-900">Latest AI Disease Prediction & Routing</h2>
            </div>
            {latestPrediction && (
              <StatusBadge status={latestPrediction.riskCategory} type="risk" />
            )}
          </div>

          {latestPrediction ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Condition Evaluated</span>
                  <div className="font-bold text-base text-navy-900 mt-0.5">
                    {latestPrediction.predictedCondition}
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(latestPrediction.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-xs text-slate-500 font-semibold block">Calibrated Risk Index</span>
                  <div className="text-2xl font-black text-navy-900">
                    {(latestPrediction.probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Specialist Routing Card */}
              <div className="bg-clinical-50/60 border border-clinical-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-clinical-600 text-white shrink-0 mt-0.5">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-clinical-700 block">
                      Recommended Medical Specialty
                    </span>
                    <h3 className="text-lg font-bold text-navy-900 mt-0.5">
                      {latestPrediction.specialistRecommendation?.specialty || 'General Physician'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {latestPrediction.specialistRecommendation?.reason}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Urgency:</span>
                      <span className="text-[11px] font-bold text-clinical-800 uppercase px-2 py-0.5 rounded bg-clinical-100">
                        {latestPrediction.specialistRecommendation?.urgency || 'routine'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs">
                <Link
                  to="/patient/predictions"
                  className="text-clinical-700 hover:text-clinical-800 font-bold inline-flex items-center gap-1"
                >
                  View Full Prediction History
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/patient/prediction"
                  className="px-3 py-1.5 bg-clinical-600 text-white font-bold rounded-lg hover:bg-clinical-700 transition-colors"
                >
                  Run New Assessment
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <BrainCircuit className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">No Predictions Evaluated Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Provide your cardiovascular clinical metrics to evaluate your risk tier and receive specialist routing.
              </p>
              <Link
                to="/patient/prediction"
                className="inline-flex items-center gap-2 px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Launch First Prediction
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Medical Records & Uploads Sidebar (1 column) */}
        <div className="space-y-6">
          {/* Recent Records Card */}
          <div className="clinical-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Recent Health Records
              </h3>
              <Link to="/patient/records" className="text-xs text-clinical-600 font-bold hover:underline">
                View All
              </Link>
            </div>

            {recentRecords.length > 0 ? (
              <div className="space-y-3">
                {recentRecords.slice(0, 3).map((rec) => (
                  <div key={rec.recordId} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1">
                      <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                      <span className="font-semibold text-slate-600">{rec.creatorRole}</span>
                    </div>
                    <div className="font-bold text-slate-800">
                      {rec.symptoms && rec.symptoms.length > 0 ? rec.symptoms.join(', ') : 'Routine Checkup'}
                    </div>
                    {rec.notes && <p className="text-slate-500 mt-1 line-clamp-1">{rec.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No recorded medical history entries.</p>
            )}
          </div>

          {/* Recent Uploaded Documents Card */}
          <div className="clinical-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-slate-500" />
                Lab Reports & Files
              </h3>
              <Link to="/patient/reports" className="text-xs text-clinical-600 font-bold hover:underline">
                Upload
              </Link>
            </div>

            {recentReports.length > 0 ? (
              <div className="space-y-2">
                {recentReports.slice(0, 3).map((rep) => (
                  <div key={rep.reportId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-800 block truncate">{rep.fileName}</span>
                      <span className="text-[10px] text-slate-400">{rep.description || 'Lab diagnostic'}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {rep.fileName.split('.').pop()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">
                No lab reports uploaded yet.
                <Link to="/patient/reports" className="block text-clinical-600 font-bold mt-1">
                  Upload Lab PDF/Scans
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
