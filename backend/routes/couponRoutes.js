const express = require('express');
const { protect, sellerAuth } = require('../middleware/auth');
const {
  createRedisBackedRateLimiter,
  getUserOrIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');
const {
  createCoupon, validateCoupon,
  getSellerCoupons, toggleCoupon, deleteCoupon,
} = require('../controllers/couponController');

const router = express.Router();
const couponValidateLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.COUPON_VALIDATE_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.COUPON_VALIDATE_RATE_LIMIT_MAX, 20),
  prefix: 'coupon-validate',
  keyGenerator: getUserOrIpRateLimitKey,
  message: 'Too many coupon validation attempts. Please wait a moment and try again.',
});

// ── Authenticated (any logged-in user can validate a coupon at checkout) ───────
router.post('/validate', protect, couponValidateLimiter, validateCoupon);

// ── Seller ────────────────────────────────────────────────────────────────────
router.post('/',          sellerAuth, createCoupon);
router.get('/seller',     sellerAuth, getSellerCoupons);
router.patch('/:id/toggle', sellerAuth, toggleCoupon);
router.delete('/:id',     sellerAuth, deleteCoupon);

module.exports = router;
