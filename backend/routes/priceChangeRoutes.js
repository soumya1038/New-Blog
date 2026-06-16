const express = require('express');
const { sellerAuth, adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const {
  createPriceChangeRequest,
  getSellerPriceChangeRequests,
  cancelSellerPriceChangeRequest,
  getAdminPriceChangeRequests,
  approvePriceChangeRequest,
  rejectPriceChangeRequest,
} = require('../controllers/priceChangeController');

const router = express.Router();

router.post('/seller', sellerAuth, createPriceChangeRequest);
router.get('/seller', sellerAuth, getSellerPriceChangeRequests);
router.patch('/seller/:id/cancel', sellerAuth, cancelSellerPriceChangeRequest);

router.get('/admin', adminOrCoAdminAuth, getAdminPriceChangeRequests);
router.patch('/admin/:id/approve', adminAuth, approvePriceChangeRequest);
router.patch('/admin/:id/reject', adminAuth, rejectPriceChangeRequest);

module.exports = router;
