const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

// Create blog
exports.createBlog = async (req, res) => {
  try {
    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription, slug } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }

    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const blog = await Blog.create({
      title,
      content,
      author: req.user._id,
      tags: tagArray,
      category: category || 'General',
      coverImage: coverImage || null,
      cloudinaryPublicId: cloudinaryPublicId || null,
      metaDescription: metaDescription || null,
      slug: slug || null,
      isDraft: isDraft || false
    });

    const populatedBlog = await Blog.findById(blog._id).populate('author', 'username profileImage');

    res.status(201).json({ success: true, blog: populatedBlog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all blogs
exports.getBlogs = async (req, res) => {
  try {
    const { author, tag, draft } = req.query;
    const filter = {};

    if (author) filter.author = author;
    if (tag) filter.tags = tag;
    if (draft !== undefined) {
      filter.isDraft = draft === 'true';
      // Only show own drafts if user is authenticated
      if (req.user) {
        filter.author = req.user._id;
        
        // Auto-delete drafts older than 42 hours
        const fortyTwoHoursAgo = new Date(Date.now() - 42 * 60 * 60 * 1000);
        const oldDrafts = await Blog.find({
          author: req.user._id,
          isDraft: true,
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

    const blogs = await Blog.find(filter)
      .populate('author', 'username profileImage')
      .sort({ createdAt: -1 });

    res.json({ success: true, blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single blog
exports.getBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username profileImage fullName bio')
      .populate('likes', 'username profileImage');

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const commentCount = await Comment.countDocuments({ blog: blog._id });

    res.json({
      success: true,
      blog: {
        ...blog.toObject(),
        likeCount: blog.likes.length,
        commentCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription } = req.body;
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : blog.tags;

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tagArray;
    blog.category = category || blog.category;
    blog.coverImage = coverImage !== undefined ? coverImage : blog.coverImage;
    blog.cloudinaryPublicId = cloudinaryPublicId !== undefined ? cloudinaryPublicId : blog.cloudinaryPublicId;
    blog.metaDescription = metaDescription !== undefined ? metaDescription : blog.metaDescription;
    blog.isDraft = isDraft !== undefined ? isDraft : blog.isDraft;
    blog.updatedAt = Date.now();

    await blog.save();

    const updatedBlog = await Blog.findById(blog._id).populate('author', 'username profileImage');

    res.json({ success: true, blog: updatedBlog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

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

    res.json({ success: true, message: 'Blog deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Like/Unlike blog
exports.toggleLike = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const likeIndex = blog.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike
      blog.likes.splice(likeIndex, 1);
      await blog.save();
      res.json({ success: true, liked: false, likes: blog.likes });
    } else {
      // Like
      blog.likes.push(req.user._id);
      await blog.save();

      // Create notification for author
      if (blog.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: blog.author,
          sender: req.user._id,
          type: 'like',
          blog: blog._id,
          message: `${req.user.username} liked your post "${blog.title}"`
        });
        
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
