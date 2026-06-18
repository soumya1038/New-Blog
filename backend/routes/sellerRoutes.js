const express = require('express');
const multer = require('multer');
const { protect, sellerAuth, adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/apply', protect, applyAsSeller);
router.get('/application/status', protect, getMyApplication);
router.patch('/application/withdraw', protect, withdrawMyApplication);

router.get('/store/settings', sellerAuth, getStoreSettings);
router.put('/store/settings', upload.single('banner'), sellerAuth, updateStoreSettings);
router.get('/dashboard/stats', sellerAuth, getSellerStats);

router.get('/admin/seller-applications', adminOrCoAdminAuth, getSellerApplications);
router.put('/admin/seller-applications/:id/approve', adminAuth, reviewSellerApplication);
router.put('/admin/seller-applications/:id/reject', adminAuth, reviewSellerApplication);

router.get('/store/:username', getStoreByUsername);

module.exports = router;
