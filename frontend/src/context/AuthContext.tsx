import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/auth';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, role?: UserRole) => Promise<void>;
  register: (email: string, fullName: string, role: UserRole, extra?: any) => Promise<void>;
  loginAsDemo: (demoRole: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      if (data && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.warn('[AuthContext] Could not retrieve session, defaulting to demo patient.');
      // Auto-fallback to demo-patient in local preview
      const fallbackToken = getAuthToken() || 'demo-patient';
      setAuthToken(fallbackToken);
      try {
        const data = await api.getMe();
        if (data && data.user) setUser(data.user);
      } catch (inner) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, targetRole: UserRole = 'patient') => {
    setLoading(true);
    try {
      // In hybrid/demo mode, map to role token
      const token = `demo-${targetRole}`;
      setAuthToken(token);
      await api.syncUser({ email, role: targetRole, fullName: email.split('@')[0] });
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, fullName: string, role: UserRole, extra: any = {}) => {
    setLoading(true);
    try {
      const token = `demo-${role}`;
      setAuthToken(token);
      await api.syncUser({
        email,
        fullName,
        role,
        ...extra,
      });
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (demoRole: UserRole) => {
    setLoading(true);
    try {
      setAuthToken(`demo-${demoRole}`);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const role: UserRole = user?.role || 'patient';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        register,
        loginAsDemo,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
