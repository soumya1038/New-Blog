const Product  = require('../models/Product');
const Review   = require('../models/Review');
const Order    = require('../models/Order');
const User     = require('../models/User');
const Cart     = require('../models/Cart');
const StoreSettings = require('../models/StoreSettings');
const cloudinary = require('../utils/cloudinary');
const { processProductThumbnail } = require('../services/backgroundRemovalService');
const { getDocumentFileSignatureValidationError } = require('../utils/documentSignatures');
const {
  getImageFileSignatureValidationError,
  getImageSignatureValidationError,
} = require('../utils/imageSignatures');
const { getMediaFileSignatureValidationError } = require('../utils/mediaSignatures');
const { normalizeHttpUrl } = require('../utils/safeUrls');
const { logWarn, sendSafeServerError } = require('../utils/safeErrorLog');
const { hasUserId } = require('../utils/userVisibility');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MAX_CART_ITEM_QTY = Math.max(1, Number(process.env.MAX_CART_ITEM_QTY || process.env.MAX_ORDER_ITEM_QTY) || 99);
const SELLER_PRODUCT_DEFAULT_LIMIT = Math.max(1, Number(process.env.SELLER_PRODUCT_DEFAULT_LIMIT) || 20);
const SELLER_PRODUCT_MAX_LIMIT = Math.max(1, Number(process.env.SELLER_PRODUCT_MAX_LIMIT) || 100);
const SELLER_PRODUCT_MAX_PAGE = Math.max(1, Number(process.env.SELLER_PRODUCT_MAX_PAGE) || 1000);
const MARKETPLACE_PRODUCT_MAX_PAGE = Math.max(1, Number(process.env.MARKETPLACE_PRODUCT_MAX_PAGE) || 200);
const MARKETPLACE_SEARCH_MAX_PAGE = Math.max(1, Number(process.env.MARKETPLACE_SEARCH_MAX_PAGE) || 10);
const MARKETPLACE_SEARCH_MAX_LENGTH = Math.max(1, Number(process.env.MARKETPLACE_SEARCH_MAX_LENGTH) || 120);
const MARKETPLACE_FILTER_VALUE_MAX_LENGTH = Math.max(1, Number(process.env.MARKETPLACE_FILTER_VALUE_MAX_LENGTH) || 80);
const MARKETPLACE_CATEGORY_FILTER_MAX = Math.max(1, Number(process.env.MARKETPLACE_CATEGORY_FILTER_MAX) || 10);
const MARKETPLACE_SEARCH_FETCH_MAX = Math.max(50, Number(process.env.MARKETPLACE_SEARCH_FETCH_MAX) || 240);
const MARKETPLACE_MAX_PRICE_FILTER = Math.max(1, Number(process.env.MARKETPLACE_MAX_PRICE_FILTER) || 10000000);
const MARKETPLACE_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.MARKETPLACE_QUERY_MAX_TIME_MS) || 5000);
const MAX_WISHLIST_ITEMS = Math.max(1, Number(process.env.MAX_WISHLIST_ITEMS) || 500);
const DIGITAL_MAX_DOWNLOADS = Math.max(1, Number(process.env.DIGITAL_MAX_DOWNLOADS) || 100);
const REVIEW_TITLE_MAX_LENGTH = Math.max(1, Number(process.env.REVIEW_TITLE_MAX_LENGTH) || 100);
const REVIEW_BODY_MAX_LENGTH = Math.max(1, Number(process.env.REVIEW_BODY_MAX_LENGTH) || 1000);
const REVIEW_REPLY_MAX_LENGTH = Math.max(1, Number(process.env.REVIEW_REPLY_MAX_LENGTH) || 1000);
const MARKETPLACE_PRODUCT_TYPES = new Set(['digital', 'physical', 'service', 'external']);
const MARKETPLACE_SORT_FIELDS = new Set(['createdAt', 'price', 'rating', 'popular']);
const PRODUCT_EXTERNAL_PLATFORMS = new Set(['Amazon', 'Etsy', 'Gumroad', 'Flipkart', 'Other']);
const PRODUCT_IMAGE_SIGNATURE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PRODUCT_SERVER_ERROR_MESSAGE = 'Unable to process product request';

const getSafeProductErrorStatus = (error) => {
  const status = Number(error?.statusCode || error?.status);
  return Number.isInteger(status) && status >= 400 && status < 500 ? status : 500;
};

const sendProductError = (res, error) => {
  const status = getSafeProductErrorStatus(error);
  if (status >= 500) {
    return sendSafeServerError(res, '[productController] request failed:', error, PRODUCT_SERVER_ERROR_MESSAGE);
  }

  return res.status(status).json({
    success: false,
    message: error?.message || 'Invalid product request',
  });
};

const digitalImageMimeTypesByExt = new Map([
  ['png', new Set(['image/png'])],
  ['jpg', new Set(['image/jpeg'])],
  ['jpeg', new Set(['image/jpeg'])],
  ['webp', new Set(['image/webp'])],
]);
const digitalMediaMimeTypesByExt = new Map([
  ['mp3', new Set(['audio/mpeg', 'audio/mp3'])],
  ['wav', new Set(['audio/wav', 'audio/wave', 'audio/x-wav'])],
  ['mp4', new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'video/mp4'])],
  ['mov', new Set(['video/quicktime'])],
]);
const digitalDocumentMimeTypesByExt = new Map([
  ['pdf', new Set(['application/pdf'])],
  ['zip', new Set(['application/zip', 'application/x-zip-compressed'])],
  ['epub', new Set(['application/epub+zip', 'application/zip', 'application/x-zip-compressed'])],
  ['txt', new Set(['text/plain'])],
  ['doc', new Set(['application/msword'])],
  ['docx', new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])],
  ['ppt', new Set(['application/vnd.ms-powerpoint'])],
  ['pptx', new Set(['application/vnd.openxmlformats-officedocument.presentationml.presentation'])],
  ['xls', new Set(['application/vnd.ms-excel'])],
  ['xlsx', new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])],
]);

const parseBoundedInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

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

const buildValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeBoundedOptionalText = (value, maxLength, fieldName) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw buildValidationError(`${fieldName} must be text.`);
  }
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length > maxLength) {
    throw buildValidationError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
  return text;
};

const uploadBufferToCloudinary = (file, folder) => {
  const signatureError = getImageSignatureValidationError(file, PRODUCT_IMAGE_SIGNATURE_MIME_TYPES);
  if (signatureError) {
    throw buildValidationError(signatureError);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
};

const getDigitalFileSignatureValidationError = async (file) => {
  const ext = path.extname(file?.originalname || '').replace(/^\./, '').toLowerCase();
  if (digitalImageMimeTypesByExt.has(ext)) {
    return getImageFileSignatureValidationError(file, digitalImageMimeTypesByExt.get(ext));
  }
  if (digitalMediaMimeTypesByExt.has(ext)) {
    return getMediaFileSignatureValidationError(file, digitalMediaMimeTypesByExt.get(ext));
  }
  if (digitalDocumentMimeTypesByExt.has(ext)) {
    return getDocumentFileSignatureValidationError(file, digitalDocumentMimeTypesByExt.get(ext));
  }
  return 'This digital file type is not allowed';
};

const compactUnique = (values = []) =>
  [...new Set(values.filter(Boolean).map(value => String(value)))];

const parseCartQuantity = (value, { allowZero = false } = {}) => {
  const parsed = Number(value);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > MAX_CART_ITEM_QTY) return null;
  return parsed;
};
const physicalMinimumQty = product => Math.max(1, Number(product?.physical?.minimumOrderQuantity) || 1);
const physicalStockQty = product => Math.max(0, Number(product?.physical?.stock) || 0);
const CART_PRODUCT_POPULATE_FIELDS = 'title slug thumbnail price type status physical.stock physical.minimumOrderQuantity physical.shippingFee isFree sellerId';

const buildCartItemSnapshot = (product, qty) => ({
  productId: product._id,
  qty,
  priceSnapshot: product.price,
  titleSnapshot: product.title,
  thumbnailSnapshot: product.thumbnail,
});

const buildCartItemSnapshotSet = (product) => ({
  'items.$.priceSnapshot': product.price,
  'items.$.titleSnapshot': product.title,
  'items.$.thumbnailSnapshot': product.thumbnail,
});

const ensureUserCart = async (userId) => {
  try {
    await Cart.updateOne(
      { userId },
      { $setOnInsert: { userId, items: [], couponCode: '' } },
      { upsert: true }
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
};

const getPopulatedCartForUser = async (userId) => {
  const cart = await Cart.findOne({ userId })
    .populate('items.productId', CART_PRODUCT_POPULATE_FIELDS);
  return cart || { items: [], couponCode: '' };
};

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

const normalizeMarketplaceFilterValue = (value = '') =>
  String(value || '').trim().slice(0, MARKETPLACE_FILTER_VALUE_MAX_LENGTH);

const normalizeMarketplaceCategories = (value) => {
  const rawValues = Array.isArray(value) ? value : [value];
  return compactUnique(
    rawValues
      .flatMap(item => String(item || '').split(','))
      .map(normalizeMarketplaceFilterValue)
      .filter(Boolean)
  ).slice(0, MARKETPLACE_CATEGORY_FILTER_MAX);
};

const parseMarketplaceNumberFilter = (value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return undefined;
  }
  return parsed;
};

const normalizeProductSlugParam = (value = '') => String(value || '').trim().toLowerCase();

const isValidProductSlug = (value = '') =>
  value.length > 0 && value.length <= 220 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

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

const sanitizePublicProduct = (product, { includeDigitalPreview = false } = {}) => {
  if (!product) return product;
  const obj = typeof product.toObject === 'function' ? product.toObject() : { ...product };

  delete obj.imagePublicIds;
  delete obj.transparentThumbnailPublicId;
  delete obj.backgroundRemovalStatus;
  delete obj.backgroundRemovalError;
  delete obj.backgroundRemovalSourceHash;
  delete obj.backgroundRemovedAt;
  delete obj.__v;

  if (obj.digital) {
    obj.digital = { ...obj.digital };
    delete obj.digital.fileUrl;
    delete obj.digital.filePublicId;
    if (!includeDigitalPreview) delete obj.digital.previewUrl;
  }

  return obj;
};

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

const normalizeExternalProductDetails = (external) => {
  if (external === undefined) return undefined;
  if (!external || typeof external !== 'object') return {};
  const platform = PRODUCT_EXTERNAL_PLATFORMS.has(external.platform) ? external.platform : 'Other';
  return {
    url: normalizeHttpUrl(external.url),
    platform,
  };
};

const normalizeDigitalDetails = (digital, existing = {}) => {
  if (digital === undefined) return undefined;
  const current = existing?.toObject ? existing.toObject() : (existing || {});
  const maxDownloads = parseBoundedInt(
    digital?.maxDownloads ?? current.maxDownloads,
    Number(current.maxDownloads) || 5,
    1,
    DIGITAL_MAX_DOWNLOADS
  );
  const previewUrl = digital?.previewUrl !== undefined
    ? normalizeHttpUrl(digital.previewUrl)
    : (current.previewUrl || '');

  return {
    fileUrl: current.fileUrl || '',
    filePublicId: current.filePublicId || '',
    fileSize: Number(current.fileSize || 0),
    fileFormat: current.fileFormat || '',
    maxDownloads,
    previewUrl,
  };
};

const normalizeProductBody = (body = {}) => ({
  ...body,
  category: parseArrayField(body.category),
  tags: parseArrayField(body.tags),
  specifications: parseArrayField(body.specifications),
  digital: parseObjectField(body.digital),
  physical: parseObjectField(body.physical),
  service: parseObjectField(body.service),
  external: normalizeExternalProductDetails(parseObjectField(body.external)),
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

    const normalizedSearch = normalizeSearchTerm(search);
    if (normalizedSearch.length > MARKETPLACE_SEARCH_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Search query must be ${MARKETPLACE_SEARCH_MAX_LENGTH} characters or fewer.`,
      });
    }

    const parsedPage = parseBoundedInt(
      page,
      1,
      1,
      normalizedSearch ? MARKETPLACE_SEARCH_MAX_PAGE : MARKETPLACE_PRODUCT_MAX_PAGE
    );
    const parsedLimit = parseBoundedInt(limit, 20, 1, 50);
    const skip = (parsedPage - 1) * parsedLimit;

    const baseQuery = { status: 'active' };
    if (type) {
      const normalizedType = String(type || '').trim().toLowerCase();
      if (!MARKETPLACE_PRODUCT_TYPES.has(normalizedType)) {
        return res.status(400).json({ success: false, message: 'Invalid product type.' });
      }
      baseQuery.type = normalizedType;
    }
    const categories = normalizeMarketplaceCategories(category);
    if (categories.length) baseQuery.category = { $in: categories };
    if (isFree === 'true') baseQuery.isFree = true;
    if (minPrice || maxPrice) {
      const parsedMinPrice = parseMarketplaceNumberFilter(minPrice, { min: 0, max: MARKETPLACE_MAX_PRICE_FILTER });
      const parsedMaxPrice = parseMarketplaceNumberFilter(maxPrice, { min: 0, max: MARKETPLACE_MAX_PRICE_FILTER });
      if (parsedMinPrice === undefined || parsedMaxPrice === undefined) {
        return res.status(400).json({ success: false, message: 'Invalid price filter.' });
      }
      if (parsedMinPrice !== null && parsedMaxPrice !== null && parsedMinPrice > parsedMaxPrice) {
        return res.status(400).json({ success: false, message: 'Minimum price cannot exceed maximum price.' });
      }
      baseQuery.price = {};
      if (parsedMinPrice !== null) baseQuery.price.$gte = parsedMinPrice;
      if (parsedMaxPrice !== null) baseQuery.price.$lte = parsedMaxPrice;
    }
    if (rating) {
      const parsedRating = parseMarketplaceNumberFilter(rating, { min: 0, max: 5 });
      if (parsedRating === undefined) {
        return res.status(400).json({ success: false, message: 'Invalid rating filter.' });
      }
      if (parsedRating !== null) baseQuery.averageRating = { $gte: parsedRating };
    }
    const query = buildMarketplaceSearchQuery(baseQuery, normalizedSearch);

    const sortObj = {};
    const normalizedSort = MARKETPLACE_SORT_FIELDS.has(String(sort)) ? String(sort) : 'createdAt';
    const normalizedOrder = order === 'asc' ? 'asc' : 'desc';
    if (normalizedSort === 'price')    sortObj.price            = normalizedOrder === 'asc' ? 1 : -1;
    else if (normalizedSort === 'rating')   sortObj.averageRating = -1;
    else if (normalizedSort === 'popular')  sortObj['stats.sales'] = -1;
    else                          sortObj.createdAt      = -1;

    let products;
    let total;

    if (normalizedSearch) {
      const maxSearchFetch = Math.min(Math.max(skip + parsedLimit, 120), MARKETPLACE_SEARCH_FETCH_MAX);
      const [matchedProducts, matchedCount] = await Promise.all([
        Product.find(query)
          .populate('sellerId', 'username name profileImage isSeller isVerified')
          .sort({ createdAt: -1 })
          .limit(maxSearchFetch)
          .select('-digital.fileUrl -digital.filePublicId -digital.previewUrl')
          .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
          .lean(),
        Product.countDocuments(query).maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS),
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
            .select('-digital.fileUrl -digital.filePublicId -digital.previewUrl')
            .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
            .lean(),
          Product.countDocuments(categoryQuery).maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS),
        ]);
      }

      products = [
        ...sortProductsForSearch(matchedProducts, normalizedSearch),
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
          .select('-digital.fileUrl -digital.filePublicId -digital.previewUrl') // never expose private URLs in listing
          .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
          .lean(),
        Product.countDocuments(query).maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS),
      ]);
    }

    res.json({
      success: true,
      products: products.map(product => sanitizePublicProduct(product)),
      total,
      page:  parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (error) {
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? 'Failed to load products' : error.message,
    });
  }
};

// GET /api/marketplace/suggestions?q=
exports.getProductSuggestions = async (req, res) => {
  try {
    const term = normalizeSearchTerm(req.query.q);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 4), 12);

    if (term.length > MARKETPLACE_SEARCH_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Search query must be ${MARKETPLACE_SEARCH_MAX_LENGTH} characters or fewer.`,
      });
    }

    if (term.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const query = buildMarketplaceSearchQuery({ status: 'active' }, term);
    const products = await Product.find(query)
      .select('title slug thumbnail price compareAtPrice isFree type category tags stats createdAt')
      .sort({ createdAt: -1 })
      .limit(Math.min(60, MARKETPLACE_SEARCH_FETCH_MAX))
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
      .lean();

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
    res.status(500).json({ success: false, message: 'Failed to load product suggestions' });
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
    return sendProductError(res, error);
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
    return sendProductError(res, error);
  }
};

// GET /api/marketplace/:slug
exports.getProductBySlug = async (req, res) => {
  try {
    const slug = normalizeProductSlugParam(req.params.slug);
    if (!isValidProductSlug(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid product slug.' });
    }

    const product = await Product.findOne({ slug, status: 'active' })
      .populate('sellerId', 'username name profileImage isSeller isVerified createdAt bio')
      .select('-digital.fileUrl -digital.filePublicId')
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
      .lean();

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // Increment view count (fire-and-forget)
    Product.findByIdAndUpdate(product._id, { $inc: { 'stats.views': 1 } })
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
      .exec()
      .catch((error) => {
        logWarn('[marketplace] Product view increment failed:', error);
      });

    // Fetch reviews for this product (latest 10)
    const reviews = await Review.find({ productId: product._id })
      .populate('buyerId', 'username name profileImage')
      .sort({ createdAt: -1 })
      .limit(10)
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
      .lean();

    const ratingBuckets = await Review.aggregate([
      { $match: { productId: product._id } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]).option({ maxTimeMS: MARKETPLACE_QUERY_MAX_TIME_MS });
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingBuckets.forEach(bucket => {
      distribution[bucket._id] = bucket.count;
    });

    // Related products (same category, excluding this one)
    const related = product.category?.length
      ? await Product.find({
          status:   'active',
          _id:      { $ne: product._id },
          category: { $in: product.category },
        })
          .select('title slug thumbnail price compareAtPrice type averageRating reviewCount')
          .limit(6)
          .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
          .lean()
      : [];

    const publicProduct = sanitizePublicProduct(product, { includeDigitalPreview: true });
    const sellerObjectId = product.sellerId?._id || product.sellerId;
    if (sellerObjectId && publicProduct.sellerId && typeof publicProduct.sellerId === 'object') {
      const storeSettings = await StoreSettings.findOne({ sellerId: sellerObjectId })
        .select('stats.averageRating stats.ratingCount')
        .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
        .lean();
      publicProduct.sellerId.storeRating = {
        averageRating: storeSettings?.stats?.averageRating || 0,
        ratingCount: storeSettings?.stats?.ratingCount || 0,
      };
    }

    res.json({
      success: true,
      product: publicProduct,
      reviews,
      related,
      ratingSummary: {
        average: product.averageRating || 0,
        total: product.reviewCount || 0,
        distribution,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load product' });
  }
};

// GET /api/marketplace/:id/delivery-estimate?pincode=000000
exports.getDeliveryEstimate = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    const pincode = String(req.query.pincode || '').trim();
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 6 digit Indian pincode.' });
    }

    const product = await Product.findOne({ _id: req.params.id, status: 'active' })
      .select('type physical')
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS)
      .lean();

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
    res.status(500).json({ success: false, message: 'Failed to load delivery estimate' });
  }
};

// POST /api/marketplace/:id/external-click  (track external link clicks)
exports.trackExternalClick = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    const result = await Product.updateOne(
      { _id: req.params.id, status: 'active', type: 'external' },
      { $inc: { 'stats.clicks': 1 } }
    ).maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS);
    if (!result.matchedCount) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to track external click' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SELLER — Product CRUD
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/seller/products
exports.createProduct = async (req, res) => {
  let uploadedImagePublicIds = [];
  try {
    const body = normalizeProductBody(req.body);
    const {
      type, title, description, category, tags,
      specifications, warranty, countryOfOrigin,
      price, compareAtPrice, currency, isFree,
      digital, physical, service, external,
      seoTitle, seoDescription, decoration, status,
    } = body;

    if (!MARKETPLACE_PRODUCT_TYPES.has(type)) {
      return res.status(400).json({ success: false, message: 'Invalid product type.' });
    }

    if (type === 'external' && !external?.url) {
      return res.status(400).json({ success: false, message: 'External products require a valid http or https URL.' });
    }

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

    if (type === 'digital') product.digital = normalizeDigitalDetails(digital || {}, {});
    if (type === 'physical' && physical) product.physical = physical;
    if (type === 'service'  && service)  product.service  = service;
    if (type === 'external' && external) product.external = external;

    // Handle multi-image upload (req.files from multer)
    if (req.files && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map(f => uploadBufferToCloudinary(f, 'lekhon/products'))
      );
      product.images    = uploads.map(r => r.secure_url).filter(Boolean);
      product.imagePublicIds = uploads.map(r => r.public_id).filter(Boolean);
      uploadedImagePublicIds = product.imagePublicIds;
      product.thumbnail = product.images[0] || '';
    }

    product.backgroundRemovalStatus = product.thumbnail ? 'pending' : 'skipped';
    await product.save();
    uploadedImagePublicIds = [];
    let responseProduct = await Product.findById(product._id);

    if (product.thumbnail) {
      await processProductThumbnail(product._id);
      responseProduct = await Product.findById(product._id);
    }

    res.status(201).json({ success: true, product: responseProduct });
  } catch (error) {
    if (uploadedImagePublicIds.length) {
      await destroyCloudinaryAssets({ imagePublicIds: uploadedImagePublicIds });
    }
    return sendProductError(res, error);
  }
};

// PUT /api/seller/products/:id
exports.updateProduct = async (req, res) => {
  let uploadedImagePublicIds = [];
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id })
      .select('+digital.fileUrl +digital.filePublicId');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const body = normalizeProductBody(req.body);
    const requestedPrice = body.price !== undefined ? Number(body.price) : null;

    if (product.type === 'external' && body.external !== undefined && !body.external?.url) {
      return res.status(400).json({ success: false, message: 'External products require a valid http or https URL.' });
    }

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
      'physical', 'service', 'external',
    ];
    allowed.forEach(field => {
      if (body[field] !== undefined) product[field] = body[field];
    });
    if (product.type === 'digital' && body.digital !== undefined) {
      product.digital = normalizeDigitalDetails(body.digital, product.digital);
    }

    const previousThumbnail = product.thumbnail;
    const previousImages = product.images || [];
    const previousTransparentPublicId = product.transparentThumbnailPublicId ||
      (product.transparentThumbnail ? extractCloudinaryPublicId(product.transparentThumbnail) : '');

    // Handle image updates
    if (req.files && req.files.length > 0) {
      // Upload new images
      const uploads = await Promise.all(
        req.files.map(f => uploadBufferToCloudinary(f, 'lekhon/products'))
      );
      const newUrls = uploads.map(r => r.secure_url).filter(Boolean);
      const newPublicIds = uploads.map(r => r.public_id).filter(Boolean);
      uploadedImagePublicIds = newPublicIds;

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
    uploadedImagePublicIds = [];
    if (removedImageUrls.length || (thumbnailChanged && previousTransparentPublicId)) {
      await destroyCloudinaryAssets({
        imagePublicIds: [
          ...removedImageUrls.map(extractCloudinaryPublicId),
          thumbnailChanged ? previousTransparentPublicId : '',
        ],
      });
    }

    let responseProduct = await Product.findById(product._id);
    if (product.thumbnail && thumbnailChanged) {
      await processProductThumbnail(product._id);
      responseProduct = await Product.findById(product._id);
    }

    res.json({ success: true, product: responseProduct });
  } catch (error) {
    if (uploadedImagePublicIds.length) {
      await destroyCloudinaryAssets({ imagePublicIds: uploadedImagePublicIds });
    }
    return sendProductError(res, error);
  }
};

// DELETE /api/seller/products/:id  (soft-archive — orders are never broken)
exports.archiveProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id })
      .select('+digital.filePublicId');
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
    return sendProductError(res, error);
  }
};

// GET /api/seller/products
exports.getSellerProducts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const parsedPage = parseBoundedInt(page, 1, 1, SELLER_PRODUCT_MAX_PAGE);
    const parsedLimit = parseBoundedInt(limit, SELLER_PRODUCT_DEFAULT_LIMIT, 1, SELLER_PRODUCT_MAX_LIMIT);
    const query = { sellerId: req.user._id };
    if (status) query.status = status;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      products,
      total,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (error) {
    return sendProductError(res, error);
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
    return sendProductError(res, error);
  }
};

// Upload private digital file
// POST /api/seller/products/:id/upload-file
exports.uploadDigitalFile = async (req, res) => {
  let uploadedRawPublicId = '';
  let productSaved = false;
  const tempFilePath = req.file?.path;

  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id })
      .select('+digital.filePublicId');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.type !== 'digital') return res.status(400).json({ success: false, message: 'Only digital products can have file uploads.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided.' });
    const previousRawPublicId = product.digital?.filePublicId || '';

    // Upload as private (authenticated delivery) resource
    const signatureError = await getDigitalFileSignatureValidationError(req.file);
    if (signatureError) {
      return res.status(400).json({ success: false, message: signatureError });
    }
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
        if (req.file.path) {
          fs.createReadStream(req.file.path)
            .on('error', reject)
            .pipe(stream);
        } else {
          stream.end(req.file.buffer);
        }
      });
    uploadedRawPublicId = result.public_id;

    product.digital.fileUrl      = result.secure_url;
    product.digital.filePublicId = result.public_id;
    product.digital.fileSize     = req.file.size;
    product.digital.fileFormat   = result.format || req.file.originalname.split('.').pop();
    await product.save();
    productSaved = true;
    if (previousRawPublicId && previousRawPublicId !== result.public_id) {
      await destroyCloudinaryAssets({ rawPublicIds: [previousRawPublicId] });
    }

    res.json({ success: true, message: 'File uploaded successfully.', fileSize: req.file.size, fileFormat: product.digital.fileFormat });
  } catch (error) {
    if (uploadedRawPublicId && !productSaved) {
      await destroyCloudinaryAssets({ rawPublicIds: [uploadedRawPublicId] });
    }
    return sendProductError(res, error);
  } finally {
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
};

// POST /api/marketplace/seller/products/:id/remove-background/retry
exports.retryBackgroundRemoval = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    await processProductThumbnail(product);
    const safeProduct = await Product.findById(product._id);
    res.json({ success: true, product: safeProduct });
  } catch (error) {
    return sendProductError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/marketplace/:id/reviews
exports.addReview = async (req, res) => {
  let uploadedReviewPublicIds = [];
  try {
    const { orderId, rating, title, body } = req.body;
    const productId = req.params.id;
    const parsedRating = Number.parseInt(rating, 10);

    if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid product or order id.' });
    }

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }
    const safeTitle = normalizeBoundedOptionalText(title, REVIEW_TITLE_MAX_LENGTH, 'Review title');
    const safeBody = normalizeBoundedOptionalText(body, REVIEW_BODY_MAX_LENGTH, 'Review body');

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
    uploadedReviewPublicIds = reviewImages.map(result => result.public_id).filter(Boolean);

    const review = await Review.create({
      productId,
      buyerId:            req.user._id,
      orderId,
      rating:             parsedRating,
      title:              safeTitle,
      body:               safeBody,
      images:             reviewImages.map(result => result.secure_url),
      isVerifiedPurchase: true,
    });
    uploadedReviewPublicIds = [];

    // Update product average rating
    const [ratingStats] = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round((ratingStats?.averageRating || 0) * 10) / 10,
      reviewCount: ratingStats?.reviewCount || 0,
    });

    await review.populate('buyerId', 'username name profileImage');
    res.status(201).json({ success: true, review });
  } catch (error) {
    if (uploadedReviewPublicIds.length) {
      await destroyCloudinaryAssets({ imagePublicIds: uploadedReviewPublicIds });
    }
    return sendProductError(res, error);
  }
};

// POST /api/seller/reviews/:id/reply
exports.replyToReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid review id.' });
    }

    const review  = await Review.findById(req.params.id).populate('productId', 'sellerId');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    if (review.productId.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your product.' });
    }
    review.sellerReply    = normalizeBoundedOptionalText(req.body.reply, REVIEW_REPLY_MAX_LENGTH, 'Seller reply');
    review.sellerRepliedAt= new Date();
    await review.save();
    res.json({ success: true, review });
  } catch (error) {
    return sendProductError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  WISHLIST
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/marketplace/wishlist/:id
exports.toggleWishlist = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }
    const product = await Product.findOne({ _id: req.params.id, status: 'active' })
      .select('_id')
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const removeResult = await User.updateOne(
      { _id: req.user._id, wishlist: product._id },
      { $pull: { wishlist: product._id } }
    ).maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS);
    if (removeResult.modifiedCount === 1) {
      return res.json({ success: true, added: false });
    }

    const addResult = await User.updateOne(
      {
        _id: req.user._id,
        wishlist: { $ne: product._id },
        $expr: {
          $lt: [
            { $size: { $ifNull: ['$wishlist', []] } },
            MAX_WISHLIST_ITEMS
          ]
        }
      },
      { $addToSet: { wishlist: product._id } }
    ).maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS);
    if (addResult.modifiedCount === 1) {
      return res.json({ success: true, added: true });
    }

    const user = await User.findById(req.user._id)
      .select({ wishlist: { $slice: MAX_WISHLIST_ITEMS + 1 } })
      .lean()
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (hasUserId(user.wishlist, product._id)) {
      return res.json({ success: true, added: true });
    }
    return res.status(409).json({
      success: false,
      message: `Wishlist is limited to ${MAX_WISHLIST_ITEMS} products.`
    });
  } catch (error) {
    return sendProductError(res, error);
  }
};

// GET /api/marketplace/wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select({ wishlist: { $slice: MAX_WISHLIST_ITEMS } })
      .lean()
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const products = await Product.find({
      _id:    { $in: user.wishlist || [] },
      status: 'active',
    })
      .select('title slug thumbnail price compareAtPrice type averageRating reviewCount')
      .limit(MAX_WISHLIST_ITEMS)
      .maxTimeMS(MARKETPLACE_QUERY_MAX_TIME_MS);

    res.json({ success: true, products, total: products.length });
  } catch (error) {
    return sendProductError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CART
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/marketplace/cart
exports.getCart = async (req, res) => {
  try {
    const cart = await getPopulatedCartForUser(req.user._id);
    res.json({ success: true, cart });
  } catch (error) {
    return sendProductError(res, error);
  }
};

// POST /api/marketplace/cart/add
exports.addToCart = async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }
    const requestedQty = parseCartQuantity(qty);
    if (!requestedQty) {
      return res.status(400).json({ success: false, message: `Quantity must be a whole number from 1 to ${MAX_CART_ITEM_QTY}.` });
    }
    const product = await Product.findOne({ _id: productId, status: 'active' });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.type === 'external') {
      return res.status(400).json({ success: false, message: 'External products cannot be added to cart.' });
    }
    const minimumOrderQuantity = product.type === 'physical' ? physicalMinimumQty(product) : 1;
    const effectiveQty = product.type === 'physical' ? requestedQty : 1;
    const stockCap = product.type === 'physical' ? Math.min(physicalStockQty(product), MAX_CART_ITEM_QTY) : 1;
    if (effectiveQty < minimumOrderQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum order quantity for "${product.title}" is ${minimumOrderQuantity}.`,
      });
    }
    if (product.type === 'physical' && effectiveQty > stockCap) {
      return res.status(409).json({ success: false, message: `"${product.title}" does not have enough stock.` });
    }

    await ensureUserCart(req.user._id);

    const snapshotSet = buildCartItemSnapshotSet(product);
    const existingFilter = product.type === 'physical'
      ? {
          userId: req.user._id,
          items: {
            $elemMatch: {
              productId: product._id,
              qty: { $lte: stockCap - effectiveQty },
            },
          },
        }
      : {
          userId: req.user._id,
          'items.productId': product._id,
        };
    const existingUpdate = product.type === 'physical'
      ? { $inc: { 'items.$.qty': effectiveQty }, $set: snapshotSet }
      : { $set: { ...snapshotSet, 'items.$.qty': 1 } };

    let updateResult = await Cart.updateOne(existingFilter, existingUpdate);
    if (updateResult.matchedCount === 0) {
      if (product.type === 'physical' && await Cart.exists({ userId: req.user._id, 'items.productId': product._id })) {
        return res.status(409).json({ success: false, message: `"${product.title}" does not have enough stock.` });
      }

      const pushResult = await Cart.updateOne(
        { userId: req.user._id, 'items.productId': { $ne: product._id } },
        { $push: { items: buildCartItemSnapshot(product, effectiveQty) } }
      );

      if (pushResult.matchedCount === 0) {
        updateResult = await Cart.updateOne(existingFilter, existingUpdate);
        if (updateResult.matchedCount === 0 && product.type === 'physical') {
          return res.status(409).json({ success: false, message: `"${product.title}" does not have enough stock.` });
        }
      }
    }

    const cart = await getPopulatedCartForUser(req.user._id);
    res.json({ success: true, cart });
  } catch (error) {
    return sendProductError(res, error);
  }
};

// PATCH /api/marketplace/cart/update
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }
    const requestedQty = parseCartQuantity(qty, { allowZero: true });
    if (requestedQty === null) {
      return res.status(400).json({ success: false, message: `Quantity must be a whole number from 0 to ${MAX_CART_ITEM_QTY}.` });
    }
    if (requestedQty < 1) {
      const updateResult = await Cart.updateOne(
        { userId: req.user._id, 'items.productId': productId },
        { $pull: { items: { productId } } }
      );
      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Item not in cart.' });
      }
      const cart = await getPopulatedCartForUser(req.user._id);
      return res.json({ success: true, cart });
    } else {
      const product = await Product.findOne({ _id: productId, status: 'active' });
      if (!product || product.type === 'external') {
        return res.status(404).json({ success: false, message: 'Product not available.' });
      }
      const minimumOrderQuantity = product.type === 'physical' ? physicalMinimumQty(product) : 1;
      const effectiveQty = product.type === 'physical' ? requestedQty : 1;
      const stockCap = product.type === 'physical' ? Math.min(physicalStockQty(product), MAX_CART_ITEM_QTY) : 1;
      if (effectiveQty < minimumOrderQuantity) {
        return res.status(400).json({
          success: false,
          message: `Minimum order quantity is ${minimumOrderQuantity}.`,
        });
      }
      if (product.type === 'physical' && effectiveQty > stockCap) {
        return res.status(409).json({ success: false, message: `"${product.title}" does not have enough stock.` });
      }
      const updateResult = await Cart.updateOne(
        { userId: req.user._id, 'items.productId': product._id },
        {
          $set: {
            'items.$.qty': effectiveQty,
            ...buildCartItemSnapshotSet(product),
          },
        }
      );
      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Item not in cart.' });
      }
    }

    const cart = await getPopulatedCartForUser(req.user._id);
    res.json({ success: true, cart });
  } catch (error) {
    return sendProductError(res, error);
  }
};

// DELETE /api/marketplace/cart/:productId
exports.removeFromCart = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }
    await Cart.updateOne(
      { userId: req.user._id },
      { $pull: { items: { productId: req.params.productId } } }
    );
    const cart = await getPopulatedCartForUser(req.user._id);
    res.json({ success: true, cart });
  } catch (error) {
    return sendProductError(res, error);
  }
};

// DELETE /api/marketplace/cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: '' });
    res.json({ success: true, cart: { items: [], couponCode: '' } });
  } catch (error) {
    return sendProductError(res, error);
  }
};
