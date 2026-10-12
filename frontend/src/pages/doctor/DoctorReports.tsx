import React, { useState, useEffect } from 'react';
import { FileText, Search, Users, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

export const DoctorReports: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const data = await api.getAuthorizedPatients();
        if (data?.patients) setPatients(data.patients);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-navy-900">Authorized Diagnostic Document Overview</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Access diagnostic reports and lab files for patients with active consent grants.
        </p>
      </div>

      <div className="clinical-card p-6">
        <h2 className="text-base font-bold text-navy-900 mb-4">Patient Document Access Quick Links</h2>
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs">Loading patient diagnostic records...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">No authorized patients available.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((p) => (
              <div key={p.patientId} className="py-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-navy-900 block">{p.fullName}</span>
                  <span className="text-xs text-slate-400">DOB: {p.dateOfBirth} • Blood Group: {p.bloodGroup}</span>
                </div>
                <a
                  href={`/doctor/patients/${p.patientId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-clinical-50 hover:bg-clinical-100 text-clinical-700 font-bold text-xs rounded-lg transition-colors"
                >
                  Inspect Lab Scans
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
