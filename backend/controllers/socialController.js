const User = require('../models/User');
const Notification = require('../models/Notification');

// Follow/Unfollow user
exports.toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following.includes(userId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user._id.toString());
      
      await currentUser.save();
      await userToFollow.save();

      res.json({ success: true, following: false });
    } else {
      // Follow
      currentUser.following.push(userId);
      userToFollow.followers.push(req.user._id);
      
      await currentUser.save();
      await userToFollow.save();

      // Create notification
      await Notification.create({
        recipient: userId,
        sender: req.user._id,
        type: 'follow',
        message: `${req.user.username} started following you`
      });
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('notification:follow', {
          sender: { _id: req.user._id, username: req.user.username, profileImage: req.user.profileImage }
        });
      }

      res.json({ success: true, following: true });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      isRead: false 
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clear all notifications
exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete message notifications from specific sender
exports.deleteMessageNotifications = async (req, res) => {
  try {
    const { senderId } = req.params;
    await Notification.deleteMany({ 
      recipient: req.user._id, 
      sender: senderId, 
      type: 'message' 
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete single notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await Notification.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Auto-cleanup old notifications (24 hours)
exports.cleanupOldNotifications = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({ 
      createdAt: { $lt: twentyFourHoursAgo } 
    });
    console.log(`Cleaned up ${result.deletedCount} old notifications`);
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
};
