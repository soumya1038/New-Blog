const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },   // LEK-2026-0001
  buyerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  items: [{
    productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sellerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    type:       { type: String, enum: ['digital', 'physical', 'service'] },
    title:      { type: String },
    price:      { type: Number },
    qty:        { type: Number, default: 1 },
    subtotal:   { type: Number },
    thumbnail:  { type: String, default: '' },
  }],

  couponCode:     { type: String, default: '' },
  couponDiscount: { type: Number, default: 0 },
  shippingFee:    { type: Number, default: 0 },
  platformFee:    { type: Number, default: 0 },
  total:          { type: Number, required: true },
  currency:       { type: String, default: 'INR' },

  status: {
    type: String,
    enum: ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending_payment',
  },

  payment: {
    method:             { type: String, default: 'razorpay' },
    razorpayOrderId:    { type: String, default: '' },
    razorpayPaymentId:  { type: String, default: '' },
    razorpaySignature:  { type: String, default: '' },
    paidAt:             { type: Date,   default: null },
  },

  shipping: {
    name:           { type: String, default: '' },
    phone:          { type: String, default: '' },
    addressLine1:   { type: String, default: '' },
    addressLine2:   { type: String, default: '' },
    city:           { type: String, default: '' },
    state:          { type: String, default: '' },
    pin:            { type: String, default: '' },
    country:        { type: String, default: 'India' },
    trackingNumber: { type: String, default: '' },
    courier:        { type: String, default: '' },
    shippedAt:      { type: Date,   default: null },
    deliveredAt:    { type: Date,   default: null },
  },

  serviceRequirements: { type: mongoose.Schema.Types.Mixed, default: {} },

  downloads: [{
    productId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    count:           { type: Number, default: 0 },
    lastDownloadedAt:{ type: Date, default: null },
  }],

  notes: { type: String, default: '' },
}, { timestamps: true });

// ── Auto order number ──────────────────────────────────────────────────────────
const getMaxOrderSequence = async (year, session) => {
  const query = mongoose.model('Order').aggregate([
    { $match: { orderNumber: { $regex: `^LEK-${year}-\\d+$` } } },
    {
      $project: {
        seq: {
          $toInt: {
            $arrayElemAt: [{ $split: ['$orderNumber', '-'] }, 2],
          },
        },
      },
    },
    { $sort: { seq: -1 } },
    { $limit: 1 },
  ]);
  if (session) query.session(session);
  const [latest] = await query;

  return latest?.seq || 0;
};

const getNextOrderNumber = async (doc) => {
  const year = new Date().getFullYear();
  const session = typeof doc.$session === 'function' ? doc.$session() : null;
  const counterId = `orderNumber:${year}`;
  const counters = mongoose.connection.collection('counters');
  const maxExistingSeq = await getMaxOrderSequence(year, session);
  const now = new Date();

  await counters.updateOne(
    { _id: counterId },
    {
      $max: { seq: maxExistingSeq },
      $set: { updatedAt: now },
      $setOnInsert: { type: 'orderNumber', year, createdAt: now },
    },
    { upsert: true, ...(session ? { session } : {}) }
  );

  const result = await counters.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 }, $set: { updatedAt: now } },
    { returnDocument: 'after', ...(session ? { session } : {}) }
  );
  const counter = result.value || result;
  return `LEK-${year}-${String(counter.seq).padStart(4, '0')}`;
};

orderSchema.pre('save', async function (next) {
  try {
    if (!this.orderNumber) {
      this.orderNumber = await getNextOrderNumber(this);
    }
    next();
  } catch (error) {
    next(error);
  }
});

orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ 'items.sellerId': 1, createdAt: -1 });
orderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'items.sellerId': 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 });
orderSchema.index({ 'shipping.trackingNumber': 1 }, { sparse: true });

module.exports = mongoose.model('Order', orderSchema);
