import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  Users,
  ClipboardList,
  Activity,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [patientsData, notesData] = await Promise.all([
          api.getAuthorizedPatients().catch(() => ({ patients: [] })),
          api.getMyClinicalNotes().catch(() => ({ notes: [] })),
        ]);
        if (patientsData?.patients) setPatients(patientsData.patients);
        if (notesData?.notes) setNotes(notesData.notes);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Clinician Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold mb-3">
            <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
            Healthcare Professional Clinical Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.fullName || 'Doctor'}
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Review authorized patients who have explicitly granted clinical consent. Inspect AI-assisted decision-support evaluations, recorded vitals, and submit dated clinical consultation notes.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/doctor/patients"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <Users className="w-4 h-4" />
              View Authorized Patients ({patients.length})
            </Link>
            <Link
              to="/doctor/notes"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              My Clinical Notes ({notes.length})
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="clinical-card p-5">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
            Authorized Patients
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-navy-900">
            {patients.length}
          </div>
          <span className="text-[11px] text-teal-600 font-semibold mt-1 block">
            With Active Consent
          </span>
        </div>

        <div className="clinical-card p-5">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
            Clinical Notes Logged
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-navy-900">
            {notes.length}
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
            Consultation Records
          </span>
        </div>

        <div className="clinical-card p-5">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
            Verification Status
          </span>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status="verified" type="verification" />
          </div>
          <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
            Medical Board Verified
          </span>
        </div>
      </div>

      {/* Authorized Patients List */}
      <div className="clinical-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-base text-navy-900">Permitted Patients with Active Consent</h2>
          </div>
          <Link to="/doctor/patients" className="text-xs text-clinical-600 font-bold hover:underline">
            View All Patients
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading authorized patient list...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Authorized Patients Currently</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Patients must grant access to your clinician profile before their healthcare records and AI predictions are accessible.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((p) => (
              <div key={p.patientId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                    {(p.fullName || 'P').charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-navy-900">{p.fullName || 'Patient'}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>DOB: {p.dateOfBirth || 'Unknown'}</span>
                      <span>•</span>
                      <span>Gender: {p.gender || 'Unspecified'}</span>
                      <span>•</span>
                      <span>Blood Group: {p.bloodGroup || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {p.latestPrediction ? (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Latest AI Evaluation</span>
                      <StatusBadge status={p.latestPrediction.riskCategory} type="risk" />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No AI Predictions</span>
                  )}

                  <Link
                    to={`/doctor/patients/${p.patientId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-clinical-50 hover:bg-clinical-100 text-clinical-700 font-bold text-xs rounded-lg transition-colors"
                  >
                    Open Chart
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
