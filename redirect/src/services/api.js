import axios from 'axios';
import { clearAuthSession, getAuthToken } from '../utils/authSession';
import { buildApiUrl } from '../utils/apiBaseUrl';
import { storeRedirectAfterLogin } from '../utils/authRedirects';

const API_URL = buildApiUrl('/api');

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

  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle session expiration
api.interceptors.response.use(
  response => response,
  error => {
    const isCredentialRejection =
      Number.isFinite(Number(error.response?.data?.attemptsRemaining)) ||
      error.response?.data?.showForgotPassword === true;
    if (error.response?.status === 401 && !error.config?.skipAuthFailureLogout && !isCredentialRejection) {
      const token = getAuthToken();
      
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
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (currentPath !== '/login' && currentPath !== '/register') {
          storeRedirectAfterLogin(currentPath);
        }
        
        // Dispatch custom event for AuthContext to handle
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
