import React from 'react';
import { Stethoscope, ShieldCheck, Hospital, Award, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const DoctorSettings: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-navy-900">Clinician Profile & Practice Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Medical board credentials, hospital affiliations, and professional verification status.
        </p>
      </div>

      <div className="clinical-card p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              Professional Credential Details
            </h2>
            <StatusBadge status="verified" type="verification" />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Clinician Legal Name:</span>
              <span className="font-bold text-slate-800">{user?.fullName || 'Dr. Sarah Chen, MD'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Medical Specialty:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Cardiologist (Adult Cardiology)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Medical License Identifier:</span>
              <span className="font-mono text-slate-700 font-bold">MD-CARDIO-88921</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Primary Hospital Affiliation:</span>
              <span className="text-slate-700 font-medium">Metro Cardiac & General Institute</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Clinical Experience:</span>
              <span className="text-slate-700 font-medium">14 Years Active Practice</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Audit Logging & Governance Notice
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            All patient chart inquiries, document views, and clinical note submissions are immutably logged with actor timestamps. Patient records are governed by least-privilege consent rules.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out of Clinician Portal
          </button>
        </div>
      </div>
    </div>
  );
};
