const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200
  },
  icon: {
    type: String,
    default: null
  },
  iconPublicId: {
    type: String
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  coAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  settings: {
    onlyAdminsCanSend: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanEditInfo: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

groupSchema.index({ members: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ admins: 1 });
groupSchema.index({ coAdmins: 1 });
groupSchema.index({ inviteCode: 1 });

// Generate invite code before saving
groupSchema.pre('save', function(next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
