const express = require('express');
const Blog = require('../models/Blog');
const { apiKeyAuth } = require('../middleware/auth');

const router = express.Router();

// GET all blogs
router.get('/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find({ isDraft: false })
      .populate('author', 'username')
      .select('-likes')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: blogs.length, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single blog
router.get('/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username');

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create blog (requires API key)
router.post('/blogs', apiKeyAuth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }

    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const blog = await Blog.create({
      title,
      content,
      author: req.user._id,
      tags: tagArray
    });

    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update blog (requires API key)
router.put('/blogs/:id', apiKeyAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this blog' });
    }

    const { title, content, tags } = req.body;
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : blog.tags;

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tagArray;
    blog.updatedAt = Date.now();

    await blog.save();

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE blog (requires API key)
router.delete('/blogs/:id', apiKeyAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this blog' });
    }

    await Blog.findByIdAndDelete(blog._id);

    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
