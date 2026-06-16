// ════════════════════════════════════════════════════════════════════════════
// FILE 1: backend/routes/earningsRoutes.js
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const { protect, sellerAuth } = require('../middleware/auth');
const { adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const {
  getMyEarnings, requestPayout, getMyPayouts,
  getAdminPayouts, adminMarkPayoutPaid,
} = require('../controllers/earningsController');

const router = express.Router();

// Seller
router.get('/earnings',               sellerAuth, getMyEarnings);
router.post('/earnings/request-payout', sellerAuth, requestPayout);
router.get('/payouts',                sellerAuth, getMyPayouts);

// Admin
router.get('/admin/payouts',                    adminOrCoAdminAuth, getAdminPayouts);
router.patch('/admin/payouts/:id/mark-paid',    adminAuth,          adminMarkPayoutPaid);

module.exports = router;
