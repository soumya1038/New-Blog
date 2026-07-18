const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
const contentViewLimiter = require('../middleware/contentViewLimiter');
const {
  createShort,
  getShorts,
  getShort,
  updateShort,
  deleteShort,
  trackView,
  toggleLike
} = require('../controllers/shortController');

router.post('/', protect, createShort);
router.get('/', optionalAuth, getShorts);
router.get('/:id', optionalAuth, getShort);
router.put('/:id', protect, updateShort);
router.delete('/:id', protect, requireSensitiveActionToken('delete_short'), requireTwoFactorForAction('delete_short'), deleteShort);
router.post('/:id/view', optionalAuth, contentViewLimiter, trackView);
router.post('/:id/like', protect, toggleLike);

module.exports = router;
