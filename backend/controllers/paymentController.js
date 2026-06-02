const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const Order     = require('../models/Order');
const Product   = require('../models/Product');
const Coupon    = require('../models/Coupon');
const Cart      = require('../models/Cart');
const cloudinary= require('../utils/cloudinary');
const { enqueueEmailJob } = require('../jobs/queueService');

const razorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const hasRazorpayCredentials = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const signaturesMatch = (expected, received) => {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payments/create-order
// ─────────────────────────────────────────────────────────────────────────────
exports.createPaymentOrder = async (req, res) => {
  try {
    if (!hasRazorpayCredentials()) {
      return res.status(500).json({ success: false, message: 'Razorpay credentials are not configured.' });
    }

    const { items, shippingAddress, couponCode, currency = 'INR' } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    // ── Re-fetch ALL prices from DB — never trust client ──────────────────────
    const productIds = items.map(i => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds }, status: 'active' });

    if (dbProducts.length !== items.length) {
      return res.status(400).json({ success: false, message: 'One or more products are unavailable.' });
    }

    // ── Stock check for physical items ────────────────────────────────────────
    for (const item of items) {
      const p = dbProducts.find(d => d._id.toString() === item.productId);
      if (p.type === 'physical' && p.physical.stock < (item.qty || 1)) {
        return res.status(400).json({ success: false, message: `"${p.title}" is out of stock.` });
      }
    }

    // ── Build order items at server-side prices ───────────────────────────────
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
        subtotal:   p.price * qty,
        thumbnail:  p.thumbnail,
      };
    });

    let subtotal      = orderItems.reduce((s, i) => s + i.subtotal, 0);
    let shippingFee   = 0;
    let couponDiscount = 0;
    let isFreeShipping = false;

    // ── Shipping (physical items only) ────────────────────────────────────────
    const physicalProducts = dbProducts.filter(p => p.type === 'physical');
    if (physicalProducts.length > 0) {
      shippingFee = physicalProducts.reduce((s, p) => s + (p.physical.shippingFee || 0), 0);
    }

    // ── Coupon application ────────────────────────────────────────────────────
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        const now     = new Date();
        const inDate  = now >= coupon.validFrom && now <= coupon.validUntil;
        const inLimit = coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit;
        const inMin   = subtotal >= coupon.minOrderValue;
        const userUses= coupon.usedBy.filter(u => u.userId.toString() === req.user._id.toString()).length;
        const inUser  = userUses < coupon.perUserLimit;

        if (inDate && inLimit && inMin && inUser) {
          if (coupon.discountType === 'percentage') {
            couponDiscount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscountCap) couponDiscount = Math.min(couponDiscount, coupon.maxDiscountCap);
          } else if (coupon.discountType === 'flat') {
            couponDiscount = Math.min(coupon.discountValue, subtotal);
          } else if (coupon.discountType === 'free_shipping') {
            isFreeShipping = true;
          }
        }
      }
    }

    if (isFreeShipping) shippingFee = 0;
    const commissionRate = parseFloat(process.env.COMMISSION_RATE || '0');
    const transactionFee = parseFloat(process.env.PLATFORM_TRANSACTION_FEE || '0');
    const amountBeforePlatformFee = Math.max(0, subtotal - couponDiscount + shippingFee);
    const platformFee    = amountBeforePlatformFee > 0
      ? Math.round(((subtotal * commissionRate) / 100 + transactionFee) * 100) / 100
      : 0;
    const total          = Math.round((amountBeforePlatformFee + platformFee) * 100) / 100;
    const amountInPaise  = Math.round(total * 100);

    if (amountInPaise > 0 && amountInPaise < 100) {
      return res.status(400).json({ success: false, message: 'Minimum payable amount is ₹1.' });
    }

    const downloadItems = orderItems.filter(i => i.type === 'digital').map(i => ({
      productId: i.productId,
      count:     0,
    }));

    // ── Free order — skip Razorpay ─────────────────────────────────────────────
    if (total === 0) {
      const order = await Order.create({
        buyerId:     req.user._id,
        items:       orderItems,
        couponCode:  couponCode || '',
        couponDiscount,
        shippingFee,
        platformFee,
        total:       0,
        currency,
        status:      'paid',
        payment:     { method: 'free', paidAt: new Date() },
        shipping:    shippingAddress || {},
        downloads:   downloadItems,
      });
      await _fulfillOrder(order, req.app.get('io'));
      await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: '' });
      return res.json({
        success: true, free: true,
        orderId: order._id, orderNumber: order.orderNumber,
      });
    }

    // ── Create Razorpay order ─────────────────────────────────────────────────
    const rzpOrder = await razorpay().orders.create({
      amount:   amountInPaise,
      currency,
      receipt:  `receipt_${Date.now()}`,
    });

    const order = await Order.create({
      buyerId:     req.user._id,
      items:       orderItems,
      couponCode:  couponCode || '',
      couponDiscount,
      shippingFee,
      platformFee,
      total,
      currency,
      status:      'pending_payment',
      payment:     { razorpayOrderId: rzpOrder.id },
      shipping:    shippingAddress || {},
      downloads:   downloadItems,
    });

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
    console.error('[paymentController] createPaymentOrder:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payments/verify
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    if (!hasRazorpayCredentials()) {
      return res.status(500).json({ success: false, message: 'Razorpay credentials are not configured.' });
    }

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (order.payment?.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Payment order mismatch.' });
    }
    if (order.status === 'paid') {
      return res.json({ success: true, orderNumber: order.orderNumber, orderId: order._id });
    }

    // HMAC-SHA256 signature verification (never skip this)
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (!signaturesMatch(expected, razorpay_signature)) {
      await Order.findByIdAndUpdate(orderId, { status: 'failed' });
      return res.status(400).json({ success: false, message: 'Payment verification failed. Signature mismatch.' });
    }

    order.status                    = 'paid';
    order.payment.razorpayPaymentId = razorpay_payment_id;
    order.payment.razorpaySignature = razorpay_signature;
    order.payment.paidAt            = new Date();
    await order.save();

    await _fulfillOrder(order, req.app.get('io'));
    await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: '' });

    res.json({ success: true, orderNumber: order.orderNumber, orderId: order._id });
  } catch (error) {
    console.error('[paymentController] verifyPayment:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payments/webhook/razorpay  (Razorpay webhook backup)
//  NOTE: mount this route BEFORE express.json() with express.raw()
// ─────────────────────────────────────────────────────────────────────────────
exports.razorpayWebhook = async (req, res) => {
  try {
    const receivedSig = req.headers['x-razorpay-signature'];
    const expected    = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body) // raw Buffer
      .digest('hex');

    if (receivedSig !== expected) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === 'payment.captured') {
      const rzpOrderId = event.payload.payment.entity.order_id;
      const order = await Order.findOne({ 'payment.razorpayOrderId': rzpOrderId });
      if (order && order.status !== 'paid') {
        order.status          = 'paid';
        order.payment.paidAt  = new Date();
        await order.save();
        await _fulfillOrder(order, null); // no socket access in webhook
      }
    }

    if (event.event === 'refund.created') {
      const rzpOrderId = event.payload.refund.entity.order_id;
      await Order.findOneAndUpdate(
        { 'payment.razorpayOrderId': rzpOrderId },
        { status: 'refunded' }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[paymentController] razorpayWebhook:', error.message);
    res.status(500).json({ success: false });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/orders/:id/download/:productId  (signed Cloudinary URL)
// ─────────────────────────────────────────────────────────────────────────────
exports.getDownloadUrl = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (!['paid', 'completed', 'delivered'].includes(order.status)) {
      return res.status(403).json({ success: false, message: 'Payment required.' });
    }

    const orderItem = order.items.find(i => i.productId.toString() === req.params.productId);
    if (!orderItem || orderItem.type !== 'digital') {
      return res.status(404).json({ success: false, message: 'Digital item not in this order.' });
    }

    const product = await Product.findById(req.params.productId);
    if (!product || !product.digital?.filePublicId) {
      return res.status(404).json({ success: false, message: 'File not found. Contact seller.' });
    }

    // Enforce download limit
    const dlRecord = order.downloads.find(d => d.productId.toString() === req.params.productId);
    if (dlRecord && dlRecord.count >= product.digital.maxDownloads) {
      return res.status(429).json({
        success: false,
        message: `Download limit of ${product.digital.maxDownloads} reached. Please contact the seller.`,
      });
    }

    // Generate time-limited signed URL (15 minutes)
    const signedUrl = cloudinary.utils.private_download_url(
      product.digital.filePublicId,
      product.digital.fileFormat || 'raw',
      { expires_at: Math.floor(Date.now() / 1000) + 900 }
    );

    // Increment counter
    await Order.updateOne(
      { _id: order._id, 'downloads.productId': product._id },
      {
        $inc: { 'downloads.$.count': 1 },
        $set: { 'downloads.$.lastDownloadedAt': new Date() },
      }
    );

    res.json({ success: true, url: signedUrl, expiresIn: 900, fileName: product.title });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Internal: fulfill order after successful payment
// ─────────────────────────────────────────────────────────────────────────────
async function _fulfillOrder(order, io) {
  try {
    // Update product sales stats
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { 'stats.sales': item.qty } });
    }

    // Decrement physical stock
    for (const item of order.items.filter(i => i.type === 'physical')) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { 'physical.stock': -item.qty },
      });
    }

    // Mark coupon as used
    if (order.couponCode) {
      await Coupon.findOneAndUpdate(
        { code: order.couponCode },
        {
          $inc:  { usedCount: 1 },
          $push: { usedBy: { userId: order.buyerId, orderId: order._id, usedAt: new Date() } },
        }
      );
    }

    // Notify each unique seller via socket + email
    const sellerIds = [...new Set(order.items.map(i => i.sellerId.toString()))];
    for (const sellerId of sellerIds) {
      if (io) {
        io.to(`user:${sellerId}`).emit('notification:new_order', {
          message:     `New order received: ${order.orderNumber}`,
          orderNumber: order.orderNumber,
          orderId:     order._id,
        });
      }
      await enqueueEmailJob('seller-new-order', {
        userId:      sellerId,
        orderNumber: order.orderNumber,
        orderId:     order._id.toString(),
      });
    }

    // Notify buyer
    if (io) {
      io.to(`user:${order.buyerId}`).emit('notification:order_confirmed', {
        message:     `Your order ${order.orderNumber} is confirmed! 🎉`,
        orderNumber: order.orderNumber,
        orderId:     order._id,
      });
    }
    await enqueueEmailJob('buyer-order-confirmed', {
      userId:      order.buyerId.toString(),
      orderNumber: order.orderNumber,
      orderId:     order._id.toString(),
    });

  } catch (err) {
    console.error('[_fulfillOrder] error:', err.message);
  }
}
