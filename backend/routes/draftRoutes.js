const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Blog = require('../models/Blog');
const Short = require('../models/Short');

// Get all drafts (blogs + shorts combined)
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = isAdmin ? { isDraft: true } : { author: req.user._id, isDraft: true };

    // Fetch blog drafts
    const blogDrafts = await Blog.find(filter)
      .populate('author', 'username profileImage').sort({ updatedAt: -1 });

    // Fetch short drafts
    const shortDrafts = await Short.find(filter)
      .populate('author', 'username profileImage').sort({ updatedAt: -1 });

    // Mark shorts with type
    const markedShorts = shortDrafts.map(short => ({
      ...short.toObject(),
      isShortBlog: true
    }));

    // Combine and sort
    const allDrafts = [...blogDrafts, ...markedShorts].sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    res.json({ success: true, drafts: allDrafts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
