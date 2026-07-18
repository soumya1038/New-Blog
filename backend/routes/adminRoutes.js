const express = require('express');
const { adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const { getMetrics, getAlertThresholds } = require('../middleware/monitoring');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
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
const requireAdminStepUp = (action) => [
  requireSensitiveActionToken(action),
  requireTwoFactorForAction(action),
];

// Detailed health endpoint (admin only; public checks live at /health and /ready)
router.get('/health', adminOrCoAdminAuth, (req, res) => {
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
router.delete('/users/:id', adminAuth, ...requireAdminStepUp('admin_delete_user'), deleteUser);
router.put('/users/:id/suspend', adminAuth, ...requireAdminStepUp('admin_suspend_user'), suspendUser);
router.put('/users/:id/verify', adminAuth, ...requireAdminStepUp('admin_toggle_verification'), toggleVerification);
router.put('/users/:id/make-admin', adminAuth, ...requireAdminStepUp('admin_change_role'), makeAdmin);
router.put('/users/:id/make-coadmin', adminAuth, ...requireAdminStepUp('admin_change_role'), makeCoAdmin);
router.put('/users/:id/remove-coadmin', adminAuth, ...requireAdminStepUp('admin_change_role'), removeCoAdmin);
router.post('/users/:id/warn-email', adminAuth, ...requireAdminStepUp('admin_warn_user'), sendAccountWarningEmailNotice);
router.post('/users/:id/pre-deletion-email', adminAuth, ...requireAdminStepUp('admin_pre_delete_user'), sendPreDeletionWarningEmailNotice);
router.delete('/blogs/:id', adminAuth, ...requireAdminStepUp('admin_delete_content'), deleteBlog);
router.delete('/articles/:id', adminAuth, ...requireAdminStepUp('admin_delete_content'), deleteArticle);
router.delete('/shorts/:id', adminAuth, ...requireAdminStepUp('admin_delete_content'), deleteShort);

module.exports = router;
