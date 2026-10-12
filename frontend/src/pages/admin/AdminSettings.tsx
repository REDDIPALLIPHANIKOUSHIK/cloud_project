import React, { useState, useEffect } from 'react';
import { Shield, BrainCircuit, Database, Server, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../../lib/api';

export const AdminSettings: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    api.getHealth().then(setHealthData).catch(() => null);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-navy-900">System Configuration & Governance</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Operational metadata, machine learning model pipeline status, and cloud backend topology.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ML Model Card */}
        <div className="clinical-card p-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <BrainCircuit className="w-5 h-5 text-clinical-600" />
            <h2 className="font-bold text-base text-navy-900">ML Model Pipeline Credentials</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Model Classifier:</span>
              <span className="font-bold text-navy-900">Random Forest Classifier Pipeline</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Trained Version:</span>
              <span className="font-mono text-slate-700">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Training Dataset:</span>
              <span className="text-slate-700">UCI Cleveland Heart Disease (303 cases)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Holdout Test Accuracy:</span>
              <span className="font-bold text-teal-600">90.16%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Holdout F1-Score:</span>
              <span className="font-bold text-teal-600">89.29%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">ROC-AUC Score:</span>
              <span className="font-bold text-teal-600">96.10%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Test Confusion Matrix:</span>
              <span className="font-mono text-slate-600">[[30, 3], [3, 25]]</span>
            </div>
          </div>
        </div>

        {/* Database & Cloud Architecture Card */}
        <div className="clinical-card p-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <Database className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-base text-navy-900">Persistence & Cloud Architecture</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Active Database:</span>
              <span className="font-bold text-navy-900">
                {healthData?.database || 'Cloud Firestore / Local Hybrid'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">API Environment:</span>
              <span className="font-mono text-slate-700">{healthData?.environment || 'development'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">File Storage:</span>
              <span className="text-slate-700">Firebase Storage / Private Blobs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Security Rules:</span>
              <span className="font-bold text-teal-600">Enforced (firestore.rules)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Audit Logging:</span>
              <span className="font-bold text-teal-600">Active (Append-Only)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
