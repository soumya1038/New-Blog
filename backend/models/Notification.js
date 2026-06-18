const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment', 'follow', 'message', 'publish', 'seller_application_submitted', 'seller_application_withdrawn', 'seller_approved', 'seller_rejected', 'new_order', 'order_shipped', 'order_delivered', 'new_review', 'refund_requested', 'payout_processed'], required: true },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
