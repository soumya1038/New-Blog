const express = require('express');
const multer  = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { protect, optionalAuth, sellerAuth } = require('../middleware/auth');
const { digitalFileUploadLimiter, mediaUploadLimiter } = require('../middleware/uploadLimiters');
const {
  createRedisBackedRateLimiter,
  getIpRateLimitKey,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');
const {
  getProducts, getProductBySlug, getProductSuggestions, trackExternalClick,
  getMarketplacePersonalization, recordMarketplaceProductView,
  getDeliveryEstimate,
  createProduct, updateProduct, archiveProduct, getSellerProducts, getSellerProductById, uploadDigitalFile,
  retryBackgroundRemoval,
  addReview, replyToReview,
  toggleWishlist, getWishlist,
  getCart, addToCart, updateCartItem, removeFromCart, clearCart,
} = require('../controllers/productController');

const router  = express.Router();
const allowedProductImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedProductImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const marketplaceExternalClickLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.MARKETPLACE_EXTERNAL_CLICK_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.MARKETPLACE_EXTERNAL_CLICK_RATE_LIMIT_MAX, 30),
  prefix: 'marketplace-external-click',
  keyGenerator: getIpRateLimitKey,
  message: 'Too many marketplace click events. Please wait before trying again.',
});
const upload  = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4  * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    if (allowedProductImageExtensions.has(ext) && allowedProductImageMimeTypes.has(mime)) {
      return cb(null, true);
    }
    return cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
  }
});
const digitalUploadDir = path.resolve(
  process.env.DIGITAL_UPLOAD_TEMP_DIR || path.join(__dirname, '..', 'tmp', 'digital-temp')
);
fs.mkdirSync(digitalUploadDir, { recursive: true });

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const digitalFileMaxMb = parsePositiveInt(process.env.DIGITAL_FILE_UPLOAD_MAX_MB, 500);
const digitalFileMaxBytes = digitalFileMaxMb * 1024 * 1024;
const allowedDigitalExtensions = new Set(
  String(
    process.env.DIGITAL_UPLOAD_ALLOWED_EXTENSIONS ||
      'pdf,zip,epub,mp4,mov,mp3,wav,png,jpg,jpeg,webp,txt,doc,docx,ppt,pptx,xls,xlsx'
  )
    .split(',')
    .map((ext) => ext.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean)
);

const digitalStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, digitalUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const fileUp = multer({
  storage: digitalStorage,
  limits: { fileSize: digitalFileMaxBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').replace(/^\./, '').toLowerCase();
    if (allowedDigitalExtensions.has(ext)) return cb(null, true);
    return cb(new Error('This digital file type is not allowed'));
  },
});

const cleanupDigitalTempFile = async (filePath) => {
  if (!filePath) return;
  await fs.promises.unlink(filePath).catch(() => {});
};

const handleDigitalFileUpload = (req, res, next) => {
  fileUp.single('file')(req, res, async (error) => {
    if (!error) return next();

    await cleanupDigitalTempFile(req.file?.path);
    const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
    const isInvalidType = error.message === 'This digital file type is not allowed';
    return res.status(isTooLarge ? 413 : 400).json({
      success: false,
      message: isTooLarge
        ? `Digital file must be ${digitalFileMaxMb}MB or smaller.`
        : isInvalidType
          ? error.message
          : 'Invalid digital file upload.',
    });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: All static/specific routes MUST come BEFORE /:slug
// Express matches routes in order — /:slug will swallow /cart, /wishlist etc.
// ─────────────────────────────────────────────────────────────────────────────

// ── Public browse (no slug) ───────────────────────────────────────────────────
router.get('/', optionalAuth, getProducts);
router.get('/suggestions', optionalAuth, getProductSuggestions);
router.get('/personalization', protect, getMarketplacePersonalization);
router.post('/personalization/view', protect, recordMarketplaceProductView);

// ── Cart (static paths — MUST be before /:slug) ───────────────────────────────
router.get('/cart',               protect, getCart);
router.post('/cart/add',          protect, addToCart);
router.patch('/cart/update',      protect, updateCartItem);
router.delete('/cart/:productId', protect, removeFromCart);
router.delete('/cart',            protect, clearCart);

// ── Wishlist (static — MUST be before /:slug) ────────────────────────────────
router.get('/wishlist',      protect, getWishlist);
router.post('/wishlist/:id', protect, toggleWishlist);

// ── Seller product management (static — MUST be before /:slug) ───────────────
router.get('/seller/products',       sellerAuth, getSellerProducts);
router.post('/seller/products',      sellerAuth, mediaUploadLimiter, upload.array('images', 8), createProduct);
router.get('/seller/products/:id',   sellerAuth, getSellerProductById);
router.put('/seller/products/:id',   sellerAuth, mediaUploadLimiter, upload.array('images', 8), updateProduct);
router.delete('/seller/products/:id',sellerAuth, archiveProduct);
router.post('/seller/products/:id/upload-file', sellerAuth, digitalFileUploadLimiter, handleDigitalFileUpload, uploadDigitalFile);
router.post('/seller/products/:id/remove-background/retry', sellerAuth, retryBackgroundRemoval);

// ── Reviews (seller reply — static path before /:slug) ───────────────────────
router.post('/seller/reviews/:id/reply', sellerAuth, replyToReview);

// ── Dynamic single-product routes — AFTER all static routes ──────────────────
router.get('/:id/delivery-estimate', optionalAuth, getDeliveryEstimate);
router.get('/:slug',          optionalAuth, getProductBySlug);
router.post('/:id/click', marketplaceExternalClickLimiter, trackExternalClick);
router.post('/:id/reviews',   protect, mediaUploadLimiter, upload.array('images', 4), addReview);

module.exports = router;
