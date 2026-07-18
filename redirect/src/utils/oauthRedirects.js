import { isNativeApp } from './nativeApp';

const DEFAULT_NATIVE_APP_ORIGIN = 'https://lekhon-development.netlify.app';

const NATIVE_REDIRECT_URIS = {
  google: process.env.REACT_APP_NATIVE_GOOGLE_REDIRECT_URI,
  facebook: process.env.REACT_APP_NATIVE_FACEBOOK_REDIRECT_URI,
  twitter: process.env.REACT_APP_NATIVE_TWITTER_REDIRECT_URI,
  linkedin: process.env.REACT_APP_NATIVE_LINKEDIN_REDIRECT_URI,
};

const NATIVE_REDIRECT_ORIGIN = process.env.REACT_APP_NATIVE_REDIRECT_ORIGIN;
const SUPPORTED_PROVIDERS = new Set(Object.keys(NATIVE_REDIRECT_URIS));

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

const readConfiguredValue = (value) => String(value || '').trim();

const getNativeAppOrigin = () => {
  const configured = normalizeRedirectUri(readConfiguredValue(NATIVE_REDIRECT_ORIGIN));
  return configured || DEFAULT_NATIVE_APP_ORIGIN;
};

export const getOAuthRedirectUri = (provider) => {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(normalizedProvider)) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  if (isNativeApp()) {
    const nativeConfigured = normalizeRedirectUri(readConfiguredValue(NATIVE_REDIRECT_URIS[normalizedProvider]));
    if (nativeConfigured) return nativeConfigured;

    return `${getNativeAppOrigin()}/auth/${normalizedProvider}/callback`;
  }

  return `${window.location.origin}/auth/${normalizedProvider}/callback`;
};
