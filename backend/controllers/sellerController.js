const User             = require('../models/User');
const SellerApplication= require('../models/SellerApplication');
const StoreSettings    = require('../models/StoreSettings');
const Product          = require('../models/Product');
const Order            = require('../models/Order');
const Notification     = require('../models/Notification');
const { encrypt }      = require('../utils/encryption');
const { enqueueEmailJob } = require('../jobs/queueService');
const cloudinary       = require('../utils/cloudinary');
const { getImageSignatureValidationError } = require('../utils/imageSignatures');
const { normalizeHttpUrl } = require('../utils/safeUrls');
const { logError, sendSafeServerError } = require('../utils/safeErrorLog');
const mongoose         = require('mongoose');

const sendSellerServerError = (res, error) =>
  sendSafeServerError(res, '[sellerController] request failed:', error, 'Unable to process seller request');

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9._-]{1,64}$/;
const STORE_THEMES = new Set(['default', 'dark', 'warm', 'cool', 'minimal']);
const SOCIAL_LINK_KEYS = ['instagram', 'twitter', 'website', 'youtube'];
const MAX_FEATURED_PRODUCTS = Math.max(1, Number(process.env.MAX_STORE_FEATURED_PRODUCTS) || 12);
const MAX_SELLER_APP_PAGE_LIMIT = Math.max(1, Number(process.env.MAX_SELLER_APP_PAGE_LIMIT) || 100);
const STORE_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.STORE_QUERY_MAX_TIME_MS) || 5000);
const SELLER_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.SELLER_QUERY_MAX_TIME_MS) || 5000);
const SELLER_APPLICATION_USER_SELECT = 'username name profileImage email isVerified createdAt';
const STORE_BANNER_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const STORE_USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
const PUBLIC_STORE_PRODUCT_SELECT = 'title slug thumbnail price compareAtPrice type averageRating reviewCount stats createdAt';
const SELLER_APPLICATION_STATUSES = new Set(['pending', 'approved', 'rejected', 'withdrawn']);

const getSellerApprovalIneligibility = (user) => {
  if (!user) return 'Applicant account no longer exists.';
  if (user.isGuest || user.role === 'guest' || user.guestExpiresAt) {
    return 'Guest accounts cannot be approved as sellers.';
  }
  if (!user.isVerified) {
    return 'Applicant must still be verified before seller approval.';
  }
  if (user.isSeller) {
    return 'Applicant is already approved as a seller.';
  }
  if (user.isActive === false || (user.suspendedUntil && new Date() < new Date(user.suspendedUntil))) {
    return 'Suspended or inactive applicants cannot be approved as sellers.';
  }
  return '';
};

const normalizePhone = (value = '') => String(value).replace(/[\s()-]/g, '');
const normalizePan = (value = '') => String(value).trim().toUpperCase().replace(/\s+/g, '');
const normalizeIfsc = (value = '') => String(value).trim().toUpperCase().replace(/\s+/g, '');
const normalizeUpi = (value = '') => String(value).trim().toLowerCase();
const digitsOnly = (value = '') => String(value).replace(/\D/g, '');
const boundedPage = ({ page = 1, limit = 20 }, maxLimit) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.min(maxLimit, Math.max(1, parseInt(limit, 10) || 20));
  return { page: pageNumber, limit: limitNumber, skip: (pageNumber - 1) * limitNumber };
};

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
  if (obj.payoutMethod) {
    if (obj.payoutMethod.upiId) obj.payoutMethod.upiId = maskUpi(obj.payoutMethod.upiId);
    delete obj.payoutMethod.bankAccount;
  }
  if (obj.razorpayVerification) {
    delete obj.razorpayVerification.accountId;
    delete obj.razorpayVerification.referenceId;
    delete obj.razorpayVerification.onboardingUrl;
  }
  if (obj.userId && typeof obj.userId === 'object' && (
    Object.prototype.hasOwnProperty.call(obj.userId, 'username') ||
    Object.prototype.hasOwnProperty.call(obj.userId, 'email') ||
    Object.prototype.hasOwnProperty.call(obj.userId, 'name')
  )) {
    obj.userId = {
      _id: obj.userId._id,
      username: obj.userId.username || '',
      name: obj.userId.name || '',
      profileImage: obj.userId.profileImage || '',
      email: obj.userId.email || '',
      isVerified: Boolean(obj.userId.isVerified),
      createdAt: obj.userId.createdAt,
    };
  }
  return obj;
};

const serializePublicStoreSettings = (settings) => {
  if (!settings) return null;
  const obj = typeof settings.toObject === 'function' ? settings.toObject() : { ...settings };
  delete obj.sellerId;
  delete obj.bannerPublicId;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj.__v;
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
    logError('[sellerController] notifyApplicant:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SELLER — Apply
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/seller/apply
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
    const selectedVerificationProvider = 'manual';

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

    const existing = await SellerApplication.findOne({ userId })
      .maxTimeMS(SELLER_QUERY_MAX_TIME_MS);
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
      razorpayVerification: {
        status: verificationProvider === 'razorpay' ? 'pending_provider' : 'not_started',
        note: verificationProvider === 'razorpay'
          ? 'Client requested Razorpay verification, but no trusted backend verification record is connected yet. Manual admin verification is required.'
          : '',
        requestedAt: verificationProvider === 'razorpay' ? now : null,
        verifiedAt: null,
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
    return sendSellerServerError(res, error);
  }
};

// GET /api/seller/application/status
exports.getMyApplication = async (req, res) => {
  try {
    const application = await SellerApplication.findOne({ userId: req.user._id })
      .maxTimeMS(SELLER_QUERY_MAX_TIME_MS);
    if (!application) return res.json({ success: true, application: null });

    res.json({ success: true, application: sanitizeApplication(application) });
  } catch (error) {
    return sendSellerServerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SELLER — Store Settings
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/seller/store/settings
exports.getStoreSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne({ sellerId: req.user._id })
      .maxTimeMS(STORE_QUERY_MAX_TIME_MS);
    if (!settings) settings = await StoreSettings.create({ sellerId: req.user._id });
    res.json({ success: true, settings });
  } catch (error) {
    return sendSellerServerError(res, error);
  }
};

// PUT /api/seller/store/settings
exports.updateStoreSettings = async (req, res) => {
  let uploadedBannerPublicId = '';
  try {
    const { storeName, bio, theme, socialLinks, featuredProducts } = req.body;

    let settings = await StoreSettings.findOne({ sellerId: req.user._id })
      .maxTimeMS(STORE_QUERY_MAX_TIME_MS);
    if (!settings) settings = new StoreSettings({ sellerId: req.user._id });

    if (storeName !== undefined) settings.storeName = String(storeName || '').trim().slice(0, 80);
    if (bio !== undefined) settings.bio = String(bio || '').trim().slice(0, 300);
    if (theme !== undefined) {
      if (!STORE_THEMES.has(theme)) {
        return res.status(400).json({ success: false, message: 'Invalid store theme.' });
      }
      settings.theme = theme;
    }
    if (socialLinks !== undefined) {
      const incomingSocialLinks = socialLinks && typeof socialLinks === 'object' ? socialLinks : {};
      const nextSocialLinks = { ...(settings.socialLinks?.toObject?.() || settings.socialLinks || {}) };
      for (const key of SOCIAL_LINK_KEYS) {
        if (Object.prototype.hasOwnProperty.call(incomingSocialLinks, key)) {
          nextSocialLinks[key] = normalizeHttpUrl(incomingSocialLinks[key], { maxLength: 200 });
        }
      }
      settings.socialLinks = nextSocialLinks;
    }
    if (featuredProducts !== undefined) {
      const productIds = [...new Set((Array.isArray(featuredProducts) ? featuredProducts : [])
        .map(id => String(id))
        .filter(Boolean))];
      if (productIds.length > MAX_FEATURED_PRODUCTS || productIds.some(id => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ success: false, message: 'Invalid featured products.' });
      }
      if (productIds.length) {
        const ownedCount = await Product.countDocuments({
          _id: { $in: productIds },
          sellerId: req.user._id,
          status: 'active',
        }).maxTimeMS(STORE_QUERY_MAX_TIME_MS);
        if (ownedCount !== productIds.length) {
          return res.status(403).json({ success: false, message: 'Featured products must belong to your active listings.' });
        }
      }
      settings.featuredProducts = productIds;
    }

    let previousBannerPublicId = '';
    // Optional banner upload (multer single file via req.file)
    if (req.file) {
      const signatureError = getImageSignatureValidationError(req.file, STORE_BANNER_IMAGE_MIME_TYPES);
      if (signatureError) {
        return res.status(400).json({ success: false, message: signatureError });
      }
      previousBannerPublicId = settings.bannerPublicId;
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'lekhon/store-banners', transformation: [{ width: 1400, crop: 'limit' }] },
          (err, r) => (err ? reject(err) : resolve(r))
        );
        stream.end(req.file.buffer);
      });
      uploadedBannerPublicId = result.public_id;
      settings.bannerImage    = result.secure_url;
      settings.bannerPublicId = result.public_id;
    }

    await settings.save();
    uploadedBannerPublicId = '';
    if (previousBannerPublicId) {
      await cloudinary.uploader.destroy(previousBannerPublicId).catch(() => {});
    }
    res.json({ success: true, settings });
  } catch (error) {
    if (uploadedBannerPublicId) {
      await cloudinary.uploader.destroy(uploadedBannerPublicId).catch(() => {});
    }
    return sendSellerServerError(res, error);
  }
};

// GET /api/seller/store/:username  (public store page)
exports.getStoreByUsername = async (req, res) => {
  try {
    const username = String(req.params.username || '').trim();
    if (!STORE_USERNAME_PATTERN.test(username)) {
      return res.status(404).json({ success: false, message: 'Store not found.' });
    }

    const user = await User.findOne({ username, isSeller: true })
      .select('username name profileImage bio isVerified isSeller createdAt')
      .maxTimeMS(STORE_QUERY_MAX_TIME_MS)
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'Store not found.' });

    const settings = await StoreSettings.findOne({ sellerId: user._id })
      .populate({
        path: 'featuredProducts',
        match: { status: 'active' },
        select: PUBLIC_STORE_PRODUCT_SELECT,
        options: {
          sort: { 'stats.sales': -1, createdAt: -1 },
          limit: MAX_FEATURED_PRODUCTS,
          maxTimeMS: STORE_QUERY_MAX_TIME_MS,
        },
      })
      .maxTimeMS(STORE_QUERY_MAX_TIME_MS)
      .lean();

    const products = await Product.find({ sellerId: user._id, status: 'active' })
      .select(PUBLIC_STORE_PRODUCT_SELECT)
      .sort({ 'stats.sales': -1, createdAt: -1 })
      .limit(24)
      .maxTimeMS(STORE_QUERY_MAX_TIME_MS)
      .lean();

    res.json({ success: true, seller: user, settings: serializePublicStoreSettings(settings), products });
  } catch (error) {
    return sendSellerServerError(res, error);
  }
};

// GET /api/seller/dashboard/stats
exports.getSellerStats = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const sellerObjectId = new mongoose.Types.ObjectId(String(sellerId));
    const revenueStatuses = ['paid', 'processing', 'shipped', 'delivered', 'completed'];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalProducts, activeProducts, pendingOrders, orderStatsRows, revenueRows] = await Promise.all([
      Product.countDocuments({ sellerId, status: { $ne: 'archived' } })
        .maxTimeMS(SELLER_QUERY_MAX_TIME_MS),
      Product.countDocuments({ sellerId, status: 'active' })
        .maxTimeMS(SELLER_QUERY_MAX_TIME_MS),
      Order.countDocuments({
        'items.sellerId': sellerId,
        status: { $in: ['paid', 'processing'] },
      }).maxTimeMS(SELLER_QUERY_MAX_TIME_MS),
      Order.aggregate([
        { $match: { 'items.sellerId': sellerObjectId, status: { $in: revenueStatuses } } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerObjectId } },
        {
          $group: {
            _id: null,
            orderIds: { $addToSet: '$_id' },
            totalRevenue: { $sum: { $ifNull: ['$items.subtotal', 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            totalOrders: { $size: '$orderIds' },
            totalRevenue: 1,
          },
        },
      ]).option({ maxTimeMS: SELLER_QUERY_MAX_TIME_MS }),
      Order.aggregate([
        {
          $match: {
            'items.sellerId': sellerObjectId,
            status: { $in: revenueStatuses },
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerObjectId } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: { $ifNull: ['$items.subtotal', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]).option({ maxTimeMS: SELLER_QUERY_MAX_TIME_MS }),
    ]);

    const orderStats = orderStatsRows[0] || { totalOrders: 0, totalRevenue: 0 };
    const totalRevenue = Number(orderStats.totalRevenue || 0);

    // Revenue chart — last 30 days, grouped by day
    const recentOrders  = revenueRows;
    const revenueByDay  = {};
    recentOrders.forEach(o => {
      const day  = o._id;
      revenueByDay[day] = o.total;
    });

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        totalOrders: Number(orderStats.totalOrders || 0),
        pendingOrders,
        totalRevenue,
        revenueByDay,
      },
    });
  } catch (error) {
    return sendSellerServerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN — Seller Applications
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/seller-applications
exports.getSellerApplications = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const normalizedStatus = String(status || 'pending').trim().toLowerCase();
    if (normalizedStatus !== 'all' && !SELLER_APPLICATION_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid seller application status.' });
    }
    const pagination = boundedPage({ page, limit }, MAX_SELLER_APP_PAGE_LIMIT);
    const query = normalizedStatus === 'all' ? {} : { status: normalizedStatus };

    const [applications, total] = await Promise.all([
      SellerApplication.find(query)
        .populate('userId', SELLER_APPLICATION_USER_SELECT)
        .populate('reviewedBy', 'username name')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .maxTimeMS(SELLER_QUERY_MAX_TIME_MS),
      SellerApplication.countDocuments(query).maxTimeMS(SELLER_QUERY_MAX_TIME_MS),
    ]);

    const safe = applications.map(sanitizeApplication);

    res.json({ success: true, applications: safe, total, page: pagination.page });
  } catch (error) {
    return sendSellerServerError(res, error);
  }
};

// PUT /api/admin/seller-applications/:id/approve
// PUT /api/admin/seller-applications/:id/reject
exports.reviewSellerApplication = async (req, res) => {
  try {
    const action     = req.path.includes('approve') ? 'approved' : 'rejected';
    const reviewNote = String(req.body.reviewNote || '').trim().slice(0, 1000);
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid application id.' });
    }

    const application = await SellerApplication.findById(req.params.id)
      .populate('userId', SELLER_APPLICATION_USER_SELECT)
      .maxTimeMS(SELLER_QUERY_MAX_TIME_MS);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Application already ${application.status}.` });
    }

    const applicantId = application.userId?._id || application.userId;
    const applicant = applicantId
      ? await User.findById(applicantId)
        .select('username email isVerified isSeller isGuest role guestExpiresAt isActive suspendedUntil')
        .maxTimeMS(SELLER_QUERY_MAX_TIME_MS)
      : null;
    if (!applicant) {
      return res.status(409).json({ success: false, message: 'Applicant account no longer exists.' });
    }

    if (action === 'approved') {
      const ineligibleReason = getSellerApprovalIneligibility(applicant);
      if (ineligibleReason) {
        return res.status(409).json({ success: false, message: ineligibleReason });
      }
    }

    application.status     = action;
    application.reviewedBy = req.user._id;
    application.reviewNote = reviewNote;
    application.reviewedAt = new Date();
    await application.save();

    if (action === 'approved') {
      applicant.isSeller = true;
      applicant.sellerApprovedAt = new Date();
      await applicant.save();
      // Ensure store settings document exists
      await StoreSettings.findOneAndUpdate(
        { sellerId: applicant._id },
        {
          $setOnInsert: {
            sellerId:  applicant._id,
            storeName: application.businessName || application.legalName,
          },
        },
        { upsert: true, new: true }
      ).maxTimeMS(SELLER_QUERY_MAX_TIME_MS);
    }

    // Real-time socket notification
    const io        = req.app.get('io');
    const socketEvt = action === 'approved' ? 'notification:seller_approved' : 'notification:seller_rejected';
    if (io) io.to(`user:${applicant._id}`).emit(socketEvt, {
      message: action === 'approved'
        ? 'Your seller application has been approved! You can now list products.'
        : `Your seller application was not approved. ${reviewNote ? 'Reason: ' + reviewNote : 'Please contact support.'}`,
    });

    // Queue email (add cases to queueService switch — see patches/queueService.patch.js)
    await enqueueEmailJob(action === 'approved' ? 'seller-approved' : 'seller-rejected', {
      email:      applicant.email,
      username:   applicant.username,
      reviewNote,
    });

    res.json({ success: true, message: `Application ${action}.`, application: sanitizeApplication(application) });
  } catch (error) {
    return sendSellerServerError(res, error);
  }
};

// PATCH /api/seller/application/withdraw
exports.withdrawMyApplication = async (req, res) => {
  try {
    const application = await SellerApplication.findOne({ userId: req.user._id })
      .maxTimeMS(SELLER_QUERY_MAX_TIME_MS);
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

    await User.findByIdAndUpdate(req.user._id, { sellerAppliedAt: null })
      .maxTimeMS(SELLER_QUERY_MAX_TIME_MS);
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
    return sendSellerServerError(res, error);
  }
};
