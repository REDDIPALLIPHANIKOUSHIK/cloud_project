import React, { useState, useEffect } from 'react';
import { Share2, ShieldCheck, Stethoscope, Trash2, Plus, AlertCircle, CheckCircle2, UserCheck, X } from 'lucide-react';
import { api } from '../../lib/api';
import { DoctorAccessGrant } from '../../types/clinical';
import { StatusBadge } from '../../components/common/StatusBadge';

export const PatientAccess: React.FC = () => {
  const [grants, setGrants] = useState<DoctorAccessGrant[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [purpose, setPurpose] = useState('Cardiovascular consultation and clinical assessment');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [grantsData, doctorsData] = await Promise.all([
        api.getMyDoctorGrants(),
        api.getDoctorDirectory(),
      ]);
      if (grantsData?.grants) setGrants(grantsData.grants);
      if (doctorsData?.doctors) {
        setDoctors(doctorsData.doctors);
        if (doctorsData.doctors.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(doctorsData.doctors[0].doctorId);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setError('Please select a doctor to authorize.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.grantDoctorAccess(selectedDoctorId, purpose);
      setSuccess('Doctor authorized successfully. The clinician can now review your records.');
      setShowGrantModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to grant doctor access.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (accessId: string, doctorName: string) => {
    if (!window.confirm(`Revoke clinical record access for ${doctorName || 'this doctor'} immediately?`)) {
      return;
    }

    try {
      await api.revokeDoctorAccess(accessId);
      setSuccess(`Doctor access revoked immediately. The clinician is blocked from subsequent record queries.`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Doctor Access & Consent Sharing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Explicit patient consent governance. Authorize and instantly revoke clinical specialists.
          </p>
        </div>

        <button
          onClick={() => setShowGrantModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Authorize New Doctor
        </button>
      </div>

      {/* Sovereign Consent Explanation Box */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-xs text-teal-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Patient Data Sovereignty Policy</span>
          Doctors cannot browse or query patient health records without explicit, active consent granted here. Whenever you revoke authorization, subsequent application and API queries by the doctor are blocked immediately.
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          {success}
        </div>
      )}

      {/* Grants Table / Cards */}
      <div className="clinical-card p-6">
        <h2 className="text-base font-bold text-navy-900 mb-4">Current Doctor Authorizations ({grants.length})</h2>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs">Loading authorization history...</div>
        ) : grants.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Doctor Grants Active</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
              Authorize a cardiologist or primary care clinician to review your vitals, uploaded lab scans, and AI prediction results.
            </p>
            <button
              onClick={() => setShowGrantModal(true)}
              className="px-4 py-2 bg-clinical-600 text-white text-xs font-bold rounded-lg"
            >
              Authorize Doctor
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {grants.map((g) => (
              <div key={g.accessId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0 mt-0.5">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-navy-900">
                      {g.doctorName || 'Attending Clinician'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="text-clinical-700 font-semibold">{g.doctorSpecialization || 'Specialist'}</span>
                      <span>•</span>
                      <span>Purpose: {g.purpose || 'Clinical Review'}</span>
                      <span>•</span>
                      <span>Granted {new Date(g.grantedAt).toLocaleDateString()}</span>
                    </div>
                    {g.revokedAt && (
                      <span className="text-[11px] text-red-500 block mt-1">
                        Revoked on {new Date(g.revokedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={g.status} />
                  {g.status === 'active' ? (
                    <button
                      onClick={() => handleRevoke(g.accessId, g.doctorName || '')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
                      title="Immediately prevent doctor from reading records"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke Access
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Access Revoked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Access Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-navy-900">Authorize Doctor to View Records</h2>
              <button onClick={() => setShowGrantModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Verified Doctor
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {doctors.map((doc) => (
                    <option key={doc.doctorId} value={doc.doctorId}>
                      {doc.fullName} — {doc.specialization} ({doc.hospitalAffiliation || 'Hospital'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Clinical Consultation Purpose
                </label>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Second opinion on cardiovascular risk screening"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                Granting access permits the selected clinician to view your recorded vital signs, uploaded diagnostic lab scans, and AI prediction history. You may revoke access at any time.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {submitting ? 'Granting...' : 'Confirm Authorization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
