import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Access Denied (403 Forbidden)</h2>
        <p className="text-sm text-slate-600 mb-6">
          Your account role does not have authorization to view this clinical resource. To prevent data leakage, access is strictly role-governed.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-sm rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Safe Portal
        </Link>
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
        <h1 className="text-4xl font-extrabold text-navy-900 mb-2">404</h1>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-600 mb-6">
          The requested healthcare page or endpoint does not exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-sm rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Home
        </Link>
      </div>
    </div>
  );
};
