const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { optionalAuth, protect, adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const { createRedisRateLimitStore } = require('../utils/redisRateLimitStore');
const {
  requireSensitiveActionToken,
  requireTwoFactorForAction,
} = require('../utils/twoFactor');
const {
  createSupportRequest,
  getMySupportRequests,
  getAdminSupportRequests,
  getAdminSupportMetrics,
  updateAdminSupportRequest,
} = require('../controllers/supportController');

const router = express.Router();
const requireAdminStepUp = (action) => [
  requireSensitiveActionToken(action),
  requireTwoFactorForAction(action),
];

const { ipKeyGenerator } = rateLimit;

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const supportSubmitWindowMs = toPositiveInt(
  process.env.SUPPORT_SUBMIT_RATE_LIMIT_WINDOW_MS,
  60 * 60 * 1000
);
const supportSubmitMax = toPositiveInt(process.env.SUPPORT_SUBMIT_RATE_LIMIT_MAX, 8);
const supportRateLimitFailOpen =
  process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_FAIL_OPEN === 'true';

const hashLimiterValue = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32);

const getSupportSubmitKey = (req) => {
  if (req.user?._id) return `user:${req.user._id}`;

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email) return `email:${hashLimiterValue(email)}`;

  return `ip:${ipKeyGenerator(req.ip || '')}`;
};

const getRetryAfterSeconds = (req) => {
  const resetTime = req.rateLimit?.resetTime;
  const resetMs = resetTime instanceof Date ? resetTime.getTime() : Number(resetTime);
  const resetSeconds = Number.isFinite(resetMs) ? Math.ceil((resetMs - Date.now()) / 1000) : 0;
  return Math.max(1, resetSeconds || Math.ceil(supportSubmitWindowMs / 1000));
};

const supportSubmitStore = createRedisRateLimitStore({
  prefix: 'support-submit',
  windowMs: supportSubmitWindowMs,
});

const submitLimiter = rateLimit({
  windowMs: supportSubmitWindowMs,
  max: supportSubmitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getSupportSubmitKey,
  passOnStoreError: Boolean(supportSubmitStore) && supportRateLimitFailOpen,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: 'Too many support requests were submitted. Please wait and try again.',
      retryAfterSeconds,
    });
  },
  ...(supportSubmitStore ? { store: supportSubmitStore } : {}),
});

router.post('/requests', optionalAuth, submitLimiter, createSupportRequest);
router.get('/requests/me', protect, getMySupportRequests);
router.get('/admin/metrics', adminOrCoAdminAuth, getAdminSupportMetrics);
router.get('/admin/requests', adminOrCoAdminAuth, getAdminSupportRequests);
router.patch(
  '/admin/requests/:id',
  adminAuth,
  ...requireAdminStepUp('admin_update_support_request'),
  updateAdminSupportRequest
);

module.exports = router;


