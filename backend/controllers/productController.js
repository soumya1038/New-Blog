const Product  = require('../models/Product');
const Review   = require('../models/Review');
const Order    = require('../models/Order');
const User     = require('../models/User');
const Cart     = require('../models/Cart');
const cloudinary = require('../utils/cloudinary');
const { processProductThumbnail } = require('../services/backgroundRemovalService');

const extractCloudinaryPublicId = (url = '') => {
  const match = String(url).match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?(?:\?.*)?$/i);
  return match ? decodeURIComponent(match[1]) : '';
};

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

const uploadBufferToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });

const compactUnique = (values = []) =>
  [...new Set(values.filter(Boolean).map(value => String(value)))];

const parseImageListField = (value) => compactUnique(parseArrayField(value) || []);
const topCountKeys = (counts = {}, limit = 6) =>
  Object.entries(counts || {})
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, limit)
    .map(([key]) => key)
    .filter(Boolean);
const MARKETPLACE_PREF_LIMITS = {
  products: 20,
  categories: 20,
  types: 8,
};

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSearchTerm = (value = '') =>
  String(value).trim().replace(/\s+/g, ' ').toLowerCase();

const buildMarketplaceSearchQuery = (baseQuery, search) => {
  const term = normalizeSearchTerm(search);
  if (!term) return baseQuery;

  const exactRegex = new RegExp(`^${escapeRegex(term)}$`, 'i');
  const containsRegex = new RegExp(escapeRegex(term), 'i');
  const tokenRegexes = term
    .split(' ')
    .filter(token => token.length > 1)
    .slice(0, 5)
    .map(token => new RegExp(escapeRegex(token), 'i'));

  const searchOr = [
    { title: exactRegex },
    { slug: exactRegex },
    { title: containsRegex },
    { slug: containsRegex },
    { tags: containsRegex },
    { category: containsRegex },
    { description: containsRegex },
    ...tokenRegexes.flatMap(regex => ([
      { title: regex },
      { tags: regex },
      { category: regex },
    ])),
  ];

  return { ...baseQuery, $or: searchOr };
};

const productSearchRank = (product, search) => {
  const term = normalizeSearchTerm(search);
  if (!term) return 0;

  const title = normalizeSearchTerm(product.title);
  const slug = normalizeSearchTerm(product.slug);
  const description = normalizeSearchTerm(product.description);
  const tags = (product.tags || []).map(normalizeSearchTerm);
  const categories = (product.category || []).map(normalizeSearchTerm);
  const tokens = term.split(' ').filter(Boolean);

  if (title === term || slug === term) return 100;
  if (title.startsWith(term) || slug.startsWith(term)) return 90;
  if (tokens.length && tokens.every(token => title.includes(token))) return 75;
  if (title.includes(term) || slug.includes(term)) return 65;
  if (tags.some(tag => tag === term || tag.includes(term))) return 55;
  if (categories.some(category => category === term || category.includes(term))) return 45;
  if (description.includes(term)) return 35;
  if (tokens.length && tokens.some(token => title.includes(token) || tags.some(tag => tag.includes(token)))) return 25;
  return 0;
};

const sortProductsForSearch = (products, search) =>
  [...products].sort((a, b) => {
    const rankDiff = productSearchRank(b, search) - productSearchRank(a, search);
    if (rankDiff) return rankDiff;

    const salesDiff = (b.stats?.sales || 0) - (a.stats?.sales || 0);
    if (salesDiff) return salesDiff;

    const viewsDiff = (b.stats?.views || 0) - (a.stats?.views || 0);
    if (viewsDiff) return viewsDiff;

    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

const normalizeSignalList = (items = [], keyName, limit) =>
  [...items]
    .filter(item => item?.[keyName])
    .map(item => ({
      [keyName]: String(item[keyName]),
      count: Math.max(parseInt(item.count, 10) || 1, 1),
      lastSeenAt: item.lastSeenAt || new Date(),
    }))
    .sort((a, b) => {
      const countDiff = (b.count || 0) - (a.count || 0);
      if (countDiff) return countDiff;
      return new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0);
    })
    .slice(0, limit);

const bumpSignalList = (items = [], keyName, value, limit) => {
  if (!value) return normalizeSignalList(items, keyName, limit);
  const now = new Date();
  const normalizedValue = String(value);
  const next = normalizeSignalList(items, keyName, limit + 1);
  const existing = next.find(item => item[keyName] === normalizedValue);
  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = now;
  } else {
    next.push({ [keyName]: normalizedValue, count: 1, lastSeenAt: now });
  }
  return normalizeSignalList(next, keyName, limit);
};

const normalizeRecentProducts = (items = []) =>
  [...items]
    .filter(item => item?.productId)
    .map(item => ({
      productId: item.productId,
      views: Math.max(parseInt(item.views, 10) || 1, 1),
      viewedAt: item.viewedAt || new Date(),
    }))
    .sort((a, b) => new Date(b.viewedAt || 0) - new Date(a.viewedAt || 0))
    .slice(0, MARKETPLACE_PREF_LIMITS.products);

const bumpRecentProduct = (items = [], productId) => {
  const productIdString = String(productId);
  const now = new Date();
  const next = normalizeRecentProducts(items).filter(item => String(item.productId) !== productIdString);
  const existing = normalizeRecentProducts(items).find(item => String(item.productId) === productIdString);
  next.unshift({
    productId,
    views: existing ? existing.views + 1 : 1,
    viewedAt: now,
  });
  return next.slice(0, MARKETPLACE_PREF_LIMITS.products);
};

const formatMarketplacePreferences = (preferences = {}) => ({
  recentProducts: (preferences.recentProducts || [])
    .filter(item => item?.productId)
    .map(item => {
      const product = item.productId;
      const isPopulated = typeof product === 'object' && product?._id;
      return {
        id: String(isPopulated ? product._id : product),
        title: isPopulated ? product.title : '',
        slug: isPopulated ? product.slug : '',
        thumbnail: isPopulated ? product.thumbnail : '',
        price: isPopulated ? product.price : 0,
        isFree: isPopulated ? product.isFree : false,
        type: isPopulated ? product.type : '',
        category: isPopulated ? product.category || [] : [],
        views: item.views || 1,
        viewedAt: item.viewedAt,
      };
    }),
  categoryCounts: Object.fromEntries((preferences.categorySignals || []).map(item => [item.category, item.count || 1]).filter(([key]) => key)),
  typeCounts: Object.fromEntries((preferences.typeSignals || []).map(item => [item.type, item.count || 1]).filter(([key]) => key)),
  updatedAt: preferences.updatedAt || null,
});

const mapProductForMarketplaceCard = (product) => ({
  _id: product._id,
  title: product.title,
  slug: product.slug,
  thumbnail: product.thumbnail,
  price: product.price,
  compareAtPrice: product.compareAtPrice,
  isFree: product.isFree,
  type: product.type,
  category: product.category || [],
  averageRating: product.averageRating || 0,
  reviewCount: product.reviewCount || 0,
  sellerId: product.sellerId,
  stats: product.stats || {},
});

const getProductImagePublicIds = (product) =>
  compactUnique([
    ...(product.imagePublicIds || []),
    ...(product.images || []).map(extractCloudinaryPublicId),
    product.thumbnail ? extractCloudinaryPublicId(product.thumbnail) : '',
    product.transparentThumbnailPublicId,
    product.transparentThumbnail ? extractCloudinaryPublicId(product.transparentThumbnail) : '',
    product.digital?.previewUrl ? extractCloudinaryPublicId(product.digital.previewUrl) : '',
  ]);

const destroyCloudinaryAssets = async ({ imagePublicIds = [], rawPublicIds = [] } = {}) => {
  const imageDeletes = compactUnique(imagePublicIds).map(publicId =>
    cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })
  );
  const rawDeletes = compactUnique(rawPublicIds).map(publicId =>
    cloudinary.uploader.destroy(publicId, { resource_type: 'raw', invalidate: true })
  );

  return Promise.allSettled([...imageDeletes, ...rawDeletes]);
};

const normalizeProductBody = (body = {}) => ({
  ...body,
  category: parseArrayField(body.category),
  tags: parseArrayField(body.tags),
  specifications: parseArrayField(body.specifications),
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

    const baseQuery = { status: 'active' };
    if (type)           baseQuery.type     = type;
    if (category)       baseQuery.category = { $in: Array.isArray(category) ? category : [category] };
    if (isFree === 'true') baseQuery.isFree = true;
    if (minPrice || maxPrice) {
      baseQuery.price = {};
      if (minPrice) baseQuery.price.$gte = parseFloat(minPrice);
      if (maxPrice) baseQuery.price.$lte = parseFloat(maxPrice);
    }
    if (rating) baseQuery.averageRating = { $gte: parseFloat(rating) };
    const query = buildMarketplaceSearchQuery(baseQuery, search);

    const sortObj = {};
    if (sort === 'price')    sortObj.price            = order === 'asc' ? 1 : -1;
    else if (sort === 'rating')   sortObj.averageRating = -1;
    else if (sort === 'popular')  sortObj['stats.sales'] = -1;
    else                          sortObj.createdAt      = -1;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (parsedPage - 1) * parsedLimit;
    let products;
    let total;

    if (normalizeSearchTerm(search)) {
      const maxSearchFetch = Math.min(Math.max(skip + parsedLimit, 120), 500);
      const [matchedProducts, matchedCount] = await Promise.all([
        Product.find(query)
          .populate('sellerId', 'username name profileImage isSeller isVerified')
          .sort({ createdAt: -1 })
          .limit(maxSearchFetch)
          .select('-digital.fileUrl -digital.filePublicId -digital.previewUrl'),
        Product.countDocuments(query),
      ]);

      const matchedIds = matchedProducts.map(product => product._id);
      const relatedCategories = compactUnique(matchedProducts.flatMap(product => product.category || []));
      let categoryProducts = [];
      let categoryCount = 0;

      if (relatedCategories.length) {
        const categoryQuery = {
          ...baseQuery,
          category: { $in: relatedCategories },
          _id: { $nin: matchedIds },
        };
        [categoryProducts, categoryCount] = await Promise.all([
          Product.find(categoryQuery)
            .populate('sellerId', 'username name profileImage isSeller isVerified')
            .sort({ 'stats.sales': -1, 'stats.views': -1, createdAt: -1 })
            .limit(maxSearchFetch)
            .select('-digital.fileUrl -digital.filePublicId -digital.previewUrl'),
          Product.countDocuments(categoryQuery),
        ]);
      }

      products = [
        ...sortProductsForSearch(matchedProducts, search),
        ...categoryProducts,
      ].slice(skip, skip + parsedLimit);
      total = matchedCount + categoryCount;
    } else {
      [products, total] = await Promise.all([
        Product.find(query)
          .populate('sellerId', 'username name profileImage isSeller isVerified')
          .sort(sortObj)
          .skip(skip)
          .limit(parsedLimit)
          .select('-digital.fileUrl -digital.filePublicId -digital.previewUrl'), // never expose private URLs in listing
        Product.countDocuments(query),
      ]);
    }

    res.json({
      success: true,
      products,
      total,
      page:  parsedPage,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/marketplace/suggestions?q=
exports.getProductSuggestions = async (req, res) => {
  try {
    const term = normalizeSearchTerm(req.query.q);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 4), 12);

    if (term.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const query = buildMarketplaceSearchQuery({ status: 'active' }, term);
    const products = await Product.find(query)
      .select('title slug thumbnail price compareAtPrice isFree type category tags stats createdAt')
      .sort({ createdAt: -1 })
      .limit(60);

    const rankedProducts = sortProductsForSearch(products, term).slice(0, limit);
    const categoryCounts = new Map();
    const tagCounts = new Map();

    products.forEach(product => {
      (product.category || []).forEach(category => {
        if (normalizeSearchTerm(category).includes(term)) {
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }
      });
      (product.tags || []).forEach(tag => {
        if (normalizeSearchTerm(tag).includes(term)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    });

    const productSuggestions = rankedProducts.map(product => ({
      type: 'product',
      label: product.title,
      value: product.title,
      slug: product.slug,
      thumbnail: product.thumbnail,
      price: product.price,
      isFree: product.isFree,
      productType: product.type,
    }));

    const categorySuggestions = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({
        type: 'category',
        label: category,
        value: category,
        count,
      }));

    const tagSuggestions = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, count]) => ({
        type: 'search',
        label: tag,
        value: tag,
        count,
      }));

    res.json({
      success: true,
      suggestions: [
        ...productSuggestions,
        ...categorySuggestions,
        ...tagSuggestions,
      ].slice(0, limit + 4),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/marketplace/personalization
exports.getMarketplacePersonalization = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('marketplacePreferences')
      .populate('marketplacePreferences.recentProducts.productId', 'title slug thumbnail price isFree type category status');

    const prefs = user?.marketplacePreferences?.toObject
      ? user.marketplacePreferences.toObject()
      : user?.marketplacePreferences || {};
    const filteredPrefs = {
      ...prefs,
      recentProducts: (prefs.recentProducts || []).filter(item => item.productId?.status !== 'archived'),
    };
    const formattedPrefs = formatMarketplacePreferences(filteredPrefs);
    const recentProductIds = (prefs.recentProducts || [])
      .map(item => item.productId?._id || item.productId)
      .filter(Boolean);

    const recentOrders = await Order.find({
      buyerId: req.user._id,
      status: { $in: ['paid', 'processing', 'shipped', 'delivered', 'completed'] },
    })
      .select('items.productId items.type')
      .sort({ createdAt: -1 })
      .limit(12)
      .populate('items.productId', 'category type');

    const orderProductIds = compactUnique(recentOrders.flatMap(order =>
      (order.items || []).map(item => item.productId?._id || item.productId)
    ));
    const orderCategories = compactUnique(recentOrders.flatMap(order =>
      (order.items || []).flatMap(item => item.productId?.category || [])
    ));
    const orderTypes = compactUnique(recentOrders.flatMap(order =>
      (order.items || []).map(item => item.productId?.type || item.type)
    ));

    const topCategories = compactUnique([
      ...topCountKeys(formattedPrefs.categoryCounts, 6),
      ...orderCategories,
    ]).slice(0, 8);
    const topTypes = compactUnique([
      ...topCountKeys(formattedPrefs.typeCounts, 4),
      ...orderTypes,
    ]).slice(0, 4);

    const recommendationOr = [];
    if (topCategories.length) recommendationOr.push({ category: { $in: topCategories } });
    if (topTypes.length) recommendationOr.push({ type: { $in: topTypes } });

    let recommendedProducts = [];
    if (recommendationOr.length) {
      recommendedProducts = await Product.find({
        status: 'active',
        _id: { $nin: [...recentProductIds, ...orderProductIds] },
        $or: recommendationOr,
      })
        .populate('sellerId', 'username name profileImage isSeller isVerified')
        .sort({ 'stats.sales': -1, 'stats.views': -1, averageRating: -1, createdAt: -1 })
        .limit(10)
        .select('-digital.fileUrl -digital.filePublicId -digital.previewUrl');
    }

    res.json({
      success: true,
      personalization: {
        ...formattedPrefs,
        recommendedProducts: recommendedProducts.map(mapProductForMarketplaceCard),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/marketplace/personalization/view
exports.recordMarketplaceProductView = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const product = await Product.findOne({ _id: productId, status: 'active' })
      .select('type category');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const user = await User.findById(req.user._id).select('marketplacePreferences');
    const prefs = user.marketplacePreferences || {};

    user.marketplacePreferences = {
      recentProducts: bumpRecentProduct(prefs.recentProducts || [], product._id),
      categorySignals: (product.category || []).reduce(
        (signals, category) => bumpSignalList(signals, 'category', category, MARKETPLACE_PREF_LIMITS.categories),
        prefs.categorySignals || []
      ),
      typeSignals: bumpSignalList(prefs.typeSignals || [], 'type', product.type, MARKETPLACE_PREF_LIMITS.types),
      updatedAt: new Date(),
    };

    await user.save({ validateModifiedOnly: true });

    res.json({
      success: true,
      personalization: formatMarketplacePreferences(user.marketplacePreferences),
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

    const ratingBuckets = await Review.aggregate([
      { $match: { productId: product._id } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingBuckets.forEach(bucket => {
      distribution[bucket._id] = bucket.count;
    });

    // Related products (same category, excluding this one)
    const related = await Product.find({
      status:   'active',
      _id:      { $ne: product._id },
      category: { $in: product.category },
    })
      .select('title slug thumbnail price compareAtPrice type averageRating reviewCount')
      .limit(6);

    res.json({
      success: true,
      product,
      reviews,
      related,
      ratingSummary: {
        average: product.averageRating || 0,
        total: product.reviewCount || 0,
        distribution,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/marketplace/:id/delivery-estimate?pincode=000000
exports.getDeliveryEstimate = async (req, res) => {
  try {
    const pincode = String(req.query.pincode || '').trim();
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 6 digit Indian pincode.' });
    }

    const product = await Product.findOne({ _id: req.params.id, status: 'active' })
      .select('type physical');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (product.type !== 'physical') {
      return res.status(400).json({ success: false, message: 'Delivery estimate is available for physical products only.' });
    }

    const estimatedDeliveryDays = Math.max(1, Number(product.physical?.estimatedDeliveryDays) || 7);
    const shippingFee = Math.max(0, Number(product.physical?.shippingFee) || 0);
    const stock = Number(product.physical?.stock) || 0;

    res.json({
      success: true,
      estimate: {
        pincode,
        estimatedDeliveryDays,
        shippingFee,
        isFreeShipping: shippingFee === 0,
        deliverable: stock > 0,
      },
    });
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
      specifications, warranty, countryOfOrigin,
      price, compareAtPrice, currency, isFree,
      digital, physical, service, external,
      seoTitle, seoDescription, decoration, status,
    } = body;

    const product = new Product({
      sellerId:       req.user._id,
      type,
      title,
      description:    description    || '',
      specifications: (specifications || []).filter(item => item?.key || item?.value),
      warranty:       warranty       || '',
      countryOfOrigin:countryOfOrigin || '',
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
      product.images    = uploads.map(r => r.secure_url).filter(Boolean);
      product.imagePublicIds = uploads.map(r => r.public_id).filter(Boolean);
      product.thumbnail = product.images[0] || '';
    }

    product.backgroundRemovalStatus = product.thumbnail ? 'pending' : 'skipped';
    await product.save();
    let responseProduct = product;

    if (product.thumbnail) {
      await processProductThumbnail(product._id);
      responseProduct = await Product.findById(product._id);
    }

    res.status(201).json({ success: true, product: responseProduct || product });
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
    const requestedPrice = body.price !== undefined ? Number(body.price) : null;

    if (Number.isFinite(requestedPrice) && requestedPrice > Number(product.price || 0)) {
      return res.status(403).json({
        success: false,
        message: 'Price increases need admin approval. Create a price-change token from your seller dashboard.',
      });
    }

    const allowed = [
      'title', 'description', 'category', 'tags',
      'specifications', 'warranty', 'countryOfOrigin',
      'price', 'compareAtPrice', 'isFree', 'currency',
      'status', 'videoUrl', 'seoTitle', 'seoDescription', 'decoration',
      'digital', 'physical', 'service', 'external',
    ];
    allowed.forEach(field => {
      if (body[field] !== undefined) product[field] = body[field];
    });

    const previousThumbnail = product.thumbnail;
    const previousImages = product.images || [];
    const previousTransparentPublicId = product.transparentThumbnailPublicId ||
      (product.transparentThumbnail ? extractCloudinaryPublicId(product.transparentThumbnail) : '');

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
      const newUrls = uploads.map(r => r.secure_url).filter(Boolean);
      const newPublicIds = uploads.map(r => r.public_id).filter(Boolean);

      // Merge with any existing images the frontend wants to keep
      const existingKept = req.body.existingImages !== undefined
        ? parseImageListField(req.body.existingImages)
        : [];
      product.images    = [...existingKept, ...newUrls].slice(0, 8);
      product.imagePublicIds = compactUnique([
        ...existingKept.map(extractCloudinaryPublicId),
        ...newPublicIds.slice(0, Math.max(0, 8 - existingKept.length)),
      ]);
      product.thumbnail = product.images[0] || '';

    } else if (req.body.existingImages !== undefined) {
      // No new uploads but frontend sent a list of images to keep (after removals)
      const kept = parseImageListField(req.body.existingImages);
      product.images    = kept;
      product.imagePublicIds = compactUnique(kept.map(extractCloudinaryPublicId));
      product.thumbnail = kept[0] || '';
    }

    const removedImageUrls = previousImages.filter(url => !(product.images || []).includes(url));
    const thumbnailChanged = product.thumbnail !== previousThumbnail;

    if (thumbnailChanged) {
      product.backgroundRemovalStatus = product.thumbnail ? 'pending' : 'skipped';
      product.transparentThumbnail = '';
      product.transparentThumbnailPublicId = '';
      product.backgroundRemovedAt = null;
      product.backgroundRemovalError = '';
      product.backgroundRemovalSourceHash = '';
    }

    await product.save();
    if (removedImageUrls.length || (thumbnailChanged && previousTransparentPublicId)) {
      await destroyCloudinaryAssets({
        imagePublicIds: [
          ...removedImageUrls.map(extractCloudinaryPublicId),
          thumbnailChanged ? previousTransparentPublicId : '',
        ],
      });
    }

    let responseProduct = product;
    if (product.thumbnail && thumbnailChanged) {
      await processProductThumbnail(product._id);
      responseProduct = await Product.findById(product._id);
    }

    res.json({ success: true, product: responseProduct || product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/seller/products/:id  (soft-archive — orders are never broken)
exports.archiveProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const imageCleanup = await destroyCloudinaryAssets({
      imagePublicIds: getProductImagePublicIds(product),
      rawPublicIds: [product.digital?.filePublicId],
    });

    await Promise.all([
      Product.deleteOne({ _id: product._id }),
      User.updateMany({ wishlist: product._id }, { $pull: { wishlist: product._id } }),
      Cart.updateMany({ 'items.productId': product._id }, { $pull: { items: { productId: product._id } } }),
    ]);

    const failedCleanup = imageCleanup.filter(result => result.status === 'rejected').length;
    res.json({
      success: true,
      message: 'Product deleted.',
      imageCleanup: {
        attempted: imageCleanup.length,
        failed: failedCleanup,
      },
    });
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

// POST /api/marketplace/seller/products/:id/remove-background/retry
exports.retryBackgroundRemoval = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    await processProductThumbnail(product);
    res.json({ success: true, product });
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
      status:   { $in: ['completed', 'delivered'] },
    });
    if (!order) {
      return res.status(403).json({ success: false, message: 'You can only review products you have purchased.' });
    }

    const exists = await Review.findOne({ orderId, productId });
    if (exists) return res.status(400).json({ success: false, message: 'You have already reviewed this product for this order.' });

    const reviewImages = req.files?.length
      ? await Promise.all(req.files.slice(0, 4).map(file => uploadBufferToCloudinary(file, 'lekhon/reviews')))
      : [];

    const review = await Review.create({
      productId,
      buyerId:            req.user._id,
      orderId,
      rating:             parseInt(rating),
      title:              title || '',
      body:               body  || '',
      images:             reviewImages.map(result => result.secure_url),
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

    res.json({ success: true, products, total: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CART
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/marketplace/cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate('items.productId', 'title slug thumbnail price type status physical.stock physical.minimumOrderQuantity physical.shippingFee isFree sellerId');
    res.json({ success: true, cart: cart || { items: [], couponCode: '' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/marketplace/cart/add
exports.addToCart = async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;
    const requestedQty = Math.max(parseInt(qty, 10) || 1, 1);
    const product = await Product.findOne({ _id: productId, status: 'active' });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.type === 'external') {
      return res.status(400).json({ success: false, message: 'External products cannot be added to cart.' });
    }
    const minimumOrderQuantity = product.type === 'physical'
      ? Math.max(parseInt(product.physical?.minimumOrderQuantity, 10) || 1, 1)
      : 1;
    if (requestedQty < minimumOrderQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum order quantity for "${product.title}" is ${minimumOrderQuantity}.`,
      });
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) cart = new Cart({ userId: req.user._id, items: [] });

    const existing = cart.items.find(i => i.productId.toString() === productId);
    if (existing) {
      // Services: cap at 1; physical: allow multiple
      if (product.type === 'service') existing.qty = 1;
      else existing.qty = Math.min(existing.qty + requestedQty, product.physical?.stock || 99);
    } else {
      cart.items.push({
        productId,
        qty:              product.type === 'service' ? 1 : requestedQty,
        priceSnapshot:    product.price,
        titleSnapshot:    product.title,
        thumbnailSnapshot:product.thumbnail,
      });
    }

    await cart.save();
    const populated = await Cart.findById(cart._id)
      .populate('items.productId', 'title slug thumbnail price type status physical.stock physical.minimumOrderQuantity physical.shippingFee isFree sellerId');
    res.json({ success: true, cart: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/marketplace/cart/update
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const requestedQty = parseInt(qty, 10);
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });

    const item = cart.items.find(i => i.productId.toString() === productId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not in cart.' });

    if (requestedQty < 1) {
      cart.items = cart.items.filter(i => i.productId.toString() !== productId);
    } else {
      const product = await Product.findById(productId);
      const minimumOrderQuantity = product?.type === 'physical'
        ? Math.max(parseInt(product.physical?.minimumOrderQuantity, 10) || 1, 1)
        : 1;
      if (requestedQty < minimumOrderQuantity) {
        return res.status(400).json({
          success: false,
          message: `Minimum order quantity is ${minimumOrderQuantity}.`,
        });
      }
      item.qty = requestedQty;
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
