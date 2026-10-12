import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, ArrowRight, Activity, Calendar, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

export const DoctorPatients: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await api.getAuthorizedPatients();
        if (data?.patients) setPatients(data.patients);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const nameMatch = p.fullName?.toLowerCase().includes(q);
    const bgMatch = p.bloodGroup?.toLowerCase().includes(q);
    return !search || nameMatch || bgMatch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Authorized Patient Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Patients who have explicitly authorized your account to review their longitudinal health records.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          Active Records: <span className="font-bold text-slate-900">{patients.length}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient legal name or blood group..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-clinical-500"
        />
      </div>

      {/* Patients List */}
      <div className="clinical-card p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading authorized patients...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No patients match your search criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <div key={p.patientId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center shrink-0 text-base">
                    {(p.fullName || 'P').charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-navy-900">{p.fullName}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>DOB: {p.dateOfBirth}</span>
                      <span>•</span>
                      <span>Gender: {p.gender}</span>
                      <span>•</span>
                      <span>Blood Group: {p.bloodGroup}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">ID: {p.patientId.slice(0, 10)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {p.latestPrediction && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">AI Screening</span>
                      <StatusBadge status={p.latestPrediction.riskCategory} type="risk" />
                    </div>
                  )}

                  <Link
                    to={`/doctor/patients/${p.patientId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                  >
                    Open Clinical Chart
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
