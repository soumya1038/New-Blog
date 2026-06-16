const Order           = require('../models/Order');
const Product         = require('../models/Product');
const Coupon          = require('../models/Coupon');
const Razorpay        = require('razorpay');
const { enqueueEmailJob } = require('../jobs/queueService');
const { reverseEarningsForOrder } = require('./earningsController');

const razorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET /api/orders
exports.getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { buyerId: req.user._id };
    if (status) query.status = status;
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('items.productId', 'title thumbnail slug type digital.maxDownloads'),
      Order.countDocuments(query),
    ]);
    res.json({ success: true, orders, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId',         'username name profileImage')
      .populate('items.productId', 'title thumbnail slug type digital.maxDownloads')
      .populate('items.sellerId',  'username name profileImage');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const isBuyer  = order.buyerId._id.toString() === req.user._id.toString();
    const isSeller = order.items.some(i => i.sellerId?._id?.toString() === req.user._id.toString());
    const isAdmin  = ['admin', 'coAdmin'].includes(req.user.role);
    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/orders
exports.getSellerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { 'items.sellerId': req.user._id };
    if (status) query.status = status;
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('buyerId', 'username name profileImage email'),
      Order.countDocuments(query),
    ]);
    res.json({ success: true, orders, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/seller/orders/:id/ship
exports.markShipped = async (req, res) => {
  try {
    const { trackingNumber, courier } = req.body;
    if (!trackingNumber || !courier) {
      return res.status(400).json({ success: false, message: 'Tracking number and courier are required.' });
    }
    const order = await Order.findOne({ _id: req.params.id, 'items.sellerId': req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['paid', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot ship an order with status "${order.status}".` });
    }
    order.status                  = 'shipped';
    order.shipping.trackingNumber = trackingNumber;
    order.shipping.courier        = courier;
    order.shipping.shippedAt      = new Date();
    await order.save();
    const io = req.app.get('io');
    io.to(`user:${order.buyerId}`).emit('notification:order_shipped', {
      message: `Your order ${order.orderNumber} has been shipped.`,
      orderNumber: order.orderNumber, trackingNumber, courier,
    });
    await enqueueEmailJob('buyer-order-shipped', {
      userId: order.buyerId.toString(), orderNumber: order.orderNumber, trackingNumber, courier,
    });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/orders/:id/complete  (buyer confirms receipt)
exports.completeOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be completed yet.' });
    }
    order.status = 'completed';
    order.shipping.deliveredAt = new Date();
    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/seller/orders/:id/deliver  (seller delivers service)
exports.deliverService = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, 'items.sellerId': req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['paid', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot deliver an order with status "${order.status}".` });
    }
    const hasSellerService = order.items.some(item => item.type === 'service' && item.sellerId.toString() === req.user._id.toString());
    if (!hasSellerService) return res.status(400).json({ success: false, message: 'This order has no service item for your store.' });
    order.status = 'delivered';
    order.shipping.deliveredAt = new Date();
    order.notes = req.body.note || order.notes;
    await order.save();
    const io = req.app.get('io');
    io.to(`user:${order.buyerId}`).emit('notification:order_delivered', {
      message: `Your order ${order.orderNumber} has been delivered.`,
      orderNumber: order.orderNumber,
    });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/orders/:id/cancel  (buyer cancels)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const cancellableStatuses = ['pending_payment', 'failed', 'paid', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order that is already ${order.status}. Contact support.`,
      });
    }

    for (const item of order.items.filter(i => i.type === 'physical')) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { 'physical.stock': item.qty },
      });
    }

    const wasFulfilled = !!order.payment?.paidAt || ['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status);
    if (wasFulfilled) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { 'stats.sales': -item.qty },
        });
      }

      if (order.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode, usedCount: { $gt: 0 } },
          {
            $inc: { usedCount: -1 },
            $pull: { usedBy: { orderId: order._id } },
          }
        );
      }

      await reverseEarningsForOrder(order._id);
    }

    let refundId = '';
    if (order.payment?.razorpayPaymentId && order.status !== 'pending_payment' && order.status !== 'failed') {
      try {
        const rzp = razorpay();
        const refund = await rzp.payments.refund(order.payment.razorpayPaymentId, {
          amount: Math.round(order.total * 100),
          notes: { reason: req.body.reason || 'Buyer cancelled order', orderId: order._id.toString() },
        });
        refundId = refund.id;
      } catch (rzpErr) {
        console.error('[cancelOrder] Razorpay refund failed:', rzpErr.message);
      }
    }

    order.status = 'cancelled';
    order.notes = `Cancelled by buyer. ${req.body.reason || ''} ${refundId ? 'Refund ID: ' + refundId : ''}`.trim();
    await order.save();

    const io = req.app.get('io');
    const sellerIds = [...new Set(order.items.map(i => i.sellerId.toString()))];
    for (const sid of sellerIds) {
      io.to(`user:${sid}`).emit('notification:order_cancelled', {
        message: `Order ${order.orderNumber} was cancelled by the buyer.`,
        orderNumber: order.orderNumber,
      });
    }

    res.json({
      success: true,
      order,
      refundInitiated: !!refundId,
      message: refundId
        ? `Order cancelled. Refund of Rs. ${order.total} initiated (may take 5-7 business days).`
        : 'Order cancelled.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/orders/:id  (buyer removes failed or unpaid order)
exports.deleteUnpaidOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const deletableStatuses = ['pending_payment', 'failed', 'cancelled'];
    if (!deletableStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Only failed, unpaid, or cancelled orders can be deleted.' });
    }
    if (['pending_payment', 'failed'].includes(order.status)) {
      for (const item of order.items.filter(i => i.type === 'physical')) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { 'physical.stock': item.qty },
        });
      }
    }
    await Order.deleteOne({ _id: order._id });
    res.json({ success: true, message: 'Order deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/seller/orders/:id/restock  (seller updates stock)
exports.restockProduct = async (req, res) => {
  try {
    const { productId, addStock } = req.body;
    if (!productId || !addStock || addStock < 1) {
      return res.status(400).json({ success: false, message: 'productId and addStock (≥1) are required.' });
    }
    const product = await Product.findOne({ _id: productId, sellerId: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.type !== 'physical') return res.status(400).json({ success: false, message: 'Only physical products can be restocked.' });

    product.physical.stock += parseInt(addStock);
    if (product.status === 'paused' && product.physical.stock > 0) {
      product.status = 'active'; // auto-reactivate if stock was 0
    }
    await product.save();
    res.json({ success: true, newStock: product.physical.stock, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  NEW: PATCH /api/admin/seller-revoke/:userId  (admin revokes seller badge)
// ─────────────────────────────────────────────────────────────────────────────
exports.revokeSeller = async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.isSeller         = false;
    user.sellerApprovedAt = null;
    await user.save();
    // Archive all their products
    await Product.updateMany({ sellerId: user._id, status: { $ne: 'archived' } }, { status: 'paused' });
    res.json({ success: true, message: `Seller badge revoked for @${user.username}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
