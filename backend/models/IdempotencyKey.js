const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  scope: { type: String, required: true, index: true, trim: true },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    index: true
  },
  resourceType: { type: String, default: '' },
  resourceId: { type: String, default: '' },
  response: { type: mongoose.Schema.Types.Mixed, default: {} },
  error: { type: String, default: '' },
  lockedUntil: { type: Date, default: null, index: true },
  completedAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null, select: false }
}, { timestamps: true });

idempotencyKeySchema.index({ scope: 1, status: 1, updatedAt: -1 });
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
