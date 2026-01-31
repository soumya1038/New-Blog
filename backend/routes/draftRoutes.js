const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

// Get all drafts (blogs + shorts + articles combined)
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = isAdmin ? { isDraft: true } : { author: req.user._id, isDraft: true };

    // Auto-delete old drafts (42 hours)
    const fortyTwoHoursAgo = new Date(Date.now() - 42 * 60 * 60 * 1000);
    const oldFilter = { ...filter, isScheduled: false, updatedAt: { $lt: fortyTwoHoursAgo } };
    
    const oldBlogs = await Blog.find(oldFilter);
    const oldShorts = await Short.find(oldFilter);
    const oldArticles = await Article.find(oldFilter);
    
    for (const draft of [...oldBlogs, ...oldShorts, ...oldArticles]) {
      if (draft.cloudinaryPublicId) {
        const cloudinary = require('../utils/cloudinary');
        try {
          await cloudinary.uploader.destroy(draft.cloudinaryPublicId);
        } catch (err) {
          console.error('Cloudinary delete error:', err);
        }
      }
      await Comment.deleteMany({ blog: draft._id, short: draft._id, article: draft._id });
      await Notification.deleteMany({ blog: draft._id, short: draft._id, article: draft._id });
      await Blog.findByIdAndDelete(draft._id).catch(() => {});
      await Short.findByIdAndDelete(draft._id).catch(() => {});
      await Article.findByIdAndDelete(draft._id).catch(() => {});
    }

    // Fetch remaining drafts
    const blogDrafts = await Blog.find(filter)
      .populate('author', 'username profileImage').sort({ updatedAt: -1 });

    const shortDrafts = await Short.find(filter)
      .populate('author', 'username profileImage').sort({ updatedAt: -1 });

    const articleDrafts = await Article.find(filter)
      .populate('author', 'username profileImage').sort({ updatedAt: -1 });

    // Mark types
    const markedShorts = shortDrafts.map(short => ({
      ...short.toObject(),
      isShortBlog: true
    }));

    const markedArticles = articleDrafts.map(article => ({
      ...article.toObject(),
      isArticle: true
    }));

    // Combine and sort
    const allDrafts = [...blogDrafts, ...markedShorts, ...markedArticles].sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    res.json({ success: true, drafts: allDrafts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
