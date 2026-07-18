const DEFAULT_OAUTH_PROVIDER_TIMEOUT_MS = 10000;
const MIN_OAUTH_PROVIDER_TIMEOUT_MS = 1000;
const MAX_OAUTH_PROVIDER_TIMEOUT_MS = 60000;
const DEFAULT_RAZORPAY_PROVIDER_TIMEOUT_MS = 15000;
const MIN_RAZORPAY_PROVIDER_TIMEOUT_MS = 1000;
const MAX_RAZORPAY_PROVIDER_TIMEOUT_MS = 60000;
const DEFAULT_LIVEKIT_PROVIDER_TIMEOUT_MS = 10000;
const MIN_LIVEKIT_PROVIDER_TIMEOUT_MS = 1000;
const MAX_LIVEKIT_PROVIDER_TIMEOUT_MS = 60000;

const parseBoundedInteger = (value, fallback, min, max) => {
  const parsed = Number(String(value || '').trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
};

const getOAuthProviderTimeoutMs = (env = process.env) =>
  parseBoundedInteger(
    env.OAUTH_PROVIDER_TIMEOUT_MS,
    DEFAULT_OAUTH_PROVIDER_TIMEOUT_MS,
    MIN_OAUTH_PROVIDER_TIMEOUT_MS,
    MAX_OAUTH_PROVIDER_TIMEOUT_MS
  );

const getRazorpayProviderTimeoutMs = (env = process.env) =>
  parseBoundedInteger(
    env.RAZORPAY_PROVIDER_TIMEOUT_MS,
    DEFAULT_RAZORPAY_PROVIDER_TIMEOUT_MS,
    MIN_RAZORPAY_PROVIDER_TIMEOUT_MS,
    MAX_RAZORPAY_PROVIDER_TIMEOUT_MS
  );

const getLiveKitProviderTimeoutMs = (env = process.env) =>
  parseBoundedInteger(
    env.LIVEKIT_PROVIDER_TIMEOUT_MS,
    DEFAULT_LIVEKIT_PROVIDER_TIMEOUT_MS,
    MIN_LIVEKIT_PROVIDER_TIMEOUT_MS,
    MAX_LIVEKIT_PROVIDER_TIMEOUT_MS
  );

const withProviderTimeout = (promise, label, timeoutMs) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`${label} timed out after ${timeoutMs}ms`);
      error.code = 'PROVIDER_TIMEOUT';
      error.statusCode = 503;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeout])
    .finally(() => clearTimeout(timeoutId));
};

module.exports = {
  DEFAULT_LIVEKIT_PROVIDER_TIMEOUT_MS,
  DEFAULT_OAUTH_PROVIDER_TIMEOUT_MS,
  DEFAULT_RAZORPAY_PROVIDER_TIMEOUT_MS,
  MAX_LIVEKIT_PROVIDER_TIMEOUT_MS,
  MAX_OAUTH_PROVIDER_TIMEOUT_MS,
  MAX_RAZORPAY_PROVIDER_TIMEOUT_MS,
  MIN_LIVEKIT_PROVIDER_TIMEOUT_MS,
  MIN_OAUTH_PROVIDER_TIMEOUT_MS,
  MIN_RAZORPAY_PROVIDER_TIMEOUT_MS,
  getLiveKitProviderTimeoutMs,
  getOAuthProviderTimeoutMs,
  getRazorpayProviderTimeoutMs,
  withProviderTimeout,
};
