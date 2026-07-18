const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const { parsePositiveInt } = require('../utils/cacheStore');

const SUPPORTED_TYPES = new Set(['all', 'blogs', 'articles']);

const SEARCH_MIN_QUERY_LENGTH = parsePositiveInt(process.env.SEARCH_MIN_QUERY_LENGTH, 2);
const SEARCH_MAX_LIMIT = parsePositiveInt(process.env.SEARCH_MAX_LIMIT, 20);
const SEARCH_DEFAULT_LIMIT = Math.min(parsePositiveInt(process.env.SEARCH_DEFAULT_LIMIT, 10), SEARCH_MAX_LIMIT);
const SEARCH_MAX_PAGE = parsePositiveInt(process.env.SEARCH_MAX_PAGE, 50);
const SEARCH_MAX_QUERY_LENGTH = parsePositiveInt(process.env.SEARCH_MAX_QUERY_LENGTH, 120);
const SEARCH_MAX_FILTER_VALUE_LENGTH = parsePositiveInt(process.env.SEARCH_MAX_FILTER_VALUE_LENGTH, 80);
const SEARCH_MAX_TAG_FILTERS = parsePositiveInt(process.env.SEARCH_MAX_TAG_FILTERS, 10);
const SEARCH_QUERY_MAX_TIME_MS = parsePositiveInt(process.env.SEARCH_QUERY_MAX_TIME_MS, 5000);
const SEARCH_REGEX_FALLBACK_ENABLED =
  process.env.SEARCH_REGEX_FALLBACK_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

const SEARCH_PROJECTION = {
  title: 1,
  content: 1,
  metaDescription: 1,
  slug: 1,
  tags: 1,
  category: 1,
  coverImage: 1,
  createdAt: 1,
  updatedAt: 1,
  readingTime: 1,
  wordCount: 1,
  views: 1,
  author: 1,
  score: { $meta: 'textScore' }
};

const AUTHOR_SELECT = 'username profileImage isGuest role isVerified';

const toExcerpt = (value = '', max = 220) => {
  const compact = String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!compact) return '';
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 3).trim()}...`;
};

const normalizeType = (raw = 'all') => {
  const normalized = String(raw).toLowerCase().trim();
  return SUPPORTED_TYPES.has(normalized) ? normalized : 'all';
};

const parseLimit = (raw) => {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return SEARCH_DEFAULT_LIMIT;
  return Math.min(parsed, SEARCH_MAX_LIMIT);
};

const parsePage = (raw) => {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, SEARCH_MAX_PAGE);
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeFilterValue = (value = '') =>
  String(value || '').trim().slice(0, SEARCH_MAX_FILTER_VALUE_LENGTH);

const buildBaseFilters = (query = {}) => {
  const filter = { isDraft: false, isScheduled: false };

  if (query.category && String(query.category).toLowerCase() !== 'all') {
    const category = normalizeFilterValue(query.category);
    if (category) filter.category = category;
  }

  if (query.author && mongoose.Types.ObjectId.isValid(query.author)) {
    filter.author = query.author;
  }

  const tags = [];
  if (query.tag) tags.push(query.tag);
  if (query.tags) {
    String(query.tags)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => tags.push(value));
  }
  const normalizedTags = [...new Set(tags.map(normalizeFilterValue).filter(Boolean))]
    .slice(0, SEARCH_MAX_TAG_FILTERS);
  if (normalizedTags.length) {
    filter.tags = { $in: normalizedTags };
  }

  return filter;
};

const toSearchItem = (doc, contentType) => ({
  id: doc._id,
  type: contentType,
  title: doc.title || '',
  excerpt: doc.metaDescription || toExcerpt(doc.content || ''),
  score: typeof doc.score === 'number' ? Number(doc.score.toFixed(4)) : 0,
  slug: doc.slug || null,
  url: `/${contentType === 'blog' ? 'blog' : 'article'}/${doc.slug || doc._id}`,
  category: doc.category || 'General',
  tags: doc.tags || [],
  coverImage: doc.coverImage || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  readingTime: doc.readingTime || null,
  wordCount: doc.wordCount || null,
  views: doc.views || 0,
  author: doc.author
    ? {
        _id: doc.author._id,
        username: doc.author.username,
        profileImage: doc.author.profileImage || null,
        isGuest: doc.author.isGuest || false,
        role: doc.author.role || null,
        isVerified: doc.author.isVerified || false
      }
    : null
});

const rankByScoreAndRecency = (a, b) => {
  const scoreDiff = (b.score || 0) - (a.score || 0);
  if (scoreDiff !== 0) return scoreDiff;
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
};

const isMissingTextIndexError = (error) =>
  Boolean(error?.message && /text index required|need exactly one text index/i.test(error.message));

const modelTextSearch = async ({ Model, contentType, searchQuery, baseFilter, limit, skip = 0, topK = null }) => {
  const query = {
    ...baseFilter,
    $text: { $search: searchQuery }
  };

  const total = await Model.countDocuments(query).maxTimeMS(SEARCH_QUERY_MAX_TIME_MS);

  const cursor = Model.find(query, SEARCH_PROJECTION)
    .populate('author', AUTHOR_SELECT)
    .sort({ score: { $meta: 'textScore' }, createdAt: -1, _id: -1 })
    .maxTimeMS(SEARCH_QUERY_MAX_TIME_MS);

  if (typeof topK === 'number') {
    cursor.limit(topK);
  } else {
    cursor.skip(skip).limit(limit);
  }

  const docs = await cursor.lean();
  return {
    total,
    items: docs.map((doc) => toSearchItem(doc, contentType))
  };
};

const modelRegexFallback = async ({ Model, contentType, searchQuery, baseFilter, limit, skip = 0, topK = null }) => {
  const safeRegex = new RegExp(escapeRegExp(searchQuery), 'i');
  const query = {
    ...baseFilter,
    $or: [
      { title: safeRegex },
      { content: safeRegex },
      { metaDescription: safeRegex },
      { tags: safeRegex },
      { category: safeRegex }
    ]
  };

  const total = await Model.countDocuments(query).maxTimeMS(SEARCH_QUERY_MAX_TIME_MS);
  const docs = await Model.find(query)
    .populate('author', AUTHOR_SELECT)
    .sort({ createdAt: -1, _id: -1 })
    .limit(typeof topK === 'number' ? topK : skip + limit)
    .maxTimeMS(SEARCH_QUERY_MAX_TIME_MS)
    .lean();

  const scored = docs.map((doc) => {
    const title = String(doc.title || '');
    const meta = String(doc.metaDescription || '');
    const content = String(doc.content || '');
    const tags = Array.isArray(doc.tags) ? doc.tags.join(' ') : '';
    const category = String(doc.category || '');

    let score = 0;
    if (safeRegex.test(title)) score += 10;
    if (safeRegex.test(tags)) score += 6;
    if (safeRegex.test(meta)) score += 5;
    if (safeRegex.test(category)) score += 4;
    if (safeRegex.test(content)) score += 2;

    return { ...toSearchItem({ ...doc, score }, contentType), score };
  });

  scored.sort(rankByScoreAndRecency);
  const sliced = typeof topK === 'number' ? scored : scored.slice(skip, skip + limit);
  return { total, items: sliced };
};

const runModelSearch = async (config) => {
  try {
    return await modelTextSearch(config);
  } catch (error) {
    if (!isMissingTextIndexError(error)) {
      throw error;
    }
    if (!SEARCH_REGEX_FALLBACK_ENABLED) {
      const unavailable = new Error('Search index is unavailable');
      unavailable.statusCode = 503;
      throw unavailable;
    }
    return modelRegexFallback(config);
  }
};

exports.searchContent = async (req, res) => {
  try {
    const rawQuery = String(req.query.q || '').trim();
    if (rawQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Search query must be at least ${SEARCH_MIN_QUERY_LENGTH} characters.`
      });
    }
    if (rawQuery.length > SEARCH_MAX_QUERY_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Search query must be ${SEARCH_MAX_QUERY_LENGTH} characters or fewer.`
      });
    }

    const type = normalizeType(req.query.type);
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const skip = (page - 1) * limit;
    const baseFilter = buildBaseFilters(req.query);

    if (type === 'blogs') {
      const data = await runModelSearch({
        Model: Blog,
        contentType: 'blog',
        searchQuery: rawQuery,
        baseFilter,
        limit,
        skip
      });

      return res.json({
        success: true,
        query: rawQuery,
        type,
        provider: 'mongo_text_v1',
        pagination: {
          page,
          limit,
          total: data.total,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          hasMore: skip + data.items.length < data.total
        },
        results: data.items
      });
    }

    if (type === 'articles') {
      const data = await runModelSearch({
        Model: Article,
        contentType: 'article',
        searchQuery: rawQuery,
        baseFilter,
        limit,
        skip
      });

      return res.json({
        success: true,
        query: rawQuery,
        type,
        provider: 'mongo_text_v1',
        pagination: {
          page,
          limit,
          total: data.total,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          hasMore: skip + data.items.length < data.total
        },
        results: data.items
      });
    }

    const topK = page * limit;
    const [blogsData, articlesData] = await Promise.all([
      runModelSearch({
        Model: Blog,
        contentType: 'blog',
        searchQuery: rawQuery,
        baseFilter,
        limit,
        topK
      }),
      runModelSearch({
        Model: Article,
        contentType: 'article',
        searchQuery: rawQuery,
        baseFilter,
        limit,
        topK
      })
    ]);

    const merged = [...blogsData.items, ...articlesData.items].sort(rankByScoreAndRecency);
    const results = merged.slice(skip, skip + limit);
    const total = blogsData.total + articlesData.total;

    return res.json({
      success: true,
      query: rawQuery,
      type,
      provider: 'mongo_text_v1',
      counts: {
        blogs: blogsData.total,
        articles: articlesData.total
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: skip + results.length < total
      },
      results
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 503 ? 'Search is temporarily unavailable' : 'Search failed'
    });
  }
};
