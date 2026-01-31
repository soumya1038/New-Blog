const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createArticle,
  getArticles,
  getArticle,
  updateArticle,
  deleteArticle,
  trackView,
  toggleLike
} = require('../controllers/articleController');

router.post('/', protect, createArticle);
router.get('/', getArticles);
router.get('/:id', getArticle);
router.put('/:id', protect, updateArticle);
router.delete('/:id', protect, deleteArticle);
router.post('/:id/view', trackView);
router.post('/:id/like', protect, toggleLike);

module.exports = router;
