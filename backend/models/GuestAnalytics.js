const mongoose = require('mongoose');

const guestAnalyticsSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  ipAddress: { type: String, required: true },
  userAgent: String,
  pages: [{
    path: String,
    timestamp: { type: Date, default: Date.now },
    duration: Number // seconds spent on page
  }],
  sessionStart: { type: Date, default: Date.now },
  sessionEnd: Date,
  totalDuration: { type: Number, default: 0 }, // total session duration in seconds
  pageViews: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Index for efficient queries
guestAnalyticsSchema.index({ createdAt: 1 });
guestAnalyticsSchema.index({ sessionId: 1, ipAddress: 1 });

module.exports = mongoose.model('GuestAnalytics', guestAnalyticsSchema);