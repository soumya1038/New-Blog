const express = require('express');
const { adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const { getMetrics } = require('../middleware/monitoring');
const {
  getStats,
  getUsers,
  getAllBlogs,
  getAllShorts,
  deleteUser,
  suspendUser,
  deleteBlog,
  deleteShort,
  makeAdmin,
  makeCoAdmin,
  removeCoAdmin,
  toggleVerification,
  getGuestUsers
} = require('../controllers/adminController');

const router = express.Router();

// Health check endpoint (public)
router.get('/health', (req, res) => {
  const metrics = getMetrics();
  const isHealthy = metrics.database === 'connected' && metrics.memory < 450;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    ...metrics
  });
});

// System metrics (admin only)
router.get('/metrics', adminOrCoAdminAuth, (req, res) => {
  res.json({ success: true, metrics: getMetrics() });
});

// Read-only routes (admin or coAdmin)
router.get('/stats', adminOrCoAdminAuth, getStats);
router.get('/users', adminOrCoAdminAuth, getUsers);
router.get('/guests', adminOrCoAdminAuth, getGuestUsers);
router.get('/blogs', adminOrCoAdminAuth, getAllBlogs);
router.get('/shorts', adminOrCoAdminAuth, getAllShorts);

// Write routes (admin only)
router.delete('/users/:id', adminAuth, deleteUser);
router.put('/users/:id/suspend', adminAuth, suspendUser);
router.put('/users/:id/verify', adminAuth, toggleVerification);
router.put('/users/:id/make-admin', adminAuth, makeAdmin);
router.put('/users/:id/make-coadmin', adminAuth, makeCoAdmin);
router.put('/users/:id/remove-coadmin', adminAuth, removeCoAdmin);
router.delete('/blogs/:id', adminAuth, deleteBlog);
router.delete('/shorts/:id', adminAuth, deleteShort);

module.exports = router;
