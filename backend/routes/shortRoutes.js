const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
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
router.get('/', getShorts);
router.get('/:id', getShort);
router.put('/:id', protect, updateShort);
router.delete('/:id', protect, deleteShort);
router.post('/:id/view', trackView);
router.post('/:id/like', protect, toggleLike);

module.exports = router;
