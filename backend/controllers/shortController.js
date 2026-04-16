const Short = require('../models/Short');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { parsePositiveInt, createQueryCacheKey, getCache, setCache, invalidateCacheByPrefixes } = require('../utils/cacheStore');

const SHORT_LIST_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_SHORT_LIST_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_LIST_SECONDS, 120)
);

const SHORT_DETAIL_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_SHORT_DETAIL_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_DETAIL_SECONDS, 180)
);

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
            console.error('Cloudinary delete error:', err);
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
      cloudinaryPublicId: cloudinaryPublicId || null,
      videoUrls: videoUrlsArray,
      metaDescription: metaDescription || null,
      isDraft: isScheduled ? true : (isDraft || false),
      isScheduled: isScheduled || false,
      scheduledPublishDate: isScheduled ? scheduledPublishDate : null
    });

    const populatedShort = await Short.findById(short._id).populate('author', 'username profileImage');
    await invalidateShortCache();

    res.status(201).json({ success: true, short: populatedShort });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all shorts
exports.getShorts = async (req, res) => {
  try {
    const { author, tag, draft } = req.query;
    const filter = {};
    const canUseListCache = draft !== 'true';
    const listCacheKey = `shorts:list:${createQueryCacheKey(req.query)}`;

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
        
        // Auto-delete drafts older than 42 hours (exclude scheduled)
        const fortyTwoHoursAgo = new Date(Date.now() - 42 * 60 * 60 * 1000);
        const oldDrafts = await Short.find({
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
          await Comment.deleteMany({ short: draft._id });
          await Notification.deleteMany({ short: draft._id });
          await Short.findByIdAndDelete(draft._id);
        }
      } else {
        return res.status(401).json({ success: false, message: 'Authentication required for drafts' });
      }
    } else {
      filter.isDraft = false;
    }

    const shorts = await Short.find(filter)
      .populate('author', 'username profileImage isGuest role isVerified statuses')
      .sort({ createdAt: -1 });

    // Add hasActiveStatus to each short author
    const shortsWithStatus = shorts.map(short => {
      const shortObj = short.toObject();
      if (shortObj.author && shortObj.author.statuses) {
        const now = new Date();
        shortObj.author.hasActiveStatus = shortObj.author.statuses.some(status => 
          status.expiresAt && new Date(status.expiresAt) > now
        );
        delete shortObj.author.statuses;
      }
      return shortObj;
    });

    const payload = { success: true, shorts: shortsWithStatus };

    if (canUseListCache) {
      await setCache(listCacheKey, payload, SHORT_LIST_CACHE_TTL_SECONDS);
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single short
exports.getShort = async (req, res) => {
  try {
    const detailCacheKey = `short:detail:${req.params.id}`;
    const cachedPayload = await getCache(detailCacheKey);
    if (cachedPayload) {
      return res.json(cachedPayload);
    }

    const short = await Short.findById(req.params.id)
      .populate('author', 'username profileImage fullName bio statuses')
      .populate('likes', 'username profileImage');

    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    const commentCount = await Comment.countDocuments({ short: short._id });

    const shortObj = short.toObject();
    if (shortObj.author && shortObj.author.statuses) {
      const now = new Date();
      const activeStatuses = shortObj.author.statuses.filter(status => 
        status.expiresAt && new Date(status.expiresAt) > now
      );
      shortObj.author.hasActiveStatus = activeStatuses.length > 0;
      shortObj.author.statuses = activeStatuses;
    }

    const payload = {
      success: true,
      short: {
        ...shortObj,
        likeCount: short.likes.length,
        commentCount
      }
    };

    await setCache(detailCacheKey, payload, SHORT_DETAIL_CACHE_TTL_SECONDS);

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    // If changing from draft/scheduled to published, delete other drafts with same title
    if ((short.isDraft || short.isScheduled) && isDraft === false && !isScheduled) {
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
            console.error('Cloudinary delete error:', err);
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
    short.cloudinaryPublicId = cloudinaryPublicId !== undefined ? cloudinaryPublicId : short.cloudinaryPublicId;
    short.videoUrls = videoUrlsArray;
    short.metaDescription = metaDescription !== undefined ? metaDescription : short.metaDescription;
    short.isDraft = isScheduled ? true : (isDraft !== undefined ? isDraft : short.isDraft);
    short.isScheduled = isScheduled !== undefined ? isScheduled : short.isScheduled;
    short.scheduledPublishDate = isScheduled ? scheduledPublishDate : null;
    short.updatedAt = Date.now();

    await short.save();
    await invalidateShortCache();

    const updatedShort = await Short.findById(short._id).populate('author', 'username profileImage');

    res.json({ success: true, short: updatedShort });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        console.error('Cloudinary delete error:', err);
      }
    }

    await Comment.deleteMany({ short: short._id });
    await Notification.deleteMany({ short: short._id });
    await Short.findByIdAndDelete(short._id);
    await invalidateShortCache();

    res.json({ success: true, message: 'Short deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Track short view
exports.trackView = async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);
    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    const userId = req.user?._id;
    const userIp = req.ip || req.connection.remoteAddress;

    const alreadyViewed = short.viewedBy.some(view => 
      (userId && view.user?.toString() === userId.toString()) || 
      (!userId && view.ip === userIp)
    );

    if (!alreadyViewed) {
      short.views += 1;
      short.viewedBy.push({ user: userId, ip: userIp });
      await short.save();
      await invalidateShortCache();
    }

    res.json({ success: true, views: short.views });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Like/Unlike short
exports.toggleLike = async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);

    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    const likeIndex = short.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      short.likes.splice(likeIndex, 1);
      await short.save();
      await invalidateShortCache();
      res.json({ success: true, liked: false, likes: short.likes });
    } else {
      short.likes.push(req.user._id);
      await short.save();
      await invalidateShortCache();

      if (short.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: short.author,
          sender: req.user._id,
          type: 'like',
          short: short._id,
          message: `${req.user.username} liked your short "${short.title}"`
        });
        
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${short.author.toString()}`).emit('notification:like', {
            sender: { _id: req.user._id, username: req.user.username, profileImage: req.user.profileImage },
            shortId: short._id,
            shortTitle: short.title
          });
        }
      }

      res.json({ success: true, liked: true, likes: short.likes, likeCount: short.likes.length });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
