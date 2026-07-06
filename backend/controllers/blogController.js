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

const BLOG_LIST_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_BLOG_LIST_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_LIST_SECONDS, 180)
);

const BLOG_DETAIL_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_BLOG_DETAIL_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_DETAIL_SECONDS, 300)
);

const invalidateBlogReadCache = async () => {
  await invalidateCacheByPrefixes(['blogs:list:', 'blog:detail:']);
};

const invalidateBlogPublishCache = async () => {
  await invalidateCacheByPrefixes(['blogs:list:', 'blog:detail:', 'seo:sitemap', 'seo:feed']);
};

const triggerSearchIndexRefresh = (reason) => {
  enqueueSearchIndexRefresh(reason).catch((error) => {
    console.warn('[search] Failed to enqueue search index refresh:', error?.message || error);
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
  const cloudinary = require('../utils/cloudinary');
  await Promise.all(ids.map(async (publicId) => {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
    }
  }));
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
    .map(link => ({
      title: String(link.title || '').trim(),
      url: String(link.url || '').trim(),
      platform: String(link.platform || 'External').trim() || 'External',
      thumbnail: String(link.thumbnail || '').trim(),
      thumbnailPublicId: String(link.thumbnailPublicId || '').trim(),
      originalThumbnail: String(link.originalThumbnail || '').trim(),
      originalThumbnailPublicId: String(link.originalThumbnailPublicId || '').trim(),
      backgroundRemovalStatus: String(link.backgroundRemovalStatus || '').trim(),
      priceLabel: String(link.priceLabel || '').trim(),
    }))
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

    console.log('=== BACKEND CREATE BLOG ===');
    console.log('isDraft:', isDraft);
    console.log('isScheduled:', isScheduled);
    console.log('scheduledPublishDate:', scheduledPublishDate);
    console.log('title:', title);

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
            console.error('Cloudinary delete error:', err);
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
      cloudinaryPublicId: cloudinaryPublicId || null,
      galleryImages: galleryImagesArray,
      galleryImagePublicIds: galleryImagePublicIdsArray,
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
        console.error('Failed to queue blog published email:', error?.message || error);
      });
    }

    res.status(201).json({ success: true, blog: populatedBlog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    const listCacheKey = `blogs:list:${createQueryCacheKey(req.query)}`;

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
      // Only show own drafts if user is authenticated
      if (req.user) {
        filter.author = req.user._id;
        
        // Auto-delete drafts older than 42 hours (exclude scheduled)
        const fortyTwoHoursAgo = new Date(Date.now() - 42 * 60 * 60 * 1000);
        const oldDrafts = await Blog.find({
          author: req.user._id,
          isDraft: true,
          isScheduled: false,
          updatedAt: { $lt: fortyTwoHoursAgo }
        });
        
        // Delete old drafts and their images
        for (const draft of oldDrafts) {
          if (draft.cloudinaryPublicId) {
            const cloudinary = require('../utils/cloudinary');
            try {
              await cloudinary.uploader.destroy(draft.cloudinaryPublicId);
            } catch (err) {
              console.error('Cloudinary delete error:', err);
            }
          }
          await Comment.deleteMany({ blog: draft._id });
          await Notification.deleteMany({ blog: draft._id });
          await Blog.findByIdAndDelete(draft._id);
        }
      } else {
        return res.status(401).json({ success: false, message: 'Authentication required for drafts' });
      }
    } else {
      filter.isDraft = false; // Default: only published blogs
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
      .populate('author', 'username profileImage isGuest role isVerified statuses followers')
      .populate('linkedProduct', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .populate('linkedProducts', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .sort({ createdAt: -1, _id: -1 });

    if (useCursor) {
      query.limit(limit + 1);
    }

    const blogs = await query;
    const { pageItems: pagedBlogs, hasMore, nextCursor } = useCursor
      ? extractNextCursor(blogs, limit)
      : { pageItems: blogs, hasMore: false, nextCursor: null };

    const viewerId = String(req.user?._id || '');
    const canViewerSeeStatus = (status, { isOwner, isFollower }) => {
      if (!status?.expiresAt || new Date(status.expiresAt) <= new Date()) return false;
      if (isOwner) return true;
      const audience = ['public', 'followers', 'private'].includes(status?.audience) ? status.audience : 'public';
      if (audience === 'public') return true;
      if (audience === 'followers' && isFollower) return true;
      return false;
    };

    // Add commentCount and audience-aware hasActiveStatus to each blog
    const Comment = require('../models/Comment');
    const blogsWithStatus = await Promise.all(pagedBlogs.map(async (blog) => {
      const blogObj = blog.toObject();
      blogObj.commentCount = await Comment.countDocuments({ blog: blog._id });
      if (blogObj.author && blogObj.author.statuses) {
        const authorId = String(blogObj.author._id || '');
        const isOwner = viewerId && viewerId === authorId;
        const isFollower = Array.isArray(blogObj.author.followers)
          ? blogObj.author.followers.some((id) => String(id) === viewerId)
          : false;
        blogObj.author.hasActiveStatus = blogObj.author.statuses.some((status) =>
          canViewerSeeStatus(status, { isOwner, isFollower })
        );
        delete blogObj.author.statuses;
        delete blogObj.author.followers;
      }
      return blogObj;
    }));

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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single blog
exports.getBlog = async (req, res) => {
  try {
    const viewerId = String(req.user?._id || 'anon');
    const detailCacheKey = `blog:detail:v3:${req.params.id}:viewer:${viewerId}`;
    const cachedPayload = await getCache(detailCacheKey);
    if (cachedPayload) {
      return res.json(cachedPayload);
    }

    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id, {
      populate: [
        { path: 'author', select: 'username profileImage fullName bio isGuest role isVerified statuses followers' },
        { path: 'likes', select: 'username profileImage' },
        { path: 'linkedProduct', select: 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount' },
        { path: 'linkedProducts', select: 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount' }
      ]
    });

    const blog = resolved.doc;

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const authorIdForStats = blog.author?._id || blog.author;
    const [commentCount, authorArticleCount, authorBlogCount] = await Promise.all([
      Comment.countDocuments({ blog: blog._id }),
      authorIdForStats ? Article.countDocuments({ author: authorIdForStats, isDraft: false }) : 0,
      authorIdForStats ? Blog.countDocuments({ author: authorIdForStats, isDraft: false }) : 0
    ]);

    const blogObj = blog.toObject();
    // Add audience-aware hasActiveStatus and visible statuses for viewing
    let authorIsFollowing = false;
    if (blogObj.author && Array.isArray(blogObj.author.followers)) {
      authorIsFollowing = blogObj.author.followers.some((id) => String(id) === viewerId);
    }

    if (blogObj.author && blogObj.author.statuses) {
      const authorId = String(blogObj.author._id || '');
      const isOwner = viewerId !== 'anon' && viewerId === authorId;
      const visibleStatuses = (blogObj.author.statuses || []).filter((status) => {
        if (!status?.expiresAt || new Date(status.expiresAt) <= new Date()) return false;
        if (isOwner) return true;
        const audience = ['public', 'followers', 'private'].includes(status?.audience) ? status.audience : 'public';
        if (audience === 'public') return true;
        if (audience === 'followers' && authorIsFollowing) return true;
        return false;
      });
      blogObj.author.hasActiveStatus = visibleStatuses.length > 0;
      blogObj.author.statuses = visibleStatuses;
    }

    if (blogObj.author) {
      blogObj.author.followerCount = Array.isArray(blogObj.author.followers)
        ? blogObj.author.followers.length
        : Number(blogObj.author.followerCount || blogObj.author.followersCount || 0);
      blogObj.author.articleCount = authorArticleCount;
      blogObj.author.articlesCount = authorArticleCount;
      blogObj.author.blogCount = authorBlogCount;
      blogObj.author.blogsCount = authorBlogCount;
      blogObj.author.postsCount = authorArticleCount + authorBlogCount;
      blogObj.author.isFollowing = viewerId !== 'anon' && authorIsFollowing;
      delete blogObj.author.followers;
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

    await setCache(detailCacheKey, payload, BLOG_DETAIL_CACHE_TTL_SECONDS);

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRelatedBlogContent = async (req, res) => {
  try {
    const limit = Math.max(4, Math.min(Number(req.query.limit) || 10, 16));
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;

    if (!blog || blog.isDraft) {
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
      Article.find({ isDraft: false, ...differentAuthorFilter, ...categoryFilter })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Blog.find({ _id: { $ne: blog._id }, isDraft: false, ...differentAuthorFilter, ...categoryFilter })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Short.find({ isDraft: false, ...differentAuthorFilter, ...categoryFilter })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
    ]);

    const relatedWithScores = await Promise.all([
      ...articles.map(async (item) => serializeRelatedItem({
        item,
        type: 'article',
        commentCount: await Comment.countDocuments({ article: item._id }),
        currentCategory,
        relatedCategories,
        currentTags,
      })),
      ...blogs.map(async (item) => serializeRelatedItem({
        item,
        type: 'blog',
        commentCount: await Comment.countDocuments({ blog: item._id }),
        currentCategory,
        relatedCategories,
        currentTags,
      })),
      ...shorts.map(async (item) => serializeRelatedItem({
        item,
        type: 'short',
        commentCount: await Comment.countDocuments({ short: item._id }),
        currentCategory,
        relatedCategories,
        currentTags,
      })),
    ]);

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
        Article.find({ isDraft: false, ...differentAuthorFilter })
          .populate('author', 'fullName username profileImage isGuest role isVerified')
          .sort({ views: -1, createdAt: -1 })
          .limit(fallbackLimit),
        Blog.find({ _id: { $ne: blog._id }, isDraft: false, ...differentAuthorFilter })
          .populate('author', 'fullName username profileImage isGuest role isVerified')
          .sort({ views: -1, createdAt: -1 })
          .limit(fallbackLimit),
        Short.find({ isDraft: false, ...differentAuthorFilter })
          .populate('author', 'fullName username profileImage isGuest role isVerified')
          .sort({ views: -1, createdAt: -1 })
          .limit(fallbackLimit),
      ]);

      const fallbackItems = await Promise.all([
        ...fallbackArticles.map(async (item) => serializeRelatedItem({
          item,
          type: 'article',
          commentCount: await Comment.countDocuments({ article: item._id }),
          currentCategory,
          relatedCategories,
          currentTags,
        })),
        ...fallbackBlogs.map(async (item) => serializeRelatedItem({
          item,
          type: 'blog',
          commentCount: await Comment.countDocuments({ blog: item._id }),
          currentCategory,
          relatedCategories,
          currentTags,
        })),
        ...fallbackShorts.map(async (item) => serializeRelatedItem({
          item,
          type: 'short',
          commentCount: await Comment.countDocuments({ short: item._id }),
          currentCategory,
          relatedCategories,
          currentTags,
        })),
      ]);

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
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuthorBlogContent = async (req, res) => {
  try {
    const limit = Math.max(4, Math.min(Number(req.query.limit) || 10, 16));
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;

    if (!blog || blog.isDraft) {
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
      Article.find({ author: authorId, isDraft: false })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Blog.find({ _id: { $ne: blog._id }, author: authorId, isDraft: false })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Short.find({ author: authorId, isDraft: false })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
    ]);

    const authorItems = await Promise.all([
      ...articles.map(async (item) => serializeRelatedItem({
        item,
        type: 'article',
        commentCount: await Comment.countDocuments({ article: item._id }),
        currentCategory,
        relatedCategories: [currentCategory],
        currentTags,
      })),
      ...blogs.map(async (item) => serializeRelatedItem({
        item,
        type: 'blog',
        commentCount: await Comment.countDocuments({ blog: item._id }),
        currentCategory,
        relatedCategories: [currentCategory],
        currentTags,
      })),
      ...shorts.map(async (item) => serializeRelatedItem({
        item,
        type: 'short',
        commentCount: await Comment.countDocuments({ short: item._id }),
        currentCategory,
        relatedCategories: [currentCategory],
        currentTags,
      })),
    ]);

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
    res.status(500).json({ success: false, message: error.message });
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
            console.error('Cloudinary delete error:', err);
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
    blog.cloudinaryPublicId = cloudinaryPublicId !== undefined ? cloudinaryPublicId : blog.cloudinaryPublicId;
    blog.galleryImages = galleryImagesArray;
    blog.galleryImagePublicIds = galleryImagePublicIdsArray;
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
        console.error('Failed to queue blog published email after draft publish:', error?.message || error);
      });
    }

    const updatedBlog = await Blog.findById(blog._id)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('linkedProduct', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .populate('linkedProducts', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount');

    res.json({ success: true, blog: updatedBlog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        console.error('Cloudinary delete error:', err);
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Track blog view
exports.trackView = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const userId = req.user?._id;
    const userIp = req.ip || req.connection.remoteAddress;

    // Check if already viewed by this user/IP
    const alreadyViewed = blog.viewedBy.some(view => 
      (userId && view.user?.toString() === userId.toString()) || 
      (!userId && view.ip === userIp)
    );

    if (!alreadyViewed) {
      blog.views += 1;
      blog.viewedBy.push({ user: userId, ip: userIp });
      await blog.save();
      await invalidateBlogReadCache();
    }

    res.json({ success: true, views: blog.views });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get short blogs only
exports.getShortBlogs = async (req, res) => {
  try {
    const { author } = req.query;
    const filter = { isDraft: false };
    
    if (author) filter.author = author;

    console.log('Fetching short blogs with filter:', filter);
    const shortBlogs = await Blog.find(filter)
      .populate('author', 'username profileImage isGuest role isVerified')
      .sort({ createdAt: -1 });

    console.log('Found short blogs:', shortBlogs.length);
    res.json({ success: true, blogs: shortBlogs });
  } catch (error) {
    console.error('Error in getShortBlogs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Like/Unlike blog
exports.toggleLike = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id);
    const blog = resolved.doc;

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const likeIndex = blog.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike
      blog.likes.splice(likeIndex, 1);
      await blog.save();
      await invalidateBlogReadCache();
      res.json({ success: true, liked: false, likes: blog.likes });
    } else {
      // Like
      blog.likes.push(req.user._id);
      await blog.save();
      await invalidateBlogReadCache();

      // Create notification for author
      if (blog.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: blog.author,
          sender: req.user._id,
          type: 'like',
          blog: blog._id,
          message: `${req.user.username} liked your post "${blog.title}"`
        });

        const blogAuthor = await User.findById(blog.author).select('email username emailNotifications');
        if (blogAuthor?.email && isEmailNotificationEnabled(blogAuthor, 'newReaction')) {
          enqueueEmailJob(
            'new-reaction',
            {
              email: blogAuthor.email,
              username: blogAuthor.username,
              reactorName: req.user.username,
              reactionCount: blog.likes.length,
              postTitle: blog.title,
              postUrl: `/blog/${blog.slug || blog._id}`
            },
            { jobId: `new-reaction:blog:${blog._id}:${req.user._id}` }
          ).catch((error) => {
            console.error('Failed to queue blog reaction email:', error?.message || error);
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

      res.json({ success: true, liked: true, likes: blog.likes, likeCount: blog.likes.length });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
