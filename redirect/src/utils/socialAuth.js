import axios from 'axios';
import { getOAuthRedirectUri } from './oauthRedirects';
import { isNativeApp } from './nativeApp';

const API = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const RETRY_UNTIL_KEY = 'lekhon:social-auth-retry-until';

const PROVIDER_LABELS = {
  google: 'Google',
  facebook: 'Facebook',
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
};

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch (error) {
    return null;
  }
};

const formatRetryDelay = (seconds) => {
  const totalSeconds = Number(seconds);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '';
  if (totalSeconds < 60) {
    const rounded = Math.ceil(totalSeconds);
    return `${rounded} second${rounded === 1 ? '' : 's'}`;
  }
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const getStoredRetrySeconds = () => {
  const storage = getSessionStorage();
  if (!storage) return 0;

  const retryUntil = Number(storage.getItem(RETRY_UNTIL_KEY) || 0);
  if (!Number.isFinite(retryUntil) || retryUntil <= Date.now()) {
    storage.removeItem(RETRY_UNTIL_KEY);
    return 0;
  }

  return Math.ceil((retryUntil - Date.now()) / 1000);
};

const storeRetrySeconds = (seconds) => {
  const totalSeconds = Number(seconds);
  const storage = getSessionStorage();
  if (!storage || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return;
  storage.setItem(RETRY_UNTIL_KEY, String(Date.now() + totalSeconds * 1000));
};

const getRetryAfterSeconds = (response) => {
  const dataSeconds = Number(response?.data?.retryAfterSeconds);
  if (Number.isFinite(dataSeconds) && dataSeconds > 0) return Math.ceil(dataSeconds);

  const retryAfter = response?.headers?.['retry-after'];
  const headerSeconds = Number(retryAfter);
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) return Math.ceil(headerSeconds);

  const retryDate = Date.parse(retryAfter || '');
  if (Number.isFinite(retryDate)) {
    return Math.max(1, Math.ceil((retryDate - Date.now()) / 1000));
  }

  return 0;
};

const buildRateLimitMessage = (seconds) => {
  const retryDelay = formatRetryDelay(seconds);
  return retryDelay
    ? `Too many sign-in attempts. Please wait ${retryDelay} before trying again.`
    : 'Too many sign-in attempts. Please wait a few minutes before trying again.';
};

const createRateLimitError = (seconds) => {
  const error = new Error(buildRateLimitMessage(seconds));
  error.status = 429;
  error.retryAfterSeconds = seconds;
  return error;
};

const createSocialAuthError = (provider, response) => {
  const retryAfterSeconds = getRetryAfterSeconds(response);
  const status = response?.status;

  if (status === 429) {
    storeRetrySeconds(retryAfterSeconds);
    return createRateLimitError(retryAfterSeconds);
  }

  const label = PROVIDER_LABELS[provider] || 'Social';
  const serverMessage = response?.data?.message;
  const message = serverMessage
    ? `${label} sign-in could not start. ${serverMessage}`
    : `${label} sign-in could not start. Please try again.`;

  const error = new Error(message);
  error.status = status;
  return error;
};

const createSocialAuthUnavailableError = (provider) => {
  const label = PROVIDER_LABELS[provider] || 'Social';
  return new Error(`${label} sign-in could not start. Please check your connection and try again.`);
};

export const requestSocialAuthUrl = async (provider) => {
  const retrySeconds = getStoredRetrySeconds();
  if (retrySeconds > 0) {
    throw createRateLimitError(retrySeconds);
  }

  const redirectUri = getOAuthRedirectUri(provider);
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    format: 'json',
    r: String(Date.now()),
  });
  if (isNativeApp()) {
    params.set('native_app', '1');
  }

  let response;
  try {
    response = await axios.get(`${API}/api/auth/${provider}/start?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      validateStatus: () => true,
    });
  } catch (error) {
    if (error?.response) {
      throw createSocialAuthError(provider, error.response);
    }
    throw createSocialAuthUnavailableError(provider);
  }

  const authUrl = response?.data?.authUrl;
  if (response.status >= 200 && response.status < 300 && authUrl) {
    return authUrl;
  }

  throw createSocialAuthError(provider, response);
};
