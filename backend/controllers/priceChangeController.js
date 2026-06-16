const mongoose = require('mongoose');
const Product = require('../models/Product');
const PriceChangeRequest = require('../models/PriceChangeRequest');

const toMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
};

const formatRequest = async (request) => {
  if (!request) return request;
  return request.populate([
    { path: 'sellerId', select: 'name username email' },
    { path: 'productId', select: 'title slug thumbnail price status' },
    { path: 'reviewedBy', select: 'name username' },
  ]);
};

exports.createPriceChangeRequest = async (req, res) => {
  try {
    const { productId, requestedPrice, reason } = req.body;
    const nextPrice = toMoney(requestedPrice);
    const cleanReason = String(reason || '').trim();

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Valid product is required.' });
    }

    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      return res.status(400).json({ success: false, message: 'Valid requested price is required.' });
    }

    if (!cleanReason) {
      return res.status(400).json({ success: false, message: 'Reason is required.' });
    }

    const product = await Product.findOne({ _id: productId, sellerId: req.user._id });
    if (!product || product.status === 'archived') {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const currentPrice = toMoney(product.price || 0);
    if (nextPrice <= currentPrice) {
      return res.status(400).json({
        success: false,
        message: 'Only price increases need approval. You can lower or keep the price from edit product.',
      });
    }

    await PriceChangeRequest.updateMany(
      {
        sellerId: req.user._id,
        productId: product._id,
        status: 'pending',
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: 'expired' } }
    );

    const existing = await PriceChangeRequest.findOne({
      sellerId: req.user._id,
      productId: product._id,
      status: 'pending',
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A pending price-change token already exists for this product.',
        request: await formatRequest(existing),
      });
    }

    const request = await PriceChangeRequest.create({
      sellerId: req.user._id,
      productId: product._id,
      oldPrice: currentPrice,
      requestedPrice: nextPrice,
      currency: product.currency || 'INR',
      reason: cleanReason,
      snapshot: {
        productTitle: product.title,
        productSlug: product.slug,
        thumbnail: product.thumbnail,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Price-change token submitted for admin approval.',
      request: await formatRequest(request),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A pending price-change token already exists for this product.',
      });
    }
    console.error('[priceChangeController] createPriceChangeRequest:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSellerPriceChangeRequests = async (req, res) => {
  try {
    const { status = 'all', limit = 50 } = req.query;
    const query = { sellerId: req.user._id };
    if (status && status !== 'all') query.status = status;

    const requests = await PriceChangeRequest.find(query)
      .populate('productId', 'title slug thumbnail price status')
      .populate('reviewedBy', 'name username')
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100));

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelSellerPriceChangeRequest = async (req, res) => {
  try {
    const request = await PriceChangeRequest.findOne({
      _id: req.params.id,
      sellerId: req.user._id,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found.' });
    }

    request.status = 'cancelled';
    await request.save();

    res.json({
      success: true,
      message: 'Price-change token cancelled.',
      request: await formatRequest(request),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminPriceChangeRequests = async (req, res) => {
  try {
    const { status = 'pending', limit = 100 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const requests = await PriceChangeRequest.find(query)
      .populate('sellerId', 'name username email')
      .populate('productId', 'title slug thumbnail price status')
      .populate('reviewedBy', 'name username')
      .sort({ status: 1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 200));

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approvePriceChangeRequest = async (req, res) => {
  try {
    const request = await PriceChangeRequest.findOne({ _id: req.params.id, status: 'pending' });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found.' });
    }

    if (request.expiresAt && request.expiresAt <= new Date()) {
      request.status = 'expired';
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      request.adminNote = 'Request expired before review.';
      await request.save();
      return res.status(409).json({ success: false, message: 'This price-change token has expired.' });
    }

    const product = await Product.findOne({
      _id: request.productId,
      sellerId: request.sellerId,
      status: { $ne: 'archived' },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product is no longer available.' });
    }

    const currentPrice = toMoney(product.price || 0);
    if (currentPrice !== toMoney(request.oldPrice)) {
      return res.status(409).json({
        success: false,
        message: 'Product price changed after this token was created. Ask the seller to create a new token.',
      });
    }

    product.price = request.requestedPrice;
    product.isFree = false;
    await product.save();

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.appliedAt = new Date();
    request.adminNote = String(req.body.adminNote || '').trim();
    await request.save();

    res.json({
      success: true,
      message: 'Price change approved and applied.',
      request: await formatRequest(request),
      product,
    });
  } catch (error) {
    console.error('[priceChangeController] approvePriceChangeRequest:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectPriceChangeRequest = async (req, res) => {
  try {
    const request = await PriceChangeRequest.findOne({ _id: req.params.id, status: 'pending' });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found.' });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.adminNote = String(req.body.adminNote || '').trim();
    await request.save();

    res.json({
      success: true,
      message: 'Price change rejected.',
      request: await formatRequest(request),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
