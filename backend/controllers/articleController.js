const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
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
      metaDescription,
      slug,
      isScheduled,
      scheduledPublishDate,
      videoUrls,
      templateId,
      customTemplate,
      templateThemeMode
    } = req.body;

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
      videoUrls: videoUrlsArray,
      templateId: templateIdValue,
      customTemplate: customTemplateResult.value,
      templateThemeMode: templateThemeModeValue,
      metaDescription: metaDescription || null,
      slug: generatedSlug,
      slugHistory: [],
      isDraft: isScheduled ? true : (isDraft || false),
      isScheduled: isScheduled || false,
      scheduledPublishDate: isScheduled ? scheduledPublishDate : null
    });

    const populatedArticle = await Article.findById(article._id).populate('author', 'username profileImage isGuest role isVerified');
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
      .populate('author', 'username profileImage isGuest role isVerified statuses')
      .sort({ createdAt: -1, _id: -1 });

    if (useCursor) {
      query.limit(limit + 1);
    }

    const articles = await query;
    const { pageItems: pagedArticles, hasMore, nextCursor } = useCursor
      ? extractNextCursor(articles, limit)
      : { pageItems: articles, hasMore: false, nextCursor: null };

    // Add commentCount and hasActiveStatus to each article
    const articlesWithStatus = await Promise.all(pagedArticles.map(async (article) => {
      const articleObj = article.toObject();
      articleObj.commentCount = await Comment.countDocuments({ article: article._id });
      if (articleObj.author && articleObj.author.statuses) {
        const now = new Date();
        articleObj.author.hasActiveStatus = articleObj.author.statuses.some(status => 
          status.expiresAt && new Date(status.expiresAt) > now
        );
        delete articleObj.author.statuses;
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
    const detailCacheKey = `article:detail:${req.params.id}`;
    const cachedPayload = await getCache(detailCacheKey);
    if (cachedPayload) {
      return res.json(cachedPayload);
    }

    const resolved = await resolveDocumentByIdOrSlug(Article, req.params.id, {
      populate: [
        { path: 'author', select: 'username profileImage fullName bio isGuest role isVerified statuses' },
        { path: 'likes', select: 'username profileImage' }
      ]
    });

    const article = resolved.doc;

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const commentCount = await Comment.countDocuments({ article: article._id });

    const articleObj = article.toObject();
    if (articleObj.author && articleObj.author.statuses) {
      const now = new Date();
      const activeStatuses = articleObj.author.statuses.filter(status => 
        status.expiresAt && new Date(status.expiresAt) > now
      );
      articleObj.author.hasActiveStatus = activeStatuses.length > 0;
      articleObj.author.statuses = activeStatuses;
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

    await setCache(detailCacheKey, payload, ARTICLE_DETAIL_CACHE_TTL_SECONDS);

    res.json(payload);
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
      metaDescription,
      slug,
      isScheduled,
      scheduledPublishDate,
      videoUrls,
      templateId,
      customTemplate,
      templateThemeMode
    } = req.body;
    
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
    article.videoUrls = videoUrlsArray;
    article.templateId = templateIdValue;
    article.customTemplate = customTemplateResult.value;
    article.templateThemeMode = templateThemeModeValue;
    article.metaDescription = metaDescription !== undefined ? metaDescription : article.metaDescription;

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

    const updatedArticle = await Article.findById(article._id).populate('author', 'username profileImage isGuest role isVerified');

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
