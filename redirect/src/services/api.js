import axios from 'axios';
import { clearAuthSession } from '../utils/authSession';

const API_URL = process.env.REACT_APP_API_URL 
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
api.interceptors.request.use(config => {
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isFormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
      config.headers.delete('content-type');
    } else {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle session expiration
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      
      // Only show session expired if user actually had a token (was logged in)
      if (token) {
        // Check if guest session expired
        if (error.response?.data?.guestExpired) {
          clearAuthSession();
          window.dispatchEvent(new CustomEvent('guestExpired'));
          return Promise.reject(error);
        }
        
        // Clear auth data
        clearAuthSession();
        
        // Store current path for redirect after login
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        // Dispatch custom event for AuthContext to handle
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
