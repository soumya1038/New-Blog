const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  category: { type: String, default: 'General' },
  coverImage: { type: String },
  cloudinaryPublicId: { type: String },
  videoUrls: [{ type: String }],
  metaDescription: { type: String, maxlength: 160 },
  slug: { type: String, index: true },
  slugHistory: [{ type: String }],
  wordCount: { type: Number, default: 0 },
  readingTime: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDraft: { type: Boolean, default: false },
  isScheduled: { type: Boolean, default: false },
  scheduledPublishDate: { type: Date },
  views: { type: Number, default: 0 },
  linkedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  isPromoPost: { type: Boolean, default: false },
  viewedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    viewedAt: { type: Date, default: Date.now }
  }],
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

blogSchema.index({ slugHistory: 1 });
blogSchema.index(
  {
    title: 'text',
    content: 'text',
    tags: 'text',
    category: 'text',
    metaDescription: 'text'
  },
  {
    name: 'blog_weighted_text_search',
    weights: {
      title: 12,
      tags: 7,
      metaDescription: 6,
      category: 4,
      content: 2
    },
    default_language: 'english'
  }
);

module.exports = mongoose.model('Blog', blogSchema);
