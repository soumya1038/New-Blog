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
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastSeen: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  statuses: [{
    text: { type: String, default: '' },
    image: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  }],
  apiKeys: [{ 
    name: { type: String, default: 'Unnamed API Key' },
    key: String, 
    createdAt: { type: Date, default: Date.now } 
  }],
  role: { type: String, enum: ['user', 'admin', 'coAdmin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  suspendedUntil: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
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

module.exports = mongoose.model('User', userSchema);
