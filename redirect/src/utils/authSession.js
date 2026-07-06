const AUTH_USER_KEY = 'authUser';

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

const emitAuthSessionChanged = (detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('authSessionChanged', { detail }));
};

export const hasAuthToken = () => {
  if (typeof localStorage === 'undefined') return false;
  return Boolean(localStorage.getItem('token'));
};

export const getStoredAuthUser = () => {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? normalizeAuthUser(JSON.parse(raw)) : null;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export const storeAuthSession = ({ token, user, rememberMe = true }) => {
  if (!token) return null;

  const normalizedUser = normalizeAuthUser(user);
  localStorage.setItem('token', token);
  localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');

  if (normalizedUser) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }

  emitAuthSessionChanged({ user: normalizedUser });
  return normalizedUser;
};

export const clearAuthSession = () => {
  if (typeof localStorage === 'undefined') return;

  localStorage.removeItem('token');
  localStorage.removeItem('rememberMe');
  localStorage.removeItem(AUTH_USER_KEY);
  emitAuthSessionChanged({ user: null });
};
