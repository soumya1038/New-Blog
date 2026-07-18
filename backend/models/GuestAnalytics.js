const mongoose = require('mongoose');

const guestAnalyticsSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  ipHash: { type: String, index: true },
  ipAddress: { type: String, select: false }, // legacy raw IP field; new writes store ipHash instead
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
guestAnalyticsSchema.index({ createdAt: -1, ipHash: 1 });
guestAnalyticsSchema.index({ 'pages.timestamp': 1 });
guestAnalyticsSchema.index({ sessionId: 1, ipHash: 1 });

module.exports = mongoose.model('GuestAnalytics', guestAnalyticsSchema);
