const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sellerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:          { type: String, enum: ['digital', 'physical', 'service', 'external'], required: true },
  title:         { type: String, required: true, trim: true, maxlength: 200 },
  slug:          { type: String, unique: true, lowercase: true, trim: true },
  description:   { type: String, default: '' },
  specifications: [{
    key:   { type: String, trim: true },
    value: { type: String, trim: true },
  }],
  warranty:      { type: String, default: '' },
  countryOfOrigin:{ type: String, default: '' },
  category:      [{ type: String }],
  tags:          [{ type: String }],
  images:        [{ type: String }],   // Cloudinary public URLs
  imagePublicIds:[{ type: String }],
  thumbnail:     { type: String, default: '' },
  transparentThumbnail: { type: String, default: '' },
  transparentThumbnailPublicId: { type: String, default: '' },
  backgroundRemovalStatus: {
    type: String,
    enum: ['pending', 'processing', 'done', 'failed', 'skipped'],
    default: 'pending',
  },
  backgroundRemovalError: { type: String, default: '' },
  backgroundRemovedAt: { type: Date, default: null },
  backgroundRemovalSourceHash: { type: String, default: '' },
  videoUrl:      { type: String, default: '' },
  status:        { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft' },

  price:         { type: Number, required: true, min: 0 },
  compareAtPrice:{ type: Number, default: null },   // MRP / original price for strikethrough
  currency:      { type: String, enum: ['INR', 'USD'], default: 'INR' },
  isFree:        { type: Boolean, default: false },

  // ── Digital ───────────────────────────────────────────────────────────────
  digital: {
    fileUrl:      { type: String, default: '' },       // private Cloudinary URL
    filePublicId: { type: String, default: '' },       // for signed URL generation
    fileSize:     { type: Number, default: 0 },        // bytes
    fileFormat:   { type: String, default: '' },       // pdf | zip | mp4 | epub …
    maxDownloads: { type: Number, default: 5 },
    previewUrl:   { type: String, default: '' },       // public teaser file
  },

  // ── Physical ──────────────────────────────────────────────────────────────
  physical: {
    stock:               { type: Number, default: 0 },
    minimumOrderQuantity:{ type: Number, default: 1 },
    sku:                 { type: String, default: '' },
    weight:              { type: Number, default: 0 }, // grams
    dimensions:          { l: Number, w: Number, h: Number },
    shippingZones:       [{ type: String }],            // ['India', 'Worldwide']
    shippingFee:         { type: Number, default: 0 },
    estimatedDeliveryDays:{ type: Number, default: 7 },
    variants: [{
      name:    { type: String },
      options: [{ type: String }],
    }],
  },

  // ── Service ───────────────────────────────────────────────────────────────
  service: {
    deliveryDays: { type: Number, default: 3 },
    revisions:    { type: Number, default: 1 },
    includes:     [{ type: String }],
    excludes:     [{ type: String }],
    requirements: [{
      question: { type: String },
      required: { type: Boolean, default: false },
    }],
  },

  // ── External Link ─────────────────────────────────────────────────────────
  external: {
    url:      { type: String, default: '' },
    platform: { type: String, enum: ['Amazon', 'Etsy', 'Gumroad', 'Flipkart', 'Other'], default: 'Other' },
  },

  // ── SEO ───────────────────────────────────────────────────────────────────
  seoTitle:       { type: String, default: '' },
  seoDescription: { type: String, default: '' },

  // ── Decoration / Marketing ────────────────────────────────────────────────
  decoration: {
    badges:       [{ type: String }],   // 'Bestseller' | 'New' | 'Limited Edition'
    promoBanner:  { type: String, default: '' },
    faqs: [{
      question: { type: String },
      answer:   { type: String },
    }],
    testimonials: [{
      name: { type: String },
      text: { type: String },
    }],
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats: {
    views:  { type: Number, default: 0 },
    sales:  { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }, // external link clicks
  },

  averageRating: { type: Number, default: 0 },
  reviewCount:   { type: Number, default: 0 },

}, { timestamps: true });

// ── Auto-generate slug from title ─────────────────────────────────────────────
productSchema.pre('save', async function (next) {
  if (this.isModified('title') && !this.slug) {
    const base = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = base;
    let count = 1;
    while (await mongoose.model('Product').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${count++}`;
    }
    this.slug = slug;
  }
  // Sync isFree with price
  if (this.isFree) this.price = 0;
  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
productSchema.index({ sellerId: 1 });
productSchema.index({ status: 1, type: 1 });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
