import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const rememberMe = localStorage.getItem('rememberMe');
    
    if (token && rememberMe === 'true') {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
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
    // Set user with role from backend
    setUser({
      _id: data.user.id,
      username: data.user.username,
      profileImage: data.user.profileImage,
      role: data.user.role
    });
    return data;
  };

  const register = async (username, email, password, rememberMe) => {
    const { data } = await api.post('/auth/register', { username, email, password, rememberMe });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
