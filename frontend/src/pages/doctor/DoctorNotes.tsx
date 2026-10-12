import React, { useState, useEffect } from 'react';
import { ClipboardList, Calendar, User, Search, Stethoscope } from 'lucide-react';
import { api } from '../../lib/api';

export const DoctorNotes: React.FC = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const data = await api.getMyClinicalNotes();
        if (data?.notes) setNotes(data.notes);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const filtered = notes.filter((n) => {
    const q = search.toLowerCase();
    const contentMatch = n.content?.toLowerCase().includes(q);
    const diagMatch = n.diagnosis?.toLowerCase().includes(q);
    return !search || contentMatch || diagMatch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Clinical Consultation Notes</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Longitudinal record of patient observations, impressions, and prescriptions authored by your account.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          Total Logged: <span className="font-bold text-slate-900">{notes.length}</span>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by diagnosis, clinical findings, or prescriptions..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-clinical-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Loading clinical notes...</div>
      ) : filtered.length === 0 ? (
        <div className="clinical-card p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-navy-900 text-sm">No Consultation Notes Recorded</h3>
          <p className="text-xs text-slate-500 mt-1">
            Open an authorized patient chart to document your first clinical consultation note.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((note) => (
            <div key={note.noteId} className="clinical-card p-5">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800">Patient ID: {note.patientId}</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{new Date(note.createdAt).toLocaleString()}</span>
              </div>

              {note.diagnosis && (
                <div className="text-xs font-bold text-navy-900 mb-1.5">
                  Diagnosis / Impression: <span className="font-normal text-slate-700">{note.diagnosis}</span>
                </div>
              )}

              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>

              {note.prescriptions && (
                <div className="mt-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800">Rx / Prescribed Therapy: </span>
                  <span className="text-slate-700">{note.prescriptions}</span>
                </div>
              )}

              {note.followUpDate && (
                <div className="mt-2 text-[11px] text-slate-500 font-medium">
                  Follow-Up Review Date: {note.followUpDate}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
