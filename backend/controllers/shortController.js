const Short = require('../models/Short');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');
const { parsePositiveInt, createQueryCacheKey, getCache, setCache, invalidateCacheByPrefixes } = require('../utils/cacheStore');
const { enqueueEmailJob } = require('../jobs/queueService');
const { isEmailNotificationEnabled } = require('../utils/emailPreferences');
const { normalizeAllowedPublicId } = require('../utils/cloudinaryPublicIds');
const { cleanupOldDraftBatch } = require('../utils/draftCleanup');
const { logError, sendSafeServerError } = require('../utils/safeErrorLog');
const { trackPublishedContentView } = require('../utils/contentViewTracking');
const { resolveContentAuthorRelationships } = require('../utils/contentAuthorRelationships');
const {
  canViewerSeeStatus,
  filterVisibleStatusesForViewer,
  getViewerRelationshipToTarget,
  hasUserId,
  sanitizeStatusesForViewer,
} = require('../utils/userVisibility');

const sendShortServerError = (res, error) =>
  sendSafeServerError(res, '[shortController] request failed:', error, 'Unable to process short request');

const SHORT_LIST_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_SHORT_LIST_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_LIST_SECONDS, 120)
);

const SHORT_DETAIL_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_SHORT_DETAIL_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_DETAIL_SECONDS, 180)
);

const SHORT_LIST_DEFAULT_LIMIT = parsePositiveInt(process.env.SHORT_LIST_DEFAULT_LIMIT, 20);
const SHORT_LIST_MAX_LIMIT = parsePositiveInt(process.env.SHORT_LIST_MAX_LIMIT, 100);
const SHORT_LIST_MAX_PAGE = parsePositiveInt(process.env.SHORT_LIST_MAX_PAGE, 100);
const SHORT_QUERY_MAX_TIME_MS = Math.max(
  100,
  Number(process.env.SHORT_QUERY_MAX_TIME_MS) || 5000
);

const parseBoundedPositiveInt = (value, fallback, max) => {
  const parsed = parsePositiveInt(value, fallback);
  return Math.min(parsed, max);
};

const invalidateShortCache = async () => {
  await invalidateCacheByPrefixes(['shorts:list:', 'short:detail:']);
};

// Create short
exports.createShort = async (req, res) => {
  try {
    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription, isScheduled, scheduledPublishDate, videoUrls } = req.body;

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
    const coverPublicIdResult = normalizeAllowedPublicId(cloudinaryPublicId, req.user._id);
    if (coverPublicIdResult.error) {
      return res.status(400).json({ success: false, message: 'Invalid image ownership' });
    }

    // If publishing, delete existing draft with same title
    if (!isDraft && !isScheduled) {
      const existingDraft = await Short.findOne({ 
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
            logError('Cloudinary delete error:', err);
          }
        }
        await Short.findByIdAndDelete(existingDraft._id);
      }
    }

    const short = await Short.create({
      title,
      content,
      author: req.user._id,
      tags: tagArray,
      category: category || 'General',
      coverImage: coverImage || null,
      cloudinaryPublicId: coverPublicIdResult.publicId || null,
      videoUrls: videoUrlsArray,
      metaDescription: metaDescription || null,
      isDraft: isScheduled ? true : (isDraft || false),
      isScheduled: isScheduled || false,
      scheduledPublishDate: isScheduled ? scheduledPublishDate : null
    });

    const populatedShort = await Short.findById(short._id).populate('author', 'username profileImage');
    await invalidateShortCache();

    const isPublishedNow = !short.isDraft && !short.isScheduled;
    if (isPublishedNow && req.user?.email) {
      enqueueEmailJob(
        'content-published',
        {
          email: req.user.email,
          username: req.user.username,
          contentType: 'short',
          postTitle: short.title,
          postUrl: `/shorts/${short._id}`
        },
        { jobId: `content-published:short:${short._id}` }
      ).catch((error) => {
        logError('Failed to queue short published email:', error);
      });
    }

    res.status(201).json({ success: true, short: populatedShort });
  } catch (error) {
    return sendShortServerError(res, error);
  }
};

// Get all shorts
exports.getShorts = async (req, res) => {
  try {
    const { author, tag, draft } = req.query;
    const limit = parseBoundedPositiveInt(req.query.limit, SHORT_LIST_DEFAULT_LIMIT, SHORT_LIST_MAX_LIMIT);
    const page = parseBoundedPositiveInt(req.query.page, 1, SHORT_LIST_MAX_PAGE);
    const skip = (page - 1) * limit;
    const filter = {};
    const canUseListCache = draft !== 'true';
    const viewerId = String(req.user?._id || 'anon');
    if (author && !mongoose.Types.ObjectId.isValid(author)) {
      return res.status(400).json({ success: false, message: 'Invalid author id' });
    }

    const listCacheKey = `shorts:list:${createQueryCacheKey({
      author,
      tag,
      draft,
      page,
      limit,
      viewer: viewerId,
      visibility: 'block-aware-v1',
      published: 'scheduled-aware-v1'
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
      if (req.user) {
        filter.author = req.user._id;
        
        const fortyTwoHoursAgo = new Date(Date.now() - 42 * 60 * 60 * 1000);
        await cleanupOldDraftBatch({
          Model: Short,
          commentField: 'short',
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
      filter.isDraft = false;
      filter.isScheduled = false;
    }

    const [shorts, total] = await Promise.all([
      Short.find(filter)
        .populate({
          path: 'author',
          select: 'username profileImage isGuest role isVerified statuses.audience statuses.expiresAt',
          options: { maxTimeMS: SHORT_QUERY_MAX_TIME_MS },
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(SHORT_QUERY_MAX_TIME_MS),
      Short.countDocuments(filter).maxTimeMS(SHORT_QUERY_MAX_TIME_MS)
    ]);

    const authorRelationships = await resolveContentAuthorRelationships({
      viewer: req.user,
      authorIds: shorts.map((short) => short.author?._id),
      maxTimeMS: SHORT_QUERY_MAX_TIME_MS,
    });

    // Add audience-aware hasActiveStatus to each short author
    const shortsWithStatus = shorts.map(short => {
      const shortObj = short.toObject();
      if (shortObj.author && shortObj.author.statuses) {
        const relationship = authorRelationships.get(String(shortObj.author._id || '')) || {};
        shortObj.author.hasActiveStatus = shortObj.author.statuses.some((status) =>
          canViewerSeeStatus(status, relationship)
        );
        delete shortObj.author.statuses;
      }
      return shortObj;
    });

    const payload = {
      success: true,
      shorts: shortsWithStatus,
      pagination: {
        mode: 'page',
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    };

    if (canUseListCache) {
      await setCache(listCacheKey, payload, SHORT_LIST_CACHE_TTL_SECONDS);
    }

    res.json(payload);
  } catch (error) {
    return sendShortServerError(res, error);
  }
};

// Get single short
exports.getShort = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid short id' });
    }

    const viewerId = String(req.user?._id || 'anon');
    const detailCacheKey = `short:detail:v4:${req.params.id}:viewer:${viewerId}`;

    const short = await Short.findById(req.params.id)
      .populate({
        path: 'author',
        select: 'username profileImage fullName bio statuses',
        options: { maxTimeMS: SHORT_QUERY_MAX_TIME_MS },
      })
      .populate({
        path: 'likes',
        select: 'username profileImage',
        options: { maxTimeMS: SHORT_QUERY_MAX_TIME_MS },
      })
      .maxTimeMS(SHORT_QUERY_MAX_TIME_MS);

    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    const isPublished = !short.isDraft && !short.isScheduled;
    const isOwner = req.user && String(short.author?._id || short.author) === String(req.user._id);
    if (!isPublished && !isOwner) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    if (isPublished) {
      const cachedPayload = await getCache(detailCacheKey);
      if (cachedPayload) {
        return res.json(cachedPayload);
      }
    }

    const [commentCount, authorRelationships] = await Promise.all([
      Comment.countDocuments({ short: short._id }).maxTimeMS(SHORT_QUERY_MAX_TIME_MS),
      resolveContentAuthorRelationships({
        viewer: req.user,
        authorIds: short.author?._id ? [short.author._id] : [],
        maxTimeMS: SHORT_QUERY_MAX_TIME_MS,
      }),
    ]);

    const shortObj = short.toObject();
    if (shortObj.author && shortObj.author.statuses) {
      const relationship = authorRelationships.get(String(shortObj.author._id || '')) || {};
      const visibleStatuses = filterVisibleStatusesForViewer(shortObj.author.statuses, relationship);
      shortObj.author.hasActiveStatus = visibleStatuses.length > 0;
      shortObj.author.statuses = sanitizeStatusesForViewer(visibleStatuses, relationship);
    }

    const payload = {
      success: true,
      short: {
        ...shortObj,
        likeCount: short.likes.length,
        commentCount
      }
    };

    if (isPublished) {
      await setCache(detailCacheKey, payload, SHORT_DETAIL_CACHE_TTL_SECONDS);
    }

    res.json(payload);
  } catch (error) {
    return sendShortServerError(res, error);
  }
};

// Update short
exports.updateShort = async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    if (short.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription, isScheduled, scheduledPublishDate, videoUrls } = req.body;
    
    // Validate scheduled date
    if (isScheduled && scheduledPublishDate) {
      const scheduleDate = new Date(scheduledPublishDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
      }
    }
    
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : short.tags;
    const videoUrlsArray = videoUrls !== undefined ? (Array.isArray(videoUrls) ? videoUrls : JSON.parse(videoUrls)).filter(url => url.trim()) : short.videoUrls;
    const coverPublicIdResult = cloudinaryPublicId !== undefined
      ? normalizeAllowedPublicId(cloudinaryPublicId, req.user._id, [short.cloudinaryPublicId])
      : { publicId: short.cloudinaryPublicId };

    if (coverPublicIdResult.error) {
      return res.status(400).json({ success: false, message: 'Invalid image ownership' });
    }

    const publishingFromDraft =
      (short.isDraft || short.isScheduled) && isDraft === false && !isScheduled;

    // If changing from draft/scheduled to published, delete other drafts with same title
    if (publishingFromDraft) {
      const otherDraft = await Short.findOne({ 
        title: title || short.title, 
        author: req.user._id, 
        isDraft: true,
        _id: { $ne: short._id }
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
        await Short.findByIdAndDelete(otherDraft._id);
      }
    }

    short.title = title || short.title;
    short.content = content || short.content;
    short.tags = tagArray;
    short.category = category || short.category;
    short.coverImage = coverImage !== undefined ? coverImage : short.coverImage;
    short.cloudinaryPublicId = coverPublicIdResult.publicId || null;
    short.videoUrls = videoUrlsArray;
    short.metaDescription = metaDescription !== undefined ? metaDescription : short.metaDescription;
    short.isDraft = isScheduled ? true : (isDraft !== undefined ? isDraft : short.isDraft);
    short.isScheduled = isScheduled !== undefined ? isScheduled : short.isScheduled;
    short.scheduledPublishDate = isScheduled ? scheduledPublishDate : null;
    short.updatedAt = Date.now();

    await short.save();
    await invalidateShortCache();

    if (publishingFromDraft && req.user?.email) {
      enqueueEmailJob(
        'content-published',
        {
          email: req.user.email,
          username: req.user.username,
          contentType: 'short',
          postTitle: short.title,
          postUrl: `/shorts/${short._id}`
        },
        { jobId: `content-published:short:${short._id}` }
      ).catch((error) => {
        logError('Failed to queue short published email after draft publish:', error);
      });
    }

    const updatedShort = await Short.findById(short._id).populate('author', 'username profileImage');

    res.json({ success: true, short: updatedShort });
  } catch (error) {
    return sendShortServerError(res, error);
  }
};

// Delete short
exports.deleteShort = async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    if (short.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (short.cloudinaryPublicId) {
      const cloudinary = require('../utils/cloudinary');
      try {
        await cloudinary.uploader.destroy(short.cloudinaryPublicId);
      } catch (err) {
        logError('Cloudinary delete error:', err);
      }
    }

    await Comment.deleteMany({ short: short._id });
    await Notification.deleteMany({ short: short._id });
    await Short.findByIdAndDelete(short._id);
    await invalidateShortCache();

    res.json({ success: true, message: 'Short deleted' });
  } catch (error) {
    return sendShortServerError(res, error);
  }
};

// Track short view
exports.trackView = async (req, res) => {
  try {
    const result = await trackPublishedContentView({
      Model: Short,
      identifier: req.params.id,
      userId: req.user?._id,
      ip: req.ip || req.connection.remoteAddress,
      allowSlug: false,
    });

    if (!result.found) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    if (result.counted) {
      await invalidateShortCache();
    }

    res.json({ success: true, views: result.views });
  } catch (error) {
    return sendShortServerError(res, error);
  }
};

// Like/Unlike short
exports.toggleLike = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid short id' });
    }

    const short = await Short.findById(req.params.id);

    if (!short || short.isDraft || short.isScheduled) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    const shortAuthor = await User.findById(short.author).select('blockedUsers email username emailNotifications');
    if (!shortAuthor) {
      return res.status(404).json({ success: false, message: 'Short author not found' });
    }

    const relationship = getViewerRelationshipToTarget(req.user, {
      _id: short.author,
      blockedUsers: shortAuthor.blockedUsers,
    });
    if (!relationship.isOwner && relationship.isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot react to this content' });
    }

    const wasLiked = hasUserId(short.likes, req.user._id);

    if (wasLiked) {
      await Short.updateOne({ _id: short._id }, { $pull: { likes: req.user._id } });
      const updatedShort = await Short.findById(short._id).select('likes');
      await invalidateShortCache();
      return res.json({
        success: true,
        liked: false,
        likes: updatedShort?.likes || [],
        likeCount: updatedShort?.likes?.length || 0,
      });
    } else {
      const updateResult = await Short.updateOne(
        { _id: short._id, likes: { $ne: req.user._id } },
        { $addToSet: { likes: req.user._id } }
      );
      const updatedShort = await Short.findById(short._id).select('likes');
      await invalidateShortCache();

      if (updateResult.modifiedCount > 0 && short.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: short.author,
          sender: req.user._id,
          type: 'like',
          short: short._id,
          message: `${req.user.username} liked your short "${short.title}"`
        });

        if (shortAuthor?.email && isEmailNotificationEnabled(shortAuthor, 'newReaction')) {
          enqueueEmailJob(
            'new-reaction',
            {
              email: shortAuthor.email,
              username: shortAuthor.username,
              reactorName: req.user.username,
              reactionCount: updatedShort?.likes?.length || 0,
              postTitle: short.title,
              postUrl: `/shorts/${short._id}`
            },
            { jobId: `new-reaction:short:${short._id}:${req.user._id}` }
          ).catch((error) => {
            logError('Failed to queue short reaction email:', error);
          });
        }
        
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${short.author.toString()}`).emit('notification:like', {
            sender: { _id: req.user._id, username: req.user.username, profileImage: req.user.profileImage },
            shortId: short._id,
            shortTitle: short.title
          });
        }
      }

      res.json({
        success: true,
        liked: true,
        likes: updatedShort?.likes || [],
        likeCount: updatedShort?.likes?.length || 0,
      });
    }
  } catch (error) {
    return sendShortServerError(res, error);
  }
};
