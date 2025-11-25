const mongoose = require('mongoose');

const shortSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true, maxlength: 700 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  category: { type: String, default: 'General' },
  coverImage: { type: String },
  cloudinaryPublicId: { type: String },
  metaDescription: { type: String, maxlength: 160 },
  wordCount: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDraft: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  viewedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    viewedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Calculate word count before saving
shortSchema.pre('save', function(next) {
  const words = this.content.split(/\s+/).filter(word => word.length > 0);
  this.wordCount = words.length;
  next();
});

module.exports = mongoose.model('Short', shortSchema);
