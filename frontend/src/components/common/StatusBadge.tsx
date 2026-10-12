import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'risk' | 'status' | 'verification' | 'role';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status' }) => {
  let colorClasses = 'bg-slate-100 text-slate-800 border-slate-200';

  if (type === 'risk') {
    switch (status) {
      case 'High Risk':
        colorClasses = 'bg-red-50 text-red-700 border-red-200';
        break;
      case 'Elevated Risk':
        colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
        break;
      case 'Moderate Risk':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'Low Risk':
      default:
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
    }
  } else if (type === 'verification') {
    switch (status) {
      case 'verified':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'rejected':
        colorClasses = 'bg-red-50 text-red-700 border-red-200';
        break;
      case 'unverified':
      default:
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
    }
  } else if (type === 'role') {
    switch (status) {
      case 'admin':
        colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'doctor':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'patient':
      default:
        colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
        break;
    }
  } else {
    // General status
    if (status === 'active') colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (status === 'revoked') colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
    else if (status === 'suspended') colorClasses = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}>
      {status}
    </span>
  );
};
