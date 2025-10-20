const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const Notification = require('../models/Notification');

// Create comment
exports.createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { blogId } = req.params;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content required' });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const comment = await Comment.create({
      content,
      author: req.user._id,
      blog: blogId
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profileImage');

    // Create notification for blog author
    if (blog.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: blog.author,
        sender: req.user._id,
        type: 'comment',
        blog: blog._id,
        message: `${req.user.username} commented on your post "${blog.title}"`
      });
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${blog.author.toString()}`).emit('notification:comment', {
          sender: { _id: req.user._id, username: req.user.username, profileImage: req.user.profileImage },
          blogId: blog._id,
          blogTitle: blog.title
        });
      }
    }

    res.status(201).json({ success: true, comment: populatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get comments for a blog
exports.getComments = async (req, res) => {
  try {
    const { blogId } = req.params;

    const comments = await Comment.find({ blog: blogId })
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
