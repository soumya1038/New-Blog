const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:       { type: String, required: true, unique: true, uppercase: true, trim: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scope:      { type: String, enum: ['product', 'seller', 'platform'], default: 'seller' },

  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  discountType:  { type: String, enum: ['percentage', 'flat', 'free_shipping'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  maxDiscountCap:{ type: Number, default: null },  // cap for % discounts (e.g. max ₹200)
  minOrderValue: { type: Number, default: 0 },

  usageLimit:   { type: Number, default: null },   // null = unlimited
  perUserLimit: { type: Number, default: 1 },
  usedCount:    { type: Number, default: 0 },
  usedBy: [{
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt:  { type: Date, default: Date.now },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  }],

  applicableTypes: [{ type: String, enum: ['digital', 'physical', 'service'] }],
  isStackable: { type: Boolean, default: false },
  validFrom:   { type: Date, default: Date.now },
  validUntil:  { type: Date, required: true },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.index({ code: 1 });
couponSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
