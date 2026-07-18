const REDIRECT_AFTER_LOGIN_KEY = 'redirectAfterLogin';
const MAX_REDIRECT_PATH_LENGTH = 2048;

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
};

export const getSafeInternalRedirectPath = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw || raw.length > MAX_REDIRECT_PATH_LENGTH) return '';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '';
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return '';

  try {
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://lekhon.local';
    const parsed = new URL(raw, origin);
    if (parsed.origin !== origin) return '';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '';
  }
};

export const storeRedirectAfterLogin = (value) => {
  const safePath = getSafeInternalRedirectPath(value);
  const storage = getSessionStorage();
  if (!storage) return '';

  if (!safePath) {
    storage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
    return '';
  }

  storage.setItem(REDIRECT_AFTER_LOGIN_KEY, safePath);
  return safePath;
};

export const clearRedirectAfterLogin = () => {
  getSessionStorage()?.removeItem(REDIRECT_AFTER_LOGIN_KEY);
};

export const consumeRedirectAfterLogin = () => {
  const storage = getSessionStorage();
  if (!storage) return '';

  const safePath = getSafeInternalRedirectPath(storage.getItem(REDIRECT_AFTER_LOGIN_KEY));
  storage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
  return safePath;
};
