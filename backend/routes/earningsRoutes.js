// ════════════════════════════════════════════════════════════════════════════
// FILE 1: backend/routes/earningsRoutes.js
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const { protect, sellerAuth } = require('../middleware/auth');
const { adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');
const {
  getMyEarnings, requestPayout, getMyPayouts,
  getAdminPayouts, adminMarkPayoutPaid,
} = require('../controllers/earningsController');

const router = express.Router();
const requireAdminStepUp = (action) => [
  requireSensitiveActionToken(action),
  requireTwoFactorForAction(action),
];
const payoutRequestLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.PAYOUT_REQUEST_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.PAYOUT_REQUEST_RATE_LIMIT_MAX, 6),
  prefix: 'payout-request',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many payout requests. Please wait a moment and try again.',
});

// Seller
router.get('/earnings',               sellerAuth, getMyEarnings);
router.post('/earnings/request-payout', sellerAuth, payoutRequestLimiter, requestPayout);
router.get('/payouts',                sellerAuth, getMyPayouts);

// Admin
router.get('/admin/payouts',                    adminOrCoAdminAuth, getAdminPayouts);
router.patch('/admin/payouts/:id/mark-paid',    adminAuth,          ...requireAdminStepUp('admin_mark_payout_paid'), adminMarkPayoutPaid);

module.exports = router;
