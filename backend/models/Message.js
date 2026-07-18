const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    }
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'file', 'image', 'document', 'groupcall'],
    default: 'text'
  },
  voiceUrl: {
    type: String
  },
  voiceDuration: {
    type: Number
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  mimeType: {
    type: String
  },
  caption: {
    type: String
  },
  callData: {
    type: mongoose.Schema.Types.Mixed
  },
  cloudinaryPublicId: {
    type: String
  },
  cloudinaryResourceType: {
    type: String,
    enum: ['image', 'video', 'raw'],
    default: '',
    select: false,
  },
  cloudinaryDeliveryType: {
    type: String,
    enum: ['upload', 'private', 'authenticated'],
    default: 'upload',
    select: false,
  },
  cloudinaryFormat: {
    type: String,
    default: '',
    select: false,
  },
  cleanupStartedAt: {
    type: Date,
    default: null,
    select: false,
  },
  encrypted: {
    type: Boolean,
    default: true
  },
  delivered: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deletedForEveryone: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      expiresAt: {
        type: Date
      }
    }],
    default: []
  }
}, {
  timestamps: true
});

// Pre-delete hook to cleanup Cloudinary files
messageSchema.pre('deleteOne', { document: true, query: false }, async function() {
  if (this.cloudinaryPublicId) {
    try {
      const { deleteCloudinaryPublicIdAcrossResourceTypes } = require('../utils/cloudinaryCleanup');
      await deleteCloudinaryPublicIdAcrossResourceTypes(this.cloudinaryPublicId);
      console.log('[message] Deleted Cloudinary file for removed message.');
    } catch (error) {
      console.error('[message] Failed to delete Cloudinary file:', error?.message || error);
    }
  }
});

// TTL index - auto-delete messages after 30 days
// Retention cleanup is application-managed so Cloudinary assets are deleted before records.
messageSchema.index({ createdAt: 1, cleanupStartedAt: 1, _id: 1 });

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, delivered: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
