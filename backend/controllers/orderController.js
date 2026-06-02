const Order  = require('../models/Order');
const { enqueueEmailJob } = require('../jobs/queueService');

// GET /api/orders  (buyer's orders)
exports.getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { buyerId: req.user._id };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('items.productId', 'title thumbnail slug type'),
      Order.countDocuments(query),
    ]);

    res.json({ success: true, orders, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId',          'username name profileImage')
      .populate('items.productId',  'title thumbnail slug type digital.maxDownloads')
      .populate('items.sellerId',   'username name profileImage');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const isBuyer  = order.buyerId._id.toString() === req.user._id.toString();
    const isSeller = order.items.some(i => i.sellerId._id?.toString() === req.user._id.toString());
    const isAdmin  = req.user.role === 'admin' || req.user.role === 'coAdmin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/orders  (seller's received orders)
exports.getSellerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { 'items.sellerId': req.user._id };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('buyerId', 'username name profileImage email'),
      Order.countDocuments(query),
    ]);

    res.json({ success: true, orders, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/seller/orders/:id/ship
exports.markShipped = async (req, res) => {
  try {
    const { trackingNumber, courier } = req.body;
    if (!trackingNumber || !courier) {
      return res.status(400).json({ success: false, message: 'Tracking number and courier name are required.' });
    }

    const order = await Order.findOne({
      _id:               req.params.id,
      'items.sellerId':  req.user._id,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['paid', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot ship order with status "${order.status}".` });
    }

    order.status                   = 'shipped';
    order.shipping.trackingNumber  = trackingNumber;
    order.shipping.courier         = courier;
    order.shipping.shippedAt       = new Date();
    await order.save();

    const io = req.app.get('io');
    io.to(`user:${order.buyerId}`).emit('notification:order_shipped', {
      message:        `Your order ${order.orderNumber} has been shipped! 📦`,
      orderNumber:    order.orderNumber,
      trackingNumber,
      courier,
    });

    await enqueueEmailJob('buyer-order-shipped', {
      userId:         order.buyerId.toString(),
      orderNumber:    order.orderNumber,
      trackingNumber,
      courier,
    });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/orders/:id/complete  (buyer confirms receipt)
exports.completeOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be completed yet.' });
    }

    order.status                 = 'completed';
    order.shipping.deliveredAt   = new Date();
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/seller/orders/:id/service-deliver  (seller delivers service)
exports.deliverService = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id:              req.params.id,
      'items.sellerId': req.user._id,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    order.status = 'delivered';
    if (req.body.notes) order.notes = req.body.notes;
    await order.save();

    const io = req.app.get('io');
    io.to(`user:${order.buyerId}`).emit('notification:order_delivered', {
      message:     `Your service order ${order.orderNumber} has been delivered. Please review! ✅`,
      orderNumber: order.orderNumber,
    });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
