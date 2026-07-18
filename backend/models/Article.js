const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  category: { type: String, default: 'General' },
  coverImage: { type: String },
  cloudinaryPublicId: { type: String },
  galleryImages: [{ type: String }],
  galleryImagePublicIds: [{ type: String }],
  productTagPlacements: [{
    productKey: { type: String, trim: true },
    source: { type: String, enum: ['marketplace', 'external'], default: 'marketplace' },
    imageIndex: { type: Number, min: 0, default: 0 },
    x: { type: Number, min: 0, max: 100, default: 50 },
    y: { type: Number, min: 0, max: 100, default: 50 },
  }],
  videoUrls: [{ type: String }],
  templateId: { type: String, default: 'city-gazette' },
  customTemplate: { type: mongoose.Schema.Types.Mixed, default: null },
  templateThemeMode: { type: String, enum: ['auto', 'light', 'dark'], default: 'auto' },
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
  linkedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  externalProductLinks: [{
    title: { type: String, trim: true },
    url: { type: String, trim: true },
    platform: { type: String, trim: true, default: 'External' },
    thumbnail: { type: String, trim: true, default: '' },
    thumbnailPublicId: { type: String, trim: true, default: '' },
    originalThumbnail: { type: String, trim: true, default: '' },
    originalThumbnailPublicId: { type: String, trim: true, default: '' },
    backgroundRemovalStatus: { type: String, trim: true, default: '' },
    priceLabel: { type: String, trim: true, default: '' },
  }],
  isPromoPost: { type: Boolean, default: false },
  viewedBy: {
    type: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      ip: { type: String },
      ipHash: { type: String },
      viewedAt: { type: Date, default: Date.now }
    }],
    select: false
  },
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
articleSchema.index({ createdAt: -1, _id: -1 });
articleSchema.index({ isDraft: 1, createdAt: -1 });
articleSchema.index({ isScheduled: 1, isDraft: 1, scheduledPublishDate: 1 });
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
