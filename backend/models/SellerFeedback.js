const mongoose = require('mongoose');

const sellerFeedbackSchema = new mongoose.Schema({
  orderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  sellerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  buyerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  rating:        { type: Number, required: true, min: 1, max: 5 },
  arrivedOnTime: { type: String, enum: ['Yes', 'No'], required: true },
  asDescribed:   { type: String, enum: ['Yes', 'No'], required: true },
  comments:      { type: String, required: true, maxlength: Number(process.env.SELLER_FEEDBACK_COMMENT_MAX_LENGTH) || 1000 },
  isVerifiedPurchase: { type: Boolean, default: true },
}, { timestamps: true });

sellerFeedbackSchema.index({ sellerId: 1, createdAt: -1 });
sellerFeedbackSchema.index({ buyerId: 1, createdAt: -1 });
sellerFeedbackSchema.index({ orderId: 1, sellerId: 1 }, { unique: true });

module.exports = mongoose.model('SellerFeedback', sellerFeedbackSchema);
