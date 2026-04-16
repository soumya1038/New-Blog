const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
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
  viewedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    viewedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

articleSchema.pre('save', function(next) {
  const words = this.content.split(/\s+/).filter(word => word.length > 0);
  this.wordCount = words.length;
  this.readingTime = Math.ceil(words.length / 200);
  next();
});

articleSchema.index({ slugHistory: 1 });
articleSchema.index(
  {
    title: 'text',
    content: 'text',
    tags: 'text',
    category: 'text',
    metaDescription: 'text'
  },
  {
    name: 'article_weighted_text_search',
    weights: {
      title: 14,
      tags: 8,
      metaDescription: 7,
      category: 4,
      content: 2
    },
    default_language: 'english'
  }
);

module.exports = mongoose.model('Article', articleSchema);
