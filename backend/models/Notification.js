const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment', 'follow', 'message', 'publish', 'seller_application_submitted', 'seller_application_withdrawn', 'seller_approved', 'seller_rejected', 'new_order', 'order_shipped', 'order_delivered', 'new_review', 'refund_requested', 'payout_processed'], required: true },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog' },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
  short: { type: mongoose.Schema.Types.ObjectId, ref: 'Short' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1, _id: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, sender: 1, type: 1 });
notificationSchema.index({ createdAt: 1 });
notificationSchema.index({ createdAt: 1, _id: 1 });
notificationSchema.index({ blog: 1, createdAt: -1 }, { sparse: true });
notificationSchema.index({ article: 1, createdAt: -1 }, { sparse: true });
notificationSchema.index({ short: 1, createdAt: -1 }, { sparse: true });

module.exports = mongoose.model('Notification', notificationSchema);
