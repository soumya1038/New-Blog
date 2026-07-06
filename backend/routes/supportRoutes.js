const express = require('express');
const rateLimit = require('express-rate-limit');
const { optionalAuth, protect, adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const {
  createSupportRequest,
  getMySupportRequests,
  getAdminSupportRequests,
  getAdminSupportMetrics,
  updateAdminSupportRequest,
} = require('../controllers/supportController');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many support requests were submitted. Please wait and try again.',
  },
});

router.post('/requests', submitLimiter, optionalAuth, createSupportRequest);
router.get('/requests/me', protect, getMySupportRequests);
router.get('/admin/metrics', adminOrCoAdminAuth, getAdminSupportMetrics);
router.get('/admin/requests', adminOrCoAdminAuth, getAdminSupportRequests);
router.patch('/admin/requests/:id', adminAuth, updateAdminSupportRequest);

module.exports = router;


