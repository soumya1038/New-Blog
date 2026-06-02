const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3 },
  name: { type: String, default: '' },
  password: { type: String, required: true, minlength: 6 },
  fullName: { type: String, default: '' },
  email: { type: String, default: '', sparse: true },
  phone: { type: String, default: '' },
  dateOfBirth: { type: Date },
  address: { type: String, default: '' },
  bio: { type: String, default: '' },
  description: { type: String, default: '', maxlength: 200 },
  signature: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  socialMedia: [{
    name: { type: String, default: '' },
    url: { type: String, required: true }
  }],
  oauthProviders: {
    google: {
      id: { type: String, default: '' },
    },
    facebook: {
      id: { type: String, default: '' },
    },
    twitter: {
      id: { type: String, default: '' },
    },
    linkedin: {
      id: { type: String, default: '' },
    },
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    showEmail: { type: Boolean, default: true },
    showPhone: { type: Boolean, default: true },
    showSocialLinks: { type: Boolean, default: true },
    showFacebookLinks: { type: Boolean, default: true },
    showTwitterLinks: { type: Boolean, default: true },
    showLinkedInLinks: { type: Boolean, default: true },
    showGitHubLinks: { type: Boolean, default: true },
    socialLinkVisibility: {
      type: Map,
      of: Boolean,
      default: {},
    },
    allowMessages: { type: Boolean, default: true },
  },
  emailNotifications: {
    newFollower: { type: Boolean, default: true },
    newMessage: { type: Boolean, default: true },
    missedCall: { type: Boolean, default: true },
    newComment: { type: Boolean, default: true },
    newReaction: { type: Boolean, default: true },
    // Content-published emails are intentionally system-managed.
    contentPublished: { type: Boolean, default: true },
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedStoryUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hiddenStoryUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastSeen: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  statuses: [{
    contentType: { type: String, enum: ['story', 'post'], default: 'story' },
    text: { type: String, default: '' },
    image: { type: String, default: '' },
    video: { type: String, default: '' },
    mediaType: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    mediaPublicId: { type: String, default: '' },
    backgroundColor: { type: String, default: '#1f2937' },
    textColor: { type: String, default: '#ffffff' },
    fontFamily: { type: String, default: 'Inter' },
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    musicLabel: { type: String, default: '' },
    musicSourceType: {
      type: String,
      enum: ['none', 'spotify', 'youtube', 'apple', 'soundcloud', 'custom'],
      default: 'none',
    },
    musicSourceUrl: { type: String, default: '' },
    trimStartSec: { type: Number, default: 0, min: 0 },
    trimEndSec: { type: Number, default: null, min: 0 },
    stickers: [{
      id: { type: String, default: '' },
      emoji: { type: String, default: '' },
      x: { type: Number, default: 50, min: 0, max: 100 },
      y: { type: Number, default: 50, min: 0, max: 100 },
      size: { type: Number, default: 48, min: 24, max: 96 },
      rotate: { type: Number, default: 0, min: -60, max: 60 },
    }],
    textPosX: { type: Number, default: 50, min: 0, max: 100 },
    textPosY: { type: Number, default: 50, min: 0, max: 100 },
    audience: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
    seenBy: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      seenAt: { type: Date, default: Date.now },
    }],
    durationSec: { type: Number, default: 7, min: 3, max: 30 },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  }],
  apiKeys: [{ 
    name: { type: String, default: 'Unnamed API Key' },
    key: String, 
    createdAt: { type: Date, default: Date.now } 
  }],
  role: { type: String, enum: ['user', 'admin', 'coAdmin', 'guest'], default: 'user' },
  isGuest: { type: Boolean, default: false },
  guestExpiresAt: { type: Date, default: null, index: true },
  mustChangePasswordAfterGoogle: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  suspendedUntil: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  isSeller: { type: Boolean, default: false },
  sellerAppliedAt: { type: Date, default: null },
  sellerApprovedAt: { type: Date, default: null },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  verificationToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// TTL index for auto-deleting expired guests
userSchema.index(
  { guestExpiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { isGuest: true, guestExpiresAt: { $exists: true } }
  }
);

module.exports = mongoose.model('User', userSchema);
