import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, Clock, Stethoscope, ArrowRight, Download, Filter, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

export const PatientPredictionsList: React.FC = () => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await api.getPredictions();
        if (data?.predictions) setPredictions(data.predictions);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filtered = selectedCategory === 'all'
    ? predictions
    : predictions.filter((p) => p.riskCategory === selectedCategory);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">AI Prediction History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological audit of model decision-support evaluations and specialist referrals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={api.getDownloadSummaryUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Health Summary
          </a>
          <Link
            to="/patient/prediction"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs transition-colors"
          >
            <BrainCircuit className="w-4 h-4" />
            New Assessment
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 text-xs">
        <span className="text-slate-400 font-bold px-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Filter Tier:
        </span>
        {['all', 'High Risk', 'Elevated Risk', 'Moderate Risk', 'Low Risk'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {cat === 'all' ? 'All Records' : cat}
          </button>
        ))}
      </div>

      {/* Predictions Table / Cards */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-4 border-clinical-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-500 font-medium">Loading prediction history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="clinical-card p-12 text-center">
          <BrainCircuit className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-navy-900 text-sm">No Predictions in this Category</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You have not recorded any clinical evaluations matching the selected criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((pred) => (
            <div key={pred.predictionId} className="clinical-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                    <BrainCircuit className="w-5 h-5 text-clinical-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-navy-900">{pred.predictedCondition}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(pred.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>{pred.modelName} (v{pred.modelVersion})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={pred.riskCategory} type="risk" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Risk Index</span>
                    <span className="text-lg font-black text-navy-900">
                      {(pred.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendation Strip */}
              <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">
                      Recommended Specialist: {pred.specialistRecommendation?.specialty || 'General Physician'}
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {pred.specialistRecommendation?.reason}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[10px] font-bold uppercase bg-clinical-100 text-clinical-800 px-2 py-0.5 rounded">
                    Urgency: {pred.specialistRecommendation?.urgency || 'routine'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
