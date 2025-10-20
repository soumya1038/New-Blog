const express = require('express');
const { adminAuth, adminOrCoAdminAuth } = require('../middleware/auth');
const {
  getStats,
  getUsers,
  getAllBlogs,
  deleteUser,
  suspendUser,
  deleteBlog,
  makeAdmin,
  makeCoAdmin,
  removeCoAdmin
} = require('../controllers/adminController');

const router = express.Router();

// Read-only routes (admin or coAdmin)
router.get('/stats', adminOrCoAdminAuth, getStats);
router.get('/users', adminOrCoAdminAuth, getUsers);
router.get('/blogs', adminOrCoAdminAuth, getAllBlogs);

// Write routes (admin only)
router.delete('/users/:id', adminAuth, deleteUser);
router.put('/users/:id/suspend', adminAuth, suspendUser);
router.put('/users/:id/make-admin', adminAuth, makeAdmin);
router.put('/users/:id/make-coadmin', adminAuth, makeCoAdmin);
router.put('/users/:id/remove-coadmin', adminAuth, removeCoAdmin);
router.delete('/blogs/:id', adminAuth, deleteBlog);

module.exports = router;
