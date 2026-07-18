const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    select: false
  },
  codeHash: {
    type: String,
    required: true,
    index: true,
    select: false
  },
  type: {
    type: String,
    enum: [
      'registration',
      'passwordReset',
      'forgotPassword',
      'forgotPasswordChange',
      'passwordChange',
      'authenticatedPasswordChange',
      'accountDeletion'
    ],
    required: true
  },
  username: String,
  newPassword: {
    type: String,
    select: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    select: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  consumedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - MongoDB will auto-delete expired documents
  }
}, {
  timestamps: true
});

// Index for faster lookups
verificationCodeSchema.index({ email: 1, type: 1 });
verificationCodeSchema.index({ email: 1, type: 1, consumedAt: 1, expiresAt: 1 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
