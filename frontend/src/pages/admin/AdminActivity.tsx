import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { AuditLog } from '../../types/clinical';

export const AdminActivity: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await api.getAdminAuditLogs(150);
        if (data?.logs) setLogs(data.logs);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const actionMatch = l.action?.toLowerCase().includes(q);
    const actorMatch = l.actorUid?.toLowerCase().includes(q);
    const resMatch = l.resourceType?.toLowerCase().includes(q);
    return !search || actionMatch || actorMatch || resMatch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Security & Clinical Audit Stream</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable longitudinal record of authentication events, access grants, prediction runs, and note submissions.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          Captured Events: <span className="font-bold text-slate-900">{logs.length}</span>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by action (e.g. AI_PREDICTION_RUN, DOCTOR_ACCESS_GRANTED), actor UID, or resource..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-clinical-500"
        />
      </div>

      {/* Audit Log Table */}
      <div className="clinical-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Actor Identifier</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Action Triggered</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Resource Target</th>
                <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">Loading audit trail...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">No matching audit events found.</td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.eventId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-bold">
                      {log.actorUid}
                    </td>
                    <td className="px-4 py-3 font-semibold text-clinical-700">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.resourceType} / {log.resourceId}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.outcome === 'SUCCESS' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
