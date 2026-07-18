const Blog = require('../models/Blog');
const Article = require('../models/Article');
const Short = require('../models/Short');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');
const { generateUniqueSlug, applySlugWithHistory, resolveDocumentByIdOrSlug } = require('../utils/slugUtils');
const { parseLimit, shouldUseCursorPagination, decodeCursor, buildDescendingCursorFilter, extractNextCursor } = require('../utils/cursorPagination');
const { parsePositiveInt, createQueryCacheKey, getCache, setCache, invalidateCacheByPrefixes } = require('../utils/cacheStore');
const { enqueueSearchIndexRefresh, enqueueEmailJob } = require('../jobs/queueService');
const { isEmailNotificationEnabled } = require('../utils/emailPreferences');
const { cleanupOldDraftBatch } = require('../utils/draftCleanup');
const {
  normalizeAllowedPublicId,
  normalizeAllowedPublicIds
} = require('../utils/cloudinaryPublicIds');
const {
  deleteCloudinaryPublicIds: deleteCloudinaryPublicIdsBounded
} = require('../utils/cloudinaryCleanup');
const { normalizeHttpUrl } = require('../utils/safeUrls');
const { logError, logWarn, sendSafeServerError } = require('../utils/safeErrorLog');
const { trackPublishedContentView } = require('../utils/contentViewTracking');
const {
  getFollowerCount,
  resolveContentAuthorRelationships,
} = require('../utils/contentAuthorRelationships');
const {
  canViewerSeeStatus,
  filterVisibleStatusesForViewer,
  getViewerRelationshipToTarget,
  hasUserId,
  sanitizeStatusesForViewer,
} = require('../utils/userVisibility');

const sendBlogServerError = (res, error) =>
  sendSafeServerError(res, '[blogController] request failed:', error, 'Unable to process blog request');

const BLOG_LIST_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_BLOG_LIST_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_LIST_SECONDS, 180)
);

const BLOG_DETAIL_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_BLOG_DETAIL_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_DETAIL_SECONDS, 300)
);
const BLOG_QUERY_MAX_TIME_MS = Math.max(
  100,
  Number(process.env.BLOG_QUERY_MAX_TIME_MS) || 5000
);

const invalidateBlogReadCache = async () => {
  await invalidateCacheByPrefixes(['blogs:list:', 'blog:detail:']);
};

const invalidateBlogPublishCache = async () => {
  await invalidateCacheByPrefixes(['blogs:list:', 'blog:detail:', 'seo:sitemap', 'seo:feed']);
};

const getCommentCountMap = async (field, docs = []) => {
  const ids = docs.map((doc) => doc?._id).filter(Boolean);
  if (!ids.length) return new Map();

  const counts = await Comment.aggregate([
    { $match: { [field]: { $in: ids } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]).option({ maxTimeMS: BLOG_QUERY_MAX_TIME_MS });

  return new Map(counts.map((entry) => [String(entry._id), entry.count]));
};

const serializeMixedRelatedItems = async ({
  articles = [],
  blogs = [],
  shorts = [],
  currentCategory,
  relatedCategories,
  currentTags,
}) => {
  const [articleCounts, blogCounts, shortCounts] = await Promise.all([
    getCommentCountMap('article', articles),
    getCommentCountMap('blog', blogs),
    getCommentCountMap('short', shorts),
  ]);

  return [
    ...articles.map((item) => serializeRelatedItem({
      item,
      type: 'article',
      commentCount: articleCounts.get(String(item._id)) || 0,
      currentCategory,
      relatedCategories,
      currentTags,
    })),
    ...blogs.map((item) => serializeRelatedItem({
      item,
      type: 'blog',
      commentCount: blogCounts.get(String(item._id)) || 0,
      currentCategory,
      relatedCategories,
      currentTags,
    })),
    ...shorts.map((item) => serializeRelatedItem({
      item,
      type: 'short',
      commentCount: shortCounts.get(String(item._id)) || 0,
      currentCategory,
      relatedCategories,
      currentTags,
    })),
  ];
};

const triggerSearchIndexRefresh = (reason) => {
  enqueueSearchIndexRefresh(reason).catch((error) => {
    logWarn('[search] Failed to enqueue search index refresh:', error);
  });
};

const RELATED_CATEGORY_MAP = {
  lifestyle: ['health', 'food', 'travel', 'culture', 'education', 'technology', 'finance'],
  technology: ['education', 'business', 'finance', 'science', 'lifestyle'],
  food: ['lifestyle', 'health', 'travel', 'culture'],
  health: ['lifestyle', 'food', 'fitness', 'education'],
  education: ['technology', 'science', 'career', 'finance', 'lifestyle'],
  finance: ['business', 'technology', 'education', 'lifestyle'],
  travel: ['lifestyle', 'food', 'culture', 'photography'],
  culture: ['lifestyle', 'travel', 'food', 'education'],
  science: ['technology', 'education', 'health'],
  business: ['finance', 'technology', 'education'],
};

const normalizeCategoryName = (value = '') => String(value || '').trim().toLowerCase();

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRelatedCategories = (category = '') => {
  const normalized = normalizeCategoryName(category);
  const related = RELATED_CATEGORY_MAP[normalized] || [];
  return [normalized, ...related].filter(Boolean);
};

const createCategoryRegexes = (categories = []) =>
  categories.map((category) => new RegExp(`^${escapeRegex(category)}$`, 'i'));

const getLikeCount = (item) => (Array.isArray(item.likes) ? item.likes.length : Number(item.likeCount || 0));

const scoreRelatedContent = ({ item, commentCount, categoryPriority, tagOverlap }) =>
  (Number(item.views || 0) * 1.2)
  + (getLikeCount(item) * 4)
  + (Number(commentCount || 0) * 5)
  + (categoryPriority * 120)
  + (tagOverlap * 18);

const serializeRelatedItem = ({ item, type, commentCount, currentCategory, relatedCategories, currentTags }) => {
  const normalizedCategory = normalizeCategoryName(item.category);
  const categoryPriority = normalizedCategory === currentCategory ? 2 : relatedCategories.includes(normalizedCategory) ? 1 : 0;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const tagOverlap = tags.filter((tag) => currentTags.has(String(tag || '').trim().toLowerCase())).length;
  const itemObj = item.toObject ? item.toObject() : item;

  return {
    ...itemObj,
    contentType: type,
    likeCount: getLikeCount(itemObj),
    commentCount,
    popularityScore: scoreRelatedContent({ item: itemObj, commentCount, categoryPriority, tagOverlap }),
  };
};

const getRelatedItemKey = (item) => `${item.contentType}:${item._id}`;

const compareRelatedContent = (a, b) => {
  if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore;
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
};

const selectWithRequiredContentType = (items, limit, requiredType = 'blog') => {
  const selected = items.slice(0, limit);
  if (selected.some((item) => item.contentType === requiredType)) return selected;

  const requiredCandidate = items.find((item) => item.contentType === requiredType);
  if (!requiredCandidate) return selected;

  const requiredKey = getRelatedItemKey(requiredCandidate);
  const next = selected.filter((item) => getRelatedItemKey(item) !== requiredKey);
  if (next.length >= limit) next.pop();
  next.push(requiredCandidate);
  return next.sort(compareRelatedContent);
};

const parseArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return [value];
};

const normalizeStringArray = (value) =>
  parseArrayField(value)
    .map(item => String(item || '').trim())
    .filter(Boolean);

const deleteCloudinaryPublicIds = async (publicIds = []) => {
  const ids = normalizeStringArray(publicIds);
  if (!ids.length) return;
  await deleteCloudinaryPublicIdsBounded(ids);
};

const normalizeProductLinks = (body) => {
  const ids = [];
  const addId = (value) => {
    const id = typeof value === 'object' && value !== null ? (value._id || value.id) : value;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return;
    const normalized = id.toString();
    if (!ids.includes(normalized)) ids.push(normalized);
  };

  addId(body.linkedProduct);
  parseArrayField(body.linkedProducts).forEach(addId);

  const externalProductLinks = parseArrayField(body.externalProductLinks)
    .filter(link => link && typeof link === 'object')
    .map(link => {
      const url = normalizeHttpUrl(link.url);
      const thumbnail = normalizeHttpUrl(link.thumbnail, { maxLength: 1000 });
      const originalThumbnail = normalizeHttpUrl(link.originalThumbnail, { maxLength: 1000 });
      return {
        title: String(link.title || '').trim(),
        url,
        platform: String(link.platform || 'External').trim() || 'External',
        thumbnail,
        thumbnailPublicId: String(link.thumbnailPublicId || '').trim(),
        originalThumbnail,
        originalThumbnailPublicId: String(link.originalThumbnailPublicId || '').trim(),
        backgroundRemovalStatus: String(link.backgroundRemovalStatus || '').trim(),
        priceLabel: String(link.priceLabel || '').trim(),
      };
    })
    .filter(link => link.title && link.url);

  return {
    linkedProduct: ids[0] || null,
    linkedProducts: ids,
    externalProductLinks,
    isPromoPost: ids.length > 0 || externalProductLinks.length > 0,
  };
};

// Create blog
exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      tags,
      isDraft,
      category,
      coverImage,
      cloudinaryPublicId,
      galleryImages,
      galleryImagePublicIds,
      metaDescription,
      slug,
      isScheduled,
      scheduledPublishDate,
      videoUrls
    } = req.body;
    const productLinks = normalizeProductLinks(req.body);

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }

    // Validate scheduled date
    if (isScheduled && scheduledPublishDate) {
      const scheduleDate = new Date(scheduledPublishDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
      }
    }

    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    const videoUrlsArray = videoUrls ? (Array.isArray(videoUrls) ? videoUrls : JSON.parse(videoUrls)).filter(url => url.trim()) : [];
    const galleryImagesArray = normalizeStringArray(galleryImages);
    const galleryImagePublicIdsArray = normalizeStringArray(galleryImagePublicIds);
    const coverPublicIdResult = normalizeAllowedPublicId(cloudinaryPublicId, req.user._id);
    const galleryPublicIdsResult = normalizeAllowedPublicIds(galleryImagePublicIdsArray, req.user._id);

    if (coverPublicIdResult.error || galleryPublicIdsResult.error) {
      return res.status(400).json({ success: false, message: 'Invalid image ownership' });
    }

    // If publishing (not draft and not scheduled), delete any existing draft with same title
    if (!isDraft && !isScheduled) {
      const existingDraft = await Blog.findOne({ 
        title, 
        author: req.user._id, 
        isDraft: true
      });
      
      if (existingDraft) {
        // Delete draft's image from Cloudinary if exists
        if (existingDraft.cloudinaryPublicId) {
          const cloudinary = require('../utils/cloudinary');
          try {
            await cloudinary.uploader.destroy(existingDraft.cloudinaryPublicId);
          } catch (err) {
            logError('Cloudinary delete error:', err);
          }
        }
        await deleteCloudinaryPublicIds(existingDraft.galleryImagePublicIds);
        await Blog.findByIdAndDelete(existingDraft._id);
      }
    }

    const generatedSlug = await generateUniqueSlug({
      Model: Blog,
      title,
      preferredSlug: slug
    });

    const blog = await Blog.create({
      title,
      content,
      author: req.user._id,
      tags: tagArray,
      category: category || 'General',
      coverImage: coverImage || null,
      cloudinaryPublicId: coverPublicIdResult.publicId || null,
      galleryImages: galleryImagesArray,
      galleryImagePublicIds: galleryPublicIdsResult.publicIds,
      videoUrls: videoUrlsArray,
      metaDescription: metaDescription || null,
      slug: generatedSlug,
      slugHistory: [],
      linkedProduct: productLinks.linkedProduct,
      linkedProducts: productLinks.linkedProducts,
      externalProductLinks: productLinks.externalProductLinks,
      isPromoPost: productLinks.isPromoPost,
      isDraft: isScheduled ? true : (isDraft || false),
      isScheduled: isScheduled || false,
      scheduledPublishDate: isScheduled ? scheduledPublishDate : null
    });

    const populatedBlog = await Blog.findById(blog._id)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('linkedProduct', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .populate('linkedProducts', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount');
    await invalidateBlogPublishCache();
    triggerSearchIndexRefresh('blog:create');

    const isPublishedNow = !blog.isDraft && !blog.isScheduled;
    if (isPublishedNow && req.user?.email) {
      enqueueEmailJob(
        'content-published',
        {
          email: req.user.email,
          username: req.user.username,
          contentType: 'blog',
          postTitle: blog.title,
          postUrl: `/blog/${blog.slug || blog._id}`
        },
        { jobId: `content-published:blog:${blog._id}` }
      ).catch((error) => {
        logError('Failed to queue blog published email:', error);
      });
    }

    res.status(201).json({ success: true, blog: populatedBlog });
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};

// Get all blogs
exports.getBlogs = async (req, res) => {
  try {
    const { author, tag, draft, cursor } = req.query;
    const useCursor = shouldUseCursorPagination(req.query);
    const limit = parseLimit(req.query.limit);
    const filter = {};
    const canUseListCache = draft !== 'true';
    const viewerId = String(req.user?._id || 'anon');
    if (author && !mongoose.Types.ObjectId.isValid(author)) {
      return res.status(400).json({ success: false, message: 'Invalid author id' });
    }

    const listCacheKey = `blogs:list:${createQueryCacheKey({
      author,
      tag,
      draft,
      cursor,
      limit,
      viewer: viewerId,
      visibility: 'block-aware-v1',
      published: 'scheduled-aware-v1',
      mode: useCursor ? 'cursor' : 'limit'
    })}`;

    if (canUseListCache) {
      const cachedPayload = await getCache(listCacheKey);
      if (cachedPayload) {
        return res.json(cachedPayload);
      }
    }

    if (author) filter.author = author;
    if (tag) filter.tags = tag;
    if (draft !== undefined) {
      filter.isDraft = draft === 'true';
      if (draft !== 'true') filter.isScheduled = false;
      // Only show own drafts if user is authenticated
      if (req.user) {
        filter.author = req.user._id;
        
        const fortyTwoHoursAgo = new Date(Date.now() - 42 * 60 * 60 * 1000);
        await cleanupOldDraftBatch({
          Model: Blog,
          commentField: 'blog',
          notificationField: 'blog',
          filter: {
            author: req.user._id,
            isDraft: true,
            isScheduled: false,
            updatedAt: { $lt: fortyTwoHoursAgo }
          }
        });
      } else {
        return res.status(401).json({ success: false, message: 'Authentication required for drafts' });
      }
    } else {
      filter.isDraft = false; // Default: only published blogs
      filter.isScheduled = false;
    }

    if (useCursor) {
      if (cursor) {
        const decodedCursor = decodeCursor(cursor);
        if (!decodedCursor) {
          return res.status(400).json({ success: false, message: 'Invalid cursor token' });
        }
        const cursorFilter = buildDescendingCursorFilter(decodedCursor);
        if (cursorFilter) {
          filter.$or = cursorFilter.$or;
        }
      }
    }

    const query = Blog.find(filter)
      .populate({
        path: 'author',
        select: 'username profileImage isGuest role isVerified statuses.audience statuses.expiresAt',
        options: { maxTimeMS: BLOG_QUERY_MAX_TIME_MS },
      })
      .populate({
        path: 'linkedProduct',
        select: 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount',
        options: { maxTimeMS: BLOG_QUERY_MAX_TIME_MS },
      })
      .populate({
        path: 'linkedProducts',
        select: 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount',
        options: { maxTimeMS: BLOG_QUERY_MAX_TIME_MS },
      })
      .sort({ createdAt: -1, _id: -1 });

    query.limit(useCursor ? limit + 1 : limit).maxTimeMS(BLOG_QUERY_MAX_TIME_MS);

    const blogs = await query;
    const { pageItems: pagedBlogs, hasMore, nextCursor } = useCursor
      ? extractNextCursor(blogs, limit)
      : { pageItems: blogs, hasMore: false, nextCursor: null };

    const authorRelationships = await resolveContentAuthorRelationships({
      viewer: req.user,
      authorIds: pagedBlogs.map((blog) => blog.author?._id),
      maxTimeMS: BLOG_QUERY_MAX_TIME_MS,
    });

    // Add commentCount and audience-aware hasActiveStatus to each blog
    const commentCountMap = await getCommentCountMap('blog', pagedBlogs);
    const blogsWithStatus = pagedBlogs.map((blog) => {
      const blogObj = blog.toObject();
      blogObj.commentCount = commentCountMap.get(String(blog._id)) || 0;
      if (blogObj.author && blogObj.author.statuses) {
        const relationship = authorRelationships.get(String(blogObj.author._id || '')) || {};
        blogObj.author.hasActiveStatus = blogObj.author.statuses.some((status) =>
          canViewerSeeStatus(status, relationship)
        );
        delete blogObj.author.statuses;
      }
      return blogObj;
    });

    const payload = {
      success: true,
      blogs: blogsWithStatus,
      ...(useCursor
        ? {
            pagination: {
              mode: 'cursor',
              limit,
              hasMore,
              nextCursor
            }
          }
        : {})
    };

    if (canUseListCache) {
      await setCache(listCacheKey, payload, BLOG_LIST_CACHE_TTL_SECONDS);
    }

    res.json(payload);
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};

// Get single blog
exports.getBlog = async (req, res) => {
  try {
    const viewerId = String(req.user?._id || 'anon');
    const detailCacheKey = `blog:detail:v6:${req.params.id}:viewer:${viewerId}`;

    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id, {
      maxTimeMS: BLOG_QUERY_MAX_TIME_MS,
      populate: [
        { path: 'author', select: 'username profileImage fullName bio isGuest role isVerified statuses', options: { maxTimeMS: BLOG_QUERY_MAX_TIME_MS } },
        { path: 'likes', select: 'username profileImage', options: { maxTimeMS: BLOG_QUERY_MAX_TIME_MS } },
        { path: 'linkedProduct', select: 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount', options: { maxTimeMS: BLOG_QUERY_MAX_TIME_MS } },
        { path: 'linkedProducts', select: 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount', options: { maxTimeMS: BLOG_QUERY_MAX_TIME_MS } }
      ]
    });

    const blog = resolved.doc;

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const authorIdForStats = blog.author?._id || blog.author;
    const isPublished = !blog.isDraft && !blog.isScheduled;
    const isOwner = req.user && String(authorIdForStats) === String(req.user._id);
    if (!isPublished && !isOwner) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (isPublished) {
      const cachedPayload = await getCache(detailCacheKey);
      if (cachedPayload) {
        return res.json(cachedPayload);
      }
    }

    const [commentCount, authorArticleCount, authorBlogCount, authorFollowerCount, authorRelationships] = await Promise.all([
      Comment.countDocuments({ blog: blog._id }).maxTimeMS(BLOG_QUERY_MAX_TIME_MS),
      authorIdForStats
        ? Article.countDocuments({ author: authorIdForStats, isDraft: false, isScheduled: false })
          .maxTimeMS(BLOG_QUERY_MAX_TIME_MS)
        : 0,
      authorIdForStats
        ? Blog.countDocuments({ author: authorIdForStats, isDraft: false, isScheduled: false })
          .maxTimeMS(BLOG_QUERY_MAX_TIME_MS)
        : 0,
      getFollowerCount(authorIdForStats, BLOG_QUERY_MAX_TIME_MS),
      resolveContentAuthorRelationships({
        viewer: req.user,
        authorIds: authorIdForStats ? [authorIdForStats] : [],
        maxTimeMS: BLOG_QUERY_MAX_TIME_MS,
      }),
    ]);

    const blogObj = blog.toObject();
    // Add audience-aware hasActiveStatus and visible statuses for viewing
    const authorRelationship = blogObj.author
      ? authorRelationships.get(String(blogObj.author._id || '')) || {}
      : {};
    let authorIsFollowing = Boolean(authorRelationship.isFollower);

    if (blogObj.author && blogObj.author.statuses) {
      const visibleStatuses = filterVisibleStatusesForViewer(blogObj.author.statuses, authorRelationship);
      blogObj.author.hasActiveStatus = visibleStatuses.length > 0;
      blogObj.author.statuses = sanitizeStatusesForViewer(visibleStatuses, authorRelationship);
    }

    if (blogObj.author) {
      blogObj.author.followerCount = authorFollowerCount;
      blogObj.author.articleCount = authorArticleCount;
      blogObj.author.articlesCount = authorArticleCount;
      blogObj.author.blogCount = authorBlogCount;
      blogObj.author.blogsCount = authorBlogCount;
      blogObj.author.postsCount = authorArticleCount + authorBlogCount;
      blogObj.author.isFollowing = viewerId !== 'anon' && authorIsFollowing;
    }

    const payload = {
      success: true,
      blog: {
        ...blogObj,
        likeCount: blog.likes.length,
        commentCount
      },
      redirect: {
        shouldRedirect: resolved.resolution === 'legacy_slug',
        to: `/blog/${blog.slug || blog._id}`
      }
    };

    if (isPublished) {
      await setCache(detailCacheKey, payload, BLOG_DETAIL_CACHE_TTL_SECONDS);
    }

    res.json(payload);
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};

exports.getRelatedBlogContent = async (req, res) => {
  try {
    const limit = Math.max(4, Math.min(Number(req.query.limit) || 10, 16));
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;

    if (!blog || blog.isDraft || blog.isScheduled) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const currentCategory = normalizeCategoryName(blog.category || 'General');
    const relatedCategories = buildRelatedCategories(blog.category || 'General');
    const categoryRegexes = createCategoryRegexes(relatedCategories);
    const currentTags = new Set((Array.isArray(blog.tags) ? blog.tags : [])
      .map((tag) => String(tag || '').trim().toLowerCase())
      .filter(Boolean));
    const currentAuthorId = blog.author?._id || blog.author;
    const seen = new Set([`blog:${blog._id}`]);
    const categoryFilter = categoryRegexes.length ? { category: { $in: categoryRegexes } } : {};
    const differentAuthorFilter = currentAuthorId ? { author: { $ne: currentAuthorId } } : {};

    const [articles, blogs, shorts] = await Promise.all([
      Article.find({ isDraft: false, isScheduled: false, ...differentAuthorFilter, ...categoryFilter })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Blog.find({ _id: { $ne: blog._id }, isDraft: false, isScheduled: false, ...differentAuthorFilter, ...categoryFilter })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Short.find({ isDraft: false, isScheduled: false, ...differentAuthorFilter, ...categoryFilter })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
    ]);

    const relatedWithScores = await serializeMixedRelatedItems({
      articles,
      blogs,
      shorts,
      currentCategory,
      relatedCategories,
      currentTags,
    });

    const ranked = relatedWithScores
      .filter((item) => {
        const key = getRelatedItemKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(compareRelatedContent);

    if (ranked.length < limit) {
      const fallbackLimit = (limit - ranked.length) * 2;
      const [fallbackArticles, fallbackBlogs, fallbackShorts] = await Promise.all([
        Article.find({ isDraft: false, isScheduled: false, ...differentAuthorFilter })
          .populate('author', 'fullName username profileImage isGuest role isVerified')
          .sort({ views: -1, createdAt: -1 })
          .limit(fallbackLimit),
        Blog.find({ _id: { $ne: blog._id }, isDraft: false, isScheduled: false, ...differentAuthorFilter })
          .populate('author', 'fullName username profileImage isGuest role isVerified')
          .sort({ views: -1, createdAt: -1 })
          .limit(fallbackLimit),
        Short.find({ isDraft: false, isScheduled: false, ...differentAuthorFilter })
          .populate('author', 'fullName username profileImage isGuest role isVerified')
          .sort({ views: -1, createdAt: -1 })
          .limit(fallbackLimit),
      ]);

      const fallbackItems = await serializeMixedRelatedItems({
        articles: fallbackArticles,
        blogs: fallbackBlogs,
        shorts: fallbackShorts,
        currentCategory,
        relatedCategories,
        currentTags,
      });

      fallbackItems
        .sort(compareRelatedContent)
        .forEach((item) => {
          const key = getRelatedItemKey(item);
          if (!seen.has(key)) {
            seen.add(key);
            ranked.push(item);
          }
        });
    }

    res.json({
      success: true,
      related: selectWithRequiredContentType(ranked, limit, 'blog'),
      category: blog.category || 'General',
      relatedCategories,
    });
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};

exports.getAuthorBlogContent = async (req, res) => {
  try {
    const limit = Math.max(4, Math.min(Number(req.query.limit) || 10, 16));
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;

    if (!blog || blog.isDraft || blog.isScheduled) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const authorId = blog.author?._id || blog.author;
    if (!authorId) {
      return res.json({ success: true, authorContent: [] });
    }

    const currentCategory = normalizeCategoryName(blog.category || 'General');
    const currentTags = new Set((Array.isArray(blog.tags) ? blog.tags : [])
      .map((tag) => String(tag || '').trim().toLowerCase())
      .filter(Boolean));

    const [articles, blogs, shorts] = await Promise.all([
      Article.find({ author: authorId, isDraft: false, isScheduled: false })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Blog.find({ _id: { $ne: blog._id }, author: authorId, isDraft: false, isScheduled: false })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Short.find({ author: authorId, isDraft: false, isScheduled: false })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
    ]);

    const authorItems = await serializeMixedRelatedItems({
      articles,
      blogs,
      shorts,
      currentCategory,
      relatedCategories: [currentCategory],
      currentTags,
    });

    const seen = new Set();
    const ranked = authorItems
      .filter((item) => {
        const key = getRelatedItemKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(compareRelatedContent);

    res.json({
      success: true,
      authorContent: selectWithRequiredContentType(ranked, limit, 'blog'),
      author: authorId,
    });
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const {
      title,
      content,
      tags,
      isDraft,
      category,
      coverImage,
      cloudinaryPublicId,
      galleryImages,
      galleryImagePublicIds,
      metaDescription,
      slug,
      isScheduled,
      scheduledPublishDate,
      videoUrls
    } = req.body;
    const hasProductLinkInput = ['linkedProduct', 'linkedProducts', 'externalProductLinks', 'isPromoPost']
      .some(key => Object.prototype.hasOwnProperty.call(req.body, key));
    const productLinks = hasProductLinkInput ? normalizeProductLinks(req.body) : null;
    
    // Validate scheduled date
    if (isScheduled && scheduledPublishDate) {
      const scheduleDate = new Date(scheduledPublishDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
      }
    }
    
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : blog.tags;
    const videoUrlsArray = videoUrls !== undefined ? (Array.isArray(videoUrls) ? videoUrls : JSON.parse(videoUrls)).filter(url => url.trim()) : blog.videoUrls;
    const galleryImagesArray = galleryImages !== undefined ? normalizeStringArray(galleryImages) : blog.galleryImages;
    const galleryImagePublicIdsArray = galleryImagePublicIds !== undefined
      ? normalizeStringArray(galleryImagePublicIds)
      : blog.galleryImagePublicIds;
    const coverPublicIdResult = cloudinaryPublicId !== undefined
      ? normalizeAllowedPublicId(cloudinaryPublicId, req.user._id, [blog.cloudinaryPublicId])
      : { publicId: blog.cloudinaryPublicId };
    const galleryPublicIdsResult = galleryImagePublicIds !== undefined
      ? normalizeAllowedPublicIds(galleryImagePublicIdsArray, req.user._id, blog.galleryImagePublicIds || [])
      : { publicIds: blog.galleryImagePublicIds };

    if (coverPublicIdResult.error || galleryPublicIdsResult.error) {
      return res.status(400).json({ success: false, message: 'Invalid image ownership' });
    }

    const publishingFromDraft =
      (blog.isDraft || blog.isScheduled) && isDraft === false && !isScheduled;

    // If changing from draft/scheduled to published, delete any other draft with same title
    if (publishingFromDraft) {
      const otherDraft = await Blog.findOne({ 
        title: title || blog.title, 
        author: req.user._id, 
        isDraft: true,
        _id: { $ne: blog._id }
      });
      
      if (otherDraft) {
        if (otherDraft.cloudinaryPublicId) {
          const cloudinary = require('../utils/cloudinary');
          try {
            await cloudinary.uploader.destroy(otherDraft.cloudinaryPublicId);
          } catch (err) {
            logError('Cloudinary delete error:', err);
          }
        }
        await deleteCloudinaryPublicIds(otherDraft.galleryImagePublicIds);
        await Blog.findByIdAndDelete(otherDraft._id);
      }
    }

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tagArray;
    blog.category = category || blog.category;
    blog.coverImage = coverImage !== undefined ? coverImage : blog.coverImage;
    blog.cloudinaryPublicId = coverPublicIdResult.publicId || null;
    blog.galleryImages = galleryImagesArray;
    blog.galleryImagePublicIds = galleryPublicIdsResult.publicIds;
    blog.videoUrls = videoUrlsArray;
    blog.metaDescription = metaDescription !== undefined ? metaDescription : blog.metaDescription;
    if (productLinks) {
      blog.linkedProduct = productLinks.linkedProduct;
      blog.linkedProducts = productLinks.linkedProducts;
      blog.externalProductLinks = productLinks.externalProductLinks;
      blog.isPromoPost = productLinks.isPromoPost;
    }

    const shouldRefreshSlug = slug !== undefined || Boolean(title) || !blog.slug;
    if (shouldRefreshSlug) {
      const nextSlug = await generateUniqueSlug({
        Model: Blog,
        title: blog.title,
        preferredSlug: slug !== undefined ? slug : blog.title,
        excludeId: blog._id
      });
      applySlugWithHistory(blog, nextSlug);
    }

    blog.isDraft = isScheduled ? true : (isDraft !== undefined ? isDraft : blog.isDraft);
    blog.isScheduled = isScheduled !== undefined ? isScheduled : blog.isScheduled;
    blog.scheduledPublishDate = isScheduled ? scheduledPublishDate : null;
    blog.updatedAt = Date.now();

    await blog.save();
    await invalidateBlogPublishCache();
    triggerSearchIndexRefresh('blog:update');

    if (publishingFromDraft && req.user?.email) {
      enqueueEmailJob(
        'content-published',
        {
          email: req.user.email,
          username: req.user.username,
          contentType: 'blog',
          postTitle: blog.title,
          postUrl: `/blog/${blog.slug || blog._id}`
        },
        { jobId: `content-published:blog:${blog._id}` }
      ).catch((error) => {
        logError('Failed to queue blog published email after draft publish:', error);
      });
    }

    const updatedBlog = await Blog.findById(blog._id)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('linkedProduct', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .populate('linkedProducts', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount');

    res.json({ success: true, blog: updatedBlog });
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete image from Cloudinary if exists
    if (blog.cloudinaryPublicId) {
      const cloudinary = require('../utils/cloudinary');
      try {
        await cloudinary.uploader.destroy(blog.cloudinaryPublicId);
      } catch (err) {
        logError('Cloudinary delete error:', err);
      }
    }
    await deleteCloudinaryPublicIds(blog.galleryImagePublicIds);

    // Delete associated comments
    await Comment.deleteMany({ blog: blog._id });

    // Delete associated notifications
    await Notification.deleteMany({ blog: blog._id });

    await Blog.findByIdAndDelete(blog._id);
    await invalidateBlogPublishCache();
    triggerSearchIndexRefresh('blog:delete');

    res.json({ success: true, message: 'Blog deleted' });
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};

// Track blog view
exports.trackView = async (req, res) => {
  try {
    const result = await trackPublishedContentView({
      Model: Blog,
      identifier: req.params.id,
      userId: req.user?._id,
      ip: req.ip || req.connection.remoteAddress,
    });

    if (!result.found) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (result.counted) {
      await invalidateBlogReadCache();
    }

    res.json({ success: true, views: result.views });
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};

// Get short blogs only
exports.getShortBlogs = async (req, res) => {
  try {
    const { author } = req.query;
    const filter = { isDraft: false, isScheduled: false };
    
    if (author && !mongoose.Types.ObjectId.isValid(author)) {
      return res.status(400).json({ success: false, message: 'Invalid author id' });
    }

    if (author) filter.author = author;

    const limit = parseLimit(req.query.limit);
    const shortBlogs = await Blog.find(filter)
      .populate('author', 'username profileImage isGuest role isVerified')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit);

    res.json({
      success: true,
      blogs: shortBlogs,
      pagination: {
        mode: 'limit',
        limit
      }
    });
  } catch (error) {
    logError('Error in getShortBlogs:', error);
    return sendBlogServerError(res, error);
  }
};

// Like/Unlike blog
exports.toggleLike = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;

    if (!blog || blog.isDraft || blog.isScheduled) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const blogAuthor = await User.findById(blog.author).select('blockedUsers email username emailNotifications');
    if (!blogAuthor) {
      return res.status(404).json({ success: false, message: 'Blog author not found' });
    }

    const relationship = getViewerRelationshipToTarget(req.user, {
      _id: blog.author,
      blockedUsers: blogAuthor.blockedUsers,
    });
    if (!relationship.isOwner && relationship.isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot react to this content' });
    }

    const wasLiked = hasUserId(blog.likes, req.user._id);

    if (wasLiked) {
      await Blog.updateOne({ _id: blog._id }, { $pull: { likes: req.user._id } });
      const updatedBlog = await Blog.findById(blog._id).select('likes');
      await invalidateBlogReadCache();
      return res.json({
        success: true,
        liked: false,
        likes: updatedBlog?.likes || [],
        likeCount: updatedBlog?.likes?.length || 0,
      });
    } else {
      const updateResult = await Blog.updateOne(
        { _id: blog._id, likes: { $ne: req.user._id } },
        { $addToSet: { likes: req.user._id } }
      );
      const updatedBlog = await Blog.findById(blog._id).select('likes');
      await invalidateBlogReadCache();

      // Create notification for author
      if (updateResult.modifiedCount > 0 && blog.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: blog.author,
          sender: req.user._id,
          type: 'like',
          blog: blog._id,
          message: `${req.user.username} liked your post "${blog.title}"`
        });

        if (blogAuthor?.email && isEmailNotificationEnabled(blogAuthor, 'newReaction')) {
          enqueueEmailJob(
            'new-reaction',
            {
              email: blogAuthor.email,
              username: blogAuthor.username,
              reactorName: req.user.username,
              reactionCount: updatedBlog?.likes?.length || 0,
              postTitle: blog.title,
              postUrl: `/blog/${blog.slug || blog._id}`
            },
            { jobId: `new-reaction:blog:${blog._id}:${req.user._id}` }
          ).catch((error) => {
            logError('Failed to queue blog reaction email:', error);
          });
        }
        
        // Emit socket event
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${blog.author.toString()}`).emit('notification:like', {
            sender: { _id: req.user._id, username: req.user.username, profileImage: req.user.profileImage },
            blogId: blog._id,
            blogTitle: blog.title
          });
        }
      }

      res.json({
        success: true,
        liked: true,
        likes: updatedBlog?.likes || [],
        likeCount: updatedBlog?.likes?.length || 0,
      });
    }
  } catch (error) {
    return sendBlogServerError(res, error);
  }
};
