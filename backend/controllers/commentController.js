const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const Short = require('../models/Short');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { enqueueEmailJob } = require('../jobs/queueService');
const { isEmailNotificationEnabled } = require('../utils/emailPreferences');
const { resolveDocumentByIdOrSlug } = require('../utils/slugUtils');
const {
  parseLimit,
  shouldUseCursorPagination,
  decodeCursor,
  buildDescendingCursorFilter,
  buildAscendingCursorFilter,
  extractNextCursor
} = require('../utils/cursorPagination');
const { parsePositiveInt, createQueryCacheKey, getCache, setCache, invalidateCacheByPrefixes } = require('../utils/cacheStore');

const COMMENT_LIST_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_COMMENT_LIST_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_LIST_SECONDS, 90)
);

const COMMENT_REPLIES_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_COMMENT_REPLIES_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_DETAIL_SECONDS, 90)
);

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const getPostReferenceFromComment = (commentDoc) => {
  if (commentDoc.article) return { type: 'article', id: toIdString(commentDoc.article) };
  if (commentDoc.short) return { type: 'short', id: toIdString(commentDoc.short) };
  if (commentDoc.blog) return { type: 'blog', id: toIdString(commentDoc.blog) };
  return { type: null, id: null };
};

const getContentCachePrefixesByType = (contentType) => {
  if (contentType === 'article') {
    return ['articles:list:', 'article:detail:'];
  }
  if (contentType === 'short') {
    return ['shorts:list:', 'short:detail:'];
  }
  if (contentType === 'blog') {
    return ['blogs:list:', 'blog:detail:'];
  }
  return [];
};

const getContentPath = (contentType, post) => {
  if (!post?._id) return '/notifications';
  if (contentType === 'article') {
    return `/article/${post.slug || post._id}`;
  }
  if (contentType === 'short') {
    return `/shorts/${post._id}`;
  }
  return `/blog/${post.slug || post._id}`;
};

const addReplyCounts = async (commentDocs) => {
  return Promise.all(commentDocs.map(async (comment) => {
    const commentObject = typeof comment.toObject === 'function' ? comment.toObject() : comment;
    const replyCount = await Comment.countDocuments({ parentComment: commentObject._id });
    return {
      ...commentObject,
      replyCount
    };
  }));
};

const collectDescendantCommentIds = async (commentId) => {
  const descendantIds = [];
  let frontier = [commentId];

  while (frontier.length > 0) {
    const children = await Comment.find({ parentComment: { $in: frontier } }).select('_id');
    const childIds = children.map(child => child._id);
    descendantIds.push(...childIds);
    frontier = childIds;
  }

  return descendantIds;
};

// Create comment
exports.createComment = async (req, res) => {
  try {
    const { content, parentComment, replyTo } = req.body;
    const { blogId } = req.params;
    const { isShort, isArticle } = req.query;
    const contentType = isArticle === 'true' ? 'article' : (isShort === 'true' ? 'short' : 'blog');

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content required' });
    }

    let post = null;
    let resolvedPostId = blogId;

    if (isArticle === 'true') {
      const resolved = await resolveDocumentByIdOrSlug(Article, blogId);
      post = resolved.doc;
      resolvedPostId = post?._id?.toString();
    } else if (isShort === 'true') {
      post = await Short.findById(blogId);
      resolvedPostId = post?._id?.toString();
    } else {
      const resolved = await resolveDocumentByIdOrSlug(Blog, blogId);
      post = resolved.doc;
      resolvedPostId = post?._id?.toString();
    }

    if (!post) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    let parentCommentDoc = null;
    if (parentComment) {
      parentCommentDoc = await Comment.findById(parentComment);

      if (!parentCommentDoc) {
        return res.status(404).json({ success: false, message: 'Parent comment not found' });
      }

      const parentRef = getPostReferenceFromComment(parentCommentDoc);
      if (parentRef.type !== contentType || String(parentRef.id) !== String(resolvedPostId)) {
        return res.status(400).json({
          success: false,
          message: 'Reply parent must belong to the same content'
        });
      }
    }

    const comment = await Comment.create({
      content,
      author: req.user._id,
      parentComment: parentComment || null,
      replyTo: parentCommentDoc ? (replyTo || parentCommentDoc.author) : (replyTo || null),
      ...(isArticle === 'true'
        ? { article: resolvedPostId }
        : (isShort === 'true' ? { short: resolvedPostId } : { blog: resolvedPostId }))
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('replyTo', 'username');
    const populatedCommentPayload = {
      ...populatedComment.toObject(),
      replyCount: 0
    };

    // Create notification for post author
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        blog: isShort === 'true' ? null : post._id,
        message: `${req.user.username} commented on your post "${post.title}"`
      });

      const postAuthor = await User.findById(post.author).select('email username emailNotifications');
      if (postAuthor?.email && isEmailNotificationEnabled(postAuthor, 'newComment')) {
        enqueueEmailJob(
          'new-comment',
          {
            email: postAuthor.email,
            username: postAuthor.username,
            commenterName: req.user.username,
            postTitle: post.title || 'your content',
            commentText: content,
            postUrl: getContentPath(contentType, post)
          },
          { jobId: `new-comment:${comment._id}` }
        ).catch((error) => {
          console.error('Failed to queue new comment email:', error?.message || error);
        });
      }
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('comment:new', { blogId: resolvedPostId, comment: populatedCommentPayload });
    }

    await invalidateCacheByPrefixes([
      `comments:list:${contentType}:${resolvedPostId}:`,
      ...(parentComment ? [`comments:replies:${parentComment}:`] : []),
      ...getContentCachePrefixesByType(contentType)
    ]);

    res.status(201).json({ success: true, comment: populatedCommentPayload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get comments for a blog or short
exports.getComments = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { isShort, isArticle, cursor } = req.query;
    const useCursor = shouldUseCursorPagination(req.query);
    const limit = parseLimit(req.query.limit);
    const contentType = isArticle === 'true' ? 'article' : (isShort === 'true' ? 'short' : 'blog');

    let contentFilterId = blogId;

    if (isArticle === 'true') {
      const resolved = await resolveDocumentByIdOrSlug(Article, blogId);
      if (!resolved.doc) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      contentFilterId = resolved.doc._id.toString();
    } else if (isShort === 'true') {
      const shortPost = await Short.findById(blogId);
      if (!shortPost) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      contentFilterId = shortPost._id.toString();
    } else {
      const resolved = await resolveDocumentByIdOrSlug(Blog, blogId);
      if (!resolved.doc) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      contentFilterId = resolved.doc._id.toString();
    }

    const listCacheKey = `comments:list:${contentType}:${contentFilterId}:${createQueryCacheKey(req.query)}`;
    const cachedPayload = await getCache(listCacheKey);
    if (cachedPayload) {
      return res.json(cachedPayload);
    }

    const filter = isArticle === 'true'
      ? { article: contentFilterId, parentComment: null }
      : (isShort === 'true' ? { short: contentFilterId, parentComment: null } : { blog: contentFilterId, parentComment: null });

    if (useCursor && cursor) {
      const decodedCursor = decodeCursor(cursor);
      if (!decodedCursor) {
        return res.status(400).json({ success: false, message: 'Invalid cursor token' });
      }
      const cursorFilter = buildDescendingCursorFilter(decodedCursor);
      if (cursorFilter) {
        filter.$or = cursorFilter.$or;
      }
    }

    const query = Comment.find(filter)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('replyTo', 'username')
      .sort(useCursor ? { createdAt: -1, _id: -1 } : { isPinned: -1, createdAt: -1 });

    if (useCursor) {
      query.limit(limit + 1);
    }

    const comments = await query;
    const { pageItems: pagedComments, hasMore, nextCursor } = useCursor
      ? extractNextCursor(comments, limit)
      : { pageItems: comments, hasMore: false, nextCursor: null };

    const commentsWithReplies = await addReplyCounts(pagedComments);

    const payload = {
      success: true,
      comments: commentsWithReplies,
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

    await setCache(listCacheKey, payload, COMMENT_LIST_CACHE_TTL_SECONDS);

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get replies for a comment
exports.getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { cursor } = req.query;
    const useCursor = shouldUseCursorPagination(req.query);
    const limit = parseLimit(req.query.limit);
    const repliesCacheKey = `comments:replies:${commentId}:${createQueryCacheKey(req.query)}`;
    const cachedPayload = await getCache(repliesCacheKey);
    if (cachedPayload) {
      return res.json(cachedPayload);
    }
    const filter = { parentComment: commentId };

    if (useCursor && cursor) {
      const decodedCursor = decodeCursor(cursor);
      if (!decodedCursor) {
        return res.status(400).json({ success: false, message: 'Invalid cursor token' });
      }
      const cursorFilter = buildAscendingCursorFilter(decodedCursor);
      if (cursorFilter) {
        filter.$or = cursorFilter.$or;
      }
    }

    const query = Comment.find(filter)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('replyTo', 'username')
      .sort({ createdAt: 1, _id: 1 });

    if (useCursor) {
      query.limit(limit + 1);
    }

    const replies = await query;
    const { pageItems: pagedReplies, hasMore, nextCursor } = useCursor
      ? extractNextCursor(replies, limit)
      : { pageItems: replies, hasMore: false, nextCursor: null };

    const repliesWithCounts = await addReplyCounts(pagedReplies);

    const payload = {
      success: true,
      replies: repliesWithCounts,
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

    await setCache(repliesCacheKey, payload, COMMENT_REPLIES_CACHE_TTL_SECONDS);

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Like/unlike comment
exports.likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const isLiked = comment.likes.includes(req.user._id);
    if (isLiked) {
      comment.likes.pull(req.user._id);
    } else {
      comment.likes.push(req.user._id);
      comment.dislikes.pull(req.user._id);
    }

    await comment.save();
    const postRef = getPostReferenceFromComment(comment);
    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment ? [`comments:replies:${comment.parentComment.toString()}:`] : [])
    ]);

    res.json({ success: true, likes: comment.likes, dislikes: comment.dislikes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dislike/undislike comment
exports.dislikeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const isDisliked = comment.dislikes.includes(req.user._id);
    if (isDisliked) {
      comment.dislikes.pull(req.user._id);
    } else {
      comment.dislikes.push(req.user._id);
      comment.likes.pull(req.user._id);
    }

    await comment.save();
    const postRef = getPostReferenceFromComment(comment);
    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment ? [`comments:replies:${comment.parentComment.toString()}:`] : [])
    ]);

    res.json({ success: true, likes: comment.likes, dislikes: comment.dislikes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Heart/unheart comment (owner only)
exports.heartComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('blog article short');
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = comment.blog || comment.article || comment.short;
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only post owner can heart comments' });
    }

    comment.isHearted = !comment.isHearted;
    await comment.save();

    const postRef = getPostReferenceFromComment(comment);
    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment ? [`comments:replies:${comment.parentComment.toString()}:`] : [])
    ]);

    res.json({ success: true, isHearted: comment.isHearted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Pin/unpin comment (owner only)
exports.pinComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('blog article short');
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = comment.blog || comment.article || comment.short;
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only post owner can pin comments' });
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();

    const postRef = getPostReferenceFromComment(comment);
    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment ? [`comments:replies:${comment.parentComment.toString()}:`] : [])
    ]);

    res.json({ success: true, isPinned: comment.isPinned });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Edit comment
exports.editComment = async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id).populate('blog article short');

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    comment.content = content;
    await comment.save();

    const postRef = getPostReferenceFromComment(comment);
    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment ? [`comments:replies:${comment.parentComment.toString()}:`] : [])
    ]);

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profileImage isGuest role isVerified')
      .populate('replyTo', 'username');

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      const blogId = comment.blog?._id || comment.article?._id || comment.short?._id;
      io.emit('comment:updated', { blogId, comment: populatedComment });
    }

    res.json({ success: true, comment: populatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('blog article short');

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = comment.blog || comment.article || comment.short;
    const isOwner = comment.author.toString() === req.user._id.toString();
    const isPostOwner = post && post.author.toString() === req.user._id.toString();

    if (!isOwner && !isPostOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const blogId = comment.blog?._id || comment.article?._id || comment.short?._id;
    const postRef = getPostReferenceFromComment(comment);

    const descendantIds = await collectDescendantCommentIds(comment._id);

    if (descendantIds.length > 0) {
      await Comment.deleteMany({ _id: { $in: descendantIds } });
    }

    await Comment.findByIdAndDelete(comment._id);

    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment
        ? [`comments:replies:${comment.parentComment.toString()}:`]
        : [`comments:replies:${comment._id.toString()}:`]),
      `comments:replies:${comment._id.toString()}:`,
      ...descendantIds.map(descendantId => `comments:replies:${descendantId.toString()}:`),
      ...getContentCachePrefixesByType(postRef.type)
    ]);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('comment:deleted', { blogId, commentId: req.params.id });
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
