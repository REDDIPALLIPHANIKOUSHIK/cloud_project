import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  HeartPulse,
  BrainCircuit,
  FileText,
  UploadCloud,
  ClipboardList,
  Plus,
  Stethoscope,
  Calendar,
  AlertTriangle,
  Download,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmergencyBanner } from '../../components/common/EmergencyBanner';

export const DoctorPatientDetail: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);

  const fetchPatientDetail = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.getAuthorizedPatientDetail(patientId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load patient chart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetail();
  }, [patientId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !noteContent.trim()) return;

    setSubmittingNote(true);
    try {
      await api.createClinicalNote({
        patientId,
        content: noteContent,
        diagnosis,
        prescriptions,
        followUpDate: followUpDate || undefined,
      });

      setNoteSuccess('Clinical consultation note recorded successfully.');
      setShowNoteModal(false);
      setNoteContent('');
      setDiagnosis('');
      setPrescriptions('');
      setFollowUpDate('');
      await fetchPatientDetail();
      setTimeout(() => setNoteSuccess(null), 4000);
    } catch (err: any) {
      alert(`Error creating note: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-4 border-clinical-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs text-slate-500 font-medium">Loading authorized clinical chart...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="clinical-card p-10 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-navy-900 mb-2">Access Denied or Not Found</h2>
        <p className="text-xs text-slate-600 mb-6">{error || 'Patient records unavailable.'}</p>
        <Link
          to="/doctor/patients"
          className="inline-flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white font-bold text-xs rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Patient Directory
        </Link>
      </div>
    );
  }

  const { patient = {}, records = [], reports = [], predictions = [], clinicalNotes = [] } = data || {};
  const latestPred = predictions && predictions.length > 0 ? predictions[0] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header with Back Navigation & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/doctor/patients"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Return to patient list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-navy-900">{patient.fullName || 'Patient'}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                Consent Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Longitudinal Clinical Record & AI Decision Support Summary
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={api.getDownloadSummaryUrl(patientId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Patient Summary
          </a>
          <button
            onClick={() => setShowNoteModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Clinical Note
          </button>
        </div>
      </div>

      {noteSuccess && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          {noteSuccess}
        </div>
      )}

      {/* Emergency Alert Banner if applicable */}
      {latestPred?.emergencyAlert?.is_emergency && (
        <EmergencyBanner alert={latestPred.emergencyAlert} />
      )}

      {/* Demographics Strip */}
      <div className="clinical-card p-5 bg-gradient-to-r from-slate-50 to-white">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient Identifier</span>
            <span className="font-mono font-bold text-slate-800">{patientId?.slice(0, 12)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Date of Birth</span>
            <span className="font-bold text-slate-800">{patient.dateOfBirth || 'Not stated'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Biological Sex</span>
            <span className="font-bold text-slate-800">{patient.gender || 'Unspecified'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Blood Group</span>
            <span className="font-bold text-slate-800">{patient.bloodGroup || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Emergency Phone</span>
            <span className="font-bold text-slate-800">{patient.phone || patient.emergencyContact || 'None on file'}</span>
          </div>
        </div>
      </div>

      {/* Latest AI Prediction Decision-Support Card */}
      {latestPred && (
        <div className="clinical-card p-6 border border-clinical-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-clinical-600" />
              <h2 className="font-bold text-base text-navy-900">Latest AI Clinical Decision-Support</h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={latestPred.riskCategory} type="risk" />
              <span className="text-xs font-mono text-slate-500 font-bold">
                Index: {(latestPred.probability * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Evaluated Clinical Target</span>
              <div className="font-bold text-sm text-navy-900 mt-0.5">{latestPred.predictedCondition}</div>
              <p className="text-slate-500 text-[11px] mt-1">
                Model: {latestPred.modelName} (v{latestPred.modelVersion}) • {new Date(latestPred.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="p-3.5 bg-clinical-50/60 rounded-xl border border-clinical-200">
              <span className="text-[10px] uppercase font-bold text-clinical-700 block">Automated Referral Suggestion</span>
              <div className="font-bold text-sm text-navy-900 mt-0.5">
                {latestPred.specialistRecommendation?.specialty} (Urgency: {latestPred.specialistRecommendation?.urgency})
              </div>
              <p className="text-slate-600 text-[11px] mt-1">
                {latestPred.specialistRecommendation?.reason}
              </p>
            </div>
          </div>

          {/* Model Features Breakdown Pill Grid */}
          {latestPred.inputFeatureSummary && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Evaluated Input Features:</span>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {Object.entries(latestPred.inputFeatureSummary).map(([key, val]: any) => (
                  <span key={key} className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">
                    {key}: {val}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Medical Records Timeline & Diagnostic Scans Tabs / Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical History Timeline */}
        <div className="clinical-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-slate-500" />
              Recorded Vitals & Symptoms ({records.length})
            </h3>
          </div>

          {records.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No recorded vital signs or symptoms.</p>
          ) : (
            <div className="space-y-3">
              {records.map((rec: any) => (
                <div key={rec.recordId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1">
                    <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                    <span className="font-semibold text-slate-600">{rec.creatorRole}</span>
                  </div>
                  {rec.vitalSigns && (
                    <div className="font-bold text-navy-900 mb-1">
                      BP: {rec.vitalSigns.bloodPressureSystolic}/{rec.vitalSigns.bloodPressureDiastolic} mmHg | HR: {rec.vitalSigns.heartRate} bpm | SpO2: {rec.vitalSigns.oxygenSaturation}%
                    </div>
                  )}
                  {rec.symptoms && rec.symptoms.length > 0 && (
                    <div className="text-slate-600">
                      <span className="font-semibold">Symptoms:</span> {rec.symptoms.join(', ')}
                    </div>
                  )}
                  {rec.medications && rec.medications.length > 0 && (
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      <span className="font-semibold">Meds:</span> {rec.medications.join(', ')}
                    </div>
                  )}
                  {rec.notes && <p className="text-slate-500 text-[11px] mt-1 italic">{rec.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded Diagnostic Documents */}
        <div className="clinical-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-slate-500" />
              Diagnostic Lab Documents ({reports.length})
            </h3>
          </div>

          {reports.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No documents uploaded by this patient.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((rep: any) => (
                <div key={rep.reportId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="font-bold text-slate-800 block truncate">{rep.fileName}</span>
                    <span className="text-[11px] text-slate-400">{rep.description} • {new Date(rep.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => api.downloadReportFile(rep.reportId, rep.fileName)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      title="Download document securely"
                    >
                      <Download className="w-3.5 h-3.5 text-clinical-600" />
                      Download
                    </button>
                    <span className="text-[10px] uppercase font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {rep.fileName.split('.').pop()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clinical Notes Authored */}
      <div className="clinical-card p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-bold text-base text-navy-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Physician Consultation Notes ({clinicalNotes.length})
          </h3>
          <button
            onClick={() => setShowNoteModal(true)}
            className="text-xs text-clinical-600 font-bold hover:underline"
          >
            + Add New Note
          </button>
        </div>

        {clinicalNotes.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No physician consultation notes logged for this patient yet.</p>
        ) : (
          <div className="space-y-4">
            {clinicalNotes.map((note: any) => (
              <div key={note.noteId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 mb-2">
                  <span className="font-bold text-navy-900">{note.doctorName || 'Attending Clinician'}</span>
                  <span className="text-[11px] text-slate-400">{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                {note.diagnosis && (
                  <div className="font-bold text-slate-800 mb-1">
                    Impression / Diagnosis: <span className="font-normal">{note.diagnosis}</span>
                  </div>
                )}
                <p className="text-slate-700 leading-relaxed">{note.content}</p>
                {note.prescriptions && (
                  <div className="mt-2 text-slate-600 bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-clinical-800">Rx / Prescriptions: </span>
                    {note.prescriptions}
                  </div>
                )}
                {note.followUpDate && (
                  <div className="mt-2 text-slate-500 font-medium">
                    Follow-up Recommended: {note.followUpDate}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Clinical Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-navy-900">Add Clinical Consultation Note</h2>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Diagnostic Impression
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Exertional Angina Pectoris; Essential Hypertension"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Clinical Examination & Observation Notes *
                </label>
                <textarea
                  required
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Document detailed clinical findings, review of symptoms, and consultation observations..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prescription Recommendations
                </label>
                <input
                  type="text"
                  value={prescriptions}
                  onChange={(e) => setPrescriptions(e.target.value)}
                  placeholder="e.g. Metoprolol Tartrate 25mg BID; Aspirin 81mg daily"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Suggested Follow-Up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {submittingNote ? 'Saving Note...' : 'Save Consultation Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
