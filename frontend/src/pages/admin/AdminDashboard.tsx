import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  BrainCircuit,
  UploadCloud,
  Share2,
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../lib/api';

const RISK_COLORS = {
  'Low Risk': '#10b981',
  'Moderate Risk': '#f59e0b',
  'Elevated Risk': '#f97316',
  'High Risk': '#ef4444',
};

const ROLE_COLORS = {
  patient: '#0d9488',
  doctor: '#2563eb',
  admin: '#7c3aed',
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.getAdminStats();
        setStats(data);
      } catch (err) {
        console.warn('Could not fetch admin stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs text-slate-500 font-medium">Loading administrative metrics...</p>
      </div>
    );
  }

  // Chart data preparations
  const riskChartData = Object.entries(stats.riskDistribution || {}).map(([name, value]) => ({
    name,
    count: value,
    color: (RISK_COLORS as any)[name] || '#64748b',
  }));

  const roleChartData = Object.entries(stats.roleDistribution || {}).map(([name, value]) => ({
    name: name.toUpperCase(),
    value: value,
    color: (ROLE_COLORS as any)[name] || '#64748b',
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Admin Welcome Header */}
      <div className="bg-gradient-to-r from-navy-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold mb-3">
          <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          System Administration & Governance
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Platform Operations & Metrics
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          Monitor system throughput, evaluate ML risk distribution, govern role assignments, and review security audit logs with least-privilege clinical protection.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/admin/users"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            Manage User Roles ({stats.totalUsers})
          </Link>
          <Link
            to="/admin/activity"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
          >
            View Security Audit Trail ({stats.totalAuditEvents})
          </Link>
        </div>
      </div>

      {/* Aggregate Statistics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="clinical-card p-4">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Total Users</span>
          <div className="text-2xl font-extrabold text-navy-900">{stats.totalUsers}</div>
          <span className="text-[11px] text-purple-600 font-semibold mt-1 block">Active Registered</span>
        </div>

        <div className="clinical-card p-4">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">AI Predictions</span>
          <div className="text-2xl font-extrabold text-navy-900">{stats.totalPredictions}</div>
          <span className="text-[11px] text-teal-600 font-semibold mt-1 block">ML Inferences Run</span>
        </div>

        <div className="clinical-card p-4">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Active Doctor Grants</span>
          <div className="text-2xl font-extrabold text-navy-900">{stats.activeDoctorGrants}</div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Consented Shares</span>
        </div>

        <div className="clinical-card p-4">
          <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Clinical Documents</span>
          <div className="text-2xl font-extrabold text-navy-900">{stats.totalDocuments}</div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Private Files Stored</span>
        </div>
      </div>

      {/* Recharts Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Risk Distribution Chart */}
        <div className="clinical-card p-6">
          <h2 className="text-base font-bold text-navy-900 mb-1 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-clinical-600" />
            Cardiovascular Risk Stratification
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Distribution of patient predictions across clinical risk categories.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Role Distribution Chart */}
        <div className="clinical-card p-6">
          <h2 className="text-base font-bold text-navy-900 mb-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            User Role Composition
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Proportion of Patients, Healthcare Professionals, and Admins.
          </p>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {roleChartData.map((entry, index) => (
                    <Cell key={`pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
