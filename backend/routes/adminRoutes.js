const express = require('express');
const { adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const { getMetrics, getAlertThresholds } = require('../middleware/monitoring');
const {
  getStats,
  getUsers,
  getAllBlogs,
  getAllArticles,
  getAllShorts,
  deleteUser,
  suspendUser,
  deleteBlog,
  deleteArticle,
  deleteShort,
  makeAdmin,
  makeCoAdmin,
  removeCoAdmin,
  toggleVerification,
  getGuestUsers,
  sendAccountWarningEmailNotice,
  sendPreDeletionWarningEmailNotice
} = require('../controllers/adminController');

const router = express.Router();

// Health check endpoint (public)
router.get('/health', (req, res) => {
  const metrics = getMetrics();
  const isHealthy = metrics.database === 'connected' && metrics.alerts?.status !== 'critical';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    ...metrics
  });
});

// System metrics (admin only)
router.get('/metrics', adminOrCoAdminAuth, (req, res) => {
  res.json({ success: true, metrics: getMetrics() });
});

// Alert thresholds and current status (admin only)
router.get('/metrics/alerts', adminOrCoAdminAuth, (req, res) => {
  const metrics = getMetrics();
  res.json({
    success: true,
    alerts: metrics.alerts,
    thresholds: getAlertThresholds(),
    generatedAt: new Date().toISOString()
  });
});

// Read-only routes (admin or coAdmin)
router.get('/stats', adminOrCoAdminAuth, getStats);
router.get('/users', adminOrCoAdminAuth, getUsers);
router.get('/guests', adminOrCoAdminAuth, getGuestUsers);
router.get('/blogs', adminOrCoAdminAuth, getAllBlogs);
router.get('/articles', adminOrCoAdminAuth, getAllArticles);
router.get('/shorts', adminOrCoAdminAuth, getAllShorts);

// Write routes (admin only)
router.delete('/users/:id', adminAuth, deleteUser);
router.put('/users/:id/suspend', adminAuth, suspendUser);
router.put('/users/:id/verify', adminAuth, toggleVerification);
router.put('/users/:id/make-admin', adminAuth, makeAdmin);
router.put('/users/:id/make-coadmin', adminAuth, makeCoAdmin);
router.put('/users/:id/remove-coadmin', adminAuth, removeCoAdmin);
router.post('/users/:id/warn-email', adminAuth, sendAccountWarningEmailNotice);
router.post('/users/:id/pre-deletion-email', adminAuth, sendPreDeletionWarningEmailNotice);
router.delete('/blogs/:id', adminAuth, deleteBlog);
router.delete('/articles/:id', adminAuth, deleteArticle);
router.delete('/shorts/:id', adminAuth, deleteShort);

module.exports = router;
