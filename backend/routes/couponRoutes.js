const express = require('express');
const { protect, sellerAuth } = require('../middleware/auth');
const {
  createCoupon, validateCoupon,
  getSellerCoupons, toggleCoupon, deleteCoupon,
} = require('../controllers/couponController');

const router = express.Router();

// ── Authenticated (any logged-in user can validate a coupon at checkout) ───────
router.post('/validate', protect, validateCoupon);

// ── Seller ────────────────────────────────────────────────────────────────────
router.post('/',          sellerAuth, createCoupon);
router.get('/seller',     sellerAuth, getSellerCoupons);
router.patch('/:id/toggle', sellerAuth, toggleCoupon);
router.delete('/:id',     sellerAuth, deleteCoupon);

module.exports = router;
