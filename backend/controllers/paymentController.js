const Razorpay        = require('razorpay');
const crypto          = require('crypto');
const mongoose        = require('mongoose');
const Order           = require('../models/Order');
const Product         = require('../models/Product');
const Coupon          = require('../models/Coupon');
const Cart            = require('../models/Cart');
const cloudinary      = require('../utils/cloudinary');
const { enqueueEmailJob } = require('../jobs/queueService');
const { reverseEarningsForOrder } = require('./earningsController');
const { enqueueOrderFulfillment } = require('../services/marketplaceFulfillmentService');
const {
  calculateCouponApplication,
  normalizeCouponCode,
} = require('../utils/couponRules');

const razorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Fee configuration — single source of truth, always from env
const COMMISSION_RATE  = () => parseFloat(process.env.COMMISSION_RATE           || '0');
const TRANSACTION_FEE  = () => parseFloat(process.env.PLATFORM_TRANSACTION_FEE  || '0');
const FREE_SHIPPING_THRESHOLD = () => parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '1000');
const MIN_PAYMENT_PAISE = 100; // Razorpay minimum ₹1 = 100 paise

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payments/create-order
// ─────────────────────────────────────────────────────────────────────────────
exports.createPaymentOrder = async (req, res) => {
  const session = await mongoose.startSession(); // for atomic stock reservation
  session.startTransaction();
  try {
    const { items, shippingAddress, couponCode, currency = 'INR' } = req.body;
    if (!items?.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    // ── Fetch all products at current DB prices (never trust client) ──────────
    const productIds = items.map(i => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds }, status: 'active' }).session(session);

    if (dbProducts.length !== items.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'One or more products are unavailable.' });
    }

    // ── ATOMIC stock check + reservation ─────────────────────────────────────
    // Uses findOneAndUpdate with $inc so two concurrent requests cannot both succeed
    for (const item of items) {
      const p   = dbProducts.find(d => d._id.toString() === item.productId);
      const qty = parseInt(item.qty) || 1;
      if (p.type === 'physical') {
        const updated = await Product.findOneAndUpdate(
          { _id: p._id, 'physical.stock': { $gte: qty } }, // only succeeds if stock >= qty
          { $inc: { 'physical.stock': -qty } },
          { new: true, session }
        );
        if (!updated) {
          await session.abortTransaction();
          return res.status(409).json({ success: false, message: `"${p.title}" just went out of stock. Please refresh your cart.` });
        }
      }
    }

    // ── Build order items ─────────────────────────────────────────────────────
    const orderItems = items.map(item => {
      const p   = dbProducts.find(d => d._id.toString() === item.productId);
      const qty = p.type === 'physical' ? (parseInt(item.qty) || 1) : 1;
      return {
        productId:  p._id,
        sellerId:   p.sellerId,
        type:       p.type,
        title:      p.title,
        price:      p.price,
        qty,
        subtotal:   Math.round(p.price * qty * 100) / 100,
        thumbnail:  p.thumbnail,
      };
    });

    let subtotal       = orderItems.reduce((s, i) => s + i.subtotal, 0);
    let shippingFee    = 0;
    let couponDiscount = 0;
    let isFreeShipping = false;

    // ── Shipping ──────────────────────────────────────────────────────────────
    const physicalProducts = dbProducts.filter(p => p.type === 'physical');
    if (physicalProducts.length) {
      shippingFee = physicalProducts.reduce((s, p) => s + (p.physical.shippingFee || 0), 0);
    }

    // ── Coupon validation (atomic — checked again at order creation) ──────────
    if (normalizeCouponCode(couponCode)) {
      const coupon = await Coupon.findOne({ code: normalizeCouponCode(couponCode) }).session(session);
      const application = calculateCouponApplication({
        coupon,
        userId: req.user._id,
        cartTotal: subtotal,
        cartItems: orderItems,
        products: dbProducts,
      });

      if (!application.valid) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: application.message || 'Invalid coupon.' });
      }

      couponDiscount = application.discount;
      isFreeShipping = application.isFreeShipping;
    }

    if (isFreeShipping || subtotal >= FREE_SHIPPING_THRESHOLD()) shippingFee = 0;

    // ── Platform fee (FIX: single calculation from env, synced with frontend) ─
    const amountBeforeFee = Math.max(0, subtotal - couponDiscount + shippingFee);
    const platformFee     = amountBeforeFee > 0
      ? Math.round(((amountBeforeFee * COMMISSION_RATE()) / 100 + TRANSACTION_FEE()) * 100) / 100
      : 0;
    const total = Math.round((amountBeforeFee + platformFee) * 100) / 100;

    // ── Minimum amount check ──────────────────────────────────────────────────
    const amountInPaise = Math.round(total * 100);
    if (total > 0 && amountInPaise < MIN_PAYMENT_PAISE) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Minimum payable amount is ₹1. Apply fewer discounts.' });
    }

    const downloadItems = orderItems.filter(i => i.type === 'digital').map(i => ({ productId: i.productId, count: 0 }));

    // ── Free order — skip Razorpay ─────────────────────────────────────────────
    if (total === 0) {
      const order = new Order({
        buyerId:        req.user._id,
        items:          orderItems,
        couponCode:     couponCode || '',
        couponDiscount,
        shippingFee,
        platformFee,
        total:          0,
        currency,
        status:         'paid',
        payment:        { method: 'free', paidAt: new Date() },
        shipping:       shippingAddress || {},
        downloads:      downloadItems,
      });
      await order.save({ session });
      await session.commitTransaction();

      await enqueueOrderFulfillment(order, { source: 'free-order' });
      await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: '' });
      return res.json({ success: true, free: true, orderId: order._id, orderNumber: order.orderNumber });
    }

    // ── Create Razorpay order ──────────────────────────────────────────────────
    const rzpOrder = await razorpay().orders.create({
      amount:   amountInPaise,
      currency,
      receipt:  `lekhon_${Date.now()}`,
    });

    const order = new Order({
      buyerId:        req.user._id,
      items:          orderItems,
      couponCode:     couponCode || '',
      couponDiscount,
      shippingFee,
      platformFee,
      total,
      currency,
      status:         'pending_payment',
      payment:        { razorpayOrderId: rzpOrder.id },
      shipping:       shippingAddress || {},
      downloads:      downloadItems,
    });
    await order.save({ session });
    await session.commitTransaction();

    res.json({
      success:          true,
      orderId:          order._id,
      razorpayOrderId:  rzpOrder.id,
      amount:           rzpOrder.amount,
      currency,
      keyId:            process.env.RAZORPAY_KEY_ID,
      breakdown:        { subtotal, couponDiscount, shippingFee, platformFee, total },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('[paymentController] createPaymentOrder:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payments/verify
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      await Order.findByIdAndUpdate(orderId, { status: 'failed' });
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.status === 'paid') {
      await enqueueOrderFulfillment(order, { source: 'verify-payment-retry' });
      return res.json({ success: true, orderNumber: order.orderNumber, orderId: order._id }); // idempotent
    }

    order.status                    = 'paid';
    order.payment.razorpayPaymentId = razorpay_payment_id;
    order.payment.razorpaySignature = razorpay_signature;
    order.payment.paidAt            = new Date();
    await order.save();

    await enqueueOrderFulfillment(order, { source: 'verify-payment' });
    await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: '' });

    res.json({ success: true, orderNumber: order.orderNumber, orderId: order._id });
  } catch (error) {
    console.error('[paymentController] verifyPayment:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payments/webhook/razorpay
// ─────────────────────────────────────────────────────────────────────────────
exports.razorpayWebhook = async (req, res) => {
  try {
    const receivedSig = req.headers['x-razorpay-signature'];
    const expected    = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (receivedSig !== expected) return res.status(400).json({ success: false });

    const event = JSON.parse(req.body.toString());

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity;
      const rzpOrderId = paymentEntity.order_id;
      const order = await Order.findOne({ 'payment.razorpayOrderId': rzpOrderId });
      if (order) {
        if (order.status !== 'paid') {
          order.status         = 'paid';
          order.payment.paidAt = new Date();
        }
        if (!order.payment.razorpayPaymentId) {
          order.payment.razorpayPaymentId = paymentEntity.id || '';
        }
        await order.save();
        await enqueueOrderFulfillment(order, { source: 'razorpay-webhook' });
      }
    }

    // ── COMPLETE refund webhook handling ──────────────────────────────────────
    if (event.event === 'refund.created') {
      const rzpOrderId = event.payload.refund.entity.order_id;
      const order      = await Order.findOne({ 'payment.razorpayOrderId': rzpOrderId });
      if (order && order.status !== 'refunded') {
        // 1. Restore physical stock
        for (const item of order.items.filter(i => i.type === 'physical')) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { 'physical.stock': item.qty } });
        }
        // 2. Decrement sales counter
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { 'stats.sales': -item.qty } });
        }
        // 3. Reverse coupon usage
        if (order.couponCode) {
          await Coupon.findOneAndUpdate(
            { code: order.couponCode, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 }, $pull: { usedBy: { orderId: order._id } } }
          );
        }
        // 4. Reverse seller earnings
        await reverseEarningsForOrder(order._id);

        // 5. Update order
        order.status = 'refunded';
        await order.save();

        // 6. Notify buyer and seller
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${order.buyerId}`).emit('notification:refund', {
            message: `Refund for order ${order.orderNumber} has been processed.`,
          });
          const sids = [...new Set(order.items.map(i => i.sellerId.toString()))];
          for (const sid of sids) {
            io.to(`user:${sid}`).emit('notification:order_refunded', {
              message: `Order ${order.orderNumber} has been refunded.`,
            });
          }
        }
        await enqueueEmailJob('buyer-order-refunded', {
          userId: order.buyerId.toString(), orderNumber: order.orderNumber,
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[paymentController] webhook error:', error.message);
    res.status(500).json({ success: false });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/payments/orders/:id/download/:productId
// ─────────────────────────────────────────────────────────────────────────────
exports.getDownloadUrl = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (!['paid', 'delivered', 'completed'].includes(order.status)) {
      return res.status(403).json({ success: false, message: 'Payment required.' });
    }
    const orderItem = order.items.find(i => i.productId.toString() === req.params.productId);
    if (!orderItem || orderItem.type !== 'digital') {
      return res.status(404).json({ success: false, message: 'Digital item not found in order.' });
    }
    const product = await Product.findById(req.params.productId);
    if (!product?.digital?.filePublicId) {
      return res.status(404).json({ success: false, message: 'File not found. Contact seller.' });
    }
    const dlRecord = order.downloads.find(d => d.productId.toString() === req.params.productId);
    if (dlRecord && dlRecord.count >= product.digital.maxDownloads) {
      return res.status(429).json({
        success: false,
        message: `Download limit of ${product.digital.maxDownloads} reached. Contact seller.`,
      });
    }
    const signedUrl = cloudinary.utils.private_download_url(
      product.digital.filePublicId,
      product.digital.fileFormat || 'raw',
      { expires_at: Math.floor(Date.now() / 1000) + 900 }
    );
    await Order.updateOne(
      { _id: order._id, 'downloads.productId': product._id },
      { $inc: { 'downloads.$.count': 1 }, $set: { 'downloads.$.lastDownloadedAt': new Date() } }
    );
    res.json({ success: true, url: signedUrl, expiresIn: 900, fileName: product.title });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
