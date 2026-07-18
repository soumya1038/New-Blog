const { normalizeHttpUrl } = require('./safeUrls');

const DEFAULT_BACKGROUND_REMOVAL_PROVIDER = 'removebg';
const DEFAULT_REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg';
const DEFAULT_REMOVE_BG_ACCOUNT_URL = 'https://api.remove.bg/v1.0/account';
const DEFAULT_BACKGROUND_REMOVAL_TIMEOUT_MS = 45000;
const MIN_BACKGROUND_REMOVAL_TIMEOUT_MS = 1000;
const MAX_BACKGROUND_REMOVAL_TIMEOUT_MS = 60000;
const BACKGROUND_REMOVAL_PROVIDERS = new Set(['removebg', 'service']);

const parseBoundedInteger = (value, fallback, min, max) => {
  const parsed = Number(String(value || '').trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
};

const getBackgroundRemovalProvider = (env = process.env) => {
  const provider = String(env.BACKGROUND_REMOVAL_PROVIDER || DEFAULT_BACKGROUND_REMOVAL_PROVIDER)
    .trim()
    .toLowerCase();
  return BACKGROUND_REMOVAL_PROVIDERS.has(provider) ? provider : DEFAULT_BACKGROUND_REMOVAL_PROVIDER;
};

const isBackgroundRemovalEnabled = (env = process.env) =>
  String(env.BACKGROUND_REMOVAL_ENABLED || '').trim().toLowerCase() === 'true';

const getBackgroundRemovalTimeoutMs = (env = process.env) =>
  parseBoundedInteger(
    env.REMOVE_BG_TIMEOUT_MS || env.BG_REMOVER_TIMEOUT_MS,
    DEFAULT_BACKGROUND_REMOVAL_TIMEOUT_MS,
    MIN_BACKGROUND_REMOVAL_TIMEOUT_MS,
    MAX_BACKGROUND_REMOVAL_TIMEOUT_MS
  );

const normalizeConfiguredHttpUrl = (value = '') =>
  normalizeHttpUrl(value, { allowBareDomain: false, maxLength: 2048 });

const getRemoveBgApiUrl = (env = process.env) =>
  normalizeConfiguredHttpUrl(env.REMOVE_BG_API_URL) || DEFAULT_REMOVE_BG_API_URL;

const getRemoveBgAccountUrl = (env = process.env) =>
  normalizeConfiguredHttpUrl(env.REMOVE_BG_ACCOUNT_URL) || DEFAULT_REMOVE_BG_ACCOUNT_URL;

const getBackgroundRemovalServiceBaseUrl = (env = process.env) =>
  normalizeConfiguredHttpUrl(env.BG_REMOVER_URL).replace(/\/+$/, '');

module.exports = {
  BACKGROUND_REMOVAL_PROVIDERS,
  DEFAULT_BACKGROUND_REMOVAL_TIMEOUT_MS,
  DEFAULT_REMOVE_BG_ACCOUNT_URL,
  DEFAULT_REMOVE_BG_API_URL,
  MAX_BACKGROUND_REMOVAL_TIMEOUT_MS,
  MIN_BACKGROUND_REMOVAL_TIMEOUT_MS,
  getBackgroundRemovalProvider,
  getBackgroundRemovalServiceBaseUrl,
  getBackgroundRemovalTimeoutMs,
  getRemoveBgAccountUrl,
  getRemoveBgApiUrl,
  isBackgroundRemovalEnabled,
};
