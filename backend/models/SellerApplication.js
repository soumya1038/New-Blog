const mongoose = require('mongoose');

const sellerApplicationSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  legalName:    { type: String, required: true, trim: true },
  businessName: { type: String, default: '', trim: true },
  businessType: { type: String, enum: ['individual', 'company'], required: true },
  categories:   [{ type: String }],
  bio:          { type: String, default: '', maxlength: 500 },
  phone:        { type: String, required: true },
  city:         { type: String, default: '' },
  state:        { type: String, default: '' },
  country:      { type: String, default: '' },
  panNumber:    { type: String, default: '' },        // AES encrypted at rest via utils/encryption.js
  payoutMethod: {
    type:              { type: String, enum: ['bank', 'upi'], default: 'upi' },
    upiId:             { type: String, default: '' },
    bankAccount:       { type: String, default: '' }, // AES encrypted
    ifsc:              { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
  },
  agreedToTerms: { type: Boolean, required: true },
  agreedAt:      { type: Date,    default: null },
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote:    { type: String,  default: '' },
  reviewedAt:    { type: Date,    default: null },
}, { timestamps: true });

sellerApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SellerApplication', sellerApplicationSchema);
