// ════════════════════════════════════════════════════════════════════
// sellerRoutes.js
// ════════════════════════════════════════════════════════════════════
const express = require('express');
const multer  = require('multer');
const { protect }     = require('../middleware/auth');
const { sellerAuth }  = require('../middleware/auth');
const { adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const {
  applyAsSeller, getMyApplication,
  getStoreSettings, updateStoreSettings, getStoreByUsername,
  getSellerStats,
  getSellerApplications, reviewSellerApplication,
} = require('../controllers/sellerController');

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/store/:username', getStoreByUsername);

// ── Authenticated user ────────────────────────────────────────────────────────
router.post('/apply',             protect, applyAsSeller);
router.get('/application/status', protect, getMyApplication);

// ── Seller only ───────────────────────────────────────────────────────────────
router.get('/store/settings',                sellerAuth, getStoreSettings);
router.put('/store/settings', upload.single('banner'), sellerAuth, updateStoreSettings);
router.get('/dashboard/stats',               sellerAuth, getSellerStats);

// ── Admin only ────────────────────────────────────────────────────────────────
router.get('/admin/seller-applications',                  adminOrCoAdminAuth, getSellerApplications);
router.put('/admin/seller-applications/:id/approve',      adminAuth,          reviewSellerApplication);
router.put('/admin/seller-applications/:id/reject',       adminAuth,          reviewSellerApplication);

module.exports = router;
