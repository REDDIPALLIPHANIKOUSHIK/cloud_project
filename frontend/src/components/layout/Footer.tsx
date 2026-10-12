import React from 'react';
import { ShieldAlert, ExternalLink, HeartPulse } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Clinical Safety & Medical Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-0.5">Mandatory Clinical & Regulatory Disclaimer</span>
            AI-generated results are intended for educational and clinical decision-support purposes only. They are not a medical diagnosis and must not replace consultation with a qualified healthcare professional. Seek emergency medical care (dial 112 in India, 911 in US) immediately for acute, severe, or rapidly worsening symptoms.
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-clinical-600" />
            <span>MediCloud AI — Cloud-Based Healthcare Data Management & AI-Powered Disease Prediction</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/REDDIPALLIPHANIKOUSHIK/cloud_project"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-clinical-700 transition-colors font-medium"
            >
              GitHub Repository
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <span>Emergency Services: Dial 112</span>
            <span>•</span>
            <span>Cloud Firestore & Private Storage</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
