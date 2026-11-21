'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check current session from /api/auth/me on mount
  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data);
      return data;
    } catch (err) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    setUser(data);
    return data;
  };

  const register = async (formData) => {
    const data = await api.post('/api/auth/register', formData);
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  const value = {
    user,
    loading,
    isAdmin,
    isCustomer,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
