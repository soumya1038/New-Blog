const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  category: { type: String, default: 'General' },
  coverImage: { type: String },
  cloudinaryPublicId: { type: String },
  metaDescription: { type: String, maxlength: 160 },
  slug: { type: String },
  wordCount: { type: Number, default: 0 },
  readingTime: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDraft: { type: Boolean, default: false },
  isShortBlog: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  viewedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    viewedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Calculate word count, reading time, and auto-detect short blog before saving
blogSchema.pre('save', function(next) {
  const words = this.content.split(/\s+/).filter(word => word.length > 0);
  this.wordCount = words.length;
  this.readingTime = Math.ceil(words.length / 200); // 200 words per minute
  
  // Auto-detect short blog if word count <= 100
  if (this.wordCount <= 100) {
    this.isShortBlog = true;
  }
  
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
