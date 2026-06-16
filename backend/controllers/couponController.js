const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const {
  calculateCouponApplication,
  normalizeCouponCode,
  serializeCouponWithStatus,
  getCouponEffectiveStatus,
} = require('../utils/couponRules');

// POST /api/coupons  (seller creates)
exports.createCoupon = async (req, res) => {
  try {
    const {
      code, discountType, discountValue, maxDiscountCap, minOrderValue,
      usageLimit, perUserLimit, applicableProducts, applicableTypes,
      isStackable, validFrom, validUntil, scope,
    } = req.body;

    const upper = normalizeCouponCode(code);
    if (!upper) return res.status(400).json({ success: false, message: 'Coupon code is required.' });

    const existing = await Coupon.findOne({ code: upper });
    if (existing) return res.status(400).json({ success: false, message: 'Coupon code already exists. Try a different one.' });

    const coupon = await Coupon.create({
      code:               upper,
      createdBy:          req.user._id,
      scope:              scope || 'seller',
      discountType,
      discountValue:      parseFloat(discountValue),
      maxDiscountCap:     maxDiscountCap ? parseFloat(maxDiscountCap) : null,
      minOrderValue:      minOrderValue ? parseFloat(minOrderValue) : 0,
      usageLimit:         usageLimit ? parseInt(usageLimit, 10) : null,
      perUserLimit:       perUserLimit ? parseInt(perUserLimit, 10) : 1,
      applicableProducts: applicableProducts || [],
      applicableTypes:    applicableTypes || [],
      isStackable:        !!isStackable,
      validFrom:          validFrom ? new Date(validFrom) : new Date(),
      validUntil:         new Date(validUntil),
    });

    res.status(201).json({ success: true, coupon: serializeCouponWithStatus(coupon) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/coupons/validate
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;
    const userId = req.user._id;

    const coupon = await Coupon.findOne({ code: normalizeCouponCode(code) });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });

    const productIds = Array.isArray(cartItems)
      ? cartItems.map(item => item.productId || item._id).filter(Boolean)
      : [];
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds }, status: 'active' })
      : [];

    const application = calculateCouponApplication({
      coupon,
      userId,
      cartTotal,
      cartItems: Array.isArray(cartItems) ? cartItems : [],
      products,
    });

    if (!application.valid) {
      const effectiveStatus = getCouponEffectiveStatus(coupon);
      if (coupon.isActive && ['expired', 'used_up'].includes(effectiveStatus.status)) {
        await Coupon.updateOne({ _id: coupon._id }, { $set: { isActive: false } });
      }
      return res.status(400).json({ success: false, message: application.message || 'Invalid coupon.' });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/coupons
exports.getSellerCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, coupons: coupons.map(coupon => serializeCouponWithStatus(coupon)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/seller/coupons/:id  (toggle active)
exports.toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, createdBy: req.user._id });
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/seller/coupons/:id
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
