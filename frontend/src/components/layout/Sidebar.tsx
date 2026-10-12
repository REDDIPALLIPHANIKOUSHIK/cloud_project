import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  UploadCloud,
  BrainCircuit,
  History,
  Share2,
  Settings,
  Users,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
  ActivitySquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC = () => {
  const { role } = useAuth();

  const patientNav: NavItem[] = [
    { name: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
    { name: 'Health Profile', path: '/patient/profile', icon: User },
    { name: 'Medical Records', path: '/patient/records', icon: FileText },
    { name: 'Lab Documents', path: '/patient/reports', icon: UploadCloud },
    { name: 'AI Disease Prediction', path: '/patient/prediction', icon: BrainCircuit },
    { name: 'Prediction History', path: '/patient/predictions', icon: History },
    { name: 'Doctor Access Sharing', path: '/patient/access', icon: Share2 },
    { name: 'Account Settings', path: '/patient/settings', icon: Settings },
  ];

  const doctorNav: NavItem[] = [
    { name: 'Doctor Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
    { name: 'Authorized Patients', path: '/doctor/patients', icon: Users },
    { name: 'Clinical Notes', path: '/doctor/notes', icon: ClipboardList },
    { name: 'Diagnostic Reports', path: '/doctor/reports', icon: FileText },
    { name: 'Practice Settings', path: '/doctor/settings', icon: Stethoscope },
  ];

  const adminNav: NavItem[] = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User & Role Control', path: '/admin/users', icon: Users },
    { name: 'Audit & Security Logs', path: '/admin/activity', icon: ShieldCheck },
    { name: 'System Configuration', path: '/admin/settings', icon: ActivitySquare },
  ];

  const navItems = role === 'doctor' ? doctorNav : role === 'admin' ? adminNav : patientNav;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          {role.toUpperCase()} PORTAL
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-clinical-50 text-clinical-700 font-bold border-l-4 border-clinical-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0 text-slate-500" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-500 mt-6">
        <div className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          Clinical Privacy
        </div>
        Role-based record isolation and consent control active.
      </div>
    </aside>
  );
};
