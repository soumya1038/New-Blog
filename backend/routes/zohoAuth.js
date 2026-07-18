const express = require('express');
const axios = require('axios');
const { logError } = require('../utils/safeErrorLog');
const { getOAuthProviderTimeoutMs } = require('../utils/providerTimeouts');
const {
  createRedisBackedRateLimiter,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');
const router = express.Router();

const ZOHO_AUTH_CODE_MAX_LENGTH = 2048;

const zohoSetupLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.ZOHO_OAUTH_SETUP_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.ZOHO_OAUTH_SETUP_RATE_LIMIT_MAX, 5),
  prefix: 'zoho-oauth-setup',
  message: 'Too many Zoho setup attempts. Please wait and try again.',
});

const isZohoSetupEnabled = () =>
  process.env.ZOHO_OAUTH_SETUP_ENABLED === 'true' && process.env.NODE_ENV !== 'production';

const normalizeAuthorizationCode = (value) => {
  const code = String(value || '').trim();
  if (!code || code.length > ZOHO_AUTH_CODE_MAX_LENGTH) return '';
  if (/[\s\0\r\n]/.test(code)) return '';
  return code;
};

const requireZohoSetupEnabled = (req, res, next) => {
  if (!isZohoSetupEnabled()) {
    return res.status(404).send('Not found');
  }
  return next();
};

// Zoho OAuth callback
router.get('/callback', requireZohoSetupEnabled, zohoSetupLimiter, async (req, res) => {
  const code = normalizeAuthorizationCode(req.query.code);

  if (!code) {
    return res.status(400).send('Authorization code missing or invalid');
  }

  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REDIRECT_URI) {
    return res.status(500).send('Zoho OAuth setup is not configured');
  }

  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        code,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: process.env.ZOHO_REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      timeout: getOAuthProviderTimeoutMs()
    });

    const { refresh_token } = response.data;

    res.json({
      success: true,
      message: refresh_token
        ? 'Zoho OAuth code exchanged successfully. Store the refresh token through a secure setup channel; this endpoint does not return secrets.'
        : 'Zoho OAuth code exchanged, but no refresh token was returned. Re-check the requested scopes and access type.',
      hasRefreshToken: Boolean(refresh_token)
    });
  } catch (error) {
    logError('Zoho OAuth error:', error);
    res.status(500).send('OAuth failed');
  }
});

module.exports = router;
