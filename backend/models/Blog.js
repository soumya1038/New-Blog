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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Calculate word count and reading time before saving
blogSchema.pre('save', function(next) {
  const words = this.content.split(/\s+/).filter(word => word.length > 0);
  this.wordCount = words.length;
  this.readingTime = Math.ceil(words.length / 200); // 200 words per minute
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
