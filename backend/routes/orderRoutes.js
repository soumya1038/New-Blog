const express = require('express');
const { protect, sellerAuth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/auth');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
const {
  getMyOrders, getOrderById,
  getSellerOrders, markShipped,
  completeOrder, deliverService,
  submitSellerFeedback, cancelOrder, deleteUnpaidOrder, restockProduct, revokeSeller,
} = require('../controllers/orderController');

const router = express.Router();
const requireAdminStepUp = (action) => [
  requireSensitiveActionToken(action),
  requireTwoFactorForAction(action),
];

// Static seller/admin namespaces must be registered before buyer /:id routes.
router.get('/seller/orders', sellerAuth, getSellerOrders);
router.patch('/seller/orders/:id/ship', sellerAuth, markShipped);
router.patch('/seller/orders/:id/deliver', sellerAuth, deliverService);
router.post('/seller/restock', sellerAuth, restockProduct);
router.patch('/admin/seller-revoke/:userId', adminAuth, ...requireAdminStepUp('admin_revoke_seller'), revokeSeller);

router.get('/', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/complete', protect, completeOrder);
router.post('/:id/seller-feedback', protect, submitSellerFeedback);
router.patch('/:id/cancel', protect, cancelOrder);
router.delete('/:id', protect, deleteUnpaidOrder);

module.exports = router;
