const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { enqueueEmailJob } = require('../jobs/queueService');
const { isEmailNotificationEnabled } = require('../utils/emailPreferences');
const { logError } = require('../utils/safeErrorLog');

const NOTIFICATION_LIST_DEFAULT_LIMIT = Math.max(1, Number(process.env.NOTIFICATION_LIST_DEFAULT_LIMIT) || 50);
const NOTIFICATION_LIST_MAX_LIMIT = Math.max(1, Number(process.env.NOTIFICATION_LIST_MAX_LIMIT) || 100);
const NOTIFICATION_LIST_MAX_PAGE = Math.max(1, Number(process.env.NOTIFICATION_LIST_MAX_PAGE) || 1000);
const NOTIFICATION_RETENTION_HOURS = Math.min(
  Math.max(1, Number(process.env.NOTIFICATION_RETENTION_HOURS) || 24),
  24 * 90
);
const NOTIFICATION_CLEANUP_BATCH_LIMIT = Math.min(
  Math.max(1, Number(process.env.NOTIFICATION_CLEANUP_BATCH_LIMIT) || 1000),
  10000
);
const NOTIFICATION_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.NOTIFICATION_QUERY_MAX_TIME_MS) || 5000);
const SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS = Math.max(
  100,
  Number(process.env.SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS) || 5000
);
let notificationCleanupRunning = false;

const parseBoundedInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(safeValue, max);
};

const hasUserId = (ids = [], userId) =>
  Array.isArray(ids) && ids.some((id) => id.toString() === userId.toString());

const getFollowParticipants = async (currentUserId, targetUserId) => {
  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId)
      .select('following blockedUsers')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS),
    User.findById(targetUserId)
      .select('followers blockedUsers email username emailNotifications')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS)
  ]);

  return { currentUser, targetUser };
};

const rejectInvalidFollowTarget = (res, { currentUser, targetUser, currentUserId, targetUserId }) => {
  if (!currentUser) {
    res.status(404).json({ success: false, message: 'Current user not found' });
    return true;
  }

  if (!targetUser) {
    res.status(404).json({ success: false, message: 'User not found' });
    return true;
  }

  if (hasUserId(currentUser.blockedUsers, targetUserId)) {
    res.status(403).json({ success: false, message: 'Unblock this user before following' });
    return true;
  }

  if (hasUserId(targetUser.blockedUsers, currentUserId)) {
    res.status(403).json({ success: false, message: 'Cannot follow this user' });
    return true;
  }

  return false;
};

const getFollowerCount = async (userId) => {
  const user = await User.findById(userId)
    .select('followers')
    .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS)
    .lean();
  return Array.isArray(user?.followers) ? user.followers.length : 0;
};

const sendSocialError = (res, error, message) => {
  logError(message, error);
  return res.status(500).json({ success: false, message });
};

const queueNewFollowerNotification = async (req, userToFollow, userId) => {
  await Notification.create({
    recipient: userId,
    sender: req.user._id,
    type: 'follow',
    message: `${req.user.username} started following you`
  });

  if (userToFollow.email && isEmailNotificationEnabled(userToFollow, 'newFollower')) {
    enqueueEmailJob(
      'new-follower',
      {
        email: userToFollow.email,
        username: userToFollow.username,
        followerName: req.user.username,
        followerProfileUrl: `/user/${req.user._id}`
      },
      {
        jobId: `new-follower:${userId}:${req.user._id}`
      }
    ).catch((error) => {
      logError('Failed to queue new follower email:', error);
    });
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${userId}`).emit('notification:follow', {
      sender: { _id: req.user._id, username: req.user.username, profileImage: req.user.profileImage }
    });
  }
};

// Follow/Unfollow user
exports.toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    const { currentUser, targetUser: userToFollow } = await getFollowParticipants(req.user._id, userId);
    if (rejectInvalidFollowTarget(res, {
      currentUser,
      targetUser: userToFollow,
      currentUserId: req.user._id,
      targetUserId: userId
    })) return;

    const isFollowing = hasUserId(currentUser.following, userId);

    if (isFollowing) {
      await Promise.all([
        User.updateOne({ _id: req.user._id }, { $pull: { following: userId } })
          .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS),
        User.updateOne({ _id: userId }, { $pull: { followers: req.user._id } })
          .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS)
      ]);

      res.json({ success: true, following: false });
    } else {
      const followResult = await User.updateOne(
        { _id: req.user._id, following: { $ne: userId }, blockedUsers: { $ne: userId } },
        { $addToSet: { following: userId } }
      ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
      if (followResult.modifiedCount > 0) {
        const targetResult = await User.updateOne(
          { _id: userId, blockedUsers: { $ne: req.user._id } },
          { $addToSet: { followers: req.user._id } }
        ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
        if (targetResult.matchedCount > 0) {
          if (targetResult.modifiedCount > 0) {
            await queueNewFollowerNotification(req, userToFollow, userId);
          }
        } else {
          await User.updateOne(
            { _id: req.user._id },
            { $pull: { following: userId } }
          ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
          return res.status(409).json({ success: false, message: 'Cannot follow this user' });
        }
      }

      res.json({ success: true, following: true });
    }
  } catch (error) {
    return sendSocialError(res, error, 'Failed to update follow status');
  }
};

// Follow user without toggling back to unfollow.
exports.followOnly = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    const { currentUser, targetUser: userToFollow } = await getFollowParticipants(req.user._id, userId);
    if (rejectInvalidFollowTarget(res, {
      currentUser,
      targetUser: userToFollow,
      currentUserId: req.user._id,
      targetUserId: userId
    })) return;

    const isFollowing = hasUserId(currentUser.following, userId);

    if (isFollowing) {
      const repairResult = await User.updateOne(
        { _id: userId, blockedUsers: { $ne: req.user._id } },
        { $addToSet: { followers: req.user._id } }
      ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
      if (repairResult.matchedCount === 0) {
        await User.updateOne(
          { _id: req.user._id },
          { $pull: { following: userId } }
        ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
        return res.status(409).json({ success: false, message: 'Cannot follow this user' });
      }
      const followerCount = await getFollowerCount(userId);
      return res.json({
        success: true,
        following: true,
        alreadyFollowing: true,
        followerCount,
      });
    }

    const followResult = await User.updateOne(
      { _id: req.user._id, following: { $ne: userId }, blockedUsers: { $ne: userId } },
      { $addToSet: { following: userId } }
    ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);

    if (followResult.modifiedCount > 0) {
      const targetResult = await User.updateOne(
        { _id: userId, blockedUsers: { $ne: req.user._id } },
        { $addToSet: { followers: req.user._id } }
      ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
      if (targetResult.matchedCount > 0) {
        if (targetResult.modifiedCount > 0) {
          await queueNewFollowerNotification(req, userToFollow, userId);
        }
      } else {
        await User.updateOne(
          { _id: req.user._id },
          { $pull: { following: userId } }
        ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
        return res.status(409).json({ success: false, message: 'Cannot follow this user' });
      }
    }
    const followerCount = await getFollowerCount(userId);

    res.json({
      success: true,
      following: true,
      alreadyFollowing: followResult.modifiedCount === 0,
      followerCount,
    });
  } catch (error) {
    return sendSocialError(res, error, 'Failed to follow user');
  }
};

// Get notifications
exports.getNotifications = async (req, res) => {
  try {
    const limit = parseBoundedInt(
      req.query.limit,
      NOTIFICATION_LIST_DEFAULT_LIMIT,
      NOTIFICATION_LIST_MAX_LIMIT
    );
    const page = parseBoundedInt(req.query.page, 1, NOTIFICATION_LIST_MAX_PAGE);
    const skip = (page - 1) * limit;
    const filter = { recipient: req.user._id };

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'username profileImage')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS)
        .lean(),
      Notification.countDocuments(filter).maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS)
    ]);

    res.json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    return sendSocialError(res, error, 'Failed to fetch notifications');
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      isRead: false 
    }).maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS);

    res.json({ success: true, unreadCount });
  } catch (error) {
    return sendSocialError(res, error, 'Failed to fetch unread count');
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    )
      .populate('sender', 'username profileImage')
      .maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    return sendSocialError(res, error, 'Failed to mark notification as read');
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    ).maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return sendSocialError(res, error, 'Failed to mark notifications as read');
  }
};

// Clear all notifications
exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id })
      .maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS);

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    return sendSocialError(res, error, 'Failed to clear notifications');
  }
};

// Delete message notifications from specific sender
exports.deleteMessageNotifications = async (req, res) => {
  try {
    const { senderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ success: false, message: 'Invalid sender id' });
    }

    await Notification.deleteMany({ 
      recipient: req.user._id, 
      sender: senderId, 
      type: 'message' 
    }).maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS);
    res.json({ success: true });
  } catch (error) {
    return sendSocialError(res, error, 'Failed to delete message notifications');
  }
};

// Delete single notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }

    const result = await Notification.deleteOne({ _id: id, recipient: req.user._id })
      .maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS);
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    return sendSocialError(res, error, 'Failed to delete notification');
  }
};

// Auto-cleanup old notifications in bounded batches.
exports.cleanupOldNotifications = async () => {
  if (notificationCleanupRunning) return;
  notificationCleanupRunning = true;
  try {
    const retentionCutoff = new Date(Date.now() - NOTIFICATION_RETENTION_HOURS * 60 * 60 * 1000);
    const staleNotifications = await Notification.find({
      createdAt: { $lt: retentionCutoff }
    })
      .select('_id')
      .sort({ createdAt: 1, _id: 1 })
      .limit(NOTIFICATION_CLEANUP_BATCH_LIMIT)
      .maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS)
      .lean();

    if (staleNotifications.length === 0) return;

    const result = await Notification.deleteMany({
      _id: { $in: staleNotifications.map((notification) => notification._id) }
    }).maxTimeMS(NOTIFICATION_QUERY_MAX_TIME_MS);
    console.log(`[notifications] Cleaned up ${result.deletedCount} old notifications`);
  } catch (error) {
    logError('Error cleaning up notifications:', error);
  } finally {
    notificationCleanupRunning = false;
  }
};
