const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, sellerAuth, adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
const { mediaUploadLimiter } = require('../middleware/uploadLimiters');
const {
  applyAsSeller,
  getMyApplication,
  withdrawMyApplication,
  getStoreSettings,
  updateStoreSettings,
  getStoreByUsername,
  getSellerStats,
  getSellerApplications,
  reviewSellerApplication,
} = require('../controllers/sellerController');

const router = express.Router();
const requireAdminStepUp = (action) => [
  requireSensitiveActionToken(action),
  requireTwoFactorForAction(action),
];
const allowedBannerMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedBannerExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    if (allowedBannerExtensions.has(ext) && allowedBannerMimeTypes.has(mime)) {
      return cb(null, true);
    }
    return cb(new Error('Only JPG, PNG, or WEBP images are allowed for store banners'));
  }
});

router.post('/apply', protect, applyAsSeller);
router.get('/application/status', protect, getMyApplication);
router.patch('/application/withdraw', protect, withdrawMyApplication);

router.get('/store/settings', sellerAuth, getStoreSettings);
router.put('/store/settings', sellerAuth, mediaUploadLimiter, upload.single('banner'), updateStoreSettings);
router.get('/dashboard/stats', sellerAuth, getSellerStats);

router.get('/admin/seller-applications', adminOrCoAdminAuth, getSellerApplications);
router.put('/admin/seller-applications/:id/approve', adminAuth, ...requireAdminStepUp('admin_review_seller_application'), reviewSellerApplication);
router.put('/admin/seller-applications/:id/reject', adminAuth, ...requireAdminStepUp('admin_review_seller_application'), reviewSellerApplication);

router.get('/store/:username', getStoreByUsername);

module.exports = router;
