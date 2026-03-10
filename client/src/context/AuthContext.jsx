import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, getMe } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session
  useEffect(() => {
    const token = localStorage.getItem('mjt_token');
    const savedUser = localStorage.getItem('mjt_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('mjt_token');
        localStorage.removeItem('mjt_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await apiLogin(username, password);
    const { token, user: userData } = response.data;
    localStorage.setItem('mjt_token', token);
    localStorage.setItem('mjt_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mjt_token');
    localStorage.removeItem('mjt_user');
    setUser(null);
  }, []);

  const value = { user, loading, login, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
