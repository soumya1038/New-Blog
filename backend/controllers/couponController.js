const Coupon = require('../models/Coupon');

// POST /api/coupons  (seller creates)
exports.createCoupon = async (req, res) => {
  try {
    const {
      code, discountType, discountValue, maxDiscountCap, minOrderValue,
      usageLimit, perUserLimit, applicableProducts, applicableTypes,
      isStackable, validFrom, validUntil, scope,
    } = req.body;

    const upper = code?.toUpperCase().trim();
    if (!upper) return res.status(400).json({ success: false, message: 'Coupon code is required.' });

    const existing = await Coupon.findOne({ code: upper });
    if (existing) return res.status(400).json({ success: false, message: 'Coupon code already exists. Try a different one.' });

    const coupon = await Coupon.create({
      code:               upper,
      createdBy:          req.user._id,
      scope:              scope          || 'seller',
      discountType,
      discountValue:      parseFloat(discountValue),
      maxDiscountCap:     maxDiscountCap ? parseFloat(maxDiscountCap) : null,
      minOrderValue:      minOrderValue  ? parseFloat(minOrderValue)  : 0,
      usageLimit:         usageLimit     ? parseInt(usageLimit)       : null,
      perUserLimit:       perUserLimit   ? parseInt(perUserLimit)     : 1,
      applicableProducts: applicableProducts || [],
      applicableTypes:    applicableTypes    || [],
      isStackable:        !!isStackable,
      validFrom:          validFrom    ? new Date(validFrom)   : new Date(),
      validUntil:         new Date(validUntil),
    });

    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/coupons/validate
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;
    const userId = req.user._id;

    const coupon = await Coupon.findOne({ code: code?.toUpperCase().trim(), isActive: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });

    const now = new Date();
    if (now < coupon.validFrom)  return res.status(400).json({ success: false, message: 'This coupon is not active yet.' });
    if (now > coupon.validUntil) return res.status(400).json({ success: false, message: 'This coupon has expired.' });

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
    }

    const userUses = coupon.usedBy.filter(u => u.userId.toString() === userId.toString()).length;
    if (userUses >= coupon.perUserLimit) {
      return res.status(400).json({ success: false, message: 'You have already used this coupon the maximum number of times.' });
    }

    if (parseFloat(cartTotal) < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon.`,
      });
    }

    // Calculate discount amount
    let discount      = 0;
    let isFreeShipping = false;

    if (coupon.discountType === 'percentage') {
      discount = (parseFloat(cartTotal) * coupon.discountValue) / 100;
      if (coupon.maxDiscountCap) discount = Math.min(discount, coupon.maxDiscountCap);
    } else if (coupon.discountType === 'flat') {
      discount = Math.min(coupon.discountValue, parseFloat(cartTotal));
    } else if (coupon.discountType === 'free_shipping') {
      isFreeShipping = true;
    }

    discount = Math.round(discount * 100) / 100;

    res.json({
      success: true,
      discount,
      isFreeShipping,
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
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/seller/coupons/:id  (toggle active)
exports.toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, coupon });
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
