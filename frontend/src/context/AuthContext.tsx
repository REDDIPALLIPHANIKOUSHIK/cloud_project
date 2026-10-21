import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/auth';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../lib/api';

interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  specialization?: string;
  medicalLicenseNumber?: string;
  hospitalAffiliation?: string;
  yearsOfExperience?: number;
  bio?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        removeAuthToken();
      }
    } catch (err) {
      console.warn('[AuthContext] Session invalid or expired:', err);
      setUser(null);
      removeAuthToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.loginUser(email, password);
      if (res && res.token && res.user) {
        setAuthToken(res.token);
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setLoading(true);
    try {
      const res = await api.registerUser(payload);
      if (res && res.token && res.user) {
        setAuthToken(res.token);
        setUser(res.user);
      }
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
