const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { enqueueEmailJob } = require('../jobs/queueService');
const { createEarningsForOrder } = require('../controllers/earningsController');
const { runOnce } = require('./idempotencyService');

const PAID_ORDER_STATUSES = new Set(['paid', 'processing', 'shipped', 'delivered', 'completed']);

const toId = (value) => value?.toString?.() || String(value || '');

const hasPhysicalItems = (order) => {
  return order.items.some((item) => item.type === 'physical');
};

const enqueueShipmentPreparation = async (order) => {
  if (!hasPhysicalItems(order)) return null;

  const { enqueueMarketplaceJob } = require('../jobs/queueService');
  return enqueueMarketplaceJob(
    'prepare-shipments',
    {
      orderId: toId(order._id),
      orderNumber: order.orderNumber
    },
    {
      jobId: `prepare-shipments:${toId(order._id)}`,
      attempts: 5
    }
  );
};

const markProductSales = async (order) => {
  for (const item of order.items) {
    await runOnce({
      key: `order:${toId(order._id)}:product-sales:${toId(item.productId)}`,
      scope: 'marketplace-product-sales',
      resourceType: 'Product',
      resourceId: toId(item.productId),
      handler: async () => {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { 'stats.sales': item.qty || 1 }
        });
        return { qty: item.qty || 1 };
      }
    });
  }
};

const markCouponUsage = async (order) => {
  if (!order.couponCode) return null;

  return runOnce({
    key: `order:${toId(order._id)}:coupon:${String(order.couponCode).toUpperCase()}`,
    scope: 'marketplace-coupon-usage',
    resourceType: 'Coupon',
    resourceId: String(order.couponCode).toUpperCase(),
    handler: async () => {
      const coupon = await Coupon.findOneAndUpdate(
        {
          code: String(order.couponCode).toUpperCase(),
          'usedBy.orderId': { $ne: order._id },
          $or: [
            { usageLimit: null },
            { usageLimit: { $exists: false } },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
          ]
        },
        {
          $inc: { usedCount: 1 },
          $push: {
            usedBy: {
              userId: order.buyerId,
              orderId: order._id,
              usedAt: new Date()
            }
          }
        },
        { new: true }
      );

      if (coupon && coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        await Coupon.updateOne({ _id: coupon._id }, { $set: { isActive: false } });
      }

      if (!coupon) {
        await Coupon.updateOne(
          {
            code: String(order.couponCode).toUpperCase(),
            usageLimit: { $ne: null },
            $expr: { $gte: ['$usedCount', '$usageLimit'] }
          },
          { $set: { isActive: false } }
        );
      }

      return { couponCode: order.couponCode, applied: Boolean(coupon) };
    }
  });
};

const notifyOrderParticipants = async (order) => {
  const sellerIds = [...new Set(order.items.map((item) => toId(item.sellerId)))];

  for (const sellerId of sellerIds) {
    await enqueueEmailJob(
      'seller-new-order',
      {
        userId: sellerId,
        orderNumber: order.orderNumber,
        orderId: toId(order._id)
      },
      {
        jobId: `seller-new-order:${toId(order._id)}:${sellerId}`
      }
    );
  }

  await enqueueEmailJob(
    'buyer-order-confirmed',
    {
      userId: toId(order.buyerId),
      orderNumber: order.orderNumber,
      orderId: toId(order._id)
    },
    {
      jobId: `buyer-order-confirmed:${toId(order._id)}`
    }
  );
};

const fulfillOrderById = async (orderId) => {
  return runOnce({
    key: `order:${toId(orderId)}:fulfillment`,
    scope: 'marketplace-order-fulfillment',
    resourceType: 'Order',
    resourceId: toId(orderId),
    lockMs: 15 * 60 * 1000,
    handler: async () => {
      const order = await Order.findById(orderId);
      if (!order) throw new Error(`Order not found: ${orderId}`);
      if (!PAID_ORDER_STATUSES.has(order.status)) {
        throw new Error(`Order ${order.orderNumber || orderId} is not paid.`);
      }

      await markProductSales(order);
      await markCouponUsage(order);
      await createEarningsForOrder(order);
      await notifyOrderParticipants(order);
      await enqueueShipmentPreparation(order);

      return {
        orderId: toId(order._id),
        orderNumber: order.orderNumber,
        status: order.status
      };
    }
  });
};

const enqueueOrderFulfillment = async (order, options = {}) => {
  if (!order?._id) throw new Error('Order is required to enqueue fulfillment.');

  const { enqueueMarketplaceJob } = require('../jobs/queueService');
  return enqueueMarketplaceJob(
    'fulfill-order',
    {
      orderId: toId(order._id),
      orderNumber: order.orderNumber,
      source: options.source || 'payment'
    },
    {
      jobId: `fulfill-order:${toId(order._id)}`,
      attempts: options.attempts || 5
    }
  );
};

module.exports = {
  enqueueOrderFulfillment,
  fulfillOrderById
};
