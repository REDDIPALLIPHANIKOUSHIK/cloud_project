import React, { useState, useEffect } from 'react';
import { Plus, FileText, Activity, AlertCircle, Calendar, Heart, Shield, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { MedicalRecord } from '../../types/clinical';

export const PatientRecords: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [symptomsInput, setSymptomsInput] = useState('');
  const [historyInput, setHistoryInput] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [medicationsInput, setMedicationsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [vitals, setVitals] = useState({
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    heartRate: 72,
    oxygenSaturation: 98,
    temperature: 98.6,
    weightKg: 70,
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await api.getMedicalRecords();
      if (data?.records) setRecords(data.records);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        symptoms: symptomsInput.split(',').map((s) => s.trim()).filter(Boolean),
        medicalHistory: historyInput.split(',').map((s) => s.trim()).filter(Boolean),
        allergies: allergiesInput.split(',').map((s) => s.trim()).filter(Boolean),
        medications: medicationsInput.split(',').map((s) => s.trim()).filter(Boolean),
        vitalSigns: vitals,
        notes,
      };

      await api.createMedicalRecord(payload);
      setShowAddModal(false);
      // Reset form
      setSymptomsInput('');
      setHistoryInput('');
      setAllergiesInput('');
      setMedicationsInput('');
      setNotes('');
      await fetchRecords();
    } catch (err: any) {
      setError(err.message || 'Failed to submit medical record.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const symMatch = r.symptoms?.some((s) => s.toLowerCase().includes(q));
    const medMatch = r.medications?.some((m) => m.toLowerCase().includes(q));
    const noteMatch = r.notes?.toLowerCase().includes(q);
    return !search || symMatch || medMatch || noteMatch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Medical Records & Clinical Timeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Document symptoms, vital signs, allergies, and ongoing medications.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Health Entry
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symptoms, medications, or notes..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-clinical-500"
        />
      </div>

      {/* Records Timeline */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Loading medical records...</div>
      ) : filtered.length === 0 ? (
        <div className="clinical-card p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-navy-900 text-sm">No Medical Records Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Click below to document your first clinical entry.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-clinical-600 text-white text-xs font-bold rounded-lg"
          >
            Create Initial Record
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => (
            <div key={rec.recordId} className="clinical-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-clinical-600" />
                  <span className="font-bold text-sm text-navy-900">
                    {new Date(rec.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">({new Date(rec.createdAt).toLocaleTimeString()})</span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Author: {rec.creatorRole}
                </span>
              </div>

              {/* Vitals Summary Pill Grid */}
              {rec.vitalSigns && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Blood Pressure</span>
                    <span className="font-bold text-navy-900">
                      {rec.vitalSigns.bloodPressureSystolic}/{rec.vitalSigns.bloodPressureDiastolic} mmHg
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Heart Rate</span>
                    <span className="font-bold text-navy-900">{rec.vitalSigns.heartRate} bpm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Blood Oxygen</span>
                    <span className="font-bold text-navy-900">{rec.vitalSigns.oxygenSaturation}% SpO2</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Body Weight</span>
                    <span className="font-bold text-navy-900">{rec.vitalSigns.weightKg} kg</span>
                  </div>
                </div>
              )}

              {/* Clinical Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Symptoms:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.symptoms && rec.symptoms.length > 0 ? (
                      rec.symptoms.map((s, idx) => (
                        <span key={idx} className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">None reported</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">Current Medications:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.medications && rec.medications.length > 0 ? (
                      rec.medications.map((m, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </div>
                </div>
              </div>

              {rec.allergies && rec.allergies.length > 0 && (
                <div className="mt-3 text-xs">
                  <span className="font-bold text-red-700">Allergies: </span>
                  <span className="text-red-600">{rec.allergies.join(', ')}</span>
                </div>
              )}

              {rec.notes && (
                <div className="mt-3 text-xs bg-white p-2.5 rounded-lg border border-slate-100 text-slate-600">
                  <span className="font-bold text-slate-700">Clinical Notes: </span>
                  {rec.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-navy-900">Add New Health Record</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs mb-4">{error}</div>}

            <form onSubmit={handleCreateRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Symptoms (comma-separated)
                </label>
                <input
                  type="text"
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  placeholder="e.g. Mild chest tightness, shortness of breath on exertion"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Known Allergies
                  </label>
                  <input
                    type="text"
                    value={allergiesInput}
                    onChange={(e) => setAllergiesInput(e.target.value)}
                    placeholder="e.g. Penicillin, Aspirin"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Active Medications
                  </label>
                  <input
                    type="text"
                    value={medicationsInput}
                    onChange={(e) => setMedicationsInput(e.target.value)}
                    placeholder="e.g. Atorvastatin 20mg daily"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Vitals Inputs */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase block mb-2">Vital Signs</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Systolic BP</label>
                    <input
                      type="number"
                      value={vitals.bloodPressureSystolic}
                      onChange={(e) => setVitals({ ...vitals, bloodPressureSystolic: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Diastolic BP</label>
                    <input
                      type="number"
                      value={vitals.bloodPressureDiastolic}
                      onChange={(e) => setVitals({ ...vitals, bloodPressureDiastolic: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Heart Rate</label>
                    <input
                      type="number"
                      value={vitals.heartRate}
                      onChange={(e) => setVitals({ ...vitals, heartRate: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">SpO2 (%)</label>
                    <input
                      type="number"
                      value={vitals.oxygenSaturation}
                      onChange={(e) => setVitals({ ...vitals, oxygenSaturation: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Temp (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={vitals.temperature}
                      onChange={(e) => setVitals({ ...vitals, temperature: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Weight (kg)</label>
                    <input
                      type="number"
                      value={vitals.weightKg}
                      onChange={(e) => setVitals({ ...vitals, weightKg: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observations & Clinical Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or physician observations..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Health Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
