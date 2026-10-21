import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { ErrorBoundary } from './components/common/ErrorBoundary';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { UnauthorizedPage, NotFoundPage } from './pages/UnauthorizedPage';

// Patient Pages
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { PatientProfile } from './pages/patient/PatientProfile';
import { PatientRecords } from './pages/patient/PatientRecords';
import { PatientReports } from './pages/patient/PatientReports';
import { PatientPrediction } from './pages/patient/PatientPrediction';
import { PatientPredictionsList } from './pages/patient/PatientPredictionsList';
import { PatientAccess } from './pages/patient/PatientAccess';
import { PatientSettings } from './pages/patient/PatientSettings';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatients } from './pages/doctor/DoctorPatients';
import { DoctorPatientDetail } from './pages/doctor/DoctorPatientDetail';
import { DoctorNotes } from './pages/doctor/DoctorNotes';
import { DoctorReports } from './pages/doctor/DoctorReports';
import { DoctorSettings } from './pages/doctor/DoctorSettings';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminActivity } from './pages/admin/AdminActivity';
import { AdminSettings } from './pages/admin/AdminSettings';

// Layout for authenticated portals with Sidebar
const PortalLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 sm:p-8 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

// Layout for public pages
const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
            </Route>

            {/* Patient Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PortalLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
              <Route path="/patient/profile" element={<PatientProfile />} />
              <Route path="/patient/records" element={<PatientRecords />} />
              <Route path="/patient/reports" element={<PatientReports />} />
              <Route path="/patient/prediction" element={<PatientPrediction />} />
              <Route path="/patient/predictions" element={<PatientPredictionsList />} />
              <Route path="/patient/access" element={<PatientAccess />} />
              <Route path="/patient/settings" element={<PatientSettings />} />
            </Route>

            {/* Doctor Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <PortalLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<DoctorPatients />} />
              <Route path="/doctor/patients/:patientId" element={<DoctorPatientDetail />} />
              <Route path="/doctor/reports" element={<DoctorReports />} />
              <Route path="/doctor/notes" element={<DoctorNotes />} />
              <Route path="/doctor/settings" element={<DoctorSettings />} />
            </Route>

            {/* Admin Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PortalLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/activity" element={<AdminActivity />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
