const express = require('express');
const multer  = require('multer');
const { protect, optionalAuth, sellerAuth } = require('../middleware/auth');
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
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4  * 1024 * 1024 } });
const fileUp  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

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
router.post('/seller/products',      upload.array('images', 8), sellerAuth, createProduct);
router.get('/seller/products/:id',   sellerAuth, getSellerProductById);
router.put('/seller/products/:id',   upload.array('images', 8), sellerAuth, updateProduct);
router.delete('/seller/products/:id',sellerAuth, archiveProduct);
router.post('/seller/products/:id/upload-file', fileUp.single('file'), sellerAuth, uploadDigitalFile);
router.post('/seller/products/:id/remove-background/retry', sellerAuth, retryBackgroundRemoval);

// ── Reviews (seller reply — static path before /:slug) ───────────────────────
router.post('/seller/reviews/:id/reply', sellerAuth, replyToReview);

// ── Dynamic single-product routes — AFTER all static routes ──────────────────
router.get('/:id/delivery-estimate', optionalAuth, getDeliveryEstimate);
router.get('/:slug',          optionalAuth, getProductBySlug);
router.post('/:id/click',                   trackExternalClick);
router.post('/:id/reviews',   protect,      upload.array('images', 4), addReview);

module.exports = router;
