const express = require('express');
const {
  generateBlog,
  generateBio,
  improveContent,
  generateTitles,
  generateTags,
  generateDescription,
  generateQuickChat,
  enhanceMessage
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/generate-blog', protect, generateBlog);
router.post('/generate-bio', protect, generateBio);
router.post('/generate-description', protect, generateDescription);
router.post('/improve-content', protect, improveContent);
router.post('/generate-titles', protect, generateTitles);
router.post('/generate-tags', protect, generateTags);
router.post('/quick-chat', protect, generateQuickChat);
router.post('/enhance-message', protect, enhanceMessage);

module.exports = router;
