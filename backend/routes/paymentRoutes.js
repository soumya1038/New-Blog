const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const { createRedisRateLimitStore } = require('../utils/redisRateLimitStore');
const {
  createPaymentOrder,
  verifyPayment,
  razorpayWebhook,
  getDownloadUrl,
} = require('../controllers/paymentController');

const router = express.Router();

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const { ipKeyGenerator } = rateLimit;
const paymentRateLimitFailOpen =
  process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_FAIL_OPEN === 'true';

const getRetryAfterSeconds = (req, fallbackMs) => {
  const resetTime = req.rateLimit?.resetTime;
  const resetMs = resetTime instanceof Date ? resetTime.getTime() : Number(resetTime);
  const resetSeconds = Number.isFinite(resetMs) ? Math.ceil((resetMs - Date.now()) / 1000) : 0;
  return Math.max(1, resetSeconds || Math.ceil(fallbackMs / 1000));
};

const getIpKey = (req) => `ip:${ipKeyGenerator(req.ip || '')}`;
const getPaymentActionKey = (req) => (req.user?._id ? `user:${req.user._id}` : getIpKey(req));

const createPaymentLimiter = ({ windowMs, max, prefix, message, keyGenerator, exposeMessage = true }) => {
  const store = createRedisRateLimitStore({ prefix, windowMs });
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    passOnStoreError: Boolean(store) && paymentRateLimitFailOpen,
    handler: (req, res) => {
      const retryAfterSeconds = getRetryAfterSeconds(req, windowMs);
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        ...(exposeMessage ? { message } : {}),
        retryAfterSeconds,
      });
    },
    ...(store ? { store } : {}),
  });
};

const paymentActionWindowMs = toPositiveInt(
  process.env.PAYMENT_ACTION_RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);
const paymentWebhookWindowMs = toPositiveInt(
  process.env.PAYMENT_WEBHOOK_RATE_LIMIT_WINDOW_MS,
  60 * 1000
);

const paymentActionLimiter = createPaymentLimiter({
  windowMs: paymentActionWindowMs,
  max: toPositiveInt(process.env.PAYMENT_ACTION_RATE_LIMIT_MAX, 60),
  prefix: 'payment-action',
  message: 'Too many payment requests. Please wait a moment and try again.',
  keyGenerator: getPaymentActionKey,
});

const paymentWebhookLimiter = createPaymentLimiter({
  windowMs: paymentWebhookWindowMs,
  max: toPositiveInt(process.env.PAYMENT_WEBHOOK_RATE_LIMIT_MAX, 300),
  prefix: 'payment-webhook',
  message: 'Too many webhook requests.',
  keyGenerator: getIpKey,
  exposeMessage: false,
});

// Critical: webhook must use raw body mounted with express.raw() in server.js.
router.post('/webhook/razorpay', paymentWebhookLimiter, razorpayWebhook);

// Authenticated payment actions.
router.post('/create-order', protect, paymentActionLimiter, createPaymentOrder);
router.post('/verify', protect, paymentActionLimiter, verifyPayment);
router.get('/orders/:id/download/:productId', protect, paymentActionLimiter, getDownloadUrl);

module.exports = router;
