const express = require('express');
const { protect, sellerAuth } = require('../middleware/auth');
const {
  getMyOrders, getOrderById,
  getSellerOrders, markShipped,
  completeOrder, deliverService,
} = require('../controllers/orderController');

const router = express.Router();

// ── Buyer ─────────────────────────────────────────────────────────────────────
router.get('/',         protect, getMyOrders);
router.get('/:id',      protect, getOrderById);
router.patch('/:id/complete', protect, completeOrder);

// ── Seller ────────────────────────────────────────────────────────────────────
router.get('/seller/orders',               sellerAuth, getSellerOrders);
router.patch('/seller/orders/:id/ship',    sellerAuth, markShipped);
router.patch('/seller/orders/:id/deliver', sellerAuth, deliverService);

module.exports = router;
