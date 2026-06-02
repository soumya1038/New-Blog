const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createPaymentOrder,
  verifyPayment,
  razorpayWebhook,
  getDownloadUrl,
} = require('../controllers/paymentController');

const router = express.Router();

// ── CRITICAL: webhook must use raw body — mounted with express.raw() in server.js ──
router.post('/webhook/razorpay', razorpayWebhook);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.post('/create-order',  protect, createPaymentOrder);
router.post('/verify',        protect, verifyPayment);
router.get('/orders/:id/download/:productId', protect, getDownloadUrl);

module.exports = router;
