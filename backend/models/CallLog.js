const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'rejected', 'failed'],
    default: 'completed'
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
callLogSchema.index({ caller: 1, receiver: 1, createdAt: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);
