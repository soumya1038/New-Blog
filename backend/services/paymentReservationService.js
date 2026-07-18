const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { enqueueOrderFulfillment } = require('./marketplaceFulfillmentService');
const { runOnce } = require('./idempotencyService');
const { logError, logWarn } = require('../utils/safeErrorLog');
const { getRazorpayProviderTimeoutMs, withProviderTimeout } = require('../utils/providerTimeouts');

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const ORDER_QUERY_MAX_TIME_MS = toPositiveInt(process.env.ORDER_QUERY_MAX_TIME_MS, 5000);
const PAYMENT_RESERVATION_TTL_MINUTES = Math.min(
  24 * 60,
  toPositiveInt(process.env.PAYMENT_RESERVATION_TTL_MINUTES, 30)
);
const PAYMENT_EXPIRY_BATCH_LIMIT = Math.min(
  500,
  toPositiveInt(process.env.PAYMENT_EXPIRY_BATCH_LIMIT, 50)
);
const PAYMENT_EXPIRY_LOCK_MS = toPositiveInt(process.env.PAYMENT_EXPIRY_LOCK_MS, 5 * 60 * 1000);
const AUTHORIZED_PAYMENT_GRACE_MINUTES = Math.min(
  24 * 60,
  toPositiveInt(process.env.AUTHORIZED_PAYMENT_GRACE_MINUTES, 60)
);
const PAYMENT_ID_MAX_LENGTH = 100;
const IDEMPOTENCY_EVENT_RETENTION_MS = Math.max(
  30,
  Math.min(3650, Number(process.env.IDEMPOTENCY_EVENT_RETENTION_DAYS) || 730)
) * 24 * 60 * 60 * 1000;
const RAZORPAY_PROVIDER_TIMEOUT_MS = getRazorpayProviderTimeoutMs();

let sweepInProgress = false;

const createRazorpayClient = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const callRazorpay = (promise, label) =>
  withProviderTimeout(promise, label, RAZORPAY_PROVIDER_TIMEOUT_MS);

const toPaise = amount => Math.round(Number(amount || 0) * 100);

const boundedId = value => String(value || '').trim().slice(0, PAYMENT_ID_MAX_LENGTH);

const paymentEntityMatchesOrder = (payment = {}, order) => (
  Boolean(boundedId(payment.id)) &&
  payment.order_id === order.payment?.razorpayOrderId &&
  Number(payment.amount) === toPaise(order.total) &&
  String(payment.currency || '').toUpperCase() === String(order.currency || 'INR').toUpperCase()
);

const getPaymentItems = response => (
  Array.isArray(response) ? response : Array.isArray(response?.items) ? response.items : []
);

const unlockExpiryCheck = async (orderId, claimTime, extraSet = {}) => {
  await Order.updateOne(
    {
      _id: orderId,
      status: 'pending_payment',
      'payment.expiryCheckStartedAt': claimTime,
    },
    {
      $set: {
        'payment.expiryCheckStartedAt': null,
        ...extraSet,
      },
    }
  ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
};

const markCapturedOrderPaid = async (order, payment, claimTime) => {
  const paidOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: 'pending_payment',
      'payment.expiryCheckStartedAt': claimTime,
    },
    {
      $set: {
        status: 'paid',
        'payment.razorpayPaymentId': boundedId(payment.id),
        'payment.paidAt': new Date(),
        'payment.reservationExpiresAt': null,
        'payment.expiryCheckStartedAt': null,
      },
    },
    { new: true }
  ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

  if (!paidOrder) return { reconciled: false, reason: 'status_race_lost' };
  await enqueueOrderFulfillment(paidOrder, { source: 'payment-expiry-reconciliation' });
  return { reconciled: true, paid: true, orderId: paidOrder._id.toString() };
};

const expireClaimedOrder = async (orderId, claimTime) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({
      _id: orderId,
      status: 'pending_payment',
      'payment.expiryCheckStartedAt': claimTime,
    })
      .session(session)
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (!order) {
      await session.abortTransaction();
      return { expired: false, reason: 'status_race_lost' };
    }

    const shouldRestoreInventory = !order.inventoryReleased;
    const expiredAt = new Date();
    const updateResult = await Order.updateOne(
      {
        _id: order._id,
        status: 'pending_payment',
        'payment.expiryCheckStartedAt': claimTime,
      },
      {
        $set: {
          status: 'failed',
          inventoryReleased: true,
          notes: 'Payment reservation expired before payment was confirmed.',
          'payment.expiredAt': expiredAt,
          'payment.reservationExpiresAt': null,
          'payment.expiryCheckStartedAt': null,
        },
      },
      { session }
    ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
    if (updateResult.modifiedCount !== 1) {
      throw new Error('Unable to claim expired payment order.');
    }

    if (shouldRestoreInventory) {
      for (const item of order.items.filter(entry => entry.type === 'physical')) {
        const qty = Number(item.qty);
        if (!Number.isInteger(qty) || qty <= 0) continue;
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { 'physical.stock': qty } },
          { session }
        ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      }
    }

    await session.commitTransaction();
    return { expired: true, orderId: order._id.toString() };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const reconcileClaimedOrder = async (order, claimTime) => {
  const razorpayOrderId = boundedId(order.payment?.razorpayOrderId);
  if (!razorpayOrderId) {
    return expireClaimedOrder(order._id, claimTime);
  }

  let paymentsResponse;
  try {
    paymentsResponse = await callRazorpay(
      createRazorpayClient().orders.fetchPayments(razorpayOrderId),
      'Razorpay order payment lookup'
    );
  } catch (error) {
    await unlockExpiryCheck(order._id, claimTime);
    throw error;
  }

  const matchingPayments = getPaymentItems(paymentsResponse)
    .filter(payment => paymentEntityMatchesOrder(payment, order));
  const capturedPayment = matchingPayments.find(payment => payment.status === 'captured' || payment.captured === true);
  if (capturedPayment) {
    return markCapturedOrderPaid(order, capturedPayment, claimTime);
  }

  const authorizedPayment = matchingPayments.find(payment => payment.status === 'authorized');
  if (authorizedPayment) {
    const retryAt = new Date(Date.now() + AUTHORIZED_PAYMENT_GRACE_MINUTES * 60 * 1000);
    await unlockExpiryCheck(order._id, claimTime, { 'payment.reservationExpiresAt': retryAt });
    return { expired: false, authorized: true, retryAt };
  }

  return expireClaimedOrder(order._id, claimTime);
};

const runPaymentReservationExpirySweep = async () => {
  if (sweepInProgress) return { skipped: true, reason: 'already_running' };
  sweepInProgress = true;

  const now = new Date();
  const staleLockCutoff = new Date(now.getTime() - PAYMENT_EXPIRY_LOCK_MS);
  const legacyCutoff = new Date(now.getTime() - PAYMENT_RESERVATION_TTL_MINUTES * 60 * 1000);
  let reconciled = 0;
  let expired = 0;
  let deferred = 0;
  let failed = 0;

  try {
    const candidates = await Order.find({
      status: 'pending_payment',
      inventoryReleased: { $ne: true },
      $and: [
        {
          $or: [
            { 'payment.reservationExpiresAt': { $lte: now } },
            {
              'payment.reservationExpiresAt': null,
              createdAt: { $lte: legacyCutoff },
            },
          ],
        },
        {
          $or: [
            { 'payment.expiryCheckStartedAt': null },
            { 'payment.expiryCheckStartedAt': { $lte: staleLockCutoff } },
          ],
        },
      ],
    })
      .select('_id')
      .sort({ 'payment.reservationExpiresAt': 1, _id: 1 })
      .limit(PAYMENT_EXPIRY_BATCH_LIMIT)
      .lean()
      .maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

    for (const candidate of candidates) {
      const claimTime = new Date();
      const order = await Order.findOneAndUpdate(
        {
          _id: candidate._id,
          status: 'pending_payment',
          inventoryReleased: { $ne: true },
          $or: [
            { 'payment.expiryCheckStartedAt': null },
            { 'payment.expiryCheckStartedAt': { $lte: staleLockCutoff } },
          ],
        },
        { $set: { 'payment.expiryCheckStartedAt': claimTime } },
        { new: true }
      ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      if (!order) continue;

      try {
        const result = await reconcileClaimedOrder(order, claimTime);
        if (result.paid) reconciled += 1;
        else if (result.expired) expired += 1;
        else deferred += 1;
      } catch (error) {
        failed += 1;
        logWarn(`[payment-expiry] Reconciliation failed for order ${order._id}:`, error);
      }
    }

    return { checked: candidates.length, reconciled, expired, deferred, failed };
  } finally {
    sweepInProgress = false;
  }
};

const findRefundByReceipt = async (client, paymentId, receipt) => {
  const response = await callRazorpay(
    client.payments.fetchMultipleRefund(paymentId, { count: 100 }),
    'Razorpay refund lookup'
  );
  return getPaymentItems(response).find(refund => refund.receipt === receipt) || null;
};

const refundExpiredCapturedPayment = async (order, paymentEntity) => {
  if (
    !order?.payment?.expiredAt ||
    !order.inventoryReleased ||
    !paymentEntityMatchesOrder(paymentEntity, order) ||
    paymentEntity.status !== 'captured'
  ) {
    return { refunded: false, reason: 'not_expired_captured_payment' };
  }

  const paymentId = boundedId(paymentEntity.id);
  const receipt = `expired_${order._id.toString().slice(-24)}`;
  return runOnce({
    key: `razorpay:expired-payment-refund:${paymentId}`,
    scope: 'razorpay-expired-payment-refund',
    resourceType: 'Order',
    resourceId: order._id.toString(),
    lockMs: 15 * 60 * 1000,
    retentionMs: IDEMPOTENCY_EVENT_RETENTION_MS,
    handler: async () => {
      const currentOrder = await Order.findById(order._id).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);
      if (!currentOrder?.payment?.expiredAt || !currentOrder.inventoryReleased) {
        return { refunded: false, reason: 'order_no_longer_expired' };
      }
      if (currentOrder.payment.lateRefundId) {
        return { refunded: true, refundId: currentOrder.payment.lateRefundId, alreadyInitiated: true };
      }

      await Order.updateOne(
        { _id: currentOrder._id, 'payment.lateRefundId': '' },
        {
          $set: {
            'payment.razorpayPaymentId': paymentId,
            'payment.lateRefundInitiatedAt': new Date(),
          },
        }
      ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

      const client = createRazorpayClient();
      let refund;
      try {
        refund = await callRazorpay(client.payments.refund(paymentId, {
          amount: toPaise(currentOrder.total),
          receipt,
          notes: {
            reason: 'Payment captured after local inventory reservation expired',
            orderId: currentOrder._id.toString(),
          },
        }), 'Razorpay refund creation');
      } catch (error) {
        try {
          refund = await findRefundByReceipt(client, paymentId, receipt);
        } catch (lookupError) {
          logError('[payment-expiry] Refund recovery lookup failed:', lookupError);
        }
        if (!refund) throw error;
      }

      const refundId = boundedId(refund.id);
      if (!refundId) throw new Error('Razorpay did not return a refund id.');
      await Order.updateOne(
        { _id: currentOrder._id, 'payment.razorpayPaymentId': paymentId },
        { $set: { 'payment.lateRefundId': refundId } }
      ).maxTimeMS(ORDER_QUERY_MAX_TIME_MS);

      return { refunded: true, refundId };
    },
  });
};

module.exports = {
  createRazorpayClient,
  paymentEntityMatchesOrder,
  refundExpiredCapturedPayment,
  runPaymentReservationExpirySweep,
};
