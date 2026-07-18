const mongoose = require('mongoose');

const verificationCheckSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['not_started', 'format_valid', 'pending_provider', 'verified', 'manual_review', 'failed'],
    default: 'not_started',
  },
  provider: { type: String, default: '' },
  referenceId: { type: String, default: '' },
  nameMatch: { type: Boolean, default: null },
  checkedAt: { type: Date, default: null },
  verifiedAt: { type: Date, default: null },
  note: { type: String, default: '' },
}, { _id: false });

const attemptHistorySchema = new mongoose.Schema({
  attemptNumber: { type: Number, required: true },
  submittedAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'withdrawn'], required: true },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: '' },
  legalName: { type: String, default: '' },
  businessName: { type: String, default: '' },
  businessType: { type: String, default: '' },
  categories: [{ type: String }],
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: '' },
  maskedPan: { type: String, default: '' },
  payoutType: { type: String, default: '' },
  maskedPayout: { type: String, default: '' },
  verification: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const sellerApplicationSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected', 'withdrawn'], default: 'pending' },
  attemptNumber:{ type: Number, default: 1, min: 1 },
  lastSubmittedAt: { type: Date, default: null },
  reappliedAt:  { type: Date, default: null },
  attemptHistory: [attemptHistorySchema],
  legalName:    { type: String, required: true, trim: true },
  businessName: { type: String, default: '', trim: true },
  businessType: { type: String, enum: ['individual', 'company'], required: true },
  categories:   [{ type: String }],
  bio:          { type: String, default: '', maxlength: 500 },
  phone:        { type: String, required: true },
  city:         { type: String, default: '' },
  state:        { type: String, default: '' },
  country:      { type: String, default: '' },
  panNumber:    { type: String, default: '', select: false }, // AES encrypted at rest via utils/encryption.js
  maskedPan:    { type: String, default: '' },
  payoutMethod: {
    type:              { type: String, enum: ['bank', 'upi'], default: 'upi' },
    upiId:             { type: String, default: '' },
    bankAccount:       { type: String, default: '', select: false }, // AES encrypted
    bankAccountMasked: { type: String, default: '' },
    ifsc:              { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
  },
  verificationProvider: { type: String, enum: ['manual', 'razorpay'], default: 'manual' },
  razorpayVerification: {
    status: {
      type: String,
      enum: ['not_started', 'pending_setup', 'pending_provider', 'verified', 'failed'],
      default: 'not_started',
    },
    accountId: { type: String, default: '', select: false },
    referenceId: { type: String, default: '', select: false },
    onboardingUrl: { type: String, default: '', select: false },
    note: { type: String, default: '' },
    requestedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
  },
  verification: {
    phone: verificationCheckSchema,
    pan: verificationCheckSchema,
    upi: verificationCheckSchema,
    bank: verificationCheckSchema,
    digilocker: verificationCheckSchema,
  },
  agreedToTerms: { type: Boolean, required: true },
  agreedAt:      { type: Date,    default: null },
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote:    { type: String,  default: '' },
  reviewedAt:    { type: Date,    default: null },
}, { timestamps: true });

sellerApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SellerApplication', sellerApplicationSchema);
