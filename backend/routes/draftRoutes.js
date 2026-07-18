const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Article = require('../models/Article');
const { cleanupOldDraftBatch } = require('../utils/draftCleanup');
const { sendSafeServerError } = require('../utils/safeErrorLog');

const DRAFT_TTL_MS = 42 * 60 * 60 * 1000;
const DRAFT_LIST_DEFAULT_LIMIT = Math.max(1, Number(process.env.DRAFT_LIST_DEFAULT_LIMIT) || 50);
const DRAFT_LIST_MAX_LIMIT = Math.max(1, Number(process.env.DRAFT_LIST_MAX_LIMIT) || 100);
const DRAFT_CLEANUP_BATCH_LIMIT = Math.max(1, Number(process.env.DRAFT_CLEANUP_BATCH_LIMIT) || 25);
const DRAFT_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.DRAFT_QUERY_MAX_TIME_MS) || 5000);

const sendDraftServerError = (res, error) =>
  sendSafeServerError(res, '[draftRoutes] request failed:', error, 'Unable to process drafts request');

const parseBoundedInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(safeValue, max);
};

const getDraftFilter = (req) => {
  const isAdmin = req.user.role === 'admin';
  return isAdmin ? { isDraft: true } : { author: req.user._id, isDraft: true };
};

const getFreshDraftFilter = (filter) => ({
  ...filter,
  $or: [
    { isScheduled: true },
    { updatedAt: { $gte: new Date(Date.now() - DRAFT_TTL_MS) } },
  ],
});

// Get draft counts without mutating draft data.
router.get('/summary', protect, async (req, res) => {
  try {
    const filter = getFreshDraftFilter(getDraftFilter(req));
    const [blogs, shorts, articles] = await Promise.all([
      Blog.countDocuments(filter).maxTimeMS(DRAFT_QUERY_MAX_TIME_MS),
      Short.countDocuments(filter).maxTimeMS(DRAFT_QUERY_MAX_TIME_MS),
      Article.countDocuments(filter).maxTimeMS(DRAFT_QUERY_MAX_TIME_MS),
    ]);

    res.json({
      success: true,
      counts: { blogs, shorts, articles },
      total: blogs + shorts + articles,
    });
  } catch (error) {
    return sendDraftServerError(res, error);
  }
});

// Get all drafts (blogs + shorts + articles combined)
router.get('/', protect, async (req, res) => {
  try {
    const filter = getDraftFilter(req);
    const limit = parseBoundedInt(req.query.limit, DRAFT_LIST_DEFAULT_LIMIT, DRAFT_LIST_MAX_LIMIT);

    // Auto-delete old drafts (42 hours)
    const fortyTwoHoursAgo = new Date(Date.now() - DRAFT_TTL_MS);
    const oldFilter = { ...filter, isScheduled: false, updatedAt: { $lt: fortyTwoHoursAgo } };

    await Promise.all([
      cleanupOldDraftBatch({
        Model: Blog,
        commentField: 'blog',
        notificationField: 'blog',
        filter: oldFilter,
        limit: DRAFT_CLEANUP_BATCH_LIMIT,
        maxTimeMS: DRAFT_QUERY_MAX_TIME_MS
      }),
      cleanupOldDraftBatch({
        Model: Short,
        commentField: 'short',
        filter: oldFilter,
        limit: DRAFT_CLEANUP_BATCH_LIMIT,
        maxTimeMS: DRAFT_QUERY_MAX_TIME_MS
      }),
      cleanupOldDraftBatch({
        Model: Article,
        commentField: 'article',
        filter: oldFilter,
        limit: DRAFT_CLEANUP_BATCH_LIMIT,
        maxTimeMS: DRAFT_QUERY_MAX_TIME_MS
      })
    ]);

    // Fetch remaining drafts
    const blogDrafts = await Blog.find(filter)
      .populate('author', 'username profileImage')
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit)
      .maxTimeMS(DRAFT_QUERY_MAX_TIME_MS);

    const shortDrafts = await Short.find(filter)
      .populate('author', 'username profileImage')
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit)
      .maxTimeMS(DRAFT_QUERY_MAX_TIME_MS);

    const articleDrafts = await Article.find(filter)
      .populate('author', 'username profileImage')
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit)
      .maxTimeMS(DRAFT_QUERY_MAX_TIME_MS);

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
    ).slice(0, limit);

    res.json({
      success: true,
      drafts: allDrafts,
      pagination: {
        mode: 'limit',
        limit
      }
    });
  } catch (error) {
    return sendDraftServerError(res, error);
  }
});

module.exports = router;
