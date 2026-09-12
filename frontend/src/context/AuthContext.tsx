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
      // InsForge owns the browser session. Do not require the legacy
      // localStorage token because a valid InsForge session may not expose an
      // access token to this legacy compatibility layer.
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
      await api.login(email, pass);
      // The InsForge login has established the session. Loading the complete
      // application profile here keeps the existing User shape and avoids a
      // second redirect decision based on the old token guard.
      await refreshUser();
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
      value={{
        currentUser,
        loading,
        login,
        register,
        logout,
        demoSwitchUser,
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
