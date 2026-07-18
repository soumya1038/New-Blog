const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  sellerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  storeName: { type: String, default: '' },
  bio:       { type: String, default: '', maxlength: 300 },
  bannerImage:   { type: String, default: '' },
  bannerPublicId:{ type: String, default: '' },
  theme: {
    type: String,
    enum: ['default', 'dark', 'warm', 'cool', 'minimal'],
    default: 'default',
  },
  featuredProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  socialLinks: {
    instagram: { type: String, default: '' },
    twitter:   { type: String, default: '' },
    website:   { type: String, default: '' },
    youtube:   { type: String, default: '' },
  },
  stats: {
    totalSales:   { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageRating:{ type: Number, default: 0 },
    ratingCount:  { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
