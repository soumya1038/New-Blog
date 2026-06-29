import { isNativeApp } from './nativeApp';

const DEFAULT_NATIVE_APP_ORIGIN = 'https://lekhon-development.netlify.app';

const REDIRECT_ENV_KEYS = {
  google: 'REACT_APP_GOOGLE_REDIRECT_URI',
  facebook: 'REACT_APP_FACEBOOK_REDIRECT_URI',
  twitter: 'REACT_APP_TWITTER_REDIRECT_URI',
  linkedin: 'REACT_APP_LINKEDIN_REDIRECT_URI',
};

const NATIVE_REDIRECT_ENV_KEYS = {
  google: 'REACT_APP_NATIVE_GOOGLE_REDIRECT_URI',
  facebook: 'REACT_APP_NATIVE_FACEBOOK_REDIRECT_URI',
  twitter: 'REACT_APP_NATIVE_TWITTER_REDIRECT_URI',
  linkedin: 'REACT_APP_NATIVE_LINKEDIN_REDIRECT_URI',
};

const normalizeRedirectUri = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const origin = parsed.origin === 'null' ? `${parsed.protocol}//${parsed.host}` : parsed.origin;
    return `${origin}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return '';
  }
};

const isDesktopLocalRedirect = (value = '') => {
  try {
    const parsed = new URL(value);
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
    return parsed.protocol === 'http:' && localHosts.has(parsed.hostname) && Boolean(parsed.port);
  } catch {
    return false;
  }
};

const readEnvValue = (key) => String(process.env[key] || '').trim();

const getNativeAppOrigin = () => {
  const configured = normalizeRedirectUri(readEnvValue('REACT_APP_NATIVE_REDIRECT_ORIGIN'));
  return configured || DEFAULT_NATIVE_APP_ORIGIN;
};

export const getOAuthRedirectUri = (provider) => {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  if (!REDIRECT_ENV_KEYS[normalizedProvider]) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  if (isNativeApp()) {
    const nativeConfigured = normalizeRedirectUri(readEnvValue(NATIVE_REDIRECT_ENV_KEYS[normalizedProvider]));
    if (nativeConfigured) return nativeConfigured;

    const configured = normalizeRedirectUri(readEnvValue(REDIRECT_ENV_KEYS[normalizedProvider]));
    if (configured && !isDesktopLocalRedirect(configured)) return configured;

    return `${getNativeAppOrigin()}/auth/${normalizedProvider}/callback`;
  }

  const configured = normalizeRedirectUri(readEnvValue(REDIRECT_ENV_KEYS[normalizedProvider]));
  if (configured) return configured;

  return `${window.location.origin}/auth/${normalizedProvider}/callback`;
};
