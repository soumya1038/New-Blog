const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    productId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty:             { type: Number, default: 1, min: 1 },
    addedAt:         { type: Date,   default: Date.now },
    // Price snapshot so cart shows the price at add-time even if seller changes it
    priceSnapshot:     { type: Number, default: 0 },
    titleSnapshot:     { type: String, default: '' },
    thumbnailSnapshot: { type: String, default: '' },
  }],
  couponCode: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
