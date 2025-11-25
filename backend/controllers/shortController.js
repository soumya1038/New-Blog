const Short = require('../models/Short');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

// Create short
exports.createShort = async (req, res) => {
  try {
    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }

    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // If publishing, delete existing draft with same title
    if (!isDraft) {
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
      metaDescription: metaDescription || null,
      isDraft: isDraft || false
    });

    const populatedShort = await Short.findById(short._id).populate('author', 'username profileImage');

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

    if (author) filter.author = author;
    if (tag) filter.tags = tag;
    if (draft !== undefined) {
      filter.isDraft = draft === 'true';
      if (req.user) {
        filter.author = req.user._id;
        
        // Auto-delete drafts older than 42 hours
        const fortyTwoHoursAgo = new Date(Date.now() - 42 * 60 * 60 * 1000);
        const oldDrafts = await Short.find({
          author: req.user._id,
          isDraft: true,
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
      .populate('author', 'username profileImage')
      .sort({ createdAt: -1 });

    res.json({ success: true, shorts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single short
exports.getShort = async (req, res) => {
  try {
    const short = await Short.findById(req.params.id)
      .populate('author', 'username profileImage fullName bio')
      .populate('likes', 'username profileImage');

    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    const commentCount = await Comment.countDocuments({ short: short._id });

    res.json({
      success: true,
      short: {
        ...short.toObject(),
        likeCount: short.likes.length,
        commentCount
      }
    });
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

    const { title, content, tags, isDraft, category, coverImage, cloudinaryPublicId, metaDescription } = req.body;
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : short.tags;

    // If changing from draft to published, delete other drafts with same title
    if (short.isDraft && isDraft === false) {
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
    short.metaDescription = metaDescription !== undefined ? metaDescription : short.metaDescription;
    short.isDraft = isDraft !== undefined ? isDraft : short.isDraft;
    short.updatedAt = Date.now();

    await short.save();

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
      res.json({ success: true, liked: false, likes: short.likes });
    } else {
      short.likes.push(req.user._id);
      await short.save();

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
