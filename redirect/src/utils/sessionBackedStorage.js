const getBrowserStorage = (type) => {
  if (typeof window === 'undefined') return null;
  try {
    return window[type] || null;
  } catch {
    return null;
  }
};

const getLegacyKeys = (key, legacyKeys) => {
  const keys = Array.isArray(legacyKeys) && legacyKeys.length ? legacyKeys : [key];
  return [...new Set(keys.filter(Boolean))];
};

export const readSessionValue = (key, { fallback = '', legacyKeys } = {}) => {
  if (!key) return fallback;

  const sessionStorage = getBrowserStorage('sessionStorage');
  const localStorage = getBrowserStorage('localStorage');
  const sessionValue = sessionStorage?.getItem(key);
  if (sessionValue !== null && sessionValue !== undefined) return sessionValue;

  const oldKeys = getLegacyKeys(key, legacyKeys);
  const legacyValue = oldKeys
    .map((oldKey) => localStorage?.getItem(oldKey))
    .find((value) => value !== null && value !== undefined);

  oldKeys.forEach((oldKey) => localStorage?.removeItem(oldKey));
  if (legacyValue !== null && legacyValue !== undefined) {
    sessionStorage?.setItem(key, legacyValue);
    return legacyValue;
  }

  return fallback;
};

export const writeSessionValue = (key, value, { legacyKeys } = {}) => {
  if (!key) return;

  const sessionStorage = getBrowserStorage('sessionStorage');
  const localStorage = getBrowserStorage('localStorage');
  sessionStorage?.setItem(key, String(value ?? ''));
  getLegacyKeys(key, legacyKeys).forEach((oldKey) => localStorage?.removeItem(oldKey));
};

export const removeSessionValue = (key, { legacyKeys } = {}) => {
  if (!key) return;

  const sessionStorage = getBrowserStorage('sessionStorage');
  const localStorage = getBrowserStorage('localStorage');
  sessionStorage?.removeItem(key);
  getLegacyKeys(key, legacyKeys).forEach((oldKey) => localStorage?.removeItem(oldKey));
};

export const readSessionJson = (key, fallback, options = {}) => {
  const raw = readSessionValue(key, { ...options, fallback: '' });
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    removeSessionValue(key, options);
    return fallback;
  }
};

export const writeSessionJson = (key, value, options = {}) => {
  writeSessionValue(key, JSON.stringify(value), options);
};
