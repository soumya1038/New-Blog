const SellerEarning   = require('../models/SellerEarning');
const Payout          = require('../models/Payout');
const Order           = require('../models/Order');
const User            = require('../models/User');
const SellerApplication = require('../models/SellerApplication');
const { decrypt }     = require('../utils/encryption');
const { enqueueEmailJob } = require('../jobs/queueService');

const HOLD_DAYS           = parseInt(process.env.SELLER_PAYOUT_HOLD_DAYS  || '7');
const COMMISSION_RATE     = parseFloat(process.env.COMMISSION_RATE         || '0');
const GATEWAY_FEE_RATE    = parseFloat(process.env.RAZORPAY_FEE_RATE       || '2.36'); // Razorpay ~2% + 18% GST
const AUTO_RAZORPAYX_PAYOUTS = process.env.RAZORPAYX_AUTO_PAYOUTS === 'true';

const isRazorpayXConfigured = () => Boolean(
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  process.env.RAZORPAYX_ACCOUNT_NUMBER
);

const formatGatewayError = (error) => {
  if (error.response?.data) return JSON.stringify(error.response.data);
  return error.message;
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
      );
    }
  } catch (err) {
    console.error('[earningsController] createEarningsForOrder error:', err.message);
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
    );
  } catch (err) {
    console.error('[earningsController] reverseEarningsForOrder error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/seller/earnings
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyEarnings = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { sellerId };
    if (status) query.status = status;

    const [earnings, total] = await Promise.all([
      SellerEarning.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('orderId', 'orderNumber status createdAt'),
      SellerEarning.countDocuments(query),
    ]);

    // Summary stats
    const all = await SellerEarning.find({ sellerId });
    const summary = {
      totalGross:     all.reduce((s, e) => s + e.grossAmount, 0),
      totalFees:      all.reduce((s, e) => s + e.platformFee + e.gatewayFee, 0),
      totalNet:       all.filter(e => e.status !== 'reversed').reduce((s, e) => s + e.netAmount, 0),
      available:      all.filter(e => e.status === 'available').reduce((s, e) => s + e.netAmount, 0),
      pending:        all.filter(e => e.status === 'pending').reduce((s, e) => s + e.netAmount, 0),
      paidOut:        all.filter(e => e.status === 'paid_out').reduce((s, e) => s + e.netAmount, 0),
      commissionRate: COMMISSION_RATE,
      gatewayFeeRate: GATEWAY_FEE_RATE,
      holdDays:       HOLD_DAYS,
    };

    res.json({ success: true, earnings, total, summary, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/seller/earnings/request-payout
//  Seller requests payout of all available earnings
// ─────────────────────────────────────────────────────────────────────────────
exports.requestPayout = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const available = await SellerEarning.find({ sellerId, status: 'available' });
    if (!available.length) {
      return res.status(400).json({ success: false, message: 'No earnings available for payout yet. Check the hold period.' });
    }

    const totalAmount = available.reduce((s, e) => s + e.netAmount, 0);
    if (totalAmount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum payout amount is ₹10.' });
    }

    // Get seller's payout details from application
    const application = await SellerApplication.findOne({ userId: sellerId, status: 'approved' });
    if (!application?.payoutMethod?.type) {
      return res.status(400).json({ success: false, message: 'No payout method on file. Update your seller profile.' });
    }

    const { type, upiId, bankAccount, ifsc, accountHolderName } = application.payoutMethod;

    // Create payout record
    const payout = await Payout.create({
      sellerId,
      earningIds:    available.map(e => e._id),
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
    await SellerEarning.updateMany(
      { _id: { $in: available.map(e => e._id) } },
      { status: 'processing', payoutId: payout._id }
    );

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
          reference: payout._id.toString(),
        });

        payout.status = 'processing';
        payout.razorpayPayoutId = razorpayPayoutId;
        payout.failureReason = '';
        payout.notes = '';
        await payout.save();
      } catch (rzpErr) {
      // RazorpayX failed — mark as queued for manual processing
        console.error('[earningsController] RazorpayX payout failed:', formatGatewayError(rzpErr));
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
    io.to(`user:${sellerId}`).emit('notification:payout_processed', {
      message: `Payout of ₹${totalAmount.toFixed(2)} has been initiated to your ${type === 'upi' ? 'UPI' : 'bank account'}.`,
    });

    res.json({
      success: true,
      payout,
      message: `Payout of ₹${totalAmount.toFixed(2)} initiated successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/seller/payouts
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyPayouts = async (req, res) => {
  try {
    const payouts = await Payout.find({ sellerId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const sellerPayouts = payouts.map((payout) => {
      const item = payout.toObject();
      if (item.status !== 'failed') item.failureReason = '';
      return item;
    });
    res.json({ success: true, payouts: sellerPayouts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — GET /api/admin/payouts
// ─────────────────────────────────────────────────────────────────────────────
exports.getAdminPayouts = async (req, res) => {
  try {
    const { status = 'queued', page = 1, limit = 30 } = req.query;
    const query = status === 'all' ? {} : { status };
    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('sellerId', 'username name email profileImage'),
      Payout.countDocuments(query),
    ]);
    res.json({ success: true, payouts, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — PATCH /api/admin/payouts/:id/mark-paid
// ─────────────────────────────────────────────────────────────────────────────
exports.adminMarkPayoutPaid = async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ success: false, message: 'Payout not found.' });

    payout.status           = 'processed';
    payout.razorpayPayoutId = req.body.reference || 'manual';
    payout.processedAt      = new Date();
    payout.failureReason    = '';
    payout.notes            = req.body.notes || '';
    await payout.save();

    // Mark earnings as paid_out
    await SellerEarning.updateMany(
      { _id: { $in: payout.earningIds } },
      { status: 'paid_out', paidOutAt: new Date(), razorpayPayoutId: payout.razorpayPayoutId }
    );

    // Notify seller
    const io = req.app.get('io');
    io.to(`user:${payout.sellerId}`).emit('notification:payout_processed', {
      message: `₹${payout.amount.toFixed(2)} has been transferred to your account.`,
    });
    await enqueueEmailJob('seller-payout-completed', {
      userId: payout.sellerId.toString(),
      amount: payout.amount,
    });

    res.json({ success: true, payout });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Internal: RazorpayX payout initiation
// ─────────────────────────────────────────────────────────────────────────────
async function initiateRazorpayXPayout({ amount, type, upiId, bankAccount, ifsc, name, reference }) {
  const axios   = require('axios');
  const keyId   = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) throw new Error('Razorpay credentials not configured');

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  // Step 1: Create Fund Account
  const faPayload = {
    contact_id: null, // Will be set below
    account_type: type === 'upi' ? 'vpa' : 'bank_account',
    ...(type === 'upi'
      ? { vpa: { address: upiId } }
      : { bank_account: { name, ifsc, account_number: bankAccount } }
    ),
  };

  // Step 2: Create Payout
  const payoutPayload = {
    account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER, // Platform's RazorpayX account
    fund_account_id: null, // populated after fund account creation
    amount,                // in paise
    currency: 'INR',
    mode: type === 'upi' ? 'UPI' : 'NEFT',
    purpose: 'vendor_advance',
    queue_if_low_balance: true,
    reference_id: reference,
    narration: 'Lekhon Marketplace Seller Payout',
  };

  const response = await axios.post(
    'https://api.razorpay.com/v1/payouts',
    payoutPayload,
    { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'X-Payout-Idempotency': reference } }
  );

  return response.data.id;
}
