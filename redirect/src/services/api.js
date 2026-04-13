import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL 
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
api.interceptors.request.use(config => {
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
    if (error.response?.status === 401 || error.response?.status === 403) {
      const token = localStorage.getItem('token');
      
      // Only show session expired if user actually had a token (was logged in)
      if (token) {
        // Check if guest session expired
        if (error.response?.data?.guestExpired) {
          localStorage.removeItem('token');
          localStorage.removeItem('rememberMe');
          window.dispatchEvent(new CustomEvent('guestExpired'));
          return Promise.reject(error);
        }
        
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('rememberMe');
        
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
