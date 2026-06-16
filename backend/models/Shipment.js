const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String, default: '' },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  provider: { type: String, enum: ['shiprocket'], default: 'shiprocket' },
  providerOrderId: { type: String, default: '' },
  providerShipmentId: { type: String, default: '' },
  awbCode: { type: String, default: '' },
  courierCompanyId: { type: String, default: '' },
  courierName: { type: String, default: '' },

  status: {
    type: String,
    enum: [
      'pending',
      'queued',
      'credentials_required',
      'serviceability_pending',
      'shipment_pending',
      'awb_assigned',
      'pickup_scheduled',
      'in_transit',
      'delivered',
      'rto',
      'cancelled',
      'failed'
    ],
    default: 'pending'
  },

  paymentMode: { type: String, enum: ['prepaid', 'cod'], default: 'prepaid' },
  deliveryAddressSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  pickupAddressSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  packageSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  rateSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  rawProviderResponse: { type: mongoose.Schema.Types.Mixed, default: {} },

  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    title: { type: String, default: '' },
    qty: { type: Number, default: 1 },
    subtotal: { type: Number, default: 0 },
    thumbnail: { type: String, default: '' },
    weightGrams: { type: Number, default: 0 }
  }],

  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  nextRetryAt: { type: Date, default: null },
  shippedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null }
}, { timestamps: true });

shipmentSchema.index({ orderId: 1, sellerId: 1, provider: 1 }, { unique: true });
shipmentSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
shipmentSchema.index({ orderId: 1 });
shipmentSchema.index({ awbCode: 1 }, { sparse: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
