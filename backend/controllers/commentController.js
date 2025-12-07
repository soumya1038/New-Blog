const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Notification = require('../models/Notification');

// Create comment
exports.createComment = async (req, res) => {
  try {
    const { content, parentComment, replyTo } = req.body;
    const { blogId } = req.params;
    const { isShort } = req.query;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content required' });
    }

    const Model = isShort === 'true' ? Short : Blog;
    const post = await Model.findById(blogId);
    if (!post) {
      return res.status(404).json({ success: false, message: `${isShort === 'true' ? 'Short' : 'Blog'} not found` });
    }

    const comment = await Comment.create({
      content,
      author: req.user._id,
      parentComment: parentComment || null,
      replyTo: replyTo || null,
      ...(isShort === 'true' ? { short: blogId } : { blog: blogId })
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profileImage')
      .populate('replyTo', 'username');

    // Create notification for post author
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        blog: isShort === 'true' ? null : post._id,
        message: `${req.user.username} commented on your post "${post.title}"`
      });
    }

    res.status(201).json({ success: true, comment: populatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get comments for a blog or short
exports.getComments = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { isShort } = req.query;

    const filter = isShort === 'true' ? { short: blogId, parentComment: null } : { blog: blogId, parentComment: null };
    const comments = await Comment.find(filter)
      .populate('author', 'username profileImage')
      .populate('replyTo', 'username')
      .sort({ isPinned: -1, createdAt: -1 });

    // Get reply counts for each comment
    const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
      const replyCount = await Comment.countDocuments({ parentComment: comment._id });
      return {
        ...comment.toObject(),
        replyCount
      };
    }));

    res.json({ success: true, comments: commentsWithReplies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get replies for a comment
exports.getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const replies = await Comment.find({ parentComment: commentId })
      .populate('author', 'username profileImage')
      .populate('replyTo', 'username')
      .sort({ createdAt: 1 });

    res.json({ success: true, replies });
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
    }

    await comment.save();
    res.json({ success: true, likes: comment.likes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Heart/unheart comment (owner only)
exports.heartComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('blog short');
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = comment.blog || comment.short;
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only post owner can heart comments' });
    }

    comment.isHearted = !comment.isHearted;
    await comment.save();

    res.json({ success: true, isHearted: comment.isHearted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Pin/unpin comment (owner only)
exports.pinComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('blog short');
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = comment.blog || comment.short;
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only post owner can pin comments' });
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();

    res.json({ success: true, isPinned: comment.isPinned });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Edit comment
exports.editComment = async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    comment.content = content;
    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profileImage')
      .populate('replyTo', 'username');

    res.json({ success: true, comment: populatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('blog short');

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = comment.blog || comment.short;
    const isOwner = comment.author.toString() === req.user._id.toString();
    const isPostOwner = post && post.author.toString() === req.user._id.toString();

    if (!isOwner && !isPostOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete all replies to this comment
    await Comment.deleteMany({ parentComment: comment._id });
    await Comment.findByIdAndDelete(comment._id);

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
