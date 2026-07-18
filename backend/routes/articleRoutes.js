const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
const contentViewLimiter = require('../middleware/contentViewLimiter');
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
router.delete('/:id', protect, requireSensitiveActionToken('delete_article'), requireTwoFactorForAction('delete_article'), deleteArticle);
router.post('/:id/view', optionalAuth, contentViewLimiter, trackView);
router.post('/:id/like', protect, toggleLike);

module.exports = router;
