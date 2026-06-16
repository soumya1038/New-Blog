const express = require('express');
const { protect, sellerAuth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/auth');
const {
  getMyOrders, getOrderById,
  getSellerOrders, markShipped,
  completeOrder, deliverService,
  cancelOrder, deleteUnpaidOrder, restockProduct, revokeSeller,
} = require('../controllers/orderController');

const router = express.Router();

// ── Buyer ─────────────────────────────────────────────────────────────────────
router.get('/',                protect, getMyOrders);
router.get('/:id',             protect, getOrderById);
router.patch('/:id/complete',  protect, completeOrder);
router.patch('/:id/cancel',    protect, cancelOrder);      // NEW
router.delete('/:id',          protect, deleteUnpaidOrder);

// ── Seller ────────────────────────────────────────────────────────────────────
router.get('/seller/orders',                  sellerAuth, getSellerOrders);
router.patch('/seller/orders/:id/ship',       sellerAuth, markShipped);
router.patch('/seller/orders/:id/deliver',    sellerAuth, deliverService);
router.post('/seller/restock',                sellerAuth, restockProduct);  // NEW

// ── Admin ─────────────────────────────────────────────────────────────────────
router.patch('/admin/seller-revoke/:userId',  adminAuth, revokeSeller);    // NEW

module.exports = router;
