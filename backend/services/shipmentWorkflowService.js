const Order = require('../models/Order');
const Product = require('../models/Product');
const Shipment = require('../models/Shipment');
const { runOnce } = require('./idempotencyService');

const SHIPMENT_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.ORDER_QUERY_MAX_TIME_MS) || 5000);

const toId = (value) => value?.toString?.() || String(value || '');

const isShiprocketConfigured = () => {
  return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
};

const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  return { ...value };
};

const groupPhysicalItemsBySeller = (order, productMap) => {
  const bySeller = new Map();

  for (const item of order.items) {
    if (item.type !== 'physical') continue;

    const sellerId = toId(item.sellerId);
    const product = productMap.get(toId(item.productId));
    const weightGrams = Number(product?.physical?.weight || 500);
    const normalizedItem = {
      productId: item.productId,
      title: item.title || '',
      qty: item.qty || 1,
      subtotal: item.subtotal || 0,
      thumbnail: item.thumbnail || '',
      weightGrams
    };

    if (!bySeller.has(sellerId)) bySeller.set(sellerId, []);
    bySeller.get(sellerId).push(normalizedItem);
  }

  return bySeller;
};

const buildPackageSnapshot = (items) => {
  const totalWeightGrams = items.reduce((sum, item) => sum + item.weightGrams * item.qty, 0);
  return {
    totalWeightGrams: Math.max(totalWeightGrams, 500),
    itemCount: items.reduce((sum, item) => sum + item.qty, 0),
    dimensionsCm: {
      length: 20,
      width: 15,
      height: 10
    }
  };
};

const prepareShipmentsForOrder = async (orderId) => {
  return runOnce({
    key: `order:${toId(orderId)}:shipment-preparation`,
    scope: 'marketplace-shipment-preparation',
    resourceType: 'Order',
    resourceId: toId(orderId),
    lockMs: 15 * 60 * 1000,
    handler: async () => {
      const order = await Order.findById(orderId).maxTimeMS(SHIPMENT_QUERY_MAX_TIME_MS);
      if (!order) throw new Error(`Order not found: ${orderId}`);

      const physicalItems = order.items.filter((item) => item.type === 'physical');
      if (!physicalItems.length) {
        return { orderId: toId(order._id), shipments: 0 };
      }

      const productIds = physicalItems.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: productIds } })
        .select('physical')
        .maxTimeMS(SHIPMENT_QUERY_MAX_TIME_MS);
      const productMap = new Map(products.map((product) => [toId(product._id), product]));
      const bySeller = groupPhysicalItemsBySeller(order, productMap);
      const providerConfigured = isShiprocketConfigured();
      let shipmentCount = 0;

      for (const [sellerId, items] of bySeller.entries()) {
        const status = providerConfigured ? 'queued' : 'credentials_required';
        await Shipment.findOneAndUpdate(
          {
            orderId: order._id,
            sellerId,
            provider: 'shiprocket'
          },
          {
            $setOnInsert: {
              orderId: order._id,
              orderNumber: order.orderNumber,
              buyerId: order.buyerId,
              sellerId,
              provider: 'shiprocket',
              paymentMode: 'prepaid',
              deliveryAddressSnapshot: toPlainObject(order.shipping),
              packageSnapshot: buildPackageSnapshot(items),
              items,
              status,
              lastError: providerConfigured ? '' : 'Shiprocket credentials are not configured yet.'
            }
          },
          {
            upsert: true,
            new: true
          }
        ).maxTimeMS(SHIPMENT_QUERY_MAX_TIME_MS);
        shipmentCount += 1;
      }

      return {
        orderId: toId(order._id),
        orderNumber: order.orderNumber,
        shipments: shipmentCount
      };
    }
  });
};

module.exports = {
  prepareShipmentsForOrder
};
