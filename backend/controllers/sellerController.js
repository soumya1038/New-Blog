const User             = require('../models/User');
const SellerApplication= require('../models/SellerApplication');
const StoreSettings    = require('../models/StoreSettings');
const Product          = require('../models/Product');
const Order            = require('../models/Order');
const { encrypt }      = require('../utils/encryption');
const { enqueueEmailJob } = require('../jobs/queueService');
const cloudinary       = require('../utils/cloudinary');

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
      phone, city, state, country, panNumber, payoutMethod, agreedToTerms,
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
      message: 'Application submitted! Admin will review it shortly.',
      application: { _id: application._id, status: application.status },
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

    const safe = application.toObject();
    delete safe.panNumber;
    if (safe.payoutMethod) delete safe.payoutMethod.bankAccount;

    res.json({ success: true, application: safe });
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

    const safe = applications.map(a => {
      const obj = a.toObject();
      delete obj.panNumber;
      if (obj.payoutMethod) delete obj.payoutMethod.bankAccount;
      return obj;
    });

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
        ? '🎉 Your seller application has been approved! You can now list products.'
        : `Your seller application was not approved. ${reviewNote ? 'Reason: ' + reviewNote : 'Please contact support.'}`,
    });

    // Queue email (add cases to queueService switch — see patches/queueService.patch.js)
    await enqueueEmailJob(action === 'approved' ? 'seller-approved' : 'seller-rejected', {
      email:      application.userId.email,
      username:   application.userId.username,
      reviewNote,
    });

    res.json({ success: true, message: `Application ${action}.`, application });
  } catch (error) {
    console.error('[sellerController] reviewSellerApplication:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
