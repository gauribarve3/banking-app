import { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vaultbank_token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Rehydrate session on mount
  useEffect(() => {
    const rehydrate = async () => {
      const storedToken = localStorage.getItem('vaultbank_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.data.user);
        setToken(storedToken);
      } catch {
        localStorage.removeItem('vaultbank_token');
        localStorage.removeItem('vaultbank_user');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    rehydrate();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('vaultbank_token', newToken);
    localStorage.setItem('vaultbank_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('vaultbank_token');
    localStorage.removeItem('vaultbank_user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data.user);
    } catch {
      // Silent fail
    }
  }, []);

  const loginWithToken = useCallback(async (newToken) => {
    localStorage.setItem('vaultbank_token', newToken);
    setToken(newToken);
    const res = await apiClient.get('/auth/me');
    const newUser = res.data.user;
    localStorage.setItem('vaultbank_user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, isLoading, login, logout, refreshUser, loginWithToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
