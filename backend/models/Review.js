const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  buyerId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  orderId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Order',   required: true },
  rating:            { type: Number, required: true, min: 1, max: 5 },
  title:             { type: String, default: '', maxlength: Number(process.env.REVIEW_TITLE_MAX_LENGTH) || 100 },
  body:              { type: String, default: '', maxlength: Number(process.env.REVIEW_BODY_MAX_LENGTH) || 1000 },
  images:            [{ type: String }],
  isVerifiedPurchase:{ type: Boolean, default: true },
  sellerReply:       { type: String,  default: '', maxlength: Number(process.env.REVIEW_REPLY_MAX_LENGTH) || 1000 },
  sellerRepliedAt:   { type: Date,    default: null },
}, { timestamps: true });

reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ buyerId: 1 });
// One review per (order + product) pair
reviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
