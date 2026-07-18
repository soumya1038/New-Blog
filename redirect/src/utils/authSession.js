import { apiCache } from './apiCache';

const AUTH_TOKEN_KEY = 'token';
const REMEMBER_ME_KEY = 'rememberMe';
const AUTH_USER_KEY = 'authUser';
const OAUTH_REMEMBER_ME_KEY = 'oauthRememberMe';
const AUTH_TOKEN_MAX_LENGTH = 4096;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
let lastApiCacheUserId = '';

const getStorage = (type) => {
  if (typeof window === 'undefined') return null;
  try {
    return window[type] || null;
  } catch {
    return null;
  }
};

const getLocalAuthStorage = () => getStorage('localStorage');
const getSessionAuthStorage = () => getStorage('sessionStorage');

export const normalizeAuthToken = (token = '') => String(token || '').trim();

const decodeJwtPayload = (token = '') => {
  const normalizedToken = normalizeAuthToken(token);
  if (!normalizedToken || normalizedToken.length > AUTH_TOKEN_MAX_LENGTH || !JWT_PATTERN.test(normalizedToken)) {
    return null;
  }

  const payload = normalizedToken.split('.')[1];
  if (!payload) return null;

  try {
    const decodeBase64 = typeof globalThis?.atob === 'function'
      ? globalThis.atob.bind(globalThis)
      : null;
    if (!decodeBase64) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = decodeBase64(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const isUsableAuthToken = (token = '') => {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  const subject = String(payload?.id || payload?.sub || '').trim();
  if (!payload || !subject || !Number.isFinite(exp)) return false;
  return Date.now() < exp * 1000;
};

const removeAuthKeys = (storage) => {
  if (!storage) return;
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(REMEMBER_ME_KEY);
  storage.removeItem(AUTH_USER_KEY);
};

const getValidStorageWithToken = (storage) => {
  const token = normalizeAuthToken(storage?.getItem(AUTH_TOKEN_KEY));
  if (!token) return null;
  if (!isUsableAuthToken(token)) {
    removeAuthKeys(storage);
    apiCache.clear();
    lastApiCacheUserId = '';
    return null;
  }
  storage.removeItem(AUTH_USER_KEY);
  return storage;
};

const getTokenStorage = () => {
  const sessionStorage = getSessionAuthStorage();
  const sessionTokenStorage = getValidStorageWithToken(sessionStorage);
  if (sessionTokenStorage) return sessionTokenStorage;

  const localStorage = getLocalAuthStorage();
  const localTokenStorage = getValidStorageWithToken(localStorage);
  if (localTokenStorage) return localTokenStorage;

  return null;
};

export const normalizeAuthUser = (user = {}) => {
  if (!user || typeof user !== 'object') return null;

  const id = user._id || user.id;
  if (!id) return { ...user };

  return {
    ...user,
    _id: id,
    id,
  };
};

const getUserCacheId = (user = {}) => String(user?._id || user?.id || '').trim();

const clearApiCacheForAuthChange = (nextUser = null) => {
  const nextUserId = getUserCacheId(nextUser);
  if (lastApiCacheUserId !== nextUserId) {
    apiCache.clear();
  }
  lastApiCacheUserId = nextUserId;
};

const emitAuthSessionChanged = (detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('authSessionChanged', { detail }));
};

export const hasAuthToken = () => {
  return Boolean(getAuthToken());
};

export const getAuthToken = () => {
  const storage = getTokenStorage();
  return normalizeAuthToken(storage?.getItem(AUTH_TOKEN_KEY));
};

export const getRememberMePreference = () => {
  const storage = getTokenStorage();
  if (!storage) return false;
  return storage.getItem(REMEMBER_ME_KEY) === 'true';
};

export const getStoredAuthUser = () => {
  getLocalAuthStorage()?.removeItem(AUTH_USER_KEY);
  getSessionAuthStorage()?.removeItem(AUTH_USER_KEY);
  return null;
};

export const storeAuthSession = ({ token, user, rememberMe = false }) => {
  const normalizedToken = normalizeAuthToken(token);
  const localStorage = getLocalAuthStorage();
  const sessionStorage = getSessionAuthStorage();

  if (!isUsableAuthToken(normalizedToken)) {
    removeAuthKeys(localStorage);
    removeAuthKeys(sessionStorage);
    clearApiCacheForAuthChange(null);
    emitAuthSessionChanged({ user: null });
    return null;
  }

  const normalizedUser = normalizeAuthUser(user);
  const storage = rememberMe ? localStorage : sessionStorage;
  if (!storage) return null;

  removeAuthKeys(localStorage);
  removeAuthKeys(sessionStorage);
  storage.setItem(AUTH_TOKEN_KEY, normalizedToken);
  storage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');

  storage.removeItem(AUTH_USER_KEY);

  clearApiCacheForAuthChange(normalizedUser);
  emitAuthSessionChanged({ user: normalizedUser });
  return normalizedUser;
};

export const setPendingOAuthRememberMe = (rememberMe) => {
  const storage = getSessionAuthStorage();
  if (!storage) return;
  storage.setItem(OAUTH_REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
};

export const consumePendingOAuthRememberMe = () => {
  const storage = getSessionAuthStorage();
  if (!storage) return false;
  const rememberMe = storage.getItem(OAUTH_REMEMBER_ME_KEY) === 'true';
  storage.removeItem(OAUTH_REMEMBER_ME_KEY);
  return rememberMe;
};

export const clearPendingOAuthRememberMe = () => {
  getSessionAuthStorage()?.removeItem(OAUTH_REMEMBER_ME_KEY);
};

export const clearAuthSession = () => {
  removeAuthKeys(getLocalAuthStorage());
  removeAuthKeys(getSessionAuthStorage());
  clearPendingOAuthRememberMe();
  clearApiCacheForAuthChange(null);
  emitAuthSessionChanged({ user: null });
};
