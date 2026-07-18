const express = require('express');
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { apiKeyAuth } = require('../middleware/auth');
const { invalidateCacheByPrefixes } = require('../utils/cacheStore');
const { deleteCloudinaryPublicIds } = require('../utils/cloudinaryCleanup');
const { generateUniqueSlug, applySlugWithHistory } = require('../utils/slugUtils');
const { enqueueSearchIndexRefresh } = require('../jobs/queueService');
const { logWarn } = require('../utils/safeErrorLog');
const {
  createRedisBackedRateLimiter,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');

const router = express.Router();
const MAX_EXTERNAL_BLOG_LIMIT = 100;
const DEFAULT_EXTERNAL_BLOG_LIMIT = 20;
const MAX_EXTERNAL_BLOG_PAGE = 100;
const MAX_EXTERNAL_TITLE_LENGTH = 160;
const MAX_EXTERNAL_CONTENT_LENGTH = 50000;
const MAX_EXTERNAL_TAG_LENGTH = 60;
const EXTERNAL_API_QUERY_MAX_TIME_MS = Math.max(
  100,
  Number(process.env.EXTERNAL_API_QUERY_MAX_TIME_MS) || 5000
);

const BLOG_PUBLIC_SELECT = 'title content author tags category coverImage galleryImages videoUrls metaDescription slug createdAt updatedAt views readingTime wordCount';
const BLOG_PUBLIC_FILTER = { isDraft: false, isScheduled: false };

const externalApiWriteLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.EXTERNAL_API_WRITE_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.EXTERNAL_API_WRITE_RATE_LIMIT_MAX, 30),
  prefix: 'external-api-write',
  message: 'Too many external API write attempts. Please wait a moment and try again.',
  responseBuilder: ({ retryAfterSeconds }) => ({
    success: false,
    message: 'Too many external API write attempts. Please wait a moment and try again.',
    retryAfterSeconds,
  }),
});

const parseBoundedInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const parseTags = (tags) =>
  String(tags || '')
    .split(',')
    .map(tag => tag.trim())
    .map(tag => tag.slice(0, MAX_EXTERNAL_TAG_LENGTH))
    .filter(Boolean)
    .slice(0, 30);

const normalizeExternalText = (value, maxLength) =>
  String(value || '').trim().slice(0, maxLength);

const invalidateExternalBlogCaches = async () => {
  await invalidateCacheByPrefixes(['blogs:list:', 'blog:detail:', 'seo:sitemap', 'seo:feed']);
};

const triggerExternalBlogSearchRefresh = (reason) => {
  enqueueSearchIndexRefresh(`external-api:${reason}`).catch((error) => {
    logWarn('[search] Failed to enqueue external API blog refresh:', error);
  });
};

// GET all blogs
router.get('/blogs', async (req, res) => {
  try {
    const limit = parseBoundedInt(req.query.limit, DEFAULT_EXTERNAL_BLOG_LIMIT, MAX_EXTERNAL_BLOG_LIMIT);
    const page = parseBoundedInt(req.query.page, 1, MAX_EXTERNAL_BLOG_PAGE);
    const skip = (page - 1) * limit;

    const [blogs, total] = await Promise.all([
      Blog.find(BLOG_PUBLIC_FILTER)
        .populate('author', 'username')
        .select(BLOG_PUBLIC_SELECT)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(EXTERNAL_API_QUERY_MAX_TIME_MS)
        .lean(),
      Blog.countDocuments(BLOG_PUBLIC_FILTER).maxTimeMS(EXTERNAL_API_QUERY_MAX_TIME_MS)
    ]);

    res.json({
      success: true,
      count: blogs.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: skip + blogs.length < total
      },
      data: blogs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch blogs' });
  }
});

// GET single blog
router.get('/blogs/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog id' });
    }

    const blog = await Blog.findOne({ _id: req.params.id, ...BLOG_PUBLIC_FILTER })
      .populate('author', 'username')
      .select(BLOG_PUBLIC_SELECT)
      .maxTimeMS(EXTERNAL_API_QUERY_MAX_TIME_MS)
      .lean();

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch blog' });
  }
});

// POST create blog (requires API key)
router.post('/blogs', externalApiWriteLimiter, apiKeyAuth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const normalizedTitle = normalizeExternalText(title, MAX_EXTERNAL_TITLE_LENGTH);
    const normalizedContent = normalizeExternalText(content, MAX_EXTERNAL_CONTENT_LENGTH);

    if (!normalizedTitle || !normalizedContent) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }

    const tagArray = parseTags(tags);

    const blog = new Blog({
      title: normalizedTitle,
      content: normalizedContent,
      author: req.user._id,
      tags: tagArray
    });
    const nextSlug = await generateUniqueSlug({
      Model: Blog,
      title: normalizedTitle,
      preferredSlug: normalizedTitle,
      maxTimeMS: EXTERNAL_API_QUERY_MAX_TIME_MS,
    });
    applySlugWithHistory(blog, nextSlug);

    await blog.save();
    await invalidateExternalBlogCaches();
    triggerExternalBlogSearchRefresh('blog:create');
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create blog' });
  }
});

// PUT update blog (requires API key)
router.put('/blogs/:id', externalApiWriteLimiter, apiKeyAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog id' });
    }

    const blog = await Blog.findOne({ _id: req.params.id, author: req.user._id })
      .maxTimeMS(EXTERNAL_API_QUERY_MAX_TIME_MS);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const { title, content, tags } = req.body;
    const titleProvided = title !== undefined;
    const contentProvided = content !== undefined;
    const normalizedTitle = titleProvided ? normalizeExternalText(title, MAX_EXTERNAL_TITLE_LENGTH) : blog.title;
    const normalizedContent = contentProvided ? normalizeExternalText(content, MAX_EXTERNAL_CONTENT_LENGTH) : blog.content;
    const tagArray = tags !== undefined ? parseTags(tags) : blog.tags;

    if (!normalizedTitle || !normalizedContent) {
      return res.status(400).json({ success: false, message: 'Title and content cannot be empty' });
    }

    blog.title = normalizedTitle;
    blog.content = normalizedContent;
    blog.tags = tagArray;

    if (titleProvided) {
      const nextSlug = await generateUniqueSlug({
        Model: Blog,
        title: blog.title,
        preferredSlug: blog.title,
        excludeId: blog._id,
        maxTimeMS: EXTERNAL_API_QUERY_MAX_TIME_MS,
      });
      applySlugWithHistory(blog, nextSlug);
    }

    blog.updatedAt = Date.now();

    await blog.save();
    await invalidateExternalBlogCaches();
    triggerExternalBlogSearchRefresh('blog:update');

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update blog' });
  }
});

// DELETE blog (requires API key)
router.delete('/blogs/:id', externalApiWriteLimiter, apiKeyAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog id' });
    }

    const blog = await Blog.findOne({ _id: req.params.id, author: req.user._id })
      .select('cloudinaryPublicId galleryImagePublicIds')
      .maxTimeMS(EXTERNAL_API_QUERY_MAX_TIME_MS);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    await deleteCloudinaryPublicIds([
      blog.cloudinaryPublicId,
      ...(blog.galleryImagePublicIds || [])
    ]);
    await Comment.deleteMany({ blog: blog._id }).maxTimeMS(EXTERNAL_API_QUERY_MAX_TIME_MS);
    await Notification.deleteMany({ blog: blog._id }).maxTimeMS(EXTERNAL_API_QUERY_MAX_TIME_MS);
    await Blog.deleteOne({ _id: blog._id, author: req.user._id }).maxTimeMS(EXTERNAL_API_QUERY_MAX_TIME_MS);
    await invalidateExternalBlogCaches();
    triggerExternalBlogSearchRefresh('blog:delete');

    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete blog' });
  }
});

module.exports = router;
