const mongoose = require('mongoose');
const Product = require('../models/Product');
const PriceChangeRequest = require('../models/PriceChangeRequest');
const { logError } = require('../utils/safeErrorLog');

const sendPriceChangeServerError = (res, error) => {
  logError('[priceChangeController] request failed:', error);
  return res.status(500).json({ success: false, message: 'Unable to process price change request' });
};

const PRICE_CHANGE_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.PRICE_CHANGE_QUERY_MAX_TIME_MS) || 5000);
const PRICE_CHANGE_STATUSES = new Set(['pending', 'approved', 'rejected', 'cancelled', 'expired']);

const toMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
};

const boundedLimit = (value, fallback, max) => Math.min(max, Math.max(1, Number(value) || fallback));

const parseStatusFilter = (value, fallback) => {
  const status = String(value || fallback || 'all').trim().toLowerCase();
  if (status === 'all') return { status };
  if (!PRICE_CHANGE_STATUSES.has(status)) {
    return { error: 'Invalid price-change status filter.' };
  }
  return { status };
};

const formatRequest = async (request, { includeSellerEmail = false } = {}) => {
  if (!request) return request;
  return request.populate([
    { path: 'sellerId', select: includeSellerEmail ? 'name username email' : 'name username', options: { maxTimeMS: PRICE_CHANGE_QUERY_MAX_TIME_MS } },
    { path: 'productId', select: 'title slug thumbnail price status', options: { maxTimeMS: PRICE_CHANGE_QUERY_MAX_TIME_MS } },
    { path: 'reviewedBy', select: 'name username', options: { maxTimeMS: PRICE_CHANGE_QUERY_MAX_TIME_MS } },
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
    if (cleanReason.length > 1000) {
      return res.status(400).json({ success: false, message: 'Reason must be 1000 characters or less.' });
    }

    const product = await Product.findOne({ _id: productId, sellerId: req.user._id })
      .maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);
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
    ).maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);

    const existing = await PriceChangeRequest.findOne({
      sellerId: req.user._id,
      productId: product._id,
      status: 'pending',
    }).maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);

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
    return sendPriceChangeServerError(res, error);
  }
};

exports.getSellerPriceChangeRequests = async (req, res) => {
  try {
    const { status = 'all', limit = 50 } = req.query;
    const statusFilter = parseStatusFilter(status, 'all');
    if (statusFilter.error) {
      return res.status(400).json({ success: false, message: statusFilter.error });
    }
    const query = { sellerId: req.user._id };
    if (statusFilter.status !== 'all') query.status = statusFilter.status;

    const requests = await PriceChangeRequest.find(query)
      .populate({ path: 'productId', select: 'title slug thumbnail price status', options: { maxTimeMS: PRICE_CHANGE_QUERY_MAX_TIME_MS } })
      .populate({ path: 'reviewedBy', select: 'name username', options: { maxTimeMS: PRICE_CHANGE_QUERY_MAX_TIME_MS } })
      .sort({ createdAt: -1 })
      .limit(boundedLimit(limit, 50, 100))
      .maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);

    res.json({ success: true, requests });
  } catch (error) {
    return sendPriceChangeServerError(res, error);
  }
};

exports.cancelSellerPriceChangeRequest = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid request id.' });
    }
    const request = await PriceChangeRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        sellerId: req.user._id,
        status: 'pending',
      },
      { $set: { status: 'cancelled' } },
      { new: true, runValidators: true }
    ).maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found.' });
    }

    res.json({
      success: true,
      message: 'Price-change token cancelled.',
      request: await formatRequest(request),
    });
  } catch (error) {
    return sendPriceChangeServerError(res, error);
  }
};

exports.getAdminPriceChangeRequests = async (req, res) => {
  try {
    const { status = 'pending', limit = 100 } = req.query;
    const statusFilter = parseStatusFilter(status, 'pending');
    if (statusFilter.error) {
      return res.status(400).json({ success: false, message: statusFilter.error });
    }
    const query = {};
    if (statusFilter.status !== 'all') query.status = statusFilter.status;

    const requests = await PriceChangeRequest.find(query)
      .populate({ path: 'sellerId', select: 'name username email', options: { maxTimeMS: PRICE_CHANGE_QUERY_MAX_TIME_MS } })
      .populate({ path: 'productId', select: 'title slug thumbnail price status', options: { maxTimeMS: PRICE_CHANGE_QUERY_MAX_TIME_MS } })
      .populate({ path: 'reviewedBy', select: 'name username', options: { maxTimeMS: PRICE_CHANGE_QUERY_MAX_TIME_MS } })
      .sort({ status: 1, createdAt: -1 })
      .limit(boundedLimit(limit, 100, 200))
      .maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);

    res.json({ success: true, requests });
  } catch (error) {
    return sendPriceChangeServerError(res, error);
  }
};

exports.approvePriceChangeRequest = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid request id.' });
    }
    const request = await PriceChangeRequest.findOne({ _id: req.params.id, status: 'pending' })
      .maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found.' });
    }

    if (request.expiresAt && request.expiresAt <= new Date()) {
      await PriceChangeRequest.findOneAndUpdate(
        { _id: request._id, status: 'pending' },
        {
          $set: {
            status: 'expired',
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            adminNote: 'Request expired before review.',
          },
        },
        { runValidators: true }
      ).maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);
      return res.status(409).json({ success: false, message: 'This price-change token has expired.' });
    }

    const product = await Product.findOne({
      _id: request.productId,
      sellerId: request.sellerId,
      status: { $ne: 'archived' },
    }).maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);

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

    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: request.productId,
        sellerId: request.sellerId,
        status: { $ne: 'archived' },
        price: request.oldPrice,
      },
      { $set: { price: request.requestedPrice, isFree: false } },
      { new: true, runValidators: true }
    ).maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);

    if (!updatedProduct) {
      return res.status(409).json({
        success: false,
        message: 'Product price changed after this token was created. Ask the seller to create a new token.',
      });
    }

    const updatedRequest = await PriceChangeRequest.findOneAndUpdate(
      { _id: request._id, status: 'pending' },
      {
        $set: {
          status: 'approved',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          appliedAt: new Date(),
          adminNote: String(req.body.adminNote || '').trim().slice(0, 1000),
        },
      },
      { new: true, runValidators: true }
    ).maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);

    if (!updatedRequest) {
      return res.status(409).json({ success: false, message: 'Pending request not found.' });
    }

    res.json({
      success: true,
      message: 'Price change approved and applied.',
      request: await formatRequest(updatedRequest, { includeSellerEmail: true }),
      product: updatedProduct,
    });
  } catch (error) {
    return sendPriceChangeServerError(res, error);
  }
};

exports.rejectPriceChangeRequest = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid request id.' });
    }
    const request = await PriceChangeRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          adminNote: String(req.body.adminNote || '').trim().slice(0, 1000),
        },
      },
      { new: true, runValidators: true }
    ).maxTimeMS(PRICE_CHANGE_QUERY_MAX_TIME_MS);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found.' });
    }

    res.json({
      success: true,
      message: 'Price change rejected.',
      request: await formatRequest(request, { includeSellerEmail: true }),
    });
  } catch (error) {
    return sendPriceChangeServerError(res, error);
  }
};
