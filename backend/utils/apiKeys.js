const crypto = require('crypto');
const { getDedicatedSecret } = require('./secrets');

const normalizeApiKey = (apiKey = '') => String(apiKey || '').trim();

const getApiKeyHashSecret = () =>
  getDedicatedSecret({ key: 'API_KEY_HASH_SECRET' });

const hashApiKey = (apiKey) =>
  crypto
    .createHmac('sha256', getApiKeyHashSecret())
    .update(normalizeApiKey(apiKey))
    .digest('hex');

const createApiKeyRecord = (name, rawApiKey) => ({
  name: String(name || '').trim(),
  keyHash: hashApiKey(rawApiKey),
  keyPrefix: normalizeApiKey(rawApiKey).slice(0, 8),
  keyLast4: normalizeApiKey(rawApiKey).slice(-4),
  keyVersion: 2,
  createdAt: new Date(),
});

const maskApiKey = (apiKey = {}) => {
  const rawKey = normalizeApiKey(apiKey.key);
  const keyPrefix = apiKey.keyPrefix || (rawKey ? rawKey.slice(0, 8) : '');
  const keyLast4 = apiKey.keyLast4 || (rawKey ? rawKey.slice(-4) : '');

  return {
    _id: apiKey._id,
    name: apiKey.name || 'Unnamed API Key',
    createdAt: apiKey.createdAt,
    keyPreview: keyPrefix && keyLast4 ? `${keyPrefix}...${keyLast4}` : '',
  };
};

const upgradeLegacyApiKeyRecord = (apiKeyRecord, rawApiKey) => {
  const normalized = normalizeApiKey(rawApiKey);
  apiKeyRecord.keyHash = hashApiKey(normalized);
  apiKeyRecord.keyPrefix = normalized.slice(0, 8);
  apiKeyRecord.keyLast4 = normalized.slice(-4);
  apiKeyRecord.keyVersion = 2;
  apiKeyRecord.key = undefined;
};

module.exports = {
  createApiKeyRecord,
  hashApiKey,
  maskApiKey,
  normalizeApiKey,
  upgradeLegacyApiKeyRecord,
};
