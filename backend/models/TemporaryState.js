const mongoose = require('mongoose');

const temporaryStateSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    index: true,
  },
  keyHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    select: false,
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

temporaryStateSchema.index({ type: 1, expiresAt: 1 });

module.exports = mongoose.model('TemporaryState', temporaryStateSchema);
