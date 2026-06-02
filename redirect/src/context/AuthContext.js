import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [guestExpired, setGuestExpired] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Listen for session expiration from API interceptor
    const handleSessionExpired = () => {
      setUser(null);
      setSessionExpired(true);
      setLoading(false);
    };
    
    const handleGuestExpired = () => {
      setUser(null);
      setGuestExpired(true);
      setLoading(false);
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('guestExpired', handleGuestExpired);
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('guestExpired', handleGuestExpired);
    };
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const rememberMe = localStorage.getItem('rememberMe');
    
    if (token && rememberMe === 'true') {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setSessionExpired(false);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('rememberMe');
        setUser(null);
      }
    } else if (!rememberMe) {
      localStorage.removeItem('token');
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (username, password, rememberMe) => {
    const { data } = await api.post('/auth/login', { username, password, rememberMe });
    localStorage.setItem('token', data.token);
    localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
    try {
      const meRes = await api.get('/auth/me');
      setUser(meRes.data.user);
    } catch {
      setUser({
        _id: data.user.id,
        username: data.user.username,
        name: data.user.name || '',
        profileImage: data.user.profileImage,
        role: data.user.role,
        isVerified: data.user.isVerified || false,
        isSeller: data.user.isSeller || false,
      });
    }
    setSessionExpired(false);
    return data;
  };

  const register = async (username, email, password, rememberMe, mathAnswer, mathQuestion) => {
    const { data } = await api.post('/auth/register', { username, email, password, rememberMe, mathAnswer, mathQuestion });
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
    
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    setUser(null);
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, guestExpired, setGuestExpired, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
