const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
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

// Create blog
exports.createBlog = async (req, res) => {
  try {
    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription, slug, isScheduled, scheduledPublishDate, videoUrls } = req.body;

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
      videoUrls: videoUrlsArray,
      metaDescription: metaDescription || null,
      slug: generatedSlug,
      slugHistory: [],
      isDraft: isScheduled ? true : (isDraft || false),
      isScheduled: isScheduled || false,
      scheduledPublishDate: isScheduled ? scheduledPublishDate : null
    });

    const populatedBlog = await Blog.findById(blog._id).populate('author', 'username profileImage isGuest role isVerified');
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
      .populate('author', 'username profileImage isGuest role isVerified statuses')
      .sort({ createdAt: -1, _id: -1 });

    if (useCursor) {
      query.limit(limit + 1);
    }

    const blogs = await query;
    const { pageItems: pagedBlogs, hasMore, nextCursor } = useCursor
      ? extractNextCursor(blogs, limit)
      : { pageItems: blogs, hasMore: false, nextCursor: null };

    // Add commentCount and hasActiveStatus to each blog
    const Comment = require('../models/Comment');
    const blogsWithStatus = await Promise.all(pagedBlogs.map(async (blog) => {
      const blogObj = blog.toObject();
      blogObj.commentCount = await Comment.countDocuments({ blog: blog._id });
      if (blogObj.author && blogObj.author.statuses) {
        const now = new Date();
        blogObj.author.hasActiveStatus = blogObj.author.statuses.some(status => 
          status.expiresAt && new Date(status.expiresAt) > now
        );
        delete blogObj.author.statuses;
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
    const detailCacheKey = `blog:detail:${req.params.id}`;
    const cachedPayload = await getCache(detailCacheKey);
    if (cachedPayload) {
      return res.json(cachedPayload);
    }

    const resolved = await resolveDocumentByIdOrSlug(Blog, req.params.id, {
      populate: [
        { path: 'author', select: 'username profileImage fullName bio isGuest role isVerified statuses' },
        { path: 'likes', select: 'username profileImage' }
      ]
    });

    const blog = resolved.doc;

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const commentCount = await Comment.countDocuments({ blog: blog._id });

    const blogObj = blog.toObject();
    // Add hasActiveStatus to author and keep statuses for viewing
    if (blogObj.author && blogObj.author.statuses) {
      const now = new Date();
      const activeStatuses = blogObj.author.statuses.filter(status => 
        status.expiresAt && new Date(status.expiresAt) > now
      );
      blogObj.author.hasActiveStatus = activeStatuses.length > 0;
      blogObj.author.statuses = activeStatuses; // Keep active statuses for viewing
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

    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription, slug, isScheduled, scheduledPublishDate, videoUrls } = req.body;
    
    // Validate scheduled date
    if (isScheduled && scheduledPublishDate) {
      const scheduleDate = new Date(scheduledPublishDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
      }
    }
    
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : blog.tags;
    const videoUrlsArray = videoUrls !== undefined ? (Array.isArray(videoUrls) ? videoUrls : JSON.parse(videoUrls)).filter(url => url.trim()) : blog.videoUrls;

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
        await Blog.findByIdAndDelete(otherDraft._id);
      }
    }

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tagArray;
    blog.category = category || blog.category;
    blog.coverImage = coverImage !== undefined ? coverImage : blog.coverImage;
    blog.cloudinaryPublicId = cloudinaryPublicId !== undefined ? cloudinaryPublicId : blog.cloudinaryPublicId;
    blog.videoUrls = videoUrlsArray;
    blog.metaDescription = metaDescription !== undefined ? metaDescription : blog.metaDescription;

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

    const updatedBlog = await Blog.findById(blog._id).populate('author', 'username profileImage isGuest role isVerified');

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
