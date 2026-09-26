import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { clearPhoneSession, getCurrentPhoneUser, requestPhoneOtp, verifyPhoneOtp } from '../services/phoneAuth';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  requestPhoneOtp: (phone: string) => Promise<string>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
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
    // A fresh visitor has no authenticated access token yet. Calling
    // getCurrentUser() in that state can make the InsForge SDK hit its
    // browser refresh endpoint and produce a 401/403 even though nobody
    // is logged in. Only restore a session when the app has a token.
    const hasToken = Boolean(sessionStorage.getItem('skillbarter_token'));
    if (!hasToken) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      try {
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

  const logout = async () => {
    await api.logout();
    clearPhoneSession();
    setCurrentUser(null);
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
    <AuthContext.Provider value={{ currentUser, loading, login, requestPhoneOtp: handleRequestPhoneOtp, verifyPhoneOtp: handleVerifyPhoneOtp, register, logout, demoSwitchUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
