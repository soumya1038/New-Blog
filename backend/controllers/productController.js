const Product  = require('../models/Product');
const Review   = require('../models/Review');
const Order    = require('../models/Order');
const User     = require('../models/User');
const cloudinary = require('../utils/cloudinary');

const parseJsonField = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseArrayField = (value) => {
  const parsed = parseJsonField(value);
  if (parsed === undefined) return undefined;
  return Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
};

const parseObjectField = (value) => {
  const parsed = parseJsonField(value);
  if (parsed === undefined) return undefined;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const parseBooleanField = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return Boolean(value);
};

const normalizeProductBody = (body = {}) => ({
  ...body,
  category: parseArrayField(body.category),
  tags: parseArrayField(body.tags),
  digital: parseObjectField(body.digital),
  physical: parseObjectField(body.physical),
  service: parseObjectField(body.service),
  external: parseObjectField(body.external),
  decoration: parseObjectField(body.decoration),
  isFree: parseBooleanField(body.isFree),
  replaceImages: parseBooleanField(body.replaceImages),
});

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC — Browse & Search
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/marketplace
exports.getProducts = async (req, res) => {
  try {
    const {
      type, category, minPrice, maxPrice, search,
      sort = 'createdAt', order = 'desc',
      page = 1, limit = 20, isFree, rating,
    } = req.query;

    const query = { status: 'active' };
    if (type)           query.type     = type;
    if (category)       query.category = { $in: Array.isArray(category) ? category : [category] };
    if (isFree === 'true') query.isFree = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (rating) query.averageRating = { $gte: parseFloat(rating) };
    if (search) query.$text = { $search: search };

    const sortObj = {};
    if (sort === 'price')    sortObj.price            = order === 'asc' ? 1 : -1;
    else if (sort === 'rating')   sortObj.averageRating = -1;
    else if (sort === 'popular')  sortObj['stats.sales'] = -1;
    else                          sortObj.createdAt      = -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('sellerId', 'username name profileImage isSeller isVerified')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-digital.fileUrl -digital.filePublicId -digital.previewUrl'), // never expose private URLs in listing
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      products,
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/marketplace/:slug
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, status: 'active' })
      .populate('sellerId', 'username name profileImage isSeller isVerified createdAt bio')
      .select('-digital.fileUrl -digital.filePublicId');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // Increment view count (fire-and-forget)
    Product.findByIdAndUpdate(product._id, { $inc: { 'stats.views': 1 } }).exec();

    // Fetch reviews for this product (latest 10)
    const reviews = await Review.find({ productId: product._id })
      .populate('buyerId', 'username name profileImage')
      .sort({ createdAt: -1 })
      .limit(10);

    // Related products (same category, excluding this one)
    const related = await Product.find({
      status:   'active',
      _id:      { $ne: product._id },
      category: { $in: product.category },
    })
      .select('title slug thumbnail price compareAtPrice type averageRating reviewCount')
      .limit(6);

    res.json({ success: true, product, reviews, related });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/marketplace/:id/external-click  (track external link clicks)
exports.trackExternalClick = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { $inc: { 'stats.clicks': 1 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SELLER — Product CRUD
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/seller/products
exports.createProduct = async (req, res) => {
  try {
    const body = normalizeProductBody(req.body);
    const {
      type, title, description, category, tags,
      price, compareAtPrice, currency, isFree,
      digital, physical, service, external,
      seoTitle, seoDescription, decoration, status,
    } = body;

    const product = new Product({
      sellerId:       req.user._id,
      type,
      title,
      description:    description    || '',
      category:       category       || [],
      tags:           tags           || [],
      price:          isFree ? 0 : parseFloat(price || 0),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      currency:       currency       || 'INR',
      isFree:         !!isFree,
      seoTitle:       seoTitle       || title,
      seoDescription: seoDescription || '',
      decoration:     decoration     || {},
      status:         status         || 'draft',
    });

    if (type === 'digital'  && digital)  product.digital  = digital;
    if (type === 'physical' && physical) product.physical = physical;
    if (type === 'service'  && service)  product.service  = service;
    if (type === 'external' && external) product.external = external;

    // Handle multi-image upload (req.files from multer)
    if (req.files && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map(f =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: 'lekhon/products' },
              (err, r) => (err ? reject(err) : resolve(r))
            );
            stream.end(f.buffer);
          })
        )
      );
      product.images    = uploads.map(r => r.secure_url);
      product.thumbnail = product.images[0] || '';
    }

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('[productController] createProduct:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/seller/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const body = normalizeProductBody(req.body);

    const allowed = [
      'title', 'description', 'category', 'tags',
      'price', 'compareAtPrice', 'isFree', 'currency',
      'status', 'videoUrl', 'seoTitle', 'seoDescription', 'decoration',
      'digital', 'physical', 'service', 'external',
    ];
    allowed.forEach(field => {
      if (body[field] !== undefined) product[field] = body[field];
    });

    // Handle image updates
    if (req.files && req.files.length > 0) {
      // Upload new images
      const uploads = await Promise.all(
        req.files.map(f =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: 'lekhon/products' },
              (err, r) => (err ? reject(err) : resolve(r))
            );
            stream.end(f.buffer);
          })
        )
      );
      const newUrls = uploads.map(r => r.secure_url);

      // Merge with any existing images the frontend wants to keep
      let existingKept = [];
      if (req.body.existingImages) {
        try { existingKept = JSON.parse(req.body.existingImages); } catch {}
      }
      product.images    = [...existingKept, ...newUrls].slice(0, 8);
      product.thumbnail = product.images[0] || product.thumbnail;

    } else if (req.body.existingImages) {
      // No new uploads but frontend sent a list of images to keep (after removals)
      try {
        const kept = JSON.parse(req.body.existingImages);
        product.images    = kept;
        product.thumbnail = kept[0] || product.thumbnail;
      } catch {}
    }

    await product.save();
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/seller/products/:id  (soft-archive — orders are never broken)
exports.archiveProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    product.status = 'archived';
    await product.save();
    res.json({ success: true, message: 'Product archived.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/products
exports.getSellerProducts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { sellerId: req.user._id };
    if (status) query.status = status;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Product.countDocuments(query),
    ]);

    res.json({ success: true, products, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/seller/products/:id  (seller views own product by ID for editing)
exports.getSellerProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user._id,
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload private digital file
// POST /api/seller/products/:id/upload-file
exports.uploadDigitalFile = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.type !== 'digital') return res.status(400).json({ success: false, message: 'Only digital products can have file uploads.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided.' });

    // Upload as private (authenticated delivery) resource
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        'lekhon/digital-files',
          resource_type: 'raw',
          access_mode:   'authenticated', // private — requires signed URL
          use_filename:  true,
          unique_filename: true,
        },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      stream.end(req.file.buffer);
    });

    product.digital.fileUrl      = result.secure_url;
    product.digital.filePublicId = result.public_id;
    product.digital.fileSize     = req.file.size;
    product.digital.fileFormat   = result.format || req.file.originalname.split('.').pop();
    await product.save();

    res.json({ success: true, message: 'File uploaded successfully.', fileSize: req.file.size, fileFormat: product.digital.fileFormat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/marketplace/:id/reviews
exports.addReview = async (req, res) => {
  try {
    const { orderId, rating, title, body } = req.body;
    const productId = req.params.id;

    // Verify this buyer actually purchased this product in this order
    const order = await Order.findOne({
      _id:      orderId,
      buyerId:  req.user._id,
      'items.productId': productId,
      status:   { $in: ['completed', 'delivered', 'paid'] },
    });
    if (!order) {
      return res.status(403).json({ success: false, message: 'You can only review products you have purchased.' });
    }

    const exists = await Review.findOne({ orderId, productId });
    if (exists) return res.status(400).json({ success: false, message: 'You have already reviewed this product for this order.' });

    const review = await Review.create({
      productId,
      buyerId:            req.user._id,
      orderId,
      rating:             parseInt(rating),
      title:              title || '',
      body:               body  || '',
      isVerifiedPurchase: true,
    });

    // Update product average rating
    const allReviews = await Review.find({ productId });
    const avg        = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(avg * 10) / 10,
      reviewCount:   allReviews.length,
    });

    await review.populate('buyerId', 'username name profileImage');
    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/seller/reviews/:id/reply
exports.replyToReview = async (req, res) => {
  try {
    const review  = await Review.findById(req.params.id).populate('productId', 'sellerId');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    if (review.productId.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your product.' });
    }
    review.sellerReply    = req.body.reply;
    review.sellerRepliedAt= new Date();
    await review.save();
    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  WISHLIST
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/marketplace/wishlist/:id
exports.toggleWishlist = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const user  = await User.findById(req.user._id);
    const list  = user.wishlist || [];
    const idx   = list.findIndex(id => id.toString() === req.params.id);
    let added;

    if (idx > -1) {
      list.splice(idx, 1);
      added = false;
    } else {
      list.push(req.params.id);
      added = true;
    }

    await User.findByIdAndUpdate(req.user._id, { wishlist: list });
    res.json({ success: true, added });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/marketplace/wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wishlist');
    const products = await Product.find({
      _id:    { $in: user.wishlist || [] },
      status: 'active',
    }).select('title slug thumbnail price compareAtPrice type averageRating reviewCount');

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CART
// ─────────────────────────────────────────────────────────────────────────────

const Cart = require('../models/Cart');

// GET /api/marketplace/cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate('items.productId', 'title slug thumbnail price type status physical.stock isFree sellerId');
    res.json({ success: true, cart: cart || { items: [], couponCode: '' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/marketplace/cart/add
exports.addToCart = async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;
    const product = await Product.findOne({ _id: productId, status: 'active' });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.type === 'external') {
      return res.status(400).json({ success: false, message: 'External products cannot be added to cart.' });
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) cart = new Cart({ userId: req.user._id, items: [] });

    const existing = cart.items.find(i => i.productId.toString() === productId);
    if (existing) {
      // Services: cap at 1; physical: allow multiple
      if (product.type === 'service') existing.qty = 1;
      else existing.qty = Math.min(existing.qty + qty, product.physical?.stock || 99);
    } else {
      cart.items.push({
        productId,
        qty:              product.type === 'service' ? 1 : qty,
        priceSnapshot:    product.price,
        titleSnapshot:    product.title,
        thumbnailSnapshot:product.thumbnail,
      });
    }

    await cart.save();
    const populated = await Cart.findById(cart._id)
      .populate('items.productId', 'title slug thumbnail price type status physical.stock isFree sellerId');
    res.json({ success: true, cart: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/marketplace/cart/update
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });

    const item = cart.items.find(i => i.productId.toString() === productId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not in cart.' });

    if (qty < 1) {
      cart.items = cart.items.filter(i => i.productId.toString() !== productId);
    } else {
      item.qty = qty;
    }
    await cart.save();
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/marketplace/cart/:productId
exports.removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.json({ success: true });
    cart.items = cart.items.filter(i => i.productId.toString() !== req.params.productId);
    await cart.save();
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/marketplace/cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: '' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
