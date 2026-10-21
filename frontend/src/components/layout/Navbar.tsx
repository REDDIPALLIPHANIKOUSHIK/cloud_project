import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
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

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <StatusBadge status={role} type="role" />
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-900">{user.fullName || 'User'}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                  title="Sign out of account"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-clinical-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Log In
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
