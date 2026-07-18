const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const Short = require('../models/Short');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');
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
const { logError, sendSafeServerError } = require('../utils/safeErrorLog');
const {
  getViewerRelationshipToTarget,
  hasUserId,
} = require('../utils/userVisibility');

const sendCommentServerError = (res, error) =>
  sendSafeServerError(res, '[commentController] request failed:', error, 'Unable to process comment request');

const COMMENT_LIST_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_COMMENT_LIST_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_LIST_SECONDS, 90)
);

const COMMENT_REPLIES_CACHE_TTL_SECONDS = parsePositiveInt(
  process.env.CACHE_TTL_COMMENT_REPLIES_SECONDS,
  parsePositiveInt(process.env.CACHE_TTL_DETAIL_SECONDS, 90)
);
const COMMENT_MAX_THREAD_DEPTH = parsePositiveInt(process.env.COMMENT_MAX_THREAD_DEPTH, 10);
const COMMENT_DESCENDANT_DELETE_MAX = parsePositiveInt(process.env.COMMENT_DESCENDANT_DELETE_MAX, 5000);
const COMMENT_QUERY_MAX_TIME_MS = parsePositiveInt(process.env.COMMENT_QUERY_MAX_TIME_MS, 5000);

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

const isPublishedContent = (post) => Boolean(post && !post.isDraft && !post.isScheduled);

const getReferencedContentForComment = async (commentDoc, projection = 'isDraft isScheduled author') => {
  const ref = getPostReferenceFromComment(commentDoc);
  if (!ref.type || !ref.id) return null;
  if (ref.type === 'article') return Article.findById(ref.id).select(projection).maxTimeMS(COMMENT_QUERY_MAX_TIME_MS);
  if (ref.type === 'short') return Short.findById(ref.id).select(projection).maxTimeMS(COMMENT_QUERY_MAX_TIME_MS);
  return Blog.findById(ref.id).select(projection).maxTimeMS(COMMENT_QUERY_MAX_TIME_MS);
};

const populateCommentPostAuthor = (query) => query
  .populate('blog', 'author')
  .populate('article', 'author')
  .populate('short', 'author');

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
  const commentObjects = commentDocs.map((comment) =>
    typeof comment.toObject === 'function' ? comment.toObject() : comment
  );
  const commentIds = commentObjects
    .map((comment) => comment?._id)
    .filter(Boolean);

  const replyCounts = commentIds.length
    ? await Comment.aggregate([
      { $match: { parentComment: { $in: commentIds } } },
      { $group: { _id: '$parentComment', count: { $sum: 1 } } }
    ]).option({ maxTimeMS: COMMENT_QUERY_MAX_TIME_MS })
    : [];
  const replyCountMap = new Map(
    replyCounts.map((entry) => [String(entry._id), entry.count])
  );

  return commentObjects.map((commentObject) => {
    return {
      ...commentObject,
      replyCount: replyCountMap.get(String(commentObject._id)) || 0
    };
  });
};

const collectDescendantCommentIds = async (commentId) => {
  const descendantIds = [];
  let frontier = [commentId];
  const seen = new Set([String(commentId)]);

  while (frontier.length > 0) {
    const remaining = COMMENT_DESCENDANT_DELETE_MAX - descendantIds.length;
    if (remaining <= 0) return { descendantIds, exceeded: true };

    const children = await Comment.find({ parentComment: { $in: frontier } })
      .select('_id')
      .limit(remaining + 1)
      .lean()
      .maxTimeMS(COMMENT_QUERY_MAX_TIME_MS);
    const childIds = children
      .map(child => child._id)
      .filter((childId) => {
        const id = String(childId);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    if (childIds.length > remaining) return { descendantIds, exceeded: true };
    descendantIds.push(...childIds);
    frontier = childIds;
  }

  return { descendantIds, exceeded: false };
};

const resolveReplyDepth = async (parentCommentDoc) => {
  let current = parentCommentDoc;
  let newDepth = 1;
  const seen = new Set([String(parentCommentDoc._id)]);

  while (current.parentComment) {
    if (newDepth >= COMMENT_MAX_THREAD_DEPTH) return null;
    const parentId = String(current.parentComment);
    if (seen.has(parentId)) return null;
    seen.add(parentId);

    current = await Comment.findById(parentId)
      .select('parentComment')
      .lean()
      .maxTimeMS(COMMENT_QUERY_MAX_TIME_MS);
    if (!current) return null;
    newDepth += 1;
  }

  return newDepth;
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
    if (parentComment && !mongoose.isValidObjectId(parentComment)) {
      return res.status(400).json({ success: false, message: 'Invalid parent comment id' });
    }
    if (replyTo && !mongoose.isValidObjectId(replyTo)) {
      return res.status(400).json({ success: false, message: 'Invalid reply target id' });
    }

    let post = null;
    let resolvedPostId = blogId;

    if (isArticle === 'true') {
      const resolved = await resolveDocumentByIdOrSlug(Article, blogId);
      post = resolved.doc;
      resolvedPostId = post?._id?.toString();
    } else if (isShort === 'true') {
      if (!mongoose.isValidObjectId(blogId)) {
        return res.status(400).json({ success: false, message: 'Invalid short id' });
      }
      post = await Short.findById(blogId);
      resolvedPostId = post?._id?.toString();
    } else {
      const resolved = await resolveDocumentByIdOrSlug(Blog, blogId);
      post = resolved.doc;
      resolvedPostId = post?._id?.toString();
    }

    if (!isPublishedContent(post)) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const postAuthor = await User.findById(post.author).select('blockedUsers email username emailNotifications');
    if (!postAuthor) {
      return res.status(404).json({ success: false, message: 'Content author not found' });
    }

    const postAuthorRelationship = getViewerRelationshipToTarget(req.user, {
      _id: post.author,
      blockedUsers: postAuthor.blockedUsers,
    });
    if (!postAuthorRelationship.isOwner && postAuthorRelationship.isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot comment on this content' });
    }

    let parentCommentDoc = null;
    let commentDepth = 0;
    if (parentComment) {
      parentCommentDoc = await Comment.findById(parentComment).maxTimeMS(COMMENT_QUERY_MAX_TIME_MS);

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

      commentDepth = await resolveReplyDepth(parentCommentDoc);
      if (!Number.isInteger(commentDepth)) {
        return res.status(409).json({
          success: false,
          message: `Replies are limited to ${COMMENT_MAX_THREAD_DEPTH} levels.`
        });
      }
    }

    const comment = await Comment.create({
      content,
      author: req.user._id,
      parentComment: parentComment || null,
      depth: commentDepth,
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
      const notificationContentRef = contentType === 'article'
        ? { article: post._id }
        : (contentType === 'short' ? { short: post._id } : { blog: post._id });

      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        ...notificationContentRef,
        message: `${req.user.username} commented on your post "${post.title}"`
      });

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
          logError('Failed to queue new comment email:', error);
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
    return sendCommentServerError(res, error);
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
      if (!isPublishedContent(resolved.doc)) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      contentFilterId = resolved.doc._id.toString();
    } else if (isShort === 'true') {
      if (!mongoose.Types.ObjectId.isValid(blogId)) {
        return res.status(400).json({ success: false, message: 'Invalid content id' });
      }
      const shortPost = await Short.findById(blogId);
      if (!isPublishedContent(shortPost)) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      contentFilterId = shortPost._id.toString();
    } else {
      const resolved = await resolveDocumentByIdOrSlug(Blog, blogId);
      if (!isPublishedContent(resolved.doc)) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      contentFilterId = resolved.doc._id.toString();
    }

    const listCacheKey = `comments:list:${contentType}:${contentFilterId}:${createQueryCacheKey({
      isShort,
      isArticle,
      cursor,
      limit,
      visibility: 'published-only-v1',
      mode: useCursor ? 'cursor' : 'limit'
    })}`;
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

    query.limit(useCursor ? limit + 1 : limit);

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
        : {
            pagination: {
              mode: 'limit',
              limit
            }
          })
    };

    await setCache(listCacheKey, payload, COMMENT_LIST_CACHE_TTL_SECONDS);

    res.json(payload);
  } catch (error) {
    return sendCommentServerError(res, error);
  }
};

// Get replies for a comment
exports.getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { cursor } = req.query;
    const useCursor = shouldUseCursorPagination(req.query);
    const limit = parseLimit(req.query.limit);
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id' });
    }

    const parentComment = await Comment.findById(commentId).select('blog article short');
    if (!parentComment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    const parentContent = await getReferencedContentForComment(parentComment, 'isDraft isScheduled');
    if (!isPublishedContent(parentContent)) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const repliesCacheKey = `comments:replies:${commentId}:${createQueryCacheKey({
      cursor,
      limit,
      visibility: 'published-only-v1',
      mode: useCursor ? 'cursor' : 'limit'
    })}`;
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

    query.limit(useCursor ? limit + 1 : limit);

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
        : {
            pagination: {
              mode: 'limit',
              limit
            }
          })
    };

    await setCache(repliesCacheKey, payload, COMMENT_REPLIES_CACHE_TTL_SECONDS);

    res.json(payload);
  } catch (error) {
    return sendCommentServerError(res, error);
  }
};

// Like/unlike comment
exports.likeComment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const commentContent = await getReferencedContentForComment(comment, 'isDraft isScheduled');
    if (!isPublishedContent(commentContent)) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const commentAuthor = await User.findById(comment.author).select('blockedUsers');
    if (!commentAuthor) {
      return res.status(404).json({ success: false, message: 'Comment author not found' });
    }

    const relationship = getViewerRelationshipToTarget(req.user, {
      _id: comment.author,
      blockedUsers: commentAuthor.blockedUsers,
    });
    if (!relationship.isOwner && relationship.isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot react to this comment' });
    }

    const isLiked = hasUserId(comment.likes, req.user._id);
    if (isLiked) {
      await Comment.updateOne({ _id: comment._id }, { $pull: { likes: req.user._id } });
    } else {
      await Comment.updateOne(
        { _id: comment._id },
        {
          $addToSet: { likes: req.user._id },
          $pull: { dislikes: req.user._id },
        }
      );
    }

    const updatedComment = await Comment.findById(comment._id).select('likes dislikes');
    const postRef = getPostReferenceFromComment(comment);
    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment ? [`comments:replies:${comment.parentComment.toString()}:`] : [])
    ]);

    res.json({
      success: true,
      likes: updatedComment?.likes || [],
      dislikes: updatedComment?.dislikes || [],
    });
  } catch (error) {
    return sendCommentServerError(res, error);
  }
};

// Dislike/undislike comment
exports.dislikeComment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid comment id' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const commentContent = await getReferencedContentForComment(comment, 'isDraft isScheduled');
    if (!isPublishedContent(commentContent)) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const commentAuthor = await User.findById(comment.author).select('blockedUsers');
    if (!commentAuthor) {
      return res.status(404).json({ success: false, message: 'Comment author not found' });
    }

    const relationship = getViewerRelationshipToTarget(req.user, {
      _id: comment.author,
      blockedUsers: commentAuthor.blockedUsers,
    });
    if (!relationship.isOwner && relationship.isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot react to this comment' });
    }

    const isDisliked = hasUserId(comment.dislikes, req.user._id);
    if (isDisliked) {
      await Comment.updateOne({ _id: comment._id }, { $pull: { dislikes: req.user._id } });
    } else {
      await Comment.updateOne(
        { _id: comment._id },
        {
          $addToSet: { dislikes: req.user._id },
          $pull: { likes: req.user._id },
        }
      );
    }

    const updatedComment = await Comment.findById(comment._id).select('likes dislikes');
    const postRef = getPostReferenceFromComment(comment);
    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment ? [`comments:replies:${comment.parentComment.toString()}:`] : [])
    ]);

    res.json({
      success: true,
      likes: updatedComment?.likes || [],
      dislikes: updatedComment?.dislikes || [],
    });
  } catch (error) {
    return sendCommentServerError(res, error);
  }
};

// Heart/unheart comment (owner only)
exports.heartComment = async (req, res) => {
  try {
    const comment = await populateCommentPostAuthor(Comment.findById(req.params.id));
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
    return sendCommentServerError(res, error);
  }
};

// Pin/unpin comment (owner only)
exports.pinComment = async (req, res) => {
  try {
    const comment = await populateCommentPostAuthor(Comment.findById(req.params.id));
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
    return sendCommentServerError(res, error);
  }
};

// Edit comment
exports.editComment = async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await populateCommentPostAuthor(Comment.findById(req.params.id));

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
    return sendCommentServerError(res, error);
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await populateCommentPostAuthor(Comment.findById(req.params.id));

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

    const descendantResult = await collectDescendantCommentIds(comment._id);
    if (descendantResult.exceeded) {
      return res.status(409).json({
        success: false,
        message: 'This comment thread is too large to delete in one request. Contact support for a managed cleanup.'
      });
    }
    const { descendantIds } = descendantResult;

    if (descendantIds.length > 0) {
      await Comment.deleteMany({ _id: { $in: descendantIds } }).maxTimeMS(COMMENT_QUERY_MAX_TIME_MS);
    }

    await Comment.findByIdAndDelete(comment._id).maxTimeMS(COMMENT_QUERY_MAX_TIME_MS);

    await invalidateCacheByPrefixes([
      ...(postRef.type && postRef.id ? [`comments:list:${postRef.type}:${postRef.id}:`] : []),
      ...(comment.parentComment
        ? [`comments:replies:${comment.parentComment.toString()}:`]
        : [`comments:replies:${comment._id.toString()}:`]),
      `comments:replies:${comment._id.toString()}:`,
      ...getContentCachePrefixesByType(postRef.type)
    ]);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('comment:deleted', { blogId, commentId: req.params.id });
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    return sendCommentServerError(res, error);
  }
};
