const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { generateUniqueSlug, applySlugWithHistory, resolveDocumentByIdOrSlug } = require('../utils/slugUtils');
const { parseLimit, shouldUseCursorPagination, decodeCursor, buildDescendingCursorFilter, extractNextCursor } = require('../utils/cursorPagination');
const { parsePositiveInt, createQueryCacheKey, getCache, setCache, invalidateCacheByPrefixes } = require('../utils/cacheStore');

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

exports.createArticle = async (req, res) => {
  try {
    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription, slug, isScheduled, scheduledPublishDate, videoUrls } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }

    if (isScheduled && scheduledPublishDate) {
      const scheduleDate = new Date(scheduledPublishDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
      }
    }

    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    const videoUrlsArray = videoUrls ? (Array.isArray(videoUrls) ? videoUrls : JSON.parse(videoUrls)).filter(url => url.trim()) : [];

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
      videoUrls: videoUrlsArray,
      metaDescription: metaDescription || null,
      slug: generatedSlug,
      slugHistory: [],
      isDraft: isScheduled ? true : (isDraft || false),
      isScheduled: isScheduled || false,
      scheduledPublishDate: isScheduled ? scheduledPublishDate : null
    });

    const populatedArticle = await Article.findById(article._id).populate('author', 'username profileImage isGuest role isVerified');
    await invalidateArticlePublishCache();

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

    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription, slug, isScheduled, scheduledPublishDate, videoUrls } = req.body;
    
    if (isScheduled && scheduledPublishDate) {
      const scheduleDate = new Date(scheduledPublishDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
      }
    }
    
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : article.tags;
    const videoUrlsArray = videoUrls !== undefined ? (Array.isArray(videoUrls) ? videoUrls : JSON.parse(videoUrls)).filter(url => url.trim()) : article.videoUrls;

    if ((article.isDraft || article.isScheduled) && isDraft === false && !isScheduled) {
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
    article.videoUrls = videoUrlsArray;
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
