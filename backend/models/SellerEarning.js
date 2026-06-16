const mongoose = require('mongoose');

// One document per seller per order.
// Created the moment an order is marked PAID.
// Status moves: pending → available → paid_out
const sellerEarningSchema = new mongoose.Schema({
  sellerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String },

  // Money breakdown (all in INR)
  grossAmount:   { type: Number, required: true }, // sum of seller's items in this order
  platformFee:   { type: Number, default: 0 },     // Lekhon commission (e.g. 3%)
  gatewayFee:    { type: Number, default: 0 },     // Razorpay fee share (e.g. 2.36%)
  netAmount:     { type: Number, required: true },  // what seller actually gets

  currency: { type: String, default: 'INR' },

  status: {
    type: String,
    enum: [
      'pending',    // order paid, within hold period
      'available',  // hold period passed, ready to pay out
      'processing', // payout initiated via RazorpayX
      'paid_out',   // payout confirmed
      'reversed',   // refunded/cancelled — earning clawed back
    ],
    default: 'pending',
  },

  // Hold period — platform holds for N days after delivery before releasing
  holdUntil:    { type: Date, default: null },
  availableAt:  { type: Date, default: null },

  // Payout info (populated when paid_out)
  payoutId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Payout', default: null },
  paidOutAt:        { type: Date,   default: null },
  razorpayPayoutId: { type: String, default: '' },

  notes: { type: String, default: '' },
}, { timestamps: true });

sellerEarningSchema.index({ sellerId: 1, status: 1 });
sellerEarningSchema.index({ orderId: 1, sellerId: 1 }, { unique: true });

module.exports = mongoose.model('SellerEarning', sellerEarningSchema);
