const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  createArticle,
  getArticles,
  getArticle,
  getRelatedArticleContent,
  getAuthorArticleContent,
  updateArticle,
  deleteArticle,
  trackView,
  toggleLike
} = require('../controllers/articleController');

router.post('/', protect, createArticle);
router.get('/', optionalAuth, getArticles);
router.get('/:id/related', optionalAuth, getRelatedArticleContent);
router.get('/:id/author-content', optionalAuth, getAuthorArticleContent);
router.get('/:id', optionalAuth, getArticle);
router.put('/:id', protect, updateArticle);
router.delete('/:id', protect, deleteArticle);
router.post('/:id/view', trackView);
router.post('/:id/like', protect, toggleLike);

module.exports = router;
