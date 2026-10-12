import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';

export const LoginPage: React.FC = () => {
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || (
    role === 'doctor' ? '/doctor/dashboard' : role === 'admin' ? '/admin/dashboard' : '/patient/dashboard'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please provide an email address.');
      return;
    }
    setLoading(true);
    try {
      await login(email, role);
      navigate(role === 'doctor' ? '/doctor/dashboard' : role === 'admin' ? '/admin/dashboard' : '/patient/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoRole: UserRole) => {
    setLoading(true);
    try {
      await loginAsDemo(demoRole);
      navigate(demoRole === 'doctor' ? '/doctor/dashboard' : demoRole === 'admin' ? '/admin/dashboard' : '/patient/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-clinical-700 to-teal-500 flex items-center justify-center text-white shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-2xl text-navy-900 tracking-tight">
            MediCloud <span className="text-clinical-600">AI</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-navy-900">Sign in to your clinical account</h2>
        <p className="mt-1 text-xs text-slate-500">Secure role-isolated healthcare data management</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    role === 'patient'
                      ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    role === 'doctor'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Doctor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    role === 'admin'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'doctor' ? 'doctor@hospital.org' : 'patient@example.com'}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-clinical-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block text-center mb-3">
              One-Click Test Account Access:
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('patient')}
                className="w-full flex items-center justify-between px-3.5 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-bold text-teal-800 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Sign in as Demo Patient (Alex Mercer)
                </span>
                <span className="text-[10px] bg-teal-200 px-1.5 py-0.5 rounded">Instant</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('doctor')}
                className="w-full flex items-center justify-between px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold text-blue-800 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5" />
                  Sign in as Demo Doctor (Dr. Sarah Chen, MD)
                </span>
                <span className="text-[10px] bg-blue-200 px-1.5 py-0.5 rounded">Instant</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="w-full flex items-center justify-between px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold text-purple-800 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Sign in as Demo Administrator
                </span>
                <span className="text-[10px] bg-purple-200 px-1.5 py-0.5 rounded">Instant</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Need an account?{' '}
            <Link to="/register" className="font-bold text-clinical-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
