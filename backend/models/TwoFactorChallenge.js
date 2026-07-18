const mongoose = require('mongoose');

const twoFactorChallengeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  method: {
    type: String,
    enum: ['sms', 'authenticator', 'password', 'biometric'],
    required: true,
  },
  codeHash: {
    type: String,
    default: '',
    select: false,
  },
  tokenHash: {
    type: String,
    default: '',
    index: true,
    select: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    select: false,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  consumedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
}, {
  timestamps: true,
});

twoFactorChallengeSchema.index({ user: 1, action: 1, method: 1, createdAt: -1 });

module.exports = mongoose.model('TwoFactorChallenge', twoFactorChallengeSchema);
