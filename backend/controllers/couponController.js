const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const {
  calculateCouponApplication,
  normalizeCouponCode,
  serializeCouponWithStatus,
  getCouponEffectiveStatus,
  COUPON_CODE_MAX_LENGTH,
  COUPON_CODE_MIN_LENGTH,
} = require('../utils/couponRules');
const { logError } = require('../utils/safeErrorLog');

const VALID_DISCOUNT_TYPES = new Set(['percentage', 'flat', 'free_shipping']);
const VALID_PRODUCT_TYPES = new Set(['digital', 'physical', 'service']);
const MAX_COUPON_FLAT_AMOUNT = Math.max(1, Number(process.env.MAX_COUPON_FLAT_AMOUNT) || 100000);
const MAX_COUPON_USAGE_LIMIT = Math.max(1, Number(process.env.MAX_COUPON_USAGE_LIMIT) || 100000);
const MAX_COUPON_PRODUCTS = Math.max(1, Number(process.env.MAX_COUPON_PRODUCTS) || 100);
const COUPON_LIST_DEFAULT_LIMIT = Math.max(1, Number(process.env.COUPON_LIST_DEFAULT_LIMIT) || 50);
const COUPON_LIST_MAX_LIMIT = Math.max(1, Number(process.env.COUPON_LIST_MAX_LIMIT) || 100);
const COUPON_LIST_MAX_PAGE = Math.max(1, Number(process.env.COUPON_LIST_MAX_PAGE) || 1000);
const COUPON_VALIDATE_MAX_ITEMS = Math.max(1, Number(process.env.COUPON_VALIDATE_MAX_ITEMS) || 100);
const COUPON_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.COUPON_QUERY_MAX_TIME_MS) || 5000);

const sendCouponServerError = (res, error) => {
  if (error?.code === 11000 && error?.keyPattern?.code) {
    return res.status(400).json({ success: false, message: 'Coupon code already exists. Try a different one.' });
  }
  logError('[couponController] request failed:', error);
  return res.status(500).json({ success: false, message: 'Unable to process coupon request' });
};

const parseMoney = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
};

const parsePositiveInteger = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= MAX_COUPON_USAGE_LIMIT ? parsed : null;
};

const parseBoundedInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(safeValue, max);
};

const uniqueStrings = values => [...new Set((Array.isArray(values) ? values : []).map(value => String(value)).filter(Boolean))];
const invalidCouponResponse = (res) =>
  res.status(400).json({ success: false, message: 'Invalid coupon.' });

// POST /api/coupons  (seller creates)
exports.createCoupon = async (req, res) => {
  try {
    const {
      code, discountType, discountValue, maxDiscountCap, minOrderValue,
      usageLimit, perUserLimit, applicableProducts, applicableTypes,
      isStackable, validFrom, validUntil, scope,
    } = req.body;

    const upper = normalizeCouponCode(code);
    if (!upper) {
      return res.status(400).json({
        success: false,
        message: `Coupon code must be ${COUPON_CODE_MIN_LENGTH}-${COUPON_CODE_MAX_LENGTH} characters using letters, numbers, hyphen, or underscore.`,
      });
    }
    if (scope && scope !== 'seller') {
      return res.status(403).json({ success: false, message: 'Sellers can only create seller-scoped coupons.' });
    }
    if (!VALID_DISCOUNT_TYPES.has(discountType)) {
      return res.status(400).json({ success: false, message: 'Invalid discount type.' });
    }

    const cleanProductIds = uniqueStrings(applicableProducts);
    if (cleanProductIds.length > MAX_COUPON_PRODUCTS || cleanProductIds.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: 'Invalid applicable products.' });
    }
    if (cleanProductIds.length) {
      const ownedProductCount = await Product.countDocuments({
        _id: { $in: cleanProductIds },
        sellerId: req.user._id,
        status: { $ne: 'archived' },
      }).maxTimeMS(COUPON_QUERY_MAX_TIME_MS);
      if (ownedProductCount !== cleanProductIds.length) {
        return res.status(403).json({ success: false, message: 'Coupons can only target your own products.' });
      }
    }

    const cleanApplicableTypes = uniqueStrings(applicableTypes);
    if (cleanApplicableTypes.some(type => !VALID_PRODUCT_TYPES.has(type))) {
      return res.status(400).json({ success: false, message: 'Invalid applicable product type.' });
    }

    const parsedDiscountValue = discountType === 'free_shipping' ? 0 : parseMoney(discountValue);
    if (
      parsedDiscountValue === null ||
      (discountType === 'percentage' && (parsedDiscountValue <= 0 || parsedDiscountValue > 100)) ||
      (discountType === 'flat' && (parsedDiscountValue <= 0 || parsedDiscountValue > MAX_COUPON_FLAT_AMOUNT))
    ) {
      return res.status(400).json({ success: false, message: 'Invalid discount value.' });
    }

    const parsedMaxDiscountCap = maxDiscountCap ? parseMoney(maxDiscountCap) : null;
    if (parsedMaxDiscountCap !== null && (parsedMaxDiscountCap <= 0 || parsedMaxDiscountCap > MAX_COUPON_FLAT_AMOUNT)) {
      return res.status(400).json({ success: false, message: 'Invalid max discount cap.' });
    }
    const parsedMinOrderValue = parseMoney(minOrderValue, 0);
    if (parsedMinOrderValue === null || parsedMinOrderValue < 0 || parsedMinOrderValue > MAX_COUPON_FLAT_AMOUNT) {
      return res.status(400).json({ success: false, message: 'Invalid minimum order value.' });
    }
    const parsedUsageLimit = parsePositiveInteger(usageLimit);
    const parsedPerUserLimit = parsePositiveInteger(perUserLimit, 1);
    if (usageLimit && !parsedUsageLimit) {
      return res.status(400).json({ success: false, message: 'Invalid usage limit.' });
    }
    if (!parsedPerUserLimit || (parsedUsageLimit && parsedPerUserLimit > parsedUsageLimit)) {
      return res.status(400).json({ success: false, message: 'Invalid per-user limit.' });
    }

    const startsAt = validFrom ? new Date(validFrom) : new Date();
    const endsAt = new Date(validUntil);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return res.status(400).json({ success: false, message: 'Valid coupon dates are required.' });
    }

    const existing = await Coupon.findOne({ code: upper }).maxTimeMS(COUPON_QUERY_MAX_TIME_MS);
    if (existing) return res.status(400).json({ success: false, message: 'Coupon code already exists. Try a different one.' });

    const coupon = await Coupon.create({
      code:               upper,
      createdBy:          req.user._id,
      scope:              'seller',
      discountType,
      discountValue:      parsedDiscountValue,
      maxDiscountCap:     discountType === 'percentage' ? parsedMaxDiscountCap : null,
      minOrderValue:      parsedMinOrderValue,
      usageLimit:         parsedUsageLimit,
      perUserLimit:       parsedPerUserLimit,
      applicableProducts: cleanProductIds,
      applicableTypes:    cleanApplicableTypes,
      isStackable:        !!isStackable,
      validFrom:          startsAt,
      validUntil:         endsAt,
    });

    res.status(201).json({ success: true, coupon: serializeCouponWithStatus(coupon) });
  } catch (error) {
    return sendCouponServerError(res, error);
  }
};

// POST /api/coupons/validate
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;
    const userId = req.user._id;
    const normalizedCode = normalizeCouponCode(code);
    if (!normalizedCode) return invalidCouponResponse(res);

    const coupon = await Coupon.findOne({ code: normalizedCode }).maxTimeMS(COUPON_QUERY_MAX_TIME_MS);
    if (!coupon) return invalidCouponResponse(res);

    const cleanCartItems = Array.isArray(cartItems) ? cartItems : [];
    if (cleanCartItems.length > COUPON_VALIDATE_MAX_ITEMS) {
      return res.status(400).json({ success: false, message: 'Too many cart items for coupon validation.' });
    }
    const productIds = uniqueStrings(cleanCartItems.map(item => item.productId || item._id).filter(Boolean));
    if (productIds.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: 'Invalid cart item for coupon validation.' });
    }
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds }, status: 'active' })
        .select('sellerId type price status')
        .maxTimeMS(COUPON_QUERY_MAX_TIME_MS)
      : [];

    const application = calculateCouponApplication({
      coupon,
      userId,
      cartTotal,
      cartItems: cleanCartItems,
      products,
    });

    if (!application.valid) {
      const effectiveStatus = getCouponEffectiveStatus(coupon);
      if (coupon.isActive && ['expired', 'used_up'].includes(effectiveStatus.status)) {
        await Coupon.updateOne({ _id: coupon._id }, { $set: { isActive: false } });
      }
      return invalidCouponResponse(res);
    }

    res.json({
      success: true,
      discount: application.discount,
      isFreeShipping: application.isFreeShipping,
      coupon: {
        code:          coupon.code,
        discountType:  coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error) {
    return sendCouponServerError(res, error);
  }
};

// GET /api/seller/coupons
exports.getSellerCoupons = async (req, res) => {
  try {
    const limit = parseBoundedInt(req.query.limit, COUPON_LIST_DEFAULT_LIMIT, COUPON_LIST_MAX_LIMIT);
    const page = parseBoundedInt(req.query.page, 1, COUPON_LIST_MAX_PAGE);
    const skip = (page - 1) * limit;
    const filter = { createdBy: req.user._id };
    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(COUPON_QUERY_MAX_TIME_MS),
      Coupon.countDocuments(filter).maxTimeMS(COUPON_QUERY_MAX_TIME_MS)
    ]);
    res.json({
      success: true,
      coupons: coupons.map(coupon => serializeCouponWithStatus(coupon)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    return sendCouponServerError(res, error);
  }
};

// PATCH /api/seller/coupons/:id  (toggle active)
exports.toggleCoupon = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon id.' });
    }
    const coupon = await Coupon.findOne({ _id: req.params.id, createdBy: req.user._id })
      .maxTimeMS(COUPON_QUERY_MAX_TIME_MS);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });

    if (!coupon.isActive) {
      const effectiveStatus = getCouponEffectiveStatus({ ...coupon.toObject(), isActive: true });
      if (!effectiveStatus.canActivate || ['expired', 'used_up'].includes(effectiveStatus.status)) {
        return res.status(400).json({ success: false, message: effectiveStatus.message });
      }
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, coupon: serializeCouponWithStatus(coupon) });
  } catch (error) {
    return sendCouponServerError(res, error);
  }
};

// DELETE /api/seller/coupons/:id
exports.deleteCoupon = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon id.' });
    }
    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id })
      .maxTimeMS(COUPON_QUERY_MAX_TIME_MS);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (error) {
    return sendCouponServerError(res, error);
  }
};
