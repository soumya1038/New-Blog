const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } = require('../utils/passwordPolicy');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
    trim: true,
    match: /^[a-zA-Z0-9_]+$/,
  },
  name: { type: String, default: '' },
  password: {
    type: String,
    required: true,
    minlength: PASSWORD_MIN_LENGTH,
    maxlength: PASSWORD_MAX_LENGTH,
    select: false,
  },
  fullName: { type: String, default: '' },
  email: { type: String, default: '', trim: true, lowercase: true },
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
    telegram: {
      id: { type: String, default: '' },
    },
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
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
  twoFactor: {
    enabled: { type: Boolean, default: false },
    preferredMethod: {
      type: String,
      enum: ['authenticator', 'sms'],
      default: 'authenticator',
    },
    authenticator: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, default: '', select: false },
      setupSecret: { type: String, default: '', select: false },
      confirmedAt: { type: Date, default: null },
    },
    sms: {
      enabled: { type: Boolean, default: false },
      phone: { type: String, default: '' },
      verifiedAt: { type: Date, default: null },
    },
    lastChangedAt: { type: Date, default: null },
  },
  security: {
    sensitiveActionPassword: {
      failedAttempts: { type: Number, default: 0 },
      windowStartedAt: { type: Date, default: null },
      lockedUntil: { type: Date, default: null },
      lastFailedAt: { type: Date, default: null },
    },
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
    mediaFormat: { type: String, default: '' },
    mediaResourceType: { type: String, enum: ['', 'image', 'video'], default: '' },
    mediaDeliveryType: { type: String, enum: ['', 'upload', 'authenticated'], default: '' },
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
    seenByCount: { type: Number, default: 0, min: 0 },
    durationSec: { type: Number, default: 7, min: 3, max: 30 },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  }],
  apiKeys: [{ 
    name: { type: String, default: 'Unnamed API Key' },
    key: { type: String, select: false },
    keyHash: { type: String, select: false },
    keyPrefix: { type: String, default: '' },
    keyLast4: { type: String, default: '' },
    keyVersion: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now } 
  }],
  role: { type: String, enum: ['user', 'admin', 'coAdmin', 'guest'], default: 'user' },
  isGuest: { type: Boolean, default: false },
  guestExpiresAt: { type: Date, default: null },
  guestCleanupStartedAt: { type: Date, default: null },
  statusCleanupStartedAt: { type: Date, default: null, select: false },
  mustChangePasswordAfterGoogle: { type: Boolean, default: false },
  telegramOnboardingPasswordPending: { type: Boolean, default: false, select: false },
  authVersion: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  suspendedUntil: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  isSeller: { type: Boolean, default: false },
  sellerAppliedAt: { type: Date, default: null },
  sellerApprovedAt: { type: Date, default: null },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  marketplacePreferences: {
    recentProducts: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      views: { type: Number, default: 1 },
      viewedAt: { type: Date, default: Date.now },
    }],
    categorySignals: [{
      category: { type: String, trim: true },
      count: { type: Number, default: 1 },
      lastSeenAt: { type: Date, default: Date.now },
    }],
    typeSignals: [{
      type: { type: String, enum: ['digital', 'physical', 'service', 'external'] },
      count: { type: Number, default: 1 },
      lastSeenAt: { type: Date, default: Date.now },
    }],
    updatedAt: { type: Date, default: null },
  },
  verificationToken: { type: String, default: null, select: false },
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
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Guest expiry is handled by the cleanup job so related data and media are removed first.
userSchema.index(
  { isGuest: 1, guestExpiresAt: 1, guestCleanupStartedAt: 1 },
  {
    name: 'guest_cleanup_due_idx',
    partialFilterExpression: { isGuest: true, guestExpiresAt: { $exists: true } }
  }
);
userSchema.index({ 'apiKeys.keyHash': 1 });
userSchema.index({ isGuest: 1, createdAt: -1, _id: -1 });
userSchema.index({ isGuest: 1, suspendedUntil: 1 });
userSchema.index({ lastActive: -1 });
userSchema.index(
  { 'statuses.expiresAt': 1, statusCleanupStartedAt: 1, _id: 1 },
  { name: 'status_cleanup_due_idx' }
);
userSchema.index({ 'statuses._id': 1 }, { name: 'status_media_lookup_idx' });
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: 'string', $gt: '' },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
