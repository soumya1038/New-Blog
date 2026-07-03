const Article = require('../models/Article');
const Blog = require('../models/Blog');
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

const ARTICLE_LIST_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_ARTICLE_LIST_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_LIST_SECONDS, 180)
);

const ARTICLE_DETAIL_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_ARTICLE_DETAIL_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_DETAIL_SECONDS, 300)
);

const invalidateArticleReadCache = async () => {
  await invalidateCacheByPrefixes(['articles:list:', 'article:detail:']);
};

const invalidateArticlePublishCache = async () => {
  await invalidateCacheByPrefixes(['articles:list:', 'article:detail:', 'seo:sitemap', 'seo:feed']);
};

const triggerSearchIndexRefresh = (reason) => {
  enqueueSearchIndexRefresh(reason).catch((error) => {
    console.warn('[search] Failed to enqueue search index refresh:', error?.message || error);
  });
};

const MAX_TEMPLATE_PAYLOAD_BYTES = 450000;

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

const selectWithRequiredContentType = (items, limit, requiredType = 'article') => {
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

const parseJsonArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch (error) {
      if (trimmed.includes(',')) {
        return trimmed.split(',').map((item) => item.trim());
      }
      return [trimmed];
    }
  }

  return [];
};

const normalizeStringArray = (value) =>
  parseJsonArrayField(value)
    .map((item) => String(item || '').trim())
    .filter(Boolean);

const clampPercent = (value, fallback = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
};

const normalizeProductTagPlacements = (value) => {
  const seen = new Set();
  return parseJsonArrayField(value)
    .filter(placement => placement && typeof placement === 'object')
    .map((placement) => {
      const productKey = String(placement.productKey || '').trim().slice(0, 180);
      const source = placement.source === 'external' ? 'external' : 'marketplace';
      const imageIndex = Math.max(0, Math.min(12, Math.floor(Number(placement.imageIndex) || 0)));
      const key = `${productKey}:${source}:${imageIndex}`;
      if (!productKey || seen.has(key)) return null;
      seen.add(key);
      return {
        productKey,
        source,
        imageIndex,
        x: clampPercent(placement.x),
        y: clampPercent(placement.y),
      };
    })
    .filter(Boolean)
    .slice(0, 40);
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
  parseJsonArrayField(body.linkedProducts).forEach(addId);

  const externalProductLinks = parseJsonArrayField(body.externalProductLinks)
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

const normalizeTemplateThemeMode = (value, fallback = 'auto') =>
  ['auto', 'light', 'dark'].includes(String(value || '').trim()) ? String(value).trim() : fallback;

const normalizeTemplatePayload = (rawTemplate) => {
  if (rawTemplate === undefined || rawTemplate === null || rawTemplate === '') {
    return { value: null };
  }

  let parsed = rawTemplate;
  if (typeof rawTemplate === 'string') {
    try {
      parsed = JSON.parse(rawTemplate);
    } catch (error) {
      return { error: 'Invalid custom template payload' };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'Custom template payload must be an object' };
  }

  try {
    const asJson = JSON.stringify(parsed);
    if (!asJson || Buffer.byteLength(asJson, 'utf8') > MAX_TEMPLATE_PAYLOAD_BYTES) {
      return { error: 'Custom template payload is too large' };
    }
    return { value: JSON.parse(asJson) };
  } catch (error) {
    return { error: 'Invalid custom template payload' };
  }
};

exports.createArticle = async (req, res) => {
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
      productTagPlacements,
      metaDescription,
      slug,
      isScheduled,
      scheduledPublishDate,
      videoUrls,
      templateId,
      customTemplate,
      templateThemeMode
    } = req.body;
    const productLinks = normalizeProductLinks(req.body);

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }

    if (isScheduled && scheduledPublishDate) {
      const scheduleDate = new Date(scheduledPublishDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
      }
    }

    const tagArray = normalizeStringArray(tags);
    const videoUrlsArray = normalizeStringArray(videoUrls);
    const galleryImagesArray = normalizeStringArray(galleryImages);
    const galleryImagePublicIdsArray = normalizeStringArray(galleryImagePublicIds);
    const productTagPlacementsArray = normalizeProductTagPlacements(productTagPlacements);
    const templateIdValue = String(templateId || 'city-gazette').trim().slice(0, 64) || 'city-gazette';
    const customTemplateResult = normalizeTemplatePayload(customTemplate);
    if (customTemplateResult.error) {
      return res.status(400).json({ success: false, message: customTemplateResult.error });
    }
    const templateThemeModeValue = normalizeTemplateThemeMode(templateThemeMode, 'auto');

    if (!isDraft && !isScheduled) {
      const existingDraft = await Article.findOne({ 
        title, 
        author: req.user._id, 
        isDraft: true
      });
      
      if (existingDraft) {
        if (existingDraft.cloudinaryPublicId) {
          const cloudinary = require('../utils/cloudinary');
          try {
            await cloudinary.uploader.destroy(existingDraft.cloudinaryPublicId);
          } catch (err) {
            console.error('Cloudinary delete error:', err);
          }
        }
        await Article.findByIdAndDelete(existingDraft._id);
      }
    }

    const generatedSlug = await generateUniqueSlug({
      Model: Article,
      title,
      preferredSlug: slug
    });

    const article = await Article.create({
      title,
      content,
      author: req.user._id,
      tags: tagArray,
      category: category || 'General',
      coverImage: coverImage || null,
      cloudinaryPublicId: cloudinaryPublicId || null,
      galleryImages: galleryImagesArray,
      galleryImagePublicIds: galleryImagePublicIdsArray,
      productTagPlacements: productTagPlacementsArray,
      videoUrls: videoUrlsArray,
      templateId: templateIdValue,
      customTemplate: customTemplateResult.value,
      templateThemeMode: templateThemeModeValue,
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

    const populatedArticle = await Article.findById(article._id)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('linkedProduct', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .populate('linkedProducts', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount');
    await invalidateArticlePublishCache();
    triggerSearchIndexRefresh('article:create');

    const isPublishedNow = !article.isDraft && !article.isScheduled;
    if (isPublishedNow && req.user?.email) {
      enqueueEmailJob(
        'content-published',
        {
          email: req.user.email,
          username: req.user.username,
          contentType: 'article',
          postTitle: article.title,
          postUrl: `/article/${article.slug || article._id}`
        },
        { jobId: `content-published:article:${article._id}` }
      ).catch((error) => {
        console.error('Failed to queue article published email:', error?.message || error);
      });
    }

    res.status(201).json({ success: true, article: populatedArticle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getArticles = async (req, res) => {
  try {
    const { author, tag, draft, cursor } = req.query;
    const useCursor = shouldUseCursorPagination(req.query);
    const limit = parseLimit(req.query.limit);
    const filter = {};
    const canUseListCache = draft !== 'true';
    const listCacheKey = `articles:list:${createQueryCacheKey(req.query)}`;

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
      if (req.user) {
        filter.author = req.user._id;
        
        const fortyTwoHoursAgo = new Date(Date.now() - 42 * 60 * 60 * 1000);
        const oldDrafts = await Article.find({
          author: req.user._id,
          isDraft: true,
          isScheduled: false,
          updatedAt: { $lt: fortyTwoHoursAgo }
        });
        
        for (const draft of oldDrafts) {
          if (draft.cloudinaryPublicId) {
            const cloudinary = require('../utils/cloudinary');
            try {
              await cloudinary.uploader.destroy(draft.cloudinaryPublicId);
            } catch (err) {
              console.error('Cloudinary delete error:', err);
            }
          }
          await Comment.deleteMany({ article: draft._id });
          await Notification.deleteMany({ article: draft._id });
          await Article.findByIdAndDelete(draft._id);
        }
      } else {
        return res.status(401).json({ success: false, message: 'Authentication required for drafts' });
      }
    } else {
      filter.isDraft = false;
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

    const query = Article.find(filter)
      .populate('author', 'username profileImage isGuest role isVerified statuses followers')
      .populate('linkedProduct', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .populate('linkedProducts', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .sort({ createdAt: -1, _id: -1 });

    if (useCursor) {
      query.limit(limit + 1);
    }

    const articles = await query;
    const { pageItems: pagedArticles, hasMore, nextCursor } = useCursor
      ? extractNextCursor(articles, limit)
      : { pageItems: articles, hasMore: false, nextCursor: null };

    const viewerId = String(req.user?._id || '');
    const canViewerSeeStatus = (status, { isOwner, isFollower }) => {
      if (!status?.expiresAt || new Date(status.expiresAt) <= new Date()) return false;
      if (isOwner) return true;
      const audience = ['public', 'followers', 'private'].includes(status?.audience) ? status.audience : 'public';
      if (audience === 'public') return true;
      if (audience === 'followers' && isFollower) return true;
      return false;
    };

    // Add commentCount and audience-aware hasActiveStatus to each article
    const articlesWithStatus = await Promise.all(pagedArticles.map(async (article) => {
      const articleObj = article.toObject();
      articleObj.commentCount = await Comment.countDocuments({ article: article._id });
      if (articleObj.author && articleObj.author.statuses) {
        const authorId = String(articleObj.author._id || '');
        const isOwner = viewerId && viewerId === authorId;
        const isFollower = Array.isArray(articleObj.author.followers)
          ? articleObj.author.followers.some((id) => String(id) === viewerId)
          : false;
        articleObj.author.hasActiveStatus = articleObj.author.statuses.some((status) =>
          canViewerSeeStatus(status, { isOwner, isFollower })
        );
        delete articleObj.author.statuses;
        delete articleObj.author.followers;
      }
      return articleObj;
    }));

    const payload = {
      success: true,
      articles: articlesWithStatus,
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
      await setCache(listCacheKey, payload, ARTICLE_LIST_CACHE_TTL_SECONDS);
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getArticle = async (req, res) => {
  try {
    const viewerId = String(req.user?._id || 'anon');
    const detailCacheKey = `article:detail:v2:${req.params.id}:viewer:${viewerId}`;
    const canUseDetailCache = viewerId === 'anon';
    const cachedPayload = canUseDetailCache ? await getCache(detailCacheKey) : null;
    if (cachedPayload) {
      return res.json(cachedPayload);
    }

    const resolved = await resolveDocumentByIdOrSlug(Article, req.params.id, {
      populate: [
        { path: 'author', select: 'username profileImage fullName bio isGuest role isVerified statuses followers' },
        { path: 'likes', select: 'username profileImage' },
        { path: 'linkedProduct', select: 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount' },
        { path: 'linkedProducts', select: 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount' }
      ]
    });

    const article = resolved.doc;

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const authorIdForStats = article.author?._id || article.author;
    const [commentCount, authorArticleCount] = await Promise.all([
      Comment.countDocuments({ article: article._id }),
      authorIdForStats
        ? Article.countDocuments({ author: authorIdForStats, isDraft: false })
        : Promise.resolve(0),
    ]);

    const articleObj = article.toObject();
    let authorIsFollowing = false;
    if (articleObj.author && articleObj.author.statuses) {
      const authorId = String(articleObj.author._id || '');
      const isOwner = viewerId !== 'anon' && viewerId === authorId;
      authorIsFollowing = Array.isArray(articleObj.author.followers)
        ? articleObj.author.followers.some((id) => String(id) === viewerId)
        : false;
      const visibleStatuses = (articleObj.author.statuses || []).filter((status) => {
        if (!status?.expiresAt || new Date(status.expiresAt) <= new Date()) return false;
        if (isOwner) return true;
        const audience = ['public', 'followers', 'private'].includes(status?.audience) ? status.audience : 'public';
        if (audience === 'public') return true;
        if (audience === 'followers' && authorIsFollowing) return true;
        return false;
      });
      articleObj.author.hasActiveStatus = visibleStatuses.length > 0;
      articleObj.author.statuses = visibleStatuses;
    }
    if (articleObj.author) {
      if (!authorIsFollowing && Array.isArray(articleObj.author.followers)) {
        authorIsFollowing = articleObj.author.followers.some((id) => String(id) === viewerId);
      }
      articleObj.author.followerCount = Array.isArray(articleObj.author.followers)
        ? articleObj.author.followers.length
        : Number(articleObj.author.followerCount || articleObj.author.followersCount || 0);
      articleObj.author.articleCount = authorArticleCount;
      articleObj.author.articlesCount = authorArticleCount;
      articleObj.author.isFollowing = viewerId !== 'anon' && authorIsFollowing;
      delete articleObj.author.followers;
    }

    const payload = {
      success: true,
      article: {
        ...articleObj,
        likeCount: article.likes.length,
        commentCount
      },
      redirect: {
        shouldRedirect: resolved.resolution === 'legacy_slug',
        to: `/article/${article.slug || article._id}`
      }
    };

    if (canUseDetailCache) {
      await setCache(detailCacheKey, payload, ARTICLE_DETAIL_CACHE_TTL_SECONDS);
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRelatedArticleContent = async (req, res) => {
  try {
    const limit = Math.max(4, Math.min(Number(req.query.limit) || 10, 16));
    const resolved = await resolveDocumentByIdOrSlug(Article, req.params.id);
    const article = resolved.doc;

    if (!article || article.isDraft) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const currentCategory = normalizeCategoryName(article.category || 'General');
    const relatedCategories = buildRelatedCategories(article.category || 'General');
    const categoryRegexes = createCategoryRegexes(relatedCategories);
    const currentTags = new Set((Array.isArray(article.tags) ? article.tags : [])
      .map((tag) => String(tag || '').trim().toLowerCase())
      .filter(Boolean));
    const currentAuthorId = article.author?._id || article.author;
    const seen = new Set([`article:${article._id}`]);
    const categoryFilter = categoryRegexes.length ? { category: { $in: categoryRegexes } } : {};
    const differentAuthorFilter = currentAuthorId ? { author: { $ne: currentAuthorId } } : {};

    const [articles, blogs, shorts] = await Promise.all([
      Article.find({ _id: { $ne: article._id }, isDraft: false, ...differentAuthorFilter, ...categoryFilter })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Blog.find({ isDraft: false, ...differentAuthorFilter, ...categoryFilter })
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
        const key = `${item.contentType}:${item._id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(compareRelatedContent);

    if (ranked.length < limit) {
      const fallbackLimit = (limit - ranked.length) * 2;
      const [fallbackArticles, fallbackBlogs, fallbackShorts] = await Promise.all([
        Article.find({ _id: { $ne: article._id }, isDraft: false, ...differentAuthorFilter })
          .populate('author', 'fullName username profileImage isGuest role isVerified')
          .sort({ views: -1, createdAt: -1 })
          .limit(fallbackLimit),
        Blog.find({ isDraft: false, ...differentAuthorFilter })
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
          const key = `${item.contentType}:${item._id}`;
          if (!seen.has(key)) {
            seen.add(key);
            ranked.push(item);
          }
        });
    }

    res.json({
      success: true,
      related: selectWithRequiredContentType(ranked, limit, 'article'),
      category: article.category || 'General',
      relatedCategories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuthorArticleContent = async (req, res) => {
  try {
    const limit = Math.max(4, Math.min(Number(req.query.limit) || 10, 16));
    const resolved = await resolveDocumentByIdOrSlug(Article, req.params.id);
    const article = resolved.doc;

    if (!article || article.isDraft) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const authorId = article.author?._id || article.author;
    if (!authorId) {
      return res.json({ success: true, authorContent: [] });
    }

    const currentCategory = normalizeCategoryName(article.category || 'General');
    const currentTags = new Set((Array.isArray(article.tags) ? article.tags : [])
      .map((tag) => String(tag || '').trim().toLowerCase())
      .filter(Boolean));

    const [articles, blogs, shorts] = await Promise.all([
      Article.find({ _id: { $ne: article._id }, author: authorId, isDraft: false })
        .populate('author', 'fullName username profileImage isGuest role isVerified')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit * 2),
      Blog.find({ author: authorId, isDraft: false })
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
        const key = `${item.contentType}:${item._id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(compareRelatedContent);

    res.json({
      success: true,
      authorContent: selectWithRequiredContentType(ranked, limit, 'article'),
      author: authorId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Article, req.params.id);
    const article = resolved.doc;

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    if (article.author.toString() !== req.user._id.toString()) {
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
      productTagPlacements,
      metaDescription,
      slug,
      isScheduled,
      scheduledPublishDate,
      videoUrls,
      templateId,
      customTemplate,
      templateThemeMode
    } = req.body;
    const hasProductLinkInput = ['linkedProduct', 'linkedProducts', 'externalProductLinks', 'isPromoPost']
      .some(key => Object.prototype.hasOwnProperty.call(req.body, key));
    const productLinks = hasProductLinkInput ? normalizeProductLinks(req.body) : null;
     
    if (isScheduled && scheduledPublishDate) {
      const scheduleDate = new Date(scheduledPublishDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
      }
    }
    
    const tagArray = tags !== undefined ? normalizeStringArray(tags) : article.tags;
    const videoUrlsArray = videoUrls !== undefined ? normalizeStringArray(videoUrls) : article.videoUrls;
    const galleryImagesArray = galleryImages !== undefined ? normalizeStringArray(galleryImages) : article.galleryImages;
    const galleryImagePublicIdsArray =
      galleryImagePublicIds !== undefined
        ? normalizeStringArray(galleryImagePublicIds)
        : article.galleryImagePublicIds;
    const productTagPlacementsArray =
      productTagPlacements !== undefined
        ? normalizeProductTagPlacements(productTagPlacements)
        : article.productTagPlacements;
    const templateIdValue =
      templateId !== undefined
        ? (String(templateId || '').trim().slice(0, 64) || 'city-gazette')
        : article.templateId;
    const customTemplateResult =
      customTemplate !== undefined
        ? normalizeTemplatePayload(customTemplate)
        : { value: article.customTemplate };
    if (customTemplateResult.error) {
      return res.status(400).json({ success: false, message: customTemplateResult.error });
    }
    const templateThemeModeValue =
      templateThemeMode !== undefined
        ? normalizeTemplateThemeMode(templateThemeMode, article.templateThemeMode || 'auto')
        : article.templateThemeMode;

    const publishingFromDraft =
      (article.isDraft || article.isScheduled) && isDraft === false && !isScheduled;

    if (publishingFromDraft) {
      const otherDraft = await Article.findOne({ 
        title: title || article.title, 
        author: req.user._id, 
        isDraft: true,
        _id: { $ne: article._id }
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
        await Article.findByIdAndDelete(otherDraft._id);
      }
    }

    article.title = title || article.title;
    article.content = content || article.content;
    article.tags = tagArray;
    article.category = category || article.category;
    article.coverImage = coverImage !== undefined ? coverImage : article.coverImage;
    article.cloudinaryPublicId = cloudinaryPublicId !== undefined ? cloudinaryPublicId : article.cloudinaryPublicId;
    article.galleryImages = galleryImagesArray;
    article.galleryImagePublicIds = galleryImagePublicIdsArray;
    article.productTagPlacements = productTagPlacementsArray;
    article.videoUrls = videoUrlsArray;
    article.templateId = templateIdValue;
    article.customTemplate = customTemplateResult.value;
    article.templateThemeMode = templateThemeModeValue;
    article.metaDescription = metaDescription !== undefined ? metaDescription : article.metaDescription;
    if (productLinks) {
      article.linkedProduct = productLinks.linkedProduct;
      article.linkedProducts = productLinks.linkedProducts;
      article.externalProductLinks = productLinks.externalProductLinks;
      article.isPromoPost = productLinks.isPromoPost;
    }

    const shouldRefreshSlug = slug !== undefined || Boolean(title) || !article.slug;
    if (shouldRefreshSlug) {
      const nextSlug = await generateUniqueSlug({
        Model: Article,
        title: article.title,
        preferredSlug: slug !== undefined ? slug : article.title,
        excludeId: article._id
      });
      applySlugWithHistory(article, nextSlug);
    }

    article.isDraft = isScheduled ? true : (isDraft !== undefined ? isDraft : article.isDraft);
    article.isScheduled = isScheduled !== undefined ? isScheduled : article.isScheduled;
    article.scheduledPublishDate = isScheduled ? scheduledPublishDate : null;
    article.updatedAt = Date.now();

    await article.save();
    await invalidateArticlePublishCache();
    triggerSearchIndexRefresh('article:update');

    if (publishingFromDraft && req.user?.email) {
      enqueueEmailJob(
        'content-published',
        {
          email: req.user.email,
          username: req.user.username,
          contentType: 'article',
          postTitle: article.title,
          postUrl: `/article/${article.slug || article._id}`
        },
        { jobId: `content-published:article:${article._id}` }
      ).catch((error) => {
        console.error('Failed to queue article published email after draft publish:', error?.message || error);
      });
    }

    const updatedArticle = await Article.findById(article._id)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('linkedProduct', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount')
      .populate('linkedProducts', 'title slug thumbnail transparentThumbnail backgroundRemovalStatus price compareAtPrice type isFree averageRating reviewCount');

    res.json({ success: true, article: updatedArticle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Article, req.params.id);
    const article = resolved.doc;

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (article.cloudinaryPublicId) {
      const cloudinary = require('../utils/cloudinary');
      try {
        await cloudinary.uploader.destroy(article.cloudinaryPublicId);
      } catch (err) {
        console.error('Cloudinary delete error:', err);
      }
    }

    await Comment.deleteMany({ article: article._id });
    await Notification.deleteMany({ article: article._id });
    await Article.findByIdAndDelete(article._id);
    await invalidateArticlePublishCache();
    triggerSearchIndexRefresh('article:delete');

    res.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.trackView = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Article, req.params.id);
    const article = resolved.doc;
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const userId = req.user?._id;
    const userIp = req.ip || req.connection.remoteAddress;

    const alreadyViewed = article.viewedBy.some(view => 
      (userId && view.user?.toString() === userId.toString()) || 
      (!userId && view.ip === userIp)
    );

    if (!alreadyViewed) {
      article.views += 1;
      article.viewedBy.push({ user: userId, ip: userIp });
      await article.save();
      await invalidateArticleReadCache();
    }

    res.json({ success: true, views: article.views });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const resolved = await resolveDocumentByIdOrSlug(Article, req.params.id);
    const article = resolved.doc;

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const likeIndex = article.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      article.likes.splice(likeIndex, 1);
      await article.save();
      await invalidateArticleReadCache();
      res.json({ success: true, liked: false, likes: article.likes });
    } else {
      article.likes.push(req.user._id);
      await article.save();
      await invalidateArticleReadCache();

      if (article.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: article.author,
          sender: req.user._id,
          type: 'like',
          article: article._id,
          message: `${req.user.username} liked your article "${article.title}"`
        });

        const articleAuthor = await User.findById(article.author).select('email username emailNotifications');
        if (articleAuthor?.email && isEmailNotificationEnabled(articleAuthor, 'newReaction')) {
          enqueueEmailJob(
            'new-reaction',
            {
              email: articleAuthor.email,
              username: articleAuthor.username,
              reactorName: req.user.username,
              reactionCount: article.likes.length,
              postTitle: article.title,
              postUrl: `/article/${article.slug || article._id}`
            },
            { jobId: `new-reaction:article:${article._id}:${req.user._id}` }
          ).catch((error) => {
            console.error('Failed to queue article reaction email:', error?.message || error);
          });
        }
        
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${article.author.toString()}`).emit('notification:like', {
            sender: { _id: req.user._id, username: req.user.username, profileImage: req.user.profileImage },
            articleId: article._id,
            articleTitle: article.title
          });
        }
      }

      res.json({ success: true, liked: true, likes: article.likes, likeCount: article.likes.length });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
