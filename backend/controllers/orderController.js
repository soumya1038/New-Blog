const Order           = require('../models/Order');
const Product         = require('../models/Product');
const Coupon          = require('../models/Coupon');
const SellerFeedback  = require('../models/SellerFeedback');
const StoreSettings   = require('../models/StoreSettings');
const Razorpay        = require('razorpay');
const mongoose        = require('mongoose');
const { enqueueEmailJob } = require('../jobs/queueService');
const { reverseEarningsForOrder } = require('./earningsController');
const { logError } = require('../utils/safeErrorLog');

const razorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const MAX_ORDER_PAGE_LIMIT = Math.max(1, Number(process.env.MAX_ORDER_PAGE_LIMIT) || 100);
const MAX_RESTOCK_QTY = Math.max(1, Number(process.env.MAX_RESTOCK_QTY) || 10000);
const ORDER_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.ORDER_QUERY_MAX_TIME_MS) || 5000);
const SELLER_FEEDBACK_COMMENT_MAX_LENGTH = Math.max(1, Number(process.env.SELLER_FEEDBACK_COMMENT_MAX_LENGTH) || 1000);
const SELLER_FEEDBACK_STATUSES = new Set(['completed', 'delivered']);
const SELLER_FEEDBACK_ANSWERS = new Set(['Yes', 'No']);
const ORDER_STATUSES = new Set([
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'failed',
  'refunded',
  'cancelled',
]);

const sendOrderServerError = (res, error) => {
  logError('[orderController] request failed:', error);
  return res.status(500).json({ success: false, message: 'Unable to process order request' });
};

const idString = value => {
  if (!value) return '';
  return String(value._id || value);
};

const isSellerOrderItem = (item, sellerId) => idString(item.sellerId) === idString(sellerId);
const sellerOwnsEntireOrder = (order, sellerId) =>
  Array.isArray(order.items) && order.items.length > 0 && order.items.every(item => isSellerOrderItem(item, sellerId));

const sanitizeOrderForResponse = (order) => {
  const obj = typeof order.toObject === 'function' ? order.toObject() : { ...order };
  return {
    ...obj,
    payment: {
      method: obj.payment?.method || '',
      razorpayPaymentId: obj.payment?.razorpayPaymentId || '',
      paidAt: obj.payment?.paidAt || null,
    }
  };
};

const getPagination = ({ page = 1, limit = 20 }) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.min(MAX_ORDER_PAGE_LIMIT, Math.max(1, parseInt(limit, 10) || 20));
  return { page: pageNumber, limit: limitNumber, skip: (pageNumber - 1) * limitNumber };
};

const parsePositiveInteger = (value, max) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) return null;
  return parsed;
};

const normalizeOrderNoteText = (value = '', maxLength = 500) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const normalizeSellerFeedbackAnswer = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'yes') return 'Yes';
  if (normalized === 'no') return 'No';
  return '';
};

const refreshSellerAverageRating = async (sellerId) => {
  const sellerObjectId = new mongoose.Types.ObjectId(String(sellerId));
  const [ratingStats] = await SellerFeedback.aggregate([
    { $match: { sellerId: sellerObjectId } },
    {
      $group: {
        _id: '$sellerId',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]).option({ maxTimeMS: ORDER_QUERY_MAX_TIME_MS });
  const averageRating = Math.round((ratingStats?.averageRating || 0) * 10) / 10;

  await StoreSettings.findOneAndUpdate(
    { sellerId: sellerObjectId },
    {
      $set: {
        'stats.averageRating': averageRating,
        'stats.ratingCount': ratingStats?.ratingCount || 0,
      },
      $setOnInsert: { sellerId: sellerObjectId },
    },
    { upsert: true, new: true }
  ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

  return {
    averageRating,
    ratingCount: ratingStats?.ratingCount || 0,
  };
};

const normalizeOrderStatusFilter = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return '';
  return ORDER_STATUSES.has(normalized) ? normalized : null;
};

const safeItemQuantity = value => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

const physicalStockQty = product => Math.max(0, Number(product?.physical?.stock) || 0);

const releasePhysicalInventory = async (order) => {
  if (!order || order.inventoryReleased) return false;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const releaseResult = await Order.updateOne(
      { _id: order._id, inventoryReleased: { $ne: true } },
      { $set: { inventoryReleased: true } },
      { session }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (releaseResult.modifiedCount !== 1) {
      throw new Error('Unable to mark order inventory as released.');
    }

    for (const item of order.items.filter(i => i.type === 'physical')) {
      const qty = safeItemQuantity(item.qty);
      if (!qty) continue;
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { 'physical.stock': qty },
      }, { session }).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    }

    await session.commitTransaction();
    order.inventoryReleased = true;
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const sellerScopedOrder = (order, sellerId) => {
  const obj = typeof order.toObject === 'function' ? order.toObject() : order;
  const items = (obj.items || []).filter(item => isSellerOrderItem(item, sellerId));
  const sellerSubtotal = Math.round(
    items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0) * 100
  ) / 100;
  const ownsPhysicalItem = items.some(item => item.type === 'physical');
  const shipping = ownsPhysicalItem
    ? obj.shipping
    : {
        trackingNumber: obj.shipping?.trackingNumber || '',
        courier: obj.shipping?.courier || '',
        shippedAt: obj.shipping?.shippedAt || null,
        deliveredAt: obj.shipping?.deliveredAt || null,
      };

  return {
    _id: obj._id,
    orderNumber: obj.orderNumber,
    buyerId: obj.buyerId,
    items,
    status: obj.status,
    currency: obj.currency,
    total: sellerSubtotal,
    sellerSubtotal,
    couponDiscount: 0,
    shippingFee: 0,
    platformFee: 0,
    shipping,
    notes: '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

// GET /api/orders
exports.getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pagination = getPagination({ page, limit });
    const query = { buyerId: req.user._id };
    const normalizedStatus = normalizeOrderStatusFilter(status);
    if (normalizedStatus === null) {
      return res.status(400).json({ success: false, message: 'Invalid order status.' });
    }
    if (normalizedStatus) query.status = normalizedStatus;
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate('items.productId', 'title thumbnail slug type digital.maxDownloads')
        .maxTimeMS(ORDER_QUERY_MAX_TIME_MS),
      Order.countDocuments(query).maxTimeMS(ORDER_QUERY_MAX_TIME_MS),
    ]);
    res.json({ success: true, orders: orders.map(sanitizeOrderForResponse), total });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id.' });
    }
    const isAdmin  = ['admin', 'coAdmin'].includes(req.user.role);
    const orderQuery = isAdmin
      ? { _id: req.params.id }
      : {
          _id: req.params.id,
          $or: [
            { buyerId: req.user._id },
            { 'items.sellerId': req.user._id },
          ],
        };
    const order = await Order.findOne(orderQuery)
      .populate('buyerId',         'username name profileImage')
      .populate('items.productId', 'title thumbnail slug type digital.maxDownloads')
      .populate('items.sellerId',  'username name profileImage')
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const isBuyer  = idString(order.buyerId) === req.user._id.toString();
    const isSeller = order.items.some(i => idString(i.sellerId) === req.user._id.toString());
    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (isSeller && !isBuyer && !isAdmin) {
      return res.json({ success: true, order: sellerScopedOrder(order, req.user._id) });
    }
    const responseOrder = sanitizeOrderForResponse(order);
    if (isBuyer) {
      responseOrder.sellerFeedbacks = await SellerFeedback.find({
        orderId: order._id,
        buyerId: req.user._id,
      })
        .select('sellerId rating arrivedOnTime asDescribed comments createdAt')
        .maxTimeMS(ORDER_QUERY_MAX_TIME_MS)
        .lean();
    }
    res.json({ success: true, order: responseOrder });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// GET /api/seller/orders
exports.getSellerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pagination = getPagination({ page, limit });
    const query = { 'items.sellerId': req.user._id };
    const normalizedStatus = normalizeOrderStatusFilter(status);
    if (normalizedStatus === null) {
      return res.status(400).json({ success: false, message: 'Invalid order status.' });
    }
    if (normalizedStatus) query.status = normalizedStatus;
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate('buyerId', 'username name profileImage')
        .populate('items.productId', 'title thumbnail slug type digital.maxDownloads')
        .populate('items.sellerId', 'username name profileImage')
        .maxTimeMS(ORDER_QUERY_MAX_TIME_MS),
      Order.countDocuments(query).maxTimeMS(ORDER_QUERY_MAX_TIME_MS),
    ]);
    res.json({ success: true, orders: orders.map(order => sellerScopedOrder(order, req.user._id)), total });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// PATCH /api/seller/orders/:id/ship
exports.markShipped = async (req, res) => {
  try {
    const { trackingNumber, courier } = req.body;
    const safeTrackingNumber = String(trackingNumber || '').trim();
    const safeCourier = String(courier || '').trim();
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id.' });
    }
    if (!safeTrackingNumber || !safeCourier || safeTrackingNumber.length > 80 || safeCourier.length > 80) {
      return res.status(400).json({ success: false, message: 'Tracking number and courier are required.' });
    }
    const order = await Order.findOne({ _id: req.params.id, 'items.sellerId': req.user._id })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!sellerOwnsEntireOrder(order, req.user._id)) {
      return res.status(409).json({ success: false, message: 'Multi-seller orders require item-level fulfillment support.' });
    }
    if (!order.items.some(item => item.type === 'physical') || order.items.some(item => item.type === 'service')) {
      return res.status(400).json({ success: false, message: 'Only physical-product orders can be marked shipped.' });
    }
    if (!['paid', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot ship an order with status "${order.status}".` });
    }
    const shippedAt = new Date();
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, 'items.sellerId': req.user._id, status: { $in: ['paid', 'processing'] } },
      {
        $set: {
          status: 'shipped',
          'shipping.trackingNumber': safeTrackingNumber,
          'shipping.courier': safeCourier,
          'shipping.shippedAt': shippedAt,
        },
      },
      { new: true }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!updatedOrder) {
      return res.status(409).json({ success: false, message: 'Order status changed. Refresh and try again.' });
    }

    const io = req.app.get('io');
    if (io) io.to(`user:${updatedOrder.buyerId}`).emit('notification:order_shipped', {
      message: `Your order ${order.orderNumber} has been shipped.`,
      orderNumber: order.orderNumber, trackingNumber: safeTrackingNumber, courier: safeCourier,
    });
    await enqueueEmailJob('buyer-order-shipped', {
      userId: updatedOrder.buyerId.toString(),
      orderId: updatedOrder._id.toString(),
      orderNumber: order.orderNumber,
      trackingNumber: safeTrackingNumber,
      courier: safeCourier,
    });
    res.json({ success: true, order: sellerScopedOrder(updatedOrder, req.user._id) });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// PATCH /api/orders/:id/complete  (buyer confirms receipt)
exports.completeOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id.' });
    }
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be completed yet.' });
    }
    const completedAt = new Date();
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, buyerId: req.user._id, status: { $in: ['shipped', 'delivered'] } },
      {
        $set: {
          status: 'completed',
          'shipping.deliveredAt': completedAt,
        },
      },
      { new: true }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!updatedOrder) {
      return res.status(409).json({ success: false, message: 'Order status changed. Refresh and try again.' });
    }

    res.json({ success: true, order: sanitizeOrderForResponse(updatedOrder) });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// POST /api/orders/:id/seller-feedback  (buyer rates seller/store)
exports.submitSellerFeedback = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id.' });
    }

    const sellerId = req.body.sellerId;
    if (!mongoose.isValidObjectId(sellerId)) {
      return res.status(400).json({ success: false, message: 'Invalid seller id.' });
    }

    const rating = Number.parseInt(req.body.rating, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    const arrivedOnTime = normalizeSellerFeedbackAnswer(req.body.arrivedOnTime);
    const asDescribed = normalizeSellerFeedbackAnswer(req.body.asDescribed);
    if (!SELLER_FEEDBACK_ANSWERS.has(arrivedOnTime) || !SELLER_FEEDBACK_ANSWERS.has(asDescribed)) {
      return res.status(400).json({ success: false, message: 'Please answer every seller feedback question.' });
    }

    const comments = normalizeOrderNoteText(req.body.comments, SELLER_FEEDBACK_COMMENT_MAX_LENGTH);
    if (!comments) {
      return res.status(400).json({ success: false, message: 'Please add a seller feedback comment.' });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      buyerId: req.user._id,
      status: { $in: [...SELLER_FEEDBACK_STATUSES] },
      'items.sellerId': sellerId,
    }).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) {
      return res.status(403).json({ success: false, message: 'You can only rate sellers from completed orders.' });
    }

    const exists = await SellerFeedback.findOne({
      orderId: order._id,
      sellerId,
    }).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (exists) {
      return res.status(400).json({ success: false, message: 'You have already submitted seller feedback for this order.' });
    }

    const feedback = await SellerFeedback.create({
      orderId: order._id,
      sellerId,
      buyerId: req.user._id,
      rating,
      arrivedOnTime,
      asDescribed,
      comments,
      isVerifiedPurchase: true,
    });

    const storeRating = await refreshSellerAverageRating(sellerId);
    res.status(201).json({ success: true, feedback, storeRating });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already submitted seller feedback for this order.' });
    }
    return sendOrderServerError(res, error);
  }
};

// PATCH /api/seller/orders/:id/deliver  (seller delivers service)
exports.deliverService = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id.' });
    }
    const order = await Order.findOne({ _id: req.params.id, 'items.sellerId': req.user._id })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!sellerOwnsEntireOrder(order, req.user._id)) {
      return res.status(409).json({ success: false, message: 'Multi-seller orders require item-level fulfillment support.' });
    }
    if (!order.items.every(item => item.type === 'service')) {
      return res.status(409).json({ success: false, message: 'Service delivery can only complete service-only orders.' });
    }
    if (!['paid', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot deliver an order with status "${order.status}".` });
    }
    const hasSellerService = order.items.some(item => item.type === 'service' && item.sellerId.toString() === req.user._id.toString());
    if (!hasSellerService) return res.status(400).json({ success: false, message: 'This order has no service item for your store.' });
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 1000) : '';
    const deliveredAt = new Date();
    const update = {
      status: 'delivered',
      'shipping.deliveredAt': deliveredAt,
    };
    if (note) update.notes = note;
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, 'items.sellerId': req.user._id, status: { $in: ['paid', 'processing'] } },
      { $set: update },
      { new: true }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!updatedOrder) {
      return res.status(409).json({ success: false, message: 'Order status changed. Refresh and try again.' });
    }

    const io = req.app.get('io');
    if (io) io.to(`user:${updatedOrder.buyerId}`).emit('notification:order_delivered', {
      message: `Your order ${order.orderNumber} has been delivered.`,
      orderNumber: order.orderNumber,
    });
    res.json({ success: true, order: sellerScopedOrder(updatedOrder, req.user._id) });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// PATCH /api/orders/:id/cancel  (buyer cancels)
exports.cancelOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id.' });
    }
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const cancellableStatuses = ['pending_payment', 'failed', 'paid', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order that is already ${order.status}. Contact support.`,
      });
    }

    const previousStatus = order.status;
    const safeReason = normalizeOrderNoteText(req.body.reason);
    const baseCancellationNote = `Cancelled by buyer.${safeReason ? ` ${safeReason}` : ''}`;
    const claimResult = await Order.updateOne(
      { _id: order._id, buyerId: req.user._id, status: previousStatus },
      { $set: { status: 'cancelled', notes: baseCancellationNote } }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (claimResult.modifiedCount !== 1) {
      return res.status(409).json({ success: false, message: 'Order status changed. Refresh and try again.' });
    }
    order.status = 'cancelled';
    order.notes = baseCancellationNote;

    try {
      await releasePhysicalInventory(order);
    } catch (error) {
      await Order.updateOne(
        { _id: order._id, status: 'cancelled', inventoryReleased: { $ne: true } },
        { $set: { status: previousStatus }, $unset: { notes: '' } }
      ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      throw error;
    }

    const wasFulfilled = !!order.payment?.paidAt || ['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(previousStatus);
    if (wasFulfilled) {
      for (const item of order.items) {
        const qty = safeItemQuantity(item.qty);
        if (!qty) continue;
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { 'stats.sales': -qty },
        }).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      }

      if (order.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode, usedCount: { $gt: 0 } },
          {
            $inc: { usedCount: -1 },
            $pull: { usedBy: { orderId: order._id } },
          }
        ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      }

      await reverseEarningsForOrder(order._id);
    }

    let refundId = '';
    if (order.payment?.razorpayPaymentId && !['pending_payment', 'failed'].includes(previousStatus)) {
      try {
        const rzp = razorpay();
        const refund = await rzp.payments.refund(order.payment.razorpayPaymentId, {
          amount: Math.round(order.total * 100),
          notes: { reason: safeReason || 'Buyer cancelled order', orderId: order._id.toString() },
        });
        refundId = refund.id;
      } catch (rzpErr) {
        logError('[cancelOrder] Razorpay refund failed:', rzpErr);
      }
    }

    if (refundId) {
      order.notes = `${baseCancellationNote} Refund ID: ${refundId}`.trim();
      await Order.updateOne({ _id: order._id }, { $set: { notes: order.notes } })
        .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    }

    const io = req.app.get('io');
    const sellerIds = [...new Set(order.items.map(i => i.sellerId.toString()))];
    if (io) {
      for (const sid of sellerIds) {
        io.to(`user:${sid}`).emit('notification:order_cancelled', {
          message: `Order ${order.orderNumber} was cancelled by the buyer.`,
          orderNumber: order.orderNumber,
        });
      }
    }

    res.json({
      success: true,
      order: sanitizeOrderForResponse(order),
      refundInitiated: !!refundId,
      message: refundId
        ? `Order cancelled. Refund of Rs. ${order.total} initiated (may take 5-7 business days).`
        : 'Order cancelled.',
    });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// DELETE /api/orders/:id  (buyer removes failed or unpaid order)
exports.deleteUnpaidOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id.' });
    }
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const deletableStatuses = ['pending_payment', 'failed', 'cancelled'];
    if (!deletableStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Only failed, unpaid, or cancelled orders can be deleted.' });
    }
    const previousStatus = order.status;
    const claimResult = await Order.updateOne(
      { _id: order._id, buyerId: req.user._id, status: previousStatus },
      { $set: { status: 'cancelled' } }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (claimResult.matchedCount !== 1) {
      return res.status(409).json({ success: false, message: 'Order status changed. Refresh and try again.' });
    }
    order.status = 'cancelled';

    if (['pending_payment', 'failed'].includes(previousStatus)) {
      try {
        await releasePhysicalInventory(order);
      } catch (error) {
        await Order.updateOne(
          { _id: order._id, status: 'cancelled', inventoryReleased: { $ne: true } },
          { $set: { status: previousStatus } }
        ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
        throw error;
      }
    }
    const deleteResult = await Order.deleteOne({ _id: order._id, buyerId: req.user._id, status: 'cancelled' })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (deleteResult.deletedCount !== 1) {
      return res.status(409).json({ success: false, message: 'Order status changed. Refresh and try again.' });
    }
    res.json({ success: true, message: 'Order deleted.' });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// PATCH /api/seller/orders/:id/restock  (seller updates stock)
exports.restockProduct = async (req, res) => {
  try {
    const { productId, addStock } = req.body;
    const qty = parsePositiveInteger(addStock, MAX_RESTOCK_QTY);
    if (!mongoose.isValidObjectId(productId) || !qty) {
      return res.status(400).json({ success: false, message: `productId and addStock (1-${MAX_RESTOCK_QTY}) are required.` });
    }
    const product = await Product.findOne({ _id: productId, sellerId: req.user._id })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.type !== 'physical') return res.status(400).json({ success: false, message: 'Only physical products can be restocked.' });

    const update = { $inc: { 'physical.stock': qty } };
    if (product.status === 'paused' && physicalStockQty(product) + qty > 0) {
      update.$set = { status: 'active' };
    }
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: product._id, sellerId: req.user._id, type: 'physical' },
      update,
      { new: true }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    res.json({ success: true, newStock: updatedProduct.physical.stock, product: updatedProduct });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  NEW: PATCH /api/admin/seller-revoke/:userId  (admin revokes seller badge)
// ─────────────────────────────────────────────────────────────────────────────
exports.revokeSeller = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }
    const user = await require('../models/User').findById(req.params.userId)
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.isSeller         = false;
    user.sellerApprovedAt = null;
    await user.save();
    // Archive all their products
    await Product.updateMany({ sellerId: user._id, status: { $ne: 'archived' } }, { status: 'paused' })
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    res.json({ success: true, message: `Seller badge revoked for @${user.username}.` });
  } catch (error) {
    return sendOrderServerError(res, error);
  }
};
