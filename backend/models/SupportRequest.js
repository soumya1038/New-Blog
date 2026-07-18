const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['support', 'report', 'appeal'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    reference: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    sourcePath: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    username: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminNotes: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    adminEvents: [
      {
        action: {
          type: String,
          enum: ['support_request_updated'],
          required: true,
        },
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        adminUsername: {
          type: String,
          default: '',
          trim: true,
          maxlength: 100,
        },
        changes: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      userAgent: { type: String, default: '', maxlength: 500 },
      platform: { type: String, default: '', maxlength: 100 },
    },
  },
  { timestamps: true }
);

supportRequestSchema.index({ status: 1, createdAt: -1 });
supportRequestSchema.index({ type: 1, status: 1, createdAt: -1 });
supportRequestSchema.index({ type: 1, status: 1, priority: 1, createdAt: -1 });
supportRequestSchema.index({ priority: 1, createdAt: -1 });
supportRequestSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportRequestSchema.index({ status: 1, assignedTo: 1, createdAt: -1 });
supportRequestSchema.index({ createdAt: -1 });
supportRequestSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);

