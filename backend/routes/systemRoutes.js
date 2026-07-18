const express = require('express');
const axios = require('axios');
const { adminOrCoAdminAuth } = require('../middleware/auth');
const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');
const {
  getBackgroundRemovalProvider,
  getBackgroundRemovalServiceBaseUrl,
  getBackgroundRemovalTimeoutMs,
  getRemoveBgAccountUrl,
} = require('../utils/backgroundRemovalConfig');

const router = express.Router();

const bgRemoverWarmupLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.BG_REMOVER_WARMUP_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  max: toPositiveInt(process.env.BG_REMOVER_WARMUP_RATE_LIMIT_MAX, 3),
  prefix: 'bg-remover-warmup',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many background-remover warmup checks. Please wait and try again.',
  responseBuilder: ({ retryAfterSeconds }) => ({
    success: false,
    status: 'rate_limited',
    retryAfterSeconds,
  }),
});

router.get('/bg-remover/warmup', adminOrCoAdminAuth, bgRemoverWarmupLimiter, async (req, res) => {
  const provider = getBackgroundRemovalProvider();
  const timeout = getBackgroundRemovalTimeoutMs();

  if (provider === 'removebg') {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    const accountUrl = getRemoveBgAccountUrl();

    if (!apiKey) {
      return res.json({ success: false, status: 'not_configured' });
    }

    try {
      await axios.get(accountUrl, {
        headers: { 'X-Api-Key': apiKey },
        timeout,
      });
      return res.json({ success: true, status: 'warm', provider });
    } catch (error) {
      return res.json({ success: false, status: 'cold_or_unavailable', provider });
    }
  }

  const serviceUrl = getBackgroundRemovalServiceBaseUrl();
  const apiKey = process.env.BG_REMOVER_API_KEY;

  if (!serviceUrl || !apiKey) {
    return res.json({ success: false, status: 'not_configured' });
  }

  try {
    await axios.get(`${serviceUrl}/health`, {
      headers: { 'x-api-key': apiKey },
      timeout,
    });
    return res.json({ success: true, status: 'warm', provider });
  } catch (error) {
    return res.json({ success: false, status: 'cold_or_unavailable', provider });
  }
});

module.exports = router;
