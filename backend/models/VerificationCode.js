const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['registration', 'passwordReset', 'forgotPassword', 'passwordChange', 'authenticatedPasswordChange'],
    required: true
  },
  username: String,
  newPassword: String,
  verified: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
