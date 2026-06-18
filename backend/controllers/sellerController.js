const User             = require('../models/User');
const SellerApplication= require('../models/SellerApplication');
const StoreSettings    = require('../models/StoreSettings');
const Product          = require('../models/Product');
const Order            = require('../models/Order');
const Notification     = require('../models/Notification');
const { encrypt }      = require('../utils/encryption');
const { enqueueEmailJob } = require('../jobs/queueService');
const cloudinary       = require('../utils/cloudinary');

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9._-]{1,64}$/;

const normalizePhone = (value = '') => String(value).replace(/[\s()-]/g, '');
const normalizePan = (value = '') => String(value).trim().toUpperCase().replace(/\s+/g, '');
const normalizeIfsc = (value = '') => String(value).trim().toUpperCase().replace(/\s+/g, '');
const normalizeUpi = (value = '') => String(value).trim().toLowerCase();
const digitsOnly = (value = '') => String(value).replace(/\D/g, '');

const isValidIndianPhone = (value = '') => /^(?:\+91|91)?[6-9]\d{9}$/.test(normalizePhone(value));
const isValidBankAccount = (value = '') => {
  const account = digitsOnly(value);
  return account.length >= 9 && account.length <= 18;
};

const maskPan = (value = '') => {
  const pan = normalizePan(value);
  if (!pan) return '';
  return `${pan.slice(0, 3)}****${pan.slice(-3)}`;
};

const maskBankAccount = (value = '') => {
  const account = digitsOnly(value);
  if (!account) return '';
  return `${'*'.repeat(Math.max(account.length - 4, 0))}${account.slice(-4)}`;
};

const maskUpi = (value = '') => {
  const upi = normalizeUpi(value);
  const [name, handle] = upi.split('@');
  if (!name || !handle) return upi;
  return `${name.slice(0, 2)}${name.length > 2 ? '***' : ''}@${handle}`;
};

const check = (status, note = '', extra = {}) => ({
  status,
  note,
  checkedAt: new Date(),
  ...extra,
});

const buildVerificationSummary = ({ payoutMethod, verificationProvider = 'manual' }) => {
  const usesRazorpay = verificationProvider === 'razorpay';
  return {
  phone: usesRazorpay
    ? check('verified', 'Phone/contact verification completed through Razorpay flow.')
    : check('format_valid', 'Phone format passed. OTP/provider verification is still required.'),
  pan: usesRazorpay
    ? check('verified', 'Identity verification completed through Razorpay flow.')
    : check('format_valid', 'PAN format passed. Provider verification is still required.'),
  upi: payoutMethod?.type === 'upi'
    ? check('format_valid', 'UPI format passed. Provider payout validation is still required.')
    : check('not_started', 'UPI was not selected for payout.'),
  bank: payoutMethod?.type === 'bank'
    ? check('format_valid', 'Bank account and IFSC format passed. Penny-drop verification is still required.')
    : check('not_started', 'Bank payout was not selected.'),
  digilocker: usesRazorpay
    ? check('verified', 'Identity verification completed through Razorpay flow.')
    : check('pending_provider', 'DigiLocker consent verification is provider-ready but not connected yet.'),
  };
};

const validateSellerPayload = (payload = {}) => {
  const errors = [];
  const panNumber = normalizePan(payload.panNumber);
  const payoutMethod = payload.payoutMethod || {};
  const payoutType = payoutMethod.type || 'upi';

  if (!String(payload.legalName || '').trim()) errors.push('Legal name is required.');
  if (!['individual', 'company'].includes(payload.businessType)) errors.push('Business type is required.');
  if (!String(payload.bio || '').trim()) errors.push('Please write a short bio about your store.');
  if (!Array.isArray(payload.categories) || payload.categories.length === 0) errors.push('Select at least one product category.');
  if (!isValidIndianPhone(payload.phone)) errors.push('Enter a valid Indian phone number.');
  if (!String(payload.city || '').trim()) errors.push('City is required.');
  if (!PAN_REGEX.test(panNumber)) errors.push('Enter a valid PAN number.');

  if (!['upi', 'bank'].includes(payoutType)) {
    errors.push('Select a valid payout method.');
  } else if (payoutType === 'upi') {
    if (!UPI_REGEX.test(normalizeUpi(payoutMethod.upiId))) errors.push('Enter a valid UPI ID.');
  } else {
    if (!String(payoutMethod.accountHolderName || '').trim()) errors.push('Account holder name is required.');
    if (!isValidBankAccount(payoutMethod.bankAccount)) errors.push('Enter a valid bank account number.');
    if (!IFSC_REGEX.test(normalizeIfsc(payoutMethod.ifsc))) errors.push('Enter a valid IFSC code.');
  }

  return errors;
};

const buildAttemptSnapshot = (application) => {
  const payoutType = application.payoutMethod?.type || '';
  const maskedPayout = payoutType === 'bank'
    ? application.payoutMethod?.bankAccountMasked || ''
    : maskUpi(application.payoutMethod?.upiId || '');

  return {
    attemptNumber: application.attemptNumber || 1,
    submittedAt: application.lastSubmittedAt || application.createdAt,
    status: application.status,
    reviewedAt: application.reviewedAt || null,
    reviewNote: application.reviewNote || '',
    legalName: application.legalName || '',
    businessName: application.businessName || '',
    businessType: application.businessType || '',
    categories: application.categories || [],
    phone: application.phone || '',
    city: application.city || '',
    state: application.state || '',
    country: application.country || '',
    maskedPan: application.maskedPan || '',
    payoutType,
    maskedPayout,
    verification: application.verification || {},
  };
};

const sanitizeApplication = (application) => {
  if (!application) return application;
  const obj = typeof application.toObject === 'function' ? application.toObject() : { ...application };
  delete obj.panNumber;
  if (obj.payoutMethod) delete obj.payoutMethod.bankAccount;
  return obj;
};

const notifyApplicant = async (userId, type, message) => {
  try {
    await Notification.create({
      recipient: userId,
      sender: userId,
      type,
      message,
    });
  } catch (error) {
    console.error('[sellerController] notifyApplicant:', error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SELLER — Apply
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/seller/apply
const applyAsSellerLegacy = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'You must be a Verified user (blue badge) before applying as a seller.'
      });
    }
    if (req.user.isSeller) {
      return res.status(400).json({ success: false, message: 'You are already an approved seller.' });
    }

    const existing = await SellerApplication.findOne({ userId });
    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ success: false, message: 'You already have a pending application.' });
      }
      if (existing.status === 'approved') {
        return res.status(400).json({ success: false, message: 'Your application was already approved.' });
      }
      // Rejected — allow reapply: remove old record
      await SellerApplication.deleteOne({ userId });
    }

    const {
      legalName, businessName, businessType, categories, bio,
      phone, city, state, country, panNumber, payoutMethod, verificationProvider, agreedToTerms,
    } = req.body;

    if (!agreedToTerms) {
      return res.status(400).json({ success: false, message: 'You must agree to the Seller Terms & Conditions.' });
    }

    const data = {
      userId,
      legalName,
      businessName:  businessName  || '',
      businessType,
      categories:    categories    || [],
      bio:           bio           || '',
      phone,
      city:          city          || '',
      state:         state         || '',
      country:       country       || '',
      agreedToTerms: true,
      agreedAt:      new Date(),
    };

    if (panNumber)    data.panNumber = encrypt(panNumber);
    if (payoutMethod) {
      data.payoutMethod = {
        type:              payoutMethod.type,
        upiId:             payoutMethod.upiId             || '',
        bankAccount:       payoutMethod.bankAccount ? encrypt(payoutMethod.bankAccount) : '',
        ifsc:              payoutMethod.ifsc              || '',
        accountHolderName: payoutMethod.accountHolderName || '',
      };
    }

    const application = await SellerApplication.create(data);
    await User.findByIdAndUpdate(userId, { sellerAppliedAt: new Date() });

    res.status(201).json({
      success: true,
      message: 'Application submitted! Team will review it shortly.',
      application: { _id: application._id, status: application.status },
    });
  } catch (error) {
    console.error('[sellerController] applyAsSeller:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.applyAsSeller = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'You must be a Verified user (blue badge) before applying as a seller.',
      });
    }

    if (req.user.isSeller) {
      return res.status(400).json({ success: false, message: 'You are already an approved seller.' });
    }

    const {
      legalName, businessName, businessType, categories, bio,
      phone, city, state, country, panNumber, payoutMethod, verificationProvider, agreedToTerms,
    } = req.body;

    if (!agreedToTerms) {
      return res.status(400).json({ success: false, message: 'You must agree to the Seller Terms & Conditions.' });
    }

    const normalizedPayoutMethod = {
      type: payoutMethod?.type || 'upi',
      upiId: normalizeUpi(payoutMethod?.upiId || ''),
      bankAccount: digitsOnly(payoutMethod?.bankAccount || ''),
      ifsc: normalizeIfsc(payoutMethod?.ifsc || ''),
      accountHolderName: String(payoutMethod?.accountHolderName || '').trim(),
    };
    const normalizedPan = normalizePan(panNumber);
    const normalizedPhone = normalizePhone(phone);
    const selectedVerificationProvider = verificationProvider === 'razorpay' ? 'razorpay' : 'manual';

    if (selectedVerificationProvider !== 'razorpay') {
      return res.status(400).json({
        success: false,
        message: 'Complete Razorpay verification before submitting your seller application.',
      });
    }

    const validationErrors = validateSellerPayload({
      legalName,
      businessType,
      categories,
      bio,
      phone: normalizedPhone,
      city,
      panNumber: normalizedPan,
      payoutMethod: normalizedPayoutMethod,
    });

    if (validationErrors.length) {
      return res.status(400).json({ success: false, message: validationErrors[0], errors: validationErrors });
    }

    const existing = await SellerApplication.findOne({ userId });
    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ success: false, message: 'You already have a pending application.' });
      }
      if (existing.status === 'approved') {
        return res.status(400).json({ success: false, message: 'Your application was already approved.' });
      }
    }

    const now = new Date();
    const data = {
      userId,
      legalName: String(legalName || '').trim(),
      businessName: businessName || '',
      businessType,
      categories: categories || [],
      bio: bio || '',
      phone: normalizedPhone,
      city: city || '',
      state: state || '',
      country: country || '',
      status: 'pending',
      agreedToTerms: true,
      agreedAt: now,
      lastSubmittedAt: now,
      panNumber: encrypt(normalizedPan),
      maskedPan: maskPan(normalizedPan),
      verificationProvider: selectedVerificationProvider,
      razorpayVerification: selectedVerificationProvider === 'razorpay'
        ? {
          status: 'verified',
          note: 'Razorpay verification completed before application submission. Final review remains required before approval.',
          requestedAt: now,
          verifiedAt: now,
        }
        : {
          status: 'not_started',
        },
      payoutMethod: {
        type: normalizedPayoutMethod.type,
        upiId: normalizedPayoutMethod.type === 'upi' ? normalizedPayoutMethod.upiId : '',
        bankAccount: normalizedPayoutMethod.type === 'bank' ? encrypt(normalizedPayoutMethod.bankAccount) : '',
        bankAccountMasked: normalizedPayoutMethod.type === 'bank' ? maskBankAccount(normalizedPayoutMethod.bankAccount) : '',
        ifsc: normalizedPayoutMethod.type === 'bank' ? normalizedPayoutMethod.ifsc : '',
        accountHolderName: normalizedPayoutMethod.type === 'bank' ? normalizedPayoutMethod.accountHolderName : '',
      },
      verification: buildVerificationSummary({
        payoutMethod: normalizedPayoutMethod,
        verificationProvider: selectedVerificationProvider,
      }),
    };

    let application;
    let message = 'Application submitted! Team will review it shortly.';

    if (existing && ['rejected', 'withdrawn'].includes(existing.status)) {
      const priorAttempts = Array.isArray(existing.attemptHistory) ? existing.attemptHistory : [];
      existing.set({
        ...data,
        attemptNumber: (existing.attemptNumber || 1) + 1,
        reappliedAt: now,
        reviewedBy: null,
        reviewNote: '',
        reviewedAt: null,
        attemptHistory: [...priorAttempts, buildAttemptSnapshot(existing)].slice(-10),
      });
      application = await existing.save();
      message = `Application resubmitted as attempt #${application.attemptNumber}. Team will review it shortly.`;
    } else {
      application = await SellerApplication.create({
        ...data,
        attemptNumber: 1,
        attemptHistory: [],
      });
    }

    await User.findByIdAndUpdate(userId, { sellerAppliedAt: now });
    await notifyApplicant(
      userId,
      'seller_application_submitted',
      'Your seller application was submitted successfully. The Team will call and verify before you become a seller.'
    );

    res.status(201).json({
      success: true,
      message,
      application: {
        _id: application._id,
        status: application.status,
        attemptNumber: application.attemptNumber,
      },
    });
  } catch (error) {
    console.error('[sellerController] applyAsSeller:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/application/status
exports.getMyApplication = async (req, res) => {
  try {
    const application = await SellerApplication.findOne({ userId: req.user._id });
    if (!application) return res.json({ success: true, application: null });

    res.json({ success: true, application: sanitizeApplication(application) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SELLER — Store Settings
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/seller/store/settings
exports.getStoreSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne({ sellerId: req.user._id });
    if (!settings) settings = await StoreSettings.create({ sellerId: req.user._id });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/seller/store/settings
exports.updateStoreSettings = async (req, res) => {
  try {
    const { storeName, bio, theme, socialLinks, featuredProducts } = req.body;

    let settings = await StoreSettings.findOne({ sellerId: req.user._id });
    if (!settings) settings = new StoreSettings({ sellerId: req.user._id });

    if (storeName        !== undefined) settings.storeName        = storeName;
    if (bio              !== undefined) settings.bio              = bio;
    if (theme            !== undefined) settings.theme            = theme;
    if (socialLinks      !== undefined) settings.socialLinks      = { ...settings.socialLinks, ...socialLinks };
    if (featuredProducts !== undefined) settings.featuredProducts = featuredProducts;

    // Optional banner upload (multer single file via req.file)
    if (req.file) {
      if (settings.bannerPublicId) {
        await cloudinary.uploader.destroy(settings.bannerPublicId).catch(() => {});
      }
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'lekhon/store-banners', transformation: [{ width: 1400, crop: 'limit' }] },
          (err, r) => (err ? reject(err) : resolve(r))
        );
        stream.end(req.file.buffer);
      });
      settings.bannerImage    = result.secure_url;
      settings.bannerPublicId = result.public_id;
    }

    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/store/:username  (public store page)
exports.getStoreByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username, isSeller: true })
      .select('username name profileImage bio isVerified isSeller createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'Store not found.' });

    const settings = await StoreSettings.findOne({ sellerId: user._id })
      .populate('featuredProducts', 'title slug thumbnail price compareAtPrice type averageRating reviewCount stats');

    const products = await Product.find({ sellerId: user._id, status: 'active' })
      .select('title slug thumbnail price compareAtPrice type averageRating reviewCount stats createdAt')
      .sort({ 'stats.sales': -1, createdAt: -1 })
      .limit(24);

    res.json({ success: true, seller: user, settings, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/dashboard/stats
exports.getSellerStats = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const [totalProducts, activeProducts, allOrders] = await Promise.all([
      Product.countDocuments({ sellerId, status: { $ne: 'archived' } }),
      Product.countDocuments({ sellerId, status: 'active' }),
      Order.find({
        'items.sellerId': sellerId,
        status: { $in: ['paid', 'processing', 'shipped', 'delivered', 'completed'] },
      }).select('items status createdAt'),
    ]);

    const pendingOrders = await Order.countDocuments({
      'items.sellerId': sellerId,
      status: { $in: ['paid', 'processing'] },
    });

    const totalRevenue = allOrders.reduce((sum, o) => {
      const mine = o.items.filter(i => i.sellerId.toString() === sellerId.toString());
      return sum + mine.reduce((s, i) => s + i.subtotal, 0);
    }, 0);

    // Revenue chart — last 30 days, grouped by day
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders  = allOrders.filter(o => o.createdAt >= thirtyDaysAgo);
    const revenueByDay  = {};
    recentOrders.forEach(o => {
      const day  = o.createdAt.toISOString().split('T')[0];
      const mine = o.items.filter(i => i.sellerId.toString() === sellerId.toString());
      revenueByDay[day] = (revenueByDay[day] || 0) + mine.reduce((s, i) => s + i.subtotal, 0);
    });

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        totalOrders:   allOrders.length,
        pendingOrders,
        totalRevenue,
        revenueByDay,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — Seller Applications
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/seller-applications
exports.getSellerApplications = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const query = status === 'all' ? {} : { status };

    const [applications, total] = await Promise.all([
      SellerApplication.find(query)
        .populate('userId',     'username name profileImage email isVerified createdAt')
        .populate('reviewedBy', 'username name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      SellerApplication.countDocuments(query),
    ]);

    const safe = applications.map(sanitizeApplication);

    res.json({ success: true, applications: safe, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/seller-applications/:id/approve
// PUT /api/admin/seller-applications/:id/reject
exports.reviewSellerApplication = async (req, res) => {
  try {
    const action     = req.path.includes('approve') ? 'approved' : 'rejected';
    const reviewNote = req.body.reviewNote || '';

    const application = await SellerApplication.findById(req.params.id).populate('userId');
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Application already ${application.status}.` });
    }

    application.status     = action;
    application.reviewedBy = req.user._id;
    application.reviewNote = reviewNote;
    application.reviewedAt = new Date();
    await application.save();

    if (action === 'approved') {
      await User.findByIdAndUpdate(application.userId._id, {
        isSeller:          true,
        sellerApprovedAt:  new Date(),
      });
      // Ensure store settings document exists
      await StoreSettings.findOneAndUpdate(
        { sellerId: application.userId._id },
        {
          $setOnInsert: {
            sellerId:  application.userId._id,
            storeName: application.businessName || application.legalName,
          },
        },
        { upsert: true, new: true }
      );
    }

    // Real-time socket notification
    const io        = req.app.get('io');
    const socketEvt = action === 'approved' ? 'notification:seller_approved' : 'notification:seller_rejected';
    io.to(`user:${application.userId._id}`).emit(socketEvt, {
      message: action === 'approved'
        ? 'Your seller application has been approved! You can now list products.'
        : `Your seller application was not approved. ${reviewNote ? 'Reason: ' + reviewNote : 'Please contact support.'}`,
    });

    // Queue email (add cases to queueService switch — see patches/queueService.patch.js)
    await enqueueEmailJob(action === 'approved' ? 'seller-approved' : 'seller-rejected', {
      email:      application.userId.email,
      username:   application.userId.username,
      reviewNote,
    });

    res.json({ success: true, message: `Application ${action}.`, application: sanitizeApplication(application) });
  } catch (error) {
    console.error('[sellerController] reviewSellerApplication:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/seller/application/withdraw
exports.withdrawMyApplication = async (req, res) => {
  try {
    const application = await SellerApplication.findOne({ userId: req.user._id });
    if (!application) {
      return res.status(404).json({ success: false, message: 'No seller application found.' });
    }
    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Only pending applications can be withdrawn. Current status: ${application.status}.` });
    }

    application.status = 'withdrawn';
    application.reviewNote = 'Withdrawn by applicant.';
    application.reviewedAt = new Date();
    await application.save();

    await User.findByIdAndUpdate(req.user._id, { sellerAppliedAt: null });
    await notifyApplicant(
      req.user._id,
      'seller_application_withdrawn',
      'Your seller application was withdrawn. You can apply again whenever you are ready.'
    );

    res.json({
      success: true,
      message: 'Seller application withdrawn.',
      application: sanitizeApplication(application),
    });
  } catch (error) {
    console.error('[sellerController] withdrawMyApplication:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
