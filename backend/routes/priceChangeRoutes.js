const express = require('express');
const { sellerAuth, adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
const {
  createPriceChangeRequest,
  getSellerPriceChangeRequests,
  cancelSellerPriceChangeRequest,
  getAdminPriceChangeRequests,
  approvePriceChangeRequest,
  rejectPriceChangeRequest,
} = require('../controllers/priceChangeController');

const router = express.Router();
const requireAdminStepUp = (action) => [
  requireSensitiveActionToken(action),
  requireTwoFactorForAction(action),
];

router.post('/seller', sellerAuth, createPriceChangeRequest);
router.get('/seller', sellerAuth, getSellerPriceChangeRequests);
router.patch('/seller/:id/cancel', sellerAuth, cancelSellerPriceChangeRequest);

router.get('/admin', adminOrCoAdminAuth, getAdminPriceChangeRequests);
router.patch('/admin/:id/approve', adminAuth, ...requireAdminStepUp('admin_review_price_change'), approvePriceChangeRequest);
router.patch('/admin/:id/reject', adminAuth, ...requireAdminStepUp('admin_review_price_change'), rejectPriceChangeRequest);

module.exports = router;
