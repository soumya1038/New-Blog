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
const { logError } = require('../utils/safeErrorLog');
const { runOnce } = require('../services/idempotencyService');
const { refundExpiredCapturedPayment } = require('../services/paymentReservationService');
const { getRazorpayProviderTimeoutMs, withProviderTimeout } = require('../utils/providerTimeouts');

const razorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Fee configuration — single source of truth, always from env
const COMMISSION_RATE  = () => parseFloat(process.env.COMMISSION_RATE           || '0');
const TRANSACTION_FEE  = () => parseFloat(process.env.PLATFORM_TRANSACTION_FEE  || '0');
const FREE_SHIPPING_THRESHOLD = () => parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '1000');
const MIN_PAYMENT_PAISE = 100; // Razorpay minimum ₹1 = 100 paise
const MAX_ORDER_ITEM_QTY = Number(process.env.MAX_ORDER_ITEM_QTY || 99);
const MAX_PAYMENT_ITEMS = Math.max(1, Number(process.env.MAX_PAYMENT_ITEMS || 100));
const ORDER_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.ORDER_QUERY_MAX_TIME_MS) || 5000);
const PAYMENT_RESERVATION_TTL_MINUTES = Math.max(
  5,
  Math.min(24 * 60, Number(process.env.PAYMENT_RESERVATION_TTL_MINUTES) || 30)
);
const MAX_PENDING_PAYMENT_ORDERS_PER_USER = Math.max(
  1,
  Math.min(20, Number(process.env.MAX_PENDING_PAYMENT_ORDERS_PER_USER) || 3)
);
const SUPPORTED_PAYMENT_CURRENCIES = new Set(['INR', 'USD']);
const REFUNDABLE_ORDER_STATUSES = new Set(['pending_payment', 'failed', 'paid', 'processing', 'shipped', 'delivered', 'completed']);
const FULFILLED_ORDER_STATUSES = new Set(['paid', 'processing', 'shipped', 'delivered', 'completed']);
const PAYMENT_ID_MAX_LENGTH = 100;
const PAYMENT_SIGNATURE_MAX_LENGTH = 128;
const genericPaymentError = 'Payment processing failed. Please try again later.';
const IDEMPOTENCY_KEY_MIN_LENGTH = 16;
const IDEMPOTENCY_KEY_MAX_LENGTH = 128;
const IDEMPOTENCY_EVENT_RETENTION_MS = Math.max(
  30,
  Math.min(3650, Number(process.env.IDEMPOTENCY_EVENT_RETENTION_DAYS) || 730)
) * 24 * 60 * 60 * 1000;

const toPaise = (amount) => Math.round(Number(amount || 0) * 100);

const boundedString = (value = '', maxLength = 200) =>
  String(value || '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLength);

const isSafeHttpsUrl = (value, maxLength = 4096) => {
  const text = String(value || '').trim();
  if (!text || text.length > maxLength) return false;

  try {
    const parsed = new URL(text);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !/[\s\\]/.test(parsed.hostname);
  } catch (error) {
    return false;
  }
};

const sanitizeShippingAddress = (shippingAddress = {}) => ({
  name: boundedString(shippingAddress.name, 120),
  phone: boundedString(shippingAddress.phone, 40),
  addressLine1: boundedString(shippingAddress.addressLine1, 220),
  addressLine2: boundedString(shippingAddress.addressLine2, 220),
  city: boundedString(shippingAddress.city, 100),
  state: boundedString(shippingAddress.state, 100),
  pin: boundedString(shippingAddress.pin, 20),
  country: boundedString(shippingAddress.country || 'India', 80),
});
const RAZORPAY_PROVIDER_TIMEOUT_MS = getRazorpayProviderTimeoutMs();
const callRazorpay = (promise, label) =>
  withProviderTimeout(promise, label, RAZORPAY_PROVIDER_TIMEOUT_MS);

const isBoundedText = (value, maxLength) => {
  const text = String(value || '').trim();
  return Boolean(text) && text.length <= maxLength;
};

const secureHexCompare = (expected, received) => {
  const expectedValue = String(expected || '');
  const receivedValue = String(received || '');

  if (!expectedValue || !receivedValue) return false;
  if (!/^[a-f0-9]+$/i.test(expectedValue) || !/^[a-f0-9]+$/i.test(receivedValue)) return false;
  if (expectedValue.length % 2 !== 0 || receivedValue.length % 2 !== 0) return false;

  let expectedBuffer;
  let receivedBuffer;
  try {
    expectedBuffer = Buffer.from(expectedValue, 'hex');
    receivedBuffer = Buffer.from(receivedValue, 'hex');
  } catch (error) {
    return false;
  }

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

const parseOrderQuantity = (value, minimum = 1) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > MAX_ORDER_ITEM_QTY) {
    return null;
  }
  return parsed;
};

const normalizeIdempotencyKey = value => {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = String(candidate || '').trim();
  if (
    normalized.length < IDEMPOTENCY_KEY_MIN_LENGTH ||
    normalized.length > IDEMPOTENCY_KEY_MAX_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(normalized)
  ) {
    return '';
  }
  return normalized;
};

const sha256 = value => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const buildCheckoutRequestHash = ({ items, shippingAddress, couponCode, currency }) => sha256(
  JSON.stringify({
    items: items.map(item => ({
      productId: String(item.productId || ''),
      qty: Number(item.qty ?? 1),
    })),
    shippingAddress,
    couponCode,
    currency,
  })
);

const getStoredOrderBreakdown = order => ({
  subtotal: Math.round((order.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0) * 100) / 100,
  couponDiscount: Number(order.couponDiscount || 0),
  shippingFee: Number(order.shippingFee || 0),
  platformFee: Number(order.platformFee || 0),
  total: Number(order.total || 0),
});

const sendExistingCheckoutResponse = (res, order, requestHash) => {
  if (!order || order.checkoutRequestHash !== requestHash) {
    return res.status(409).json({
      success: false,
      message: 'This checkout request key was already used for different cart details.',
    });
  }

  if (FULFILLED_ORDER_STATUSES.has(order.status)) {
    return res.json({
      success: true,
      alreadyProcessed: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  }

  if (order.status !== 'pending_payment') {
    return res.status(409).json({
      success: false,
      message: 'This checkout attempt is no longer active. Start a new payment attempt.',
    });
  }

  if (!order.payment?.razorpayOrderId) {
    res.set('Retry-After', '2');
    return res.status(409).json({
      success: false,
      message: 'This checkout is still being initialized. Please retry in a moment.',
      retryAfterSeconds: 2,
    });
  }

  return res.json({
    success: true,
    reused: true,
    orderId: order._id,
    razorpayOrderId: order.payment.razorpayOrderId,
    amount: toPaise(order.total),
    currency: String(order.currency || 'INR').toUpperCase(),
    keyId: process.env.RAZORPAY_KEY_ID,
    breakdown: getStoredOrderBreakdown(order),
  });
};

const paymentMatchesOrder = (paymentEntity = {}, order, razorpayOrderId) => {
  const expectedAmount = toPaise(order.total);
  const paymentAmount = Number(paymentEntity.amount);
  const paymentCurrency = String(paymentEntity.currency || '').toUpperCase();
  const orderCurrency = String(order.currency || 'INR').toUpperCase();

  return (
    isBoundedText(paymentEntity.id, PAYMENT_ID_MAX_LENGTH) &&
    paymentEntity.order_id === razorpayOrderId &&
    paymentEntity.status === 'captured' &&
    paymentAmount === expectedAmount &&
    paymentCurrency === orderCurrency
  );
};

const refundMatchesOrder = (refundEntity = {}, order) => {
  const expectedAmount = toPaise(order.total);
  const refundAmount = Number(refundEntity.amount);
  const refundCurrency = String(refundEntity.currency || order.currency || 'INR').toUpperCase();
  const orderCurrency = String(order.currency || 'INR').toUpperCase();
  const refundPaymentId = boundedString(refundEntity.payment_id, PAYMENT_ID_MAX_LENGTH);
  const storedPaymentId = boundedString(order.payment?.razorpayPaymentId, PAYMENT_ID_MAX_LENGTH);
  const refundOrderId = boundedString(refundEntity.order_id, PAYMENT_ID_MAX_LENGTH);
  const storedOrderId = boundedString(order.payment?.razorpayOrderId, PAYMENT_ID_MAX_LENGTH);

  return (
    Boolean(refundPaymentId) &&
    Boolean(storedPaymentId) &&
    refundPaymentId === storedPaymentId &&
    (!refundOrderId || refundOrderId === storedOrderId) &&
    refundAmount === expectedAmount &&
    refundCurrency === orderCurrency
  );
};

const restorePhysicalStock = async (items = [], session = null) => {
  for (const item of items.filter(i => i.type === 'physical')) {
    const qty = parseOrderQuantity(item.qty);
    if (!qty) continue;
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { 'physical.stock': qty },
    }, session ? { session } : undefined).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
  }
};

const markPaymentOrderFailed = async (order, reason) => {
  if (!order?._id) return;
  const cleanupSession = await mongoose.startSession();
  cleanupSession.startTransaction();
  try {
    await restorePhysicalStock(order.items || [], cleanupSession);
    const failResult = await Order.updateOne(
      {
        _id: order._id,
        status: 'pending_payment',
        'payment.razorpayPaymentId': '',
      },
      {
        $set: {
          status: 'failed',
          inventoryReleased: true,
          notes: boundedString(reason, 1000),
          'payment.reservationExpiresAt': null,
          'payment.expiryCheckStartedAt': null,
        },
      },
      { session: cleanupSession }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (failResult.modifiedCount !== 1) {
      throw new Error('Unable to mark failed payment order after provider failure.');
    }
    await cleanupSession.commitTransaction();
  } catch (error) {
    await cleanupSession.abortTransaction();
    throw error;
  } finally {
    cleanupSession.endSession();
  }
};

const releasePhysicalStockOnce = async order => {
  if (!order?._id || order.inventoryReleased) return false;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const claimResult = await Order.updateOne(
      { _id: order._id, inventoryReleased: { $ne: true } },
      { $set: { inventoryReleased: true } },
      { session }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (claimResult.modifiedCount !== 1) {
      await session.abortTransaction();
      return false;
    }

    await restorePhysicalStock(order.items || [], session);
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payments/create-order
// ─────────────────────────────────────────────────────────────────────────────
exports.createPaymentOrder = async (req, res) => {
  const session = await mongoose.startSession(); // for atomic stock reservation
  session.startTransaction();
  try {
    const { items, shippingAddress, couponCode, currency = 'INR' } = req.body;
    const orderCurrency = String(currency || 'INR').toUpperCase();
    const rawCouponCode = String(couponCode || '').trim();
    const normalizedCouponCode = rawCouponCode ? normalizeCouponCode(rawCouponCode) : '';

    if (!Array.isArray(items) || !items.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }
    if (rawCouponCode && !normalizedCouponCode) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid coupon.' });
    }
    if (items.length > MAX_PAYMENT_ITEMS) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: `Too many items in one payment request. Please keep it under ${MAX_PAYMENT_ITEMS}.` });
    }
    if (!SUPPORTED_PAYMENT_CURRENCIES.has(orderCurrency)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Unsupported payment currency.' });
    }

    // ── Fetch all products at current DB prices (never trust client) ──────────
    const productIds = items.map(i => i.productId);
    if (productIds.some(id => !mongoose.isValidObjectId(id))) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid product in cart.' });
    }

    const idempotencyKey = normalizeIdempotencyKey(req.get('Idempotency-Key'));
    if (!idempotencyKey) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'A valid Idempotency-Key header is required for checkout.',
      });
    }

    const sanitizedShippingAddress = sanitizeShippingAddress(shippingAddress);
    const checkoutKeyHash = sha256(`${req.user._id}:${idempotencyKey}`);
    const checkoutRequestHash = buildCheckoutRequestHash({
      items,
      shippingAddress: sanitizedShippingAddress,
      couponCode: normalizedCouponCode,
      currency: orderCurrency,
    });

    const existingOrder = await Order.findOne({ buyerId: req.user._id, checkoutKeyHash })
      .select('+checkoutKeyHash +checkoutRequestHash')
      .session(session)
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (existingOrder) {
      await session.abortTransaction();
      return sendExistingCheckoutResponse(res, existingOrder, checkoutRequestHash);
    }

    const pendingOrderCount = await Order.countDocuments({
      buyerId: req.user._id,
      status: 'pending_payment',
      inventoryReleased: { $ne: true },
    })
      .session(session)
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (pendingOrderCount >= MAX_PENDING_PAYMENT_ORDERS_PER_USER) {
      await session.abortTransaction();
      return res.status(429).json({
        success: false,
        message: 'Too many unpaid checkouts are active. Complete or cancel one before starting another.',
      });
    }

    const dbProducts = await Product.find({ _id: { $in: productIds }, status: 'active' })
      .session(session)
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

    if (dbProducts.length !== items.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'One or more products are unavailable.' });
    }
    const mismatchedCurrencyProduct = dbProducts.find(
      product => String(product.currency || 'INR').toUpperCase() !== orderCurrency
    );
    if (mismatchedCurrencyProduct) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cart contains products with mixed currencies.' });
    }

    // ── ATOMIC stock check + reservation ─────────────────────────────────────
    // Uses findOneAndUpdate with $inc so two concurrent requests cannot both succeed
    const normalizedQuantities = new Map();
    for (const item of items) {
      const p   = dbProducts.find(d => d._id.toString() === String(item.productId));
      const minimumQty = p.type === 'physical'
        ? Math.max(1, Number(p.physical?.minimumOrderQuantity) || 1)
        : 1;
      const qty = p.type === 'physical' ? parseOrderQuantity(item.qty ?? 1, minimumQty) : 1;
      if (!qty) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Invalid quantity for "${p.title}".` });
      }
      normalizedQuantities.set(p._id.toString(), qty);
      if (p.type === 'physical') {
        const updated = await Product.findOneAndUpdate(
          { _id: p._id, 'physical.stock': { $gte: qty } }, // only succeeds if stock >= qty
          { $inc: { 'physical.stock': -qty } },
          { new: true, session }
        ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
        if (!updated) {
          await session.abortTransaction();
          return res.status(409).json({ success: false, message: `"${p.title}" just went out of stock. Please refresh your cart.` });
        }
      }
    }

    // ── Build order items ─────────────────────────────────────────────────────
    const orderItems = items.map(item => {
      const p   = dbProducts.find(d => d._id.toString() === String(item.productId));
      const qty = normalizedQuantities.get(p._id.toString()) || 1;
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
    if (normalizedCouponCode) {
      const coupon = await Coupon.findOne({ code: normalizedCouponCode })
        .session(session)
        .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
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
        checkoutKeyHash,
        checkoutRequestHash,
        buyerId:        req.user._id,
        items:          orderItems,
        couponCode:     normalizedCouponCode,
        couponDiscount,
        shippingFee,
        platformFee,
        total:          0,
        currency:        orderCurrency,
        status:         'paid',
        payment:        { method: 'free', paidAt: new Date() },
        shipping:       sanitizedShippingAddress,
        downloads:      downloadItems,
      });
      await order.save({ session });
      await session.commitTransaction();

      await enqueueOrderFulfillment(order, { source: 'free-order' });
      await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: '' })
        .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      return res.json({ success: true, free: true, orderId: order._id, orderNumber: order.orderNumber });
    }

    // ── Create Razorpay order ──────────────────────────────────────────────────
    const order = new Order({
      checkoutKeyHash,
      checkoutRequestHash,
      buyerId:        req.user._id,
      items:          orderItems,
      couponCode:     normalizedCouponCode,
      couponDiscount,
      shippingFee,
      platformFee,
      total,
      currency:        orderCurrency,
      status:         'pending_payment',
      payment:        {
        razorpayOrderId: '',
        reservationExpiresAt: new Date(Date.now() + PAYMENT_RESERVATION_TTL_MINUTES * 60 * 1000),
      },
      shipping:       sanitizedShippingAddress,
      downloads:      downloadItems,
    });
    await order.save({ session });
    await session.commitTransaction();

    // Keep slow provider I/O outside the MongoDB transaction so checkout load does not hold DB locks.
    let rzpOrder;
    try {
      rzpOrder = await callRazorpay(razorpay().orders.create({
        amount:   amountInPaise,
        currency: orderCurrency,
        receipt:  `lekhon_${order._id.toString().slice(-18)}`,
      }), 'Razorpay order creation');

      const linkResult = await Order.updateOne(
        {
          _id: order._id,
          buyerId: req.user._id,
          status: 'pending_payment',
          'payment.razorpayOrderId': '',
        },
        { $set: { 'payment.razorpayOrderId': rzpOrder.id } }
      ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

      if (linkResult.modifiedCount !== 1) {
        throw new Error('Unable to link Razorpay order to local order.');
      }
    } catch (providerError) {
      await markPaymentOrderFailed(order, 'Razorpay order creation failed before checkout.');
      throw providerError;
    }

    res.json({
      success:          true,
      orderId:          order._id,
      razorpayOrderId:  rzpOrder.id,
      amount:           rzpOrder.amount,
      currency:          orderCurrency,
      keyId:            process.env.RAZORPAY_KEY_ID,
      breakdown:        { subtotal, couponDiscount, shippingFee, platformFee, total },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (error?.code === 11000 && error?.keyPattern?.checkoutKeyHash) {
      const idempotencyKey = normalizeIdempotencyKey(req.get('Idempotency-Key'));
      const requestItems = Array.isArray(req.body?.items) ? req.body.items : [];
      if (idempotencyKey && requestItems.length) {
        const checkoutKeyHash = sha256(`${req.user._id}:${idempotencyKey}`);
        const checkoutRequestHash = buildCheckoutRequestHash({
          items: requestItems,
          shippingAddress: sanitizeShippingAddress(req.body?.shippingAddress),
          couponCode: normalizeCouponCode(req.body?.couponCode || ''),
          currency: String(req.body?.currency || 'INR').toUpperCase(),
        });
        const existingOrder = await Order.findOne({ buyerId: req.user._id, checkoutKeyHash })
          .select('+checkoutKeyHash +checkoutRequestHash')
          .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
        if (existingOrder) {
          return sendExistingCheckoutResponse(res, existingOrder, checkoutRequestHash);
        }
      }
    }
    logError('[paymentController] createPaymentOrder:', error);
    res.status(500).json({ success: false, message: genericPaymentError });
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

    if (
      !mongoose.isValidObjectId(orderId) ||
      !isBoundedText(razorpay_order_id, PAYMENT_ID_MAX_LENGTH) ||
      !isBoundedText(razorpay_payment_id, PAYMENT_ID_MAX_LENGTH) ||
      !isBoundedText(razorpay_signature, PAYMENT_SIGNATURE_MAX_LENGTH)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid payment verification payload.' });
    }

    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (!secureHexCompare(expected, razorpay_signature)) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user._id,
      'payment.razorpayOrderId': razorpay_order_id,
    }).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found for this payment.' });

    if (order.status === 'failed' && order.payment?.expiredAt && order.inventoryReleased) {
      const expiredPayment = await callRazorpay(
        razorpay().payments.fetch(razorpay_payment_id),
        'Razorpay payment lookup'
      );
      if (!paymentMatchesOrder(expiredPayment, order, razorpay_order_id)) {
        return res.status(400).json({ success: false, message: 'Payment details do not match the order.' });
      }
      await refundExpiredCapturedPayment(order, expiredPayment);
      return res.status(409).json({
        success: false,
        message: 'This payment arrived after the inventory reservation expired. An automatic refund has been initiated.',
      });
    }

    if (order.status === 'paid') {
      if (order.payment.razorpayPaymentId && order.payment.razorpayPaymentId !== razorpay_payment_id) {
        return res.status(409).json({ success: false, message: 'Payment does not match this order.' });
      }
      await enqueueOrderFulfillment(order, { source: 'verify-payment-retry' });
      return res.json({ success: true, orderNumber: order.orderNumber, orderId: order._id }); // idempotent
    }
    if (order.status !== 'pending_payment') {
      return res.status(409).json({ success: false, message: 'Order is not awaiting payment.' });
    }

    const payment = await callRazorpay(
      razorpay().payments.fetch(razorpay_payment_id),
      'Razorpay payment lookup'
    );
    const expectedAmount = toPaise(order.total);
    const paymentAmount = Number(payment?.amount);
    const paymentCurrency = String(payment?.currency || '').toUpperCase();
    const orderCurrency = String(order.currency || 'INR').toUpperCase();

    if (
      !payment ||
      payment.order_id !== razorpay_order_id ||
      payment.status !== 'captured' ||
      paymentAmount !== expectedAmount ||
      paymentCurrency !== orderCurrency
    ) {
      return res.status(400).json({ success: false, message: 'Payment details do not match the order.' });
    }

    const paidOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        buyerId: req.user._id,
        'payment.razorpayOrderId': razorpay_order_id,
        status: 'pending_payment'
      },
      {
        $set: {
          status: 'paid',
          'payment.razorpayPaymentId': razorpay_payment_id,
          'payment.razorpaySignature': '',
          'payment.paidAt': new Date(),
          'payment.reservationExpiresAt': null,
          'payment.expiryCheckStartedAt': null
        }
      },
      { new: true }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

    if (!paidOrder) {
      const latestOrder = await Order.findOne({
        _id: order._id,
        buyerId: req.user._id,
        'payment.razorpayOrderId': razorpay_order_id,
      }).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      if (
        latestOrder?.status === 'paid' &&
        (!latestOrder.payment?.razorpayPaymentId || latestOrder.payment.razorpayPaymentId === razorpay_payment_id)
      ) {
        await enqueueOrderFulfillment(latestOrder, { source: 'verify-payment-retry' });
        return res.json({ success: true, orderNumber: latestOrder.orderNumber, orderId: latestOrder._id });
      }
      if (latestOrder?.status === 'failed' && latestOrder.payment?.expiredAt && latestOrder.inventoryReleased) {
        await refundExpiredCapturedPayment(latestOrder, payment);
        return res.status(409).json({
          success: false,
          message: 'This payment arrived after the inventory reservation expired. An automatic refund has been initiated.',
        });
      }
      return res.status(409).json({ success: false, message: 'Order is not awaiting payment.' });
    }

    await enqueueOrderFulfillment(paidOrder, { source: 'verify-payment' });
    await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: '' })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

    res.json({ success: true, orderNumber: paidOrder.orderNumber, orderId: paidOrder._id });
  } catch (error) {
    logError('[paymentController] verifyPayment:', error);
    res.status(500).json({ success: false, message: genericPaymentError });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payments/webhook/razorpay
// ─────────────────────────────────────────────────────────────────────────────
exports.razorpayWebhook = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error('[paymentController] webhook secret is not configured.');
      return res.status(503).json({ success: false });
    }
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ success: false });
    }

    const receivedSig = req.headers['x-razorpay-signature'];
    const expected    = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (!secureHexCompare(expected, receivedSig)) return res.status(400).json({ success: false });

    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch (parseError) {
      return res.status(400).json({ success: false });
    }

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const rzpOrderId = paymentEntity.order_id;
      const rzpPaymentId = boundedString(paymentEntity.id, PAYMENT_ID_MAX_LENGTH);
      if (!rzpOrderId) return res.json({ success: true });

      await runOnce({
        key: `razorpay:v2:payment-captured:${rzpPaymentId || rzpOrderId}`,
        scope: 'razorpay-webhook-payment',
        resourceType: 'RazorpayPayment',
        resourceId: rzpPaymentId || rzpOrderId,
        lockMs: 15 * 60 * 1000,
        retentionMs: IDEMPOTENCY_EVENT_RETENTION_MS,
        handler: async () => {
          const order = await Order.findOne({ 'payment.razorpayOrderId': rzpOrderId })
            .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
          if (!order) return { ignored: true, reason: 'order_not_found', razorpayOrderId: rzpOrderId };

          if (!paymentMatchesOrder(paymentEntity, order, rzpOrderId)) {
            console.warn('[paymentController] Ignored payment webhook with mismatched payment data:', rzpOrderId);
            return { ignored: true, reason: 'payment_mismatch', orderId: order._id.toString() };
          }

          if (order.status === 'failed' && order.payment?.expiredAt && order.inventoryReleased) {
            const refundResult = await refundExpiredCapturedPayment(order, paymentEntity);
            return {
              expiredPaymentRefund: true,
              orderId: order._id.toString(),
              refundResult,
            };
          }

          if (order.status === 'paid') {
            if (!order.payment?.razorpayPaymentId && rzpPaymentId) {
              await Order.updateOne(
                { _id: order._id, 'payment.razorpayPaymentId': '' },
                { $set: { 'payment.razorpayPaymentId': rzpPaymentId } }
              ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
            }
            return { alreadyPaid: true, orderId: order._id.toString() };
          }

          if (order.status !== 'pending_payment') {
            console.warn('[paymentController] Ignored payment webhook for non-payable order:', order.orderNumber || order._id);
            return { ignored: true, reason: 'non_payable_status', orderId: order._id.toString(), status: order.status };
          }

          const paidOrder = await Order.findOneAndUpdate(
            {
              _id: order._id,
              'payment.razorpayOrderId': rzpOrderId,
              status: 'pending_payment'
            },
            {
              $set: {
                status: 'paid',
                'payment.razorpayPaymentId': rzpPaymentId,
                'payment.paidAt': new Date(),
                'payment.reservationExpiresAt': null,
                'payment.expiryCheckStartedAt': null
              }
            },
            { new: true }
          ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

          if (paidOrder) {
            await enqueueOrderFulfillment(paidOrder, { source: 'razorpay-webhook' });
            return { paid: true, orderId: paidOrder._id.toString() };
          }

          const latestOrder = await Order.findById(order._id).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
          if (latestOrder?.status === 'failed' && latestOrder.payment?.expiredAt && latestOrder.inventoryReleased) {
            const refundResult = await refundExpiredCapturedPayment(latestOrder, paymentEntity);
            return {
              expiredPaymentRefund: true,
              orderId: latestOrder._id.toString(),
              refundResult,
            };
          }

          return { skipped: true, reason: 'status_race_lost', orderId: order._id.toString() };
        }
      });
    }

    // ── COMPLETE refund webhook handling ──────────────────────────────────────
    if (event.event === 'refund.created' || event.event === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity || {};
      const refundStatus = String(refundEntity.status || '').toLowerCase();
      if (event.event !== 'refund.processed' && refundStatus !== 'processed') {
        return res.json({ success: true });
      }
      const rzpRefundId = boundedString(refundEntity.id, PAYMENT_ID_MAX_LENGTH);
      if (!rzpRefundId) return res.json({ success: true });

      const rzpOrderId = refundEntity.order_id;
      const rzpPaymentId = refundEntity.payment_id;
      let order = null;
      if (rzpOrderId) {
        order = await Order.findOne({ 'payment.razorpayOrderId': rzpOrderId })
          .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      } else if (rzpPaymentId) {
        order = await Order.findOne({ 'payment.razorpayPaymentId': rzpPaymentId })
          .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      }
      if (order && REFUNDABLE_ORDER_STATUSES.has(order.status)) {
        await runOnce({
          key: `razorpay:refund-processed:${rzpRefundId}`,
          scope: 'razorpay-webhook-refund',
          resourceType: 'RazorpayRefund',
          resourceId: rzpRefundId,
          lockMs: 15 * 60 * 1000,
          retentionMs: IDEMPOTENCY_EVENT_RETENTION_MS,
          handler: async () => {
            const currentOrder = await Order.findById(order._id)
              .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
            if (!currentOrder || !REFUNDABLE_ORDER_STATUSES.has(currentOrder.status)) {
              return { ignored: true, reason: 'order_not_refundable', orderId: order._id.toString() };
            }
            if (!refundMatchesOrder(refundEntity, currentOrder)) {
              console.warn('[paymentController] Ignored non-full or mismatched refund webhook for order:', currentOrder.orderNumber || currentOrder._id);
              return { ignored: true, reason: 'refund_mismatch', orderId: currentOrder._id.toString() };
            }

            const wasFulfilled = Boolean(currentOrder.payment?.paidAt) || FULFILLED_ORDER_STATUSES.has(currentOrder.status);

            // 1. Restore reserved physical stock exactly once across cancellation,
            // expiry, and refund races.
            await releasePhysicalStockOnce(currentOrder);
            if (wasFulfilled) {
              // 2. Decrement sales counter
              for (const item of currentOrder.items) {
                await runOnce({
                  key: `razorpay:refund-sales:${rzpRefundId}:${item.productId}`,
                  scope: 'razorpay-refund-sales',
                  resourceType: 'Product',
                  resourceId: item.productId.toString(),
                  handler: async () => {
                    await Product.findByIdAndUpdate(item.productId, { $inc: { 'stats.sales': -item.qty } })
                      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
                    return { orderId: currentOrder._id.toString(), qty: item.qty };
                  }
                });
              }
              // 3. Reverse coupon usage
              if (currentOrder.couponCode) {
                await runOnce({
                  key: `razorpay:refund-coupon:${rzpRefundId}:${String(currentOrder.couponCode).toUpperCase()}`,
                  scope: 'razorpay-refund-coupon',
                  resourceType: 'Coupon',
                  resourceId: String(currentOrder.couponCode).toUpperCase(),
                  handler: async () => {
                    await Coupon.findOneAndUpdate(
                      { code: currentOrder.couponCode, usedCount: { $gt: 0 } },
                      { $inc: { usedCount: -1 }, $pull: { usedBy: { orderId: currentOrder._id } } }
                    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
                    return { orderId: currentOrder._id.toString(), couponCode: currentOrder.couponCode };
                  }
                });
              }
              // 4. Reverse seller earnings
              await runOnce({
                key: `razorpay:refund-earnings:${rzpRefundId}:${currentOrder._id}`,
                scope: 'razorpay-refund-earnings',
                resourceType: 'Order',
                resourceId: currentOrder._id.toString(),
                handler: async () => {
                  await reverseEarningsForOrder(currentOrder._id);
                  return { orderId: currentOrder._id.toString() };
                }
              });
            }

            // 5. Notify buyer and seller
            const io = req.app.get('io');
            if (io) {
              io.to(`user:${currentOrder.buyerId}`).emit('notification:refund', {
                message: `Refund for order ${currentOrder.orderNumber} has been processed.`,
              });
              const sids = [...new Set(currentOrder.items.map(i => i.sellerId.toString()))];
              for (const sid of sids) {
                io.to(`user:${sid}`).emit('notification:order_refunded', {
                  message: `Order ${currentOrder.orderNumber} has been refunded.`,
                });
              }
            }
            await enqueueEmailJob('buyer-order-refunded', {
              userId: currentOrder.buyerId.toString(),
              orderId: currentOrder._id.toString(),
              orderNumber: currentOrder.orderNumber,
            }, {
              jobId: `buyer-order-refunded:${currentOrder._id}`
            });

            const refundedOrder = await Order.findOneAndUpdate(
              {
                _id: currentOrder._id,
                status: { $in: [...REFUNDABLE_ORDER_STATUSES] }
              },
              {
                $set: {
                  status: 'refunded',
                  notes: boundedString(`${currentOrder.notes || ''} Refund ID: ${rzpRefundId}`, 1000)
                }
              },
              { new: true }
            ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

            if (!refundedOrder) {
              return { skipped: true, reason: 'status_race_lost', orderId: currentOrder._id.toString() };
            }

            return { refunded: true, orderId: refundedOrder._id.toString() };
          }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    logError('[paymentController] webhook error:', error);
    res.status(500).json({ success: false });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/payments/orders/:id/download/:productId
// ─────────────────────────────────────────────────────────────────────────────
exports.getDownloadUrl = async (req, res) => {
  try {
    const { id, productId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid download request.' });
    }

    const order = await Order.findOne({ _id: id, buyerId: req.user._id })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['paid', 'delivered', 'completed'].includes(order.status)) {
      return res.status(403).json({ success: false, message: 'Payment required.' });
    }
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const orderDownloads = Array.isArray(order.downloads) ? order.downloads : [];
    const orderItem = orderItems.find(i => i.productId.toString() === productId);
    if (!orderItem || orderItem.type !== 'digital') {
      return res.status(404).json({ success: false, message: 'Digital item not found in order.' });
    }
    const product = await Product.findById(productId)
      .select('title digital.maxDownloads digital.fileFormat +digital.filePublicId')
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!product?.digital?.filePublicId) {
      return res.status(404).json({ success: false, message: 'File not found. Contact seller.' });
    }
    const maxDownloads = Math.max(1, Number(product.digital.maxDownloads || 5));
    const dlRecord = orderDownloads.find(d => d.productId.toString() === productId);
    if (dlRecord && dlRecord.count >= maxDownloads) {
      return res.status(429).json({
        success: false,
        message: `Download limit of ${maxDownloads} reached. Contact seller.`,
      });
    }
    const now = new Date();
    const downloadUpdate = dlRecord
      ? await Order.updateOne(
          {
            _id: order._id,
            buyerId: req.user._id,
            status: { $in: ['paid', 'delivered', 'completed'] },
            downloads: { $elemMatch: { productId: product._id, count: { $lt: maxDownloads } } },
          },
          { $inc: { 'downloads.$.count': 1 }, $set: { 'downloads.$.lastDownloadedAt': now } }
        ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS)
      : await Order.updateOne(
          {
            _id: order._id,
            buyerId: req.user._id,
            status: { $in: ['paid', 'delivered', 'completed'] },
            items: { $elemMatch: { productId: product._id, type: 'digital' } },
            'downloads.productId': { $ne: product._id },
          },
          { $push: { downloads: { productId: product._id, count: 1, lastDownloadedAt: now } } }
        ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (downloadUpdate.modifiedCount !== 1) {
      return res.status(429).json({
        success: false,
        message: `Download limit of ${maxDownloads} reached. Contact seller.`,
      });
    }
    const signedUrl = cloudinary.utils.private_download_url(
      product.digital.filePublicId,
      product.digital.fileFormat || 'raw',
      {
        expires_at: Math.floor(Date.now() / 1000) + 900,
        upload_prefix: 'https://api.cloudinary.com',
      }
    );
    if (!isSafeHttpsUrl(signedUrl)) {
      logError(
        '[paymentController] unsafe private download URL generated:',
        new Error('Cloudinary private download URL was not HTTPS.')
      );
      return res.status(500).json({ success: false, message: genericPaymentError });
    }

    res.json({
      success: true,
      url: signedUrl,
      expiresIn: 900,
      fileName: boundedString(product.title, 180) || 'download',
    });
  } catch (error) {
    logError('[paymentController] getDownloadUrl:', error);
    res.status(500).json({ success: false, message: genericPaymentError });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
