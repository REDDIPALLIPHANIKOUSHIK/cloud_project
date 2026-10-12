import React from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert } from 'lucide-react';
import { EmergencyCheckResult } from '../../types/prediction';

interface EmergencyBannerProps {
  alert?: EmergencyCheckResult | null;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ alert }) => {
  if (!alert || !alert.is_emergency) return null;

  return (
    <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg border-2 border-red-700 animate-pulse my-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-700/80 rounded-lg shrink-0 mt-0.5">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-extrabold bg-red-800 px-2 py-0.5 rounded">
              High Priority Clinical Alert
            </span>
            <span className="text-xs font-semibold text-red-100">Immediate Action Required</span>
          </div>
          <h4 className="text-base font-bold mt-1 text-white">
            {alert.urgent_warning || 'Severe Medical Warning Signs Detected'}
          </h4>
          <p className="text-sm text-red-100 mt-1">
            {alert.action_required || 'Do not delay: seek immediate emergency medical care. Call national emergency services immediately.'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={`tel:${alert.emergency_contact || '112'}`}
              className="inline-flex items-center gap-2 bg-white text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              Call Emergency Services ({alert.emergency_contact || '112'})
            </a>
            <span className="text-xs text-red-200 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Safety Rule Override: Not downgraded by statistical prediction scores.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
