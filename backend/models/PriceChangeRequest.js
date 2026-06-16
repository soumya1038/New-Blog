const crypto = require('crypto');
const mongoose = require('mongoose');

const priceChangeRequestSchema = new mongoose.Schema({
  requestToken: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  oldPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  requestedPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR',
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired'],
    default: 'pending',
    index: true,
  },
  adminNote: {
    type: String,
    default: '',
    trim: true,
    maxlength: 1000,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  appliedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: true,
  },
  snapshot: {
    productTitle: { type: String, default: '' },
    productSlug: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
  },
}, { timestamps: true });

priceChangeRequestSchema.pre('validate', function setRequestToken(next) {
  if (!this.requestToken) {
    const stamp = Date.now().toString(36).toUpperCase();
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.requestToken = `PCT-${stamp}-${suffix}`;
  }
  next();
});

priceChangeRequestSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
priceChangeRequestSchema.index({ productId: 1, status: 1 });
priceChangeRequestSchema.index(
  { sellerId: 1, productId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('PriceChangeRequest', priceChangeRequestSchema);
