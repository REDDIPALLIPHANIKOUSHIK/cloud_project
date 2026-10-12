import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Shield, LogOut, User, Stethoscope, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

export const Navbar: React.FC = () => {
  const { user, role, logout, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardPath =
    role === 'doctor'
      ? '/doctor/dashboard'
      : role === 'admin'
      ? '/admin/dashboard'
      : '/patient/dashboard';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Link to={user ? dashboardPath : '/'} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-clinical-700 to-teal-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-navy-900 tracking-tight block leading-tight">
                  MediCloud <span className="text-clinical-600 font-extrabold">AI</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase block">
                  Healthcare Data & ML Prediction
                </span>
              </div>
            </Link>
          </div>

          {/* Center/Right Nav & Demo Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Role Switcher for seamless testing */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold px-2">Demo Role:</span>
              <button
                onClick={() => loginAsDemo('patient')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  role === 'patient'
                    ? 'bg-white text-clinical-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Demo Patient Role"
              >
                Patient
              </button>
              <button
                onClick={() => loginAsDemo('doctor')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  role === 'doctor'
                    ? 'bg-white text-clinical-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Demo Doctor Role"
              >
                Doctor
              </button>
              <button
                onClick={() => loginAsDemo('admin')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  role === 'admin'
                    ? 'bg-white text-clinical-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Demo Admin Role"
              >
                Admin
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <StatusBadge status={role} type="role" />
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-900">{user.fullName || 'User'}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Log out of session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-clinical-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-white bg-clinical-600 hover:bg-clinical-700 px-3.5 py-1.5 rounded-lg shadow-xs transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
