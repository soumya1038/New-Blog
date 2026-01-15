import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Listen for session expiration from API interceptor
    const handleSessionExpired = () => {
      setUser(null);
      setSessionExpired(true);
      setLoading(false);
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('sessionExpired', handleSessionExpired);
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
    setUser({
      _id: data.user.id,
      username: data.user.username,
      profileImage: data.user.profileImage,
      role: data.user.role
    });
    setSessionExpired(false);
    return data;
  };

  const register = async (username, email, password, rememberMe, mathAnswer, mathQuestion) => {
    const { data } = await api.post('/auth/register', { username, email, password, rememberMe, mathAnswer, mathQuestion });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    setUser(null);
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
