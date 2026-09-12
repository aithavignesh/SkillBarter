import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
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
    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
      api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const result = await api.login(email, pass);
      // api.login authenticates with InsForge and returns the application user.
      // Keep that result as the immediate authenticated state so navigation is
      // not blocked by a second profile lookup. A background refresh can then
      // hydrate the latest profile data.
      if (result?.user_id) {
        const existing = await api.getMe().catch(() => null);
        if (existing) setCurrentUser(existing);
      }
      if (!currentUser) {
        const fallback = await api.getMe().catch(() => null);
        if (fallback) setCurrentUser(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: any) => {
    setLoading(true);
    try {
      await api.register(payload);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
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
    <AuthContext.Provider
      value={{ currentUser, loading, login, register, logout, demoSwitchUser, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
