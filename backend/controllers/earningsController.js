const SellerEarning   = require('../models/SellerEarning');
const Payout          = require('../models/Payout');
const Order           = require('../models/Order');
const User            = require('../models/User');
const SellerApplication = require('../models/SellerApplication');
const mongoose        = require('mongoose');
const { decrypt }     = require('../utils/encryption');
const { enqueueEmailJob } = require('../jobs/queueService');
const { logError } = require('../utils/safeErrorLog');
const { getRazorpayProviderTimeoutMs } = require('../utils/providerTimeouts');

const HOLD_DAYS           = parseInt(process.env.SELLER_PAYOUT_HOLD_DAYS  || '7');
const COMMISSION_RATE     = parseFloat(process.env.COMMISSION_RATE         || '0');
const GATEWAY_FEE_RATE    = parseFloat(process.env.RAZORPAY_FEE_RATE       || '2.36'); // Razorpay ~2% + 18% GST
const AUTO_RAZORPAYX_PAYOUTS = process.env.RAZORPAYX_AUTO_PAYOUTS === 'true';
const MAX_EARNINGS_PAGE_LIMIT = Math.max(1, Number(process.env.MAX_EARNINGS_PAGE_LIMIT) || 100);
const MAX_ADMIN_PAYOUT_PAGE_LIMIT = Math.max(1, Number(process.env.MAX_ADMIN_PAYOUT_PAGE_LIMIT) || 100);
const MAX_PAYOUT_EARNING_BATCH = Math.max(1, Number(process.env.MAX_PAYOUT_EARNING_BATCH) || 500);
const EARNINGS_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.EARNINGS_QUERY_MAX_TIME_MS) || 5000);
const EARNING_STATUSES = new Set(['pending', 'available', 'processing', 'paid_out', 'reversed']);
const PAYOUT_STATUSES = new Set(['queued', 'processing', 'processed', 'reversed', 'failed']);

const sendEarningsServerError = (res, error) => {
  logError('[earningsController] request failed:', error);
  return res.status(500).json({ success: false, message: 'Unable to process earnings request' });
};

const isRazorpayXConfigured = () => Boolean(
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  process.env.RAZORPAYX_ACCOUNT_NUMBER
);

const sanitizeRazorpayContactName = (value, fallback = 'Lekhon Seller') => {
  let cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9 ’\-_/().]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
    .trim();

  while (cleaned && !/[a-zA-Z0-9.]$/.test(cleaned)) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  return cleaned.length >= 3 ? cleaned : fallback;
};

const buildRazorpayReference = (prefix, value) =>
  `${prefix}-${String(value || '')}`
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40);

const getPagination = ({ page = 1, limit = 20 }, maxLimit) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.min(maxLimit, Math.max(1, parseInt(limit, 10) || 20));
  return { page: pageNumber, limit: limitNumber, skip: (pageNumber - 1) * limitNumber };
};

const maskUpi = (value = '') => {
  const upi = String(value || '').trim().toLowerCase();
  const [name, handle] = upi.split('@');
  if (!name || !handle) return upi;
  return `${name.slice(0, 2)}${name.length > 2 ? '***' : ''}@${handle}`;
};

const serializePayout = (payout, { includeFailureReason = false } = {}) => {
  if (!payout) return payout;
  const item = typeof payout.toObject === 'function' ? payout.toObject() : { ...payout };

  if (item.payoutDetails) {
    item.payoutDetails = {
      method: item.method,
      upiId: item.method === 'upi' ? maskUpi(item.payoutDetails.upiId) : '',
      bankAccount: item.method === 'bank' ? item.payoutDetails.bankAccount || '' : '',
      ifsc: item.method === 'bank' ? item.payoutDetails.ifsc || '' : '',
    };
  }
  if (item.sellerId && typeof item.sellerId === 'object') {
    item.sellerId = {
      _id: item.sellerId._id,
      username: item.sellerId.username || '',
      name: item.sellerId.name || '',
      profileImage: item.sellerId.profileImage || '',
    };
  }
  if (!includeFailureReason || item.status !== 'failed') item.failureReason = '';
  delete item.earningIds;
  delete item.__v;
  return item;
};

const queuePayoutForManualProcessing = async (
  payout,
  notes = 'Queued for manual admin processing.'
) => {
  payout.status = 'queued';
  payout.failureReason = '';
  payout.notes = notes;
  await payout.save();
};

// ─────────────────────────────────────────────────────────────────────────────
//  Internal helper — called from paymentController after order is paid
// ─────────────────────────────────────────────────────────────────────────────
exports.createEarningsForOrder = async (order) => {
  try {
    // Group items by seller
    const bySeller = {};
    for (const item of order.items) {
      const sid = item.sellerId.toString();
      if (!bySeller[sid]) bySeller[sid] = [];
      bySeller[sid].push(item);
    }

    const holdUntil   = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000);
    const availableAt = holdUntil;

    for (const [sellerId, items] of Object.entries(bySeller)) {
      const grossAmount = items.reduce((s, i) => s + i.subtotal, 0);
      const platformFee = Math.round((grossAmount * COMMISSION_RATE) / 100 * 100) / 100;
      const gatewayFee  = Math.round((grossAmount * GATEWAY_FEE_RATE) / 100 * 100) / 100;
      const netAmount   = Math.round((grossAmount - platformFee - gatewayFee) * 100) / 100;

      await SellerEarning.updateOne(
        { orderId: order._id, sellerId },
        {
          $setOnInsert: {
            sellerId,
            orderId:     order._id,
            orderNumber: order.orderNumber,
            grossAmount,
            platformFee,
            gatewayFee,
            netAmount,
            currency:    order.currency || 'INR',
            status:      'pending',
            holdUntil,
            availableAt,
          }
        },
        { upsert: true }
      ).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS);
    }
  } catch (err) {
    logError('[earningsController] createEarningsForOrder error:', err);
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Reverse earnings when order is cancelled or refunded
// ─────────────────────────────────────────────────────────────────────────────
exports.reverseEarningsForOrder = async (orderId) => {
  try {
    await SellerEarning.updateMany(
      { orderId, status: { $in: ['pending', 'available'] } },
      { status: 'reversed', notes: 'Order cancelled/refunded' }
    ).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS);
  } catch (err) {
    logError('[earningsController] reverseEarningsForOrder error:', err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/seller/earnings
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyEarnings = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;
    const pagination = getPagination({ page, limit }, MAX_EARNINGS_PAGE_LIMIT);

    const query = { sellerId };
    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (normalizedStatus && normalizedStatus !== 'all') {
      if (!EARNING_STATUSES.has(normalizedStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid earning status.' });
      }
      query.status = normalizedStatus;
    }

    const [earnings, total] = await Promise.all([
      SellerEarning.find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate('orderId', 'orderNumber status createdAt')
        .maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS),
      SellerEarning.countDocuments(query).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS),
    ]);

    const [summaryTotals] = await SellerEarning.aggregate([
      { $match: { sellerId } },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossAmount' },
          totalFees: { $sum: { $add: ['$platformFee', '$gatewayFee'] } },
          totalNet: {
            $sum: {
              $cond: [{ $ne: ['$status', 'reversed'] }, '$netAmount', 0],
            },
          },
          available: {
            $sum: {
              $cond: [{ $eq: ['$status', 'available'] }, '$netAmount', 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$netAmount', 0],
            },
          },
          paidOut: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid_out'] }, '$netAmount', 0],
            },
          },
        },
      },
    ]).option({ maxTimeMS: EARNINGS_QUERY_MAX_TIME_MS });
    const summary = {
      totalGross:     summaryTotals?.totalGross || 0,
      totalFees:      summaryTotals?.totalFees || 0,
      totalNet:       summaryTotals?.totalNet || 0,
      available:      summaryTotals?.available || 0,
      pending:        summaryTotals?.pending || 0,
      paidOut:        summaryTotals?.paidOut || 0,
      commissionRate: COMMISSION_RATE,
      gatewayFeeRate: GATEWAY_FEE_RATE,
      holdDays:       HOLD_DAYS,
    };

    res.json({ success: true, earnings, total, summary, page: pagination.page });
  } catch (error) {
    return sendEarningsServerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/seller/earnings/request-payout
//  Seller requests payout for a bounded batch of available earnings
// ─────────────────────────────────────────────────────────────────────────────
exports.requestPayout = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const availableCount = await SellerEarning.countDocuments({ sellerId, status: 'available' })
      .maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS);
    const available = await SellerEarning.find({ sellerId, status: 'available' })
      .select('_id netAmount')
      .sort({ createdAt: 1, _id: 1 })
      .limit(MAX_PAYOUT_EARNING_BATCH)
      .maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS)
      .lean();
    if (!available.length) {
      return res.status(400).json({ success: false, message: 'No earnings available for payout yet. Check the hold period.' });
    }

    const earningIds = available.map(e => e._id);
    const totalAmount = available.reduce((s, e) => s + (Number(e.netAmount) || 0), 0);
    if (totalAmount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum payout amount is ₹10.' });
    }

    // Get seller's payout details from application
    const application = await SellerApplication.findOne({ userId: sellerId, status: 'approved' })
      .select('+payoutMethod.bankAccount')
      .maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS);
    if (!application?.payoutMethod?.type) {
      return res.status(400).json({ success: false, message: 'No payout method on file. Update your seller profile.' });
    }

    const { type, upiId, bankAccount, ifsc, accountHolderName } = application.payoutMethod;

    // Create payout record
    const payout = await Payout.create({
      sellerId,
      earningIds,
      amount:        Math.round(totalAmount * 100) / 100,
      method:        type,
      payoutDetails: {
        upiId:             type === 'upi' ? upiId : '',
        bankAccount:       type === 'bank' ? '****' + decrypt(bankAccount || '').slice(-4) : '',
        ifsc:              type === 'bank' ? ifsc : '',
        accountHolderName: accountHolderName || '',
      },
      status:     'queued',
      initiatedBy: req.user._id,
    });

    // Mark earnings as processing
    const claimResult = await SellerEarning.updateMany(
      { _id: { $in: earningIds }, sellerId, status: 'available' },
      { status: 'processing', payoutId: payout._id }
    ).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS);
    const claimedCount = claimResult.modifiedCount ?? claimResult.nModified ?? 0;
    if (claimedCount !== available.length) {
      await SellerEarning.updateMany(
        { sellerId, payoutId: payout._id, status: 'processing' },
        { $set: { status: 'available' }, $unset: { payoutId: '' } }
      ).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS);
      payout.status = 'failed';
      payout.failureReason = 'Payout request conflicted with another in-flight request.';
      payout.notes = 'No earnings were paid. Please retry.';
      await payout.save();
      return res.status(409).json({
        success: false,
        message: 'Another payout request is already processing these earnings. Please refresh and retry.',
      });
    }

    // Attempt RazorpayX transfer
    if (!AUTO_RAZORPAYX_PAYOUTS) {
      await queuePayoutForManualProcessing(payout);
    } else if (!isRazorpayXConfigured()) {
      console.warn('[earningsController] RazorpayX auto payouts disabled: missing configuration.');
      await queuePayoutForManualProcessing(
        payout,
        'Queued for manual admin processing. RazorpayX is not fully configured.'
      );
    } else {
      try {
        const razorpayPayoutId = await initiateRazorpayXPayout({
          amount: Math.round(totalAmount * 100), // paise
          type,
          upiId: type === 'upi' ? upiId : undefined,
          bankAccount: type === 'bank' ? decrypt(bankAccount || '') : undefined,
          ifsc: type === 'bank' ? ifsc : undefined,
          name: accountHolderName || req.user.name,
          sellerId: sellerId.toString(),
          reference: payout._id.toString(),
        });

        payout.status = 'processing';
        payout.razorpayPayoutId = razorpayPayoutId;
        payout.failureReason = '';
        payout.notes = '';
        await payout.save();
      } catch (rzpErr) {
      // RazorpayX failed — mark as queued for manual processing
        logError('[earningsController] RazorpayX payout failed:', rzpErr);
        await queuePayoutForManualProcessing(
          payout,
          'Automatic transfer could not start. Queued for manual admin processing.'
        );
      }
    }

    const payoutMessage = payout.status === 'processing'
      ? `Payout of \u20b9${totalAmount.toFixed(2)} has been initiated to your ${type === 'upi' ? 'UPI' : 'bank account'}.`
      : `Payout request of \u20b9${totalAmount.toFixed(2)} is queued for admin processing.`;

    // Notify seller
    await enqueueEmailJob('seller-payout-initiated', {
      userId: sellerId.toString(),
      amount: totalAmount,
      method: type,
      message: payoutMessage,
    });

    const io = req.app.get('io');
    if (io) io.to(`user:${sellerId}`).emit('notification:payout_processed', {
      message: `Payout of ₹${totalAmount.toFixed(2)} has been initiated to your ${type === 'upi' ? 'UPI' : 'bank account'}.`,
    });

    res.json({
      success: true,
      payout: serializePayout(payout, { includeFailureReason: true }),
      payoutBatch: {
        count: available.length,
        limit: MAX_PAYOUT_EARNING_BATCH,
        hasMoreAvailable: availableCount > available.length,
      },
      message: `Payout of ₹${totalAmount.toFixed(2)} initiated successfully.`,
    });
  } catch (error) {
    return sendEarningsServerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/seller/payouts
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pagination = getPagination({ page, limit }, MAX_EARNINGS_PAGE_LIMIT);
    const query = { sellerId: req.user._id };

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS),
      Payout.countDocuments(query).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS),
    ]);

    res.json({
      success: true,
      payouts: payouts.map((payout) => serializePayout(payout, { includeFailureReason: true })),
      total,
      page: pagination.page,
    });
  } catch (error) {
    return sendEarningsServerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — GET /api/admin/payouts
// ─────────────────────────────────────────────────────────────────────────────
exports.getAdminPayouts = async (req, res) => {
  try {
    const { status = 'queued', page = 1, limit = 30 } = req.query;
    const normalizedStatus = String(status || 'queued').trim().toLowerCase();
    if (normalizedStatus !== 'all' && !PAYOUT_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payout status.' });
    }
    const pagination = getPagination({ page, limit }, MAX_ADMIN_PAYOUT_PAGE_LIMIT);
    const query = normalizedStatus === 'all' ? {} : { status: normalizedStatus };
    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate({
          path: 'sellerId',
          select: 'username name profileImage',
          options: { maxTimeMS: EARNINGS_QUERY_MAX_TIME_MS },
        })
        .maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS),
      Payout.countDocuments(query).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS),
    ]);
    res.json({
      success: true,
      payouts: payouts.map((payout) => serializePayout(payout, { includeFailureReason: true })),
      total,
      page: pagination.page,
    });
  } catch (error) {
    return sendEarningsServerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — PATCH /api/admin/payouts/:id/mark-paid
// ─────────────────────────────────────────────────────────────────────────────
exports.adminMarkPayoutPaid = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid payout id.' });
    }
    const reference = String(req.body.reference || 'manual').trim().slice(0, 120) || 'manual';
    const notes = String(req.body.notes || '').trim().slice(0, 1000);
    const payout = await Payout.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['queued', 'processing'] } },
      {
        $set: {
          status: 'processed',
          razorpayPayoutId: reference,
          processedAt: new Date(),
          failureReason: '',
          notes,
        },
      },
      { new: true }
    ).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS);
    if (!payout) {
      const existing = await Payout.findById(req.params.id)
        .select('status')
        .maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS)
        .lean();
      if (!existing) return res.status(404).json({ success: false, message: 'Payout not found.' });
      return res.status(409).json({ success: false, message: `Cannot mark a ${existing.status} payout as paid.` });
    }

    // Mark earnings as paid_out
    await SellerEarning.updateMany(
      { _id: { $in: payout.earningIds }, payoutId: payout._id, status: 'processing' },
      { status: 'paid_out', paidOutAt: new Date(), razorpayPayoutId: payout.razorpayPayoutId }
    ).maxTimeMS(EARNINGS_QUERY_MAX_TIME_MS);

    // Notify seller
    const io = req.app.get('io');
    if (io) io.to(`user:${payout.sellerId}`).emit('notification:payout_processed', {
      message: `₹${payout.amount.toFixed(2)} has been transferred to your account.`,
    });
    await enqueueEmailJob('seller-payout-completed', {
      userId: payout.sellerId.toString(),
      amount: payout.amount,
    });

    res.json({ success: true, payout: serializePayout(payout, { includeFailureReason: true }) });
  } catch (error) {
    return sendEarningsServerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Internal: RazorpayX payout initiation
// ─────────────────────────────────────────────────────────────────────────────
async function initiateRazorpayXPayout({ amount, type, upiId, bankAccount, ifsc, name, sellerId, reference }) {
  const axios   = require('axios');
  const keyId   = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) throw new Error('Razorpay credentials not configured');

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const timeout = getRazorpayProviderTimeoutMs();
  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
  const client = axios.create({
    baseURL: 'https://api.razorpay.com/v1',
    headers,
    timeout,
  });
  const contactName = sanitizeRazorpayContactName(name);
  const sellerReference = buildRazorpayReference('seller', sellerId || reference);

  // RazorpayX returns the existing object when the same unique contact details are reused.
  const contactResponse = await client.post('/contacts', {
    name: contactName,
    type: 'vendor',
    reference_id: sellerReference,
    notes: {
      payout_reference: String(reference || '').slice(0, 40),
    },
  });
  const contactId = contactResponse?.data?.id;
  if (!contactId) {
    throw new Error('RazorpayX contact id not returned');
  }

  const fundAccountPayload = {
    contact_id: contactId,
    account_type: type === 'upi' ? 'vpa' : 'bank_account',
    ...(type === 'upi'
      ? { vpa: { address: upiId } }
      : { bank_account: { name: contactName, ifsc, account_number: bankAccount } }
    ),
  };
  const fundAccountResponse = await client.post('/fund_accounts', fundAccountPayload);
  const fundAccountId = fundAccountResponse?.data?.id;
  if (!fundAccountId) {
    throw new Error('RazorpayX fund account id not returned');
  }

  const payoutPayload = {
    account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER, // Platform's RazorpayX account
    fund_account_id: fundAccountId,
    amount,                // in paise
    currency: 'INR',
    mode: type === 'upi' ? 'UPI' : 'NEFT',
    purpose: 'vendor bill',
    queue_if_low_balance: true,
    reference_id: reference,
    narration: 'Lekhon Seller Payout',
  };

  const response = await client.post(
    '/payouts',
    payoutPayload,
    {
      headers: {
        'X-Payout-Idempotency': reference,
      },
    }
  );

  return response.data.id;
}
