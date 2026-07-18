const trimTrailingSlash = (value = '') => String(value || '').trim().replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(process.env.REACT_APP_API_URL || '');

export const buildApiUrl = (path = '') => {
  const normalizedPath = String(path || '');
  const prefixedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return `${API_BASE_URL}${prefixedPath}`;
};

export const getSocketBaseUrl = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
};
