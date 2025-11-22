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
    enum: ['text', 'voice', 'file', 'image', 'document'],
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
  cloudinaryPublicId: {
    type: String
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
      const cloudinary = require('../config/cloudinary');
      await cloudinary.uploader.destroy(this.cloudinaryPublicId);
      console.log(`✅ Deleted Cloudinary file: ${this.cloudinaryPublicId}`);
    } catch (error) {
      console.error('❌ Failed to delete Cloudinary file:', error);
    }
  }
});

// TTL index - auto-delete messages after 30 days
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days = 2592000 seconds

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
