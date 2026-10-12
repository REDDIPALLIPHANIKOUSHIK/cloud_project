import React from 'react';
import { Shield, Key, Bell, Database, LogOut, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, getAuthToken } from '../../lib/api';

export const PatientSettings: React.FC = () => {
  const { user, logout } = useAuth();
  const currentToken = getAuthToken();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-navy-900">Account & Privacy Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure security credentials, notification preferences, and clinical privacy parameters.
        </p>
      </div>

      <div className="clinical-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-navy-900 mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-clinical-600" />
            Security & Identity Context
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Details concerning your authenticated clinical identity and token.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">User Identification (UID):</span>
              <span className="font-mono text-slate-800 font-bold">{user?.uid || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Authorized Role:</span>
              <span className="font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {user?.role || 'Patient'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Active Session Mode:</span>
              <span className="text-slate-700 font-mono text-[11px] truncate max-w-xs">{currentToken}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h2 className="text-base font-bold text-navy-900 mb-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-clinical-600" />
            Data Export & Portability
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Download your full longitudinal medical timeline and prediction history as a structured health summary.
          </p>

          <a
            href={api.getDownloadSummaryUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Complete Health Summary (.txt)
          </a>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h2 className="text-base font-bold text-red-700 mb-1 flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Session Termination
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Securely sign out of this browser session to clear local clinical authentication credentials.
          </p>

          <button
            onClick={logout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors"
          >
            Sign Out of MediCloud AI
          </button>
        </div>
      </div>
    </div>
  );
};
