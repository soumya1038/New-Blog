const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Blog = require('../models/Blog');
const Short = require('../models/Short');

// Get all drafts (blogs + shorts combined)
router.get('/', protect, async (req, res) => {
  try {
    // Fetch blog drafts
    const blogDrafts = await Blog.find({
      author: req.user._id,
      isDraft: true
    }).populate('author', 'username profileImage').sort({ updatedAt: -1 });

    // Fetch short drafts
    const shortDrafts = await Short.find({
      author: req.user._id,
      isDraft: true
    }).populate('author', 'username profileImage').sort({ updatedAt: -1 });

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
