const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Notification = require('../models/Notification');

// Create comment
exports.createComment = async (req, res) => {
  try {
    const { content } = req.body;
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
      ...(isShort === 'true' ? { short: blogId } : { blog: blogId })
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profileImage');

    // Create notification for post author
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        blog: isShort === 'true' ? null : post._id,
        message: `${req.user.username} commented on your post "${post.title}"`
      });
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${post.author.toString()}`).emit('notification:comment', {
          sender: { _id: req.user._id, username: req.user.username, profileImage: req.user.profileImage },
          blogId: post._id,
          blogTitle: post.title
        });
      }
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

    const filter = isShort === 'true' ? { short: blogId } : { blog: blogId };
    const comments = await Comment.find(filter)
      .populate('author', 'username profileImage')
      .sort({ createdAt: -1 });

    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Comment.findByIdAndDelete(comment._id);

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
