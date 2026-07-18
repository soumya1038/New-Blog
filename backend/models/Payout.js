const mongoose = require('mongoose');

// One payout = one bank transfer / UPI transfer to one seller
const payoutSchema = new mongoose.Schema({
  sellerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  earningIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'SellerEarning' }],

  amount:   { type: Number, required: true },   // total amount transferred
  currency: { type: String, default: 'INR' },

  method: { type: String, enum: ['upi', 'bank'], required: true },
  payoutDetails: {
    upiId:             { type: String, default: '' },
    bankAccount:       { type: String, default: '' }, // last 4 digits only for display
    ifsc:              { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
  },

  status: {
    type: String,
    enum: ['queued', 'processing', 'processed', 'reversed', 'failed'],
    default: 'queued',
  },

  // RazorpayX response
  razorpayPayoutId:     { type: String, default: '' },
  razorpayFundAccountId:{ type: String, default: '' },
  failureReason:        { type: String, default: '' },

  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin or auto
  processedAt: { type: Date, default: null },
  notes:       { type: String, default: '' },
}, { timestamps: true });

payoutSchema.index({ sellerId: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);
