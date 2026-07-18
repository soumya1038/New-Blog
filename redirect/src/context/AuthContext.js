import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  clearAuthSession,
  getAuthToken,
  getRememberMePreference,
  getStoredAuthUser,
  hasAuthToken,
  storeAuthSession,
} from '../utils/authSession';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [guestExpired, setGuestExpired] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = getAuthToken();
    const rememberMe = getRememberMePreference();

    if (!token) {
      clearAuthSession();
      setUser(null);
      setLoading(false);
      return;
    }

    const cachedUser = getStoredAuthUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    try {
      const { data } = await api.get('/auth/me');
      const nextUser = storeAuthSession({
        token,
        user: data.user,
        rememberMe,
      });
      setUser(nextUser || data.user);
      setSessionExpired(false);
      setGuestExpired(false);
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuthSession();
        setUser(null);
        if (error.response?.data?.guestExpired) {
          setGuestExpired(true);
        }
      } else if (!cachedUser) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Listen for session expiration from API interceptor
    const handleSessionExpired = () => {
      clearAuthSession();
      setUser(null);
      setSessionExpired(true);
      setLoading(false);
    };
    
    const handleGuestExpired = () => {
      clearAuthSession();
      setUser(null);
      setGuestExpired(true);
      setLoading(false);
    };

    const handleAuthSessionChanged = (event) => {
      if (event.detail?.user) {
        setUser(event.detail.user);
        return;
      }

      if (!hasAuthToken()) {
        setUser(null);
      }
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('guestExpired', handleGuestExpired);
    window.addEventListener('authSessionChanged', handleAuthSessionChanged);
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('guestExpired', handleGuestExpired);
      window.removeEventListener('authSessionChanged', handleAuthSessionChanged);
    };
  }, [checkAuth]);

  const login = async (username, password, rememberMe) => {
    const { data } = await api.post('/auth/login', { username, password, rememberMe });
    const fallbackUser = storeAuthSession({
      token: data.token,
      user: data.user,
      rememberMe,
    });
    if (fallbackUser) {
      setUser(fallbackUser);
    }
    try {
      const meRes = await api.get('/auth/me');
      const nextUser = storeAuthSession({
        token: data.token,
        user: meRes.data.user,
        rememberMe,
      });
      setUser(nextUser || meRes.data.user);
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuthSession();
        setUser(null);
        throw error;
      }
      setUser(fallbackUser || null);
    }
    setSessionExpired(false);
    setGuestExpired(false);
    return data;
  };

  const register = async (username, email, password, rememberMe) => {
    const { data } = await api.post('/auth/register', { username, email, password, rememberMe });
    return data;
  };

  const logout = async () => {
    // If guest user, call backend to delete data
    if (user?.isGuest || user?.role === 'guest') {
      try {
        await api.post('/users/guest-logout');
      } catch (error) {
        console.error('Guest logout error:', error);
      }
    }
    
    clearAuthSession();
    setUser(null);
    setSessionExpired(false);
  };

  const completeLogin = (data, rememberMe = false) => {
    const nextUser = storeAuthSession({
      token: data?.token,
      user: data?.user,
      rememberMe,
    });
    setUser(nextUser);
    setSessionExpired(false);
    setGuestExpired(false);
    return nextUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, guestExpired, setGuestExpired, login, register, logout, setUser, completeLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
