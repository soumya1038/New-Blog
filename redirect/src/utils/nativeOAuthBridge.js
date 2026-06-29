import { isNativeApp } from './nativeApp';

const PROVIDERS = new Set(['google', 'facebook', 'twitter', 'linkedin']);
const NATIVE_CALLBACK_SCHEME = 'com.lekhon.app';

const decodeJwtPayload = (token = '') => {
  const payload = String(token || '').split('.')[1];
  if (!payload) return null;

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );
    return JSON.parse(window.atob(paddedPayload));
  } catch {
    return null;
  }
};

const isAndroidBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const redirectOAuthCallbackToNativeApp = (provider, params) => {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  if (!PROVIDERS.has(normalizedProvider) || isNativeApp() || !isAndroidBrowser()) {
    return false;
  }

  const callbackParams = params instanceof URLSearchParams
    ? new URLSearchParams(params.toString())
    : new URLSearchParams(window.location.search);
  const state = callbackParams.get('state') || '';
  const statePayload = decodeJwtPayload(state);

  if (!statePayload?.returnToNativeApp) {
    return false;
  }

  const codeOrError = callbackParams.get('code') || callbackParams.get('error') || 'no_code';
  const bridgeKey = `lekhon_native_oauth_bridge:${normalizedProvider}:${codeOrError}:${state || 'no_state'}`;
  if (sessionStorage.getItem(bridgeKey) === '1') {
    return false;
  }

  sessionStorage.setItem(bridgeKey, '1');
  callbackParams.set('native_bridge', '1');
  window.location.replace(`${NATIVE_CALLBACK_SCHEME}://auth/${normalizedProvider}/callback?${callbackParams.toString()}`);
  return true;
};
