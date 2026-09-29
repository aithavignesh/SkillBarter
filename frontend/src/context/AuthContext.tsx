// UI preview deployment trigger: keep auth behavior unchanged.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { clearPhoneSession, getCurrentPhoneUser, hasPersistedPhoneSession, requestPhoneOtp, verifyPhoneOtp } from '../services/phoneAuth';
import { requestEmailOtp, verifyEmailOtp } from '../services/emailOtp';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  requestPhoneOtp: (phone: string) => Promise<string>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
  requestEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, otp: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  demoSwitchUser: (userId: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const hasToken = Boolean(sessionStorage.getItem('skillbarter_token'));
    const hasPhoneSession = hasPersistedPhoneSession();

    // Anonymous visitors should not enter the auth-provider lookup path.
    // Without a persisted session there is nothing to restore, and calling
    // getCurrentUser() can cause the SDK to probe /auth/refresh and return
    // repeated 401s on the public landing page.
    if (!hasToken && !hasPhoneSession) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      try {
        if (!hasPhoneSession) throw new Error('No persisted phone session');
        const phoneUser = await getCurrentPhoneUser();
        if (phoneUser) {
          setCurrentUser(phoneUser as User);
          return;
        }
      } catch {
        // No active phone session.
      }
      setCurrentUser(null);
      api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshUser(); }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      clearPhoneSession();
      await api.login(email, pass);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPhoneOtp = async (phone: string) => {
    setLoading(true);
    try {
      return await requestPhoneOtp(phone);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (phone: string, otp: string) => {
    setLoading(true);
    try {
      const user = await verifyPhoneOtp(phone, otp);
      setCurrentUser(user as User);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: any) => {
    setLoading(true);
    try {
      clearPhoneSession();
      await api.register(payload);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEmailOtp = async (email: string) => {
    setLoading(true);
    try { await requestEmailOtp(email); } finally { setLoading(false); }
  };

  const handleVerifyEmailOtp = async (email: string, otp: string) => {
    setLoading(true);
    try {
      clearPhoneSession();
      const user = await verifyEmailOtp(email, otp);
      if (!user) throw new Error('Email OTP verified, but the SkillBarter profile could not be loaded.');
      setCurrentUser(user as User);
    } finally { setLoading(false); }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      clearPhoneSession();
      setCurrentUser(null);
    }
  };

  const demoSwitchUser = async (userId: number) => {
    setLoading(true);
    try {
      await api.demoSwitch(userId);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, requestPhoneOtp: handleRequestPhoneOtp, verifyPhoneOtp: handleVerifyPhoneOtp, requestEmailOtp: handleRequestEmailOtp, verifyEmailOtp: handleVerifyEmailOtp, register, logout, demoSwitchUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
