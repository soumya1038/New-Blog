const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const CallLog = require('../models/CallLog');
const { encrypt, decrypt } = require('../utils/encryption');
const { enqueueEmailJob } = require('../jobs/queueService');
const { isEmailNotificationEnabled } = require('../utils/emailPreferences');
const { deleteCloudinaryPublicIdAcrossResourceTypes } = require('../utils/cloudinaryCleanup');
const {
  validateTextMessageContent,
  validateReactionEmoji,
  validateTextMessageType,
  parsePinDurationHours
} = require('../utils/messageValidation');
const { logError } = require('../utils/safeErrorLog');
const { incrementGroupUnreadCounts } = require('../utils/groupUnreadCounts');
const { sanitizeMessageMediaForDelivery } = require('../utils/messageMediaAccess');

const MESSAGE_LIST_DEFAULT_LIMIT = Math.max(1, Number(process.env.MESSAGE_LIST_DEFAULT_LIMIT) || 50);
const MESSAGE_LIST_MAX_LIMIT = Math.max(1, Number(process.env.MESSAGE_LIST_MAX_LIMIT) || 100);
const CONVERSATION_LIST_DEFAULT_LIMIT = Math.max(1, Number(process.env.CONVERSATION_LIST_DEFAULT_LIMIT) || 50);
const CONVERSATION_LIST_MAX_LIMIT = Math.max(1, Number(process.env.CONVERSATION_LIST_MAX_LIMIT) || 100);
const CHAT_SEARCH_MAX_QUERY_LENGTH = Math.max(1, Number(process.env.CHAT_SEARCH_MAX_QUERY_LENGTH) || 80);
const MESSAGE_CLEAR_DELETE_BATCH_LIMIT = Math.max(1, Number(process.env.MESSAGE_CLEAR_DELETE_BATCH_LIMIT) || 100);
const MESSAGE_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.MESSAGE_QUERY_MAX_TIME_MS) || 5000);

const logMessageError = (message, error) => {
  logError(message, error);
};

const sendServerError = (res, error) => {
  logMessageError('[messageController] request failed:', error);
  return res.status(500).json({ message: 'Server error' });
};

const parseBoundedLimit = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(safeValue, max);
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const shouldSendNewMessageEmail = (receiver) =>
  process.env.EMAIL_NOTIFY_NEW_MESSAGES === 'true' &&
  isEmailNotificationEnabled(receiver, 'newMessage');

const isSameId = (left, right) => String(left || '') === String(right || '');
const idListHas = (ids = [], userId) => ids.some((id) => isSameId(id, userId));

const emitGroupMessageToOnlineMembers = (req, group, senderId, message) => {
  const io = req.app?.get?.('io');
  if (!io) return;

  (group.members || []).forEach((memberId) => {
    const memberIdStr = memberId.toString();
    if (memberIdStr === senderId.toString()) return;
    io.to(`user:${memberIdStr}`).emit('message:receive:group', message);
  });
};

const directConversationQuery = (currentUserId, otherUserId) => ({
  $or: [
    { sender: currentUserId, receiver: otherUserId },
    { sender: otherUserId, receiver: currentUserId },
  ],
});

const cleanupBothDeletedDirectMessages = async ({ currentUserId, otherUserId }) => {
  const bothDeletedQuery = {
    ...directConversationQuery(currentUserId, otherUserId),
    deletedBy: { $all: [currentUserId, otherUserId], $size: 2 },
  };

  const messagesToDelete = await Message.find(bothDeletedQuery)
    .select('_id cloudinaryPublicId')
    .sort({ createdAt: 1 })
    .limit(MESSAGE_CLEAR_DELETE_BATCH_LIMIT)
    .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
    .lean();

  for (const msg of messagesToDelete) {
    if (msg.cloudinaryPublicId) {
      try {
        await deleteCloudinaryPublicIdAcrossResourceTypes(msg.cloudinaryPublicId);
      } catch (error) {
        logMessageError('[message] Failed to delete associated Cloudinary file:', error);
      }
    }
  }

  const ids = messagesToDelete.map((message) => message._id);
  const deleteResult = ids.length > 0
    ? await Message.deleteMany({ _id: { $in: ids } }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
    : { deletedCount: 0 };
  const cleanupPending = Boolean(await Message.exists(bothDeletedQuery).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS));

  return {
    permanentlyDeleted: deleteResult.deletedCount || 0,
    cleanupPending,
    cleanupLimit: MESSAGE_CLEAR_DELETE_BATCH_LIMIT,
  };
};

const canAccessMessage = async (message, userId) => {
  if (!message || !userId) return false;
  if (message.group) {
    return Boolean(await Group.exists({ _id: message.group, members: userId })
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS));
  }
  return isSameId(message.sender, userId) || isSameId(message.receiver, userId);
};

const isDirectReplyForMessage = (message, reply) => {
  if (!message || !reply || reply.group) return false;

  const messageSenderId = message.sender?._id || message.sender;
  const messageReceiverId = message.receiver?._id || message.receiver;
  const replySenderId = reply.sender?._id || reply.sender;
  const replyReceiverId = reply.receiver?._id || reply.receiver;

  return (
    isSameId(messageSenderId, replySenderId) &&
    isSameId(messageReceiverId, replyReceiverId)
  ) || (
    isSameId(messageSenderId, replyReceiverId) &&
    isSameId(messageReceiverId, replySenderId)
  );
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver is required' });
    }

    const contentValidation = validateTextMessageContent(content);
    if (contentValidation.error) {
      return res.status(400).json({ message: contentValidation.error });
    }
    const messageContent = contentValidation.value;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: 'Invalid receiver ID format' });
    }

    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    const receiver = await User.findById(receiverId)
      .select('blockedUsers email username emailNotifications')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Check if sender is blocked by receiver
    if (idListHas(receiver.blockedUsers, req.user._id)) {
      return res.status(403).json({ message: 'You cannot send messages to this user' });
    }

    // Check if receiver is blocked by sender
    const sender = await User.findById(req.user._id)
      .select('blockedUsers')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (idListHas(sender?.blockedUsers, receiverId)) {
      return res.status(403).json({ message: 'You have blocked this user' });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content: encrypt(messageContent),
      encrypted: true
    });

    await message.populate('sender', 'username profileImage');
    await message.populate('receiver', 'username profileImage');

    // Create notification
    await Notification.create({
      recipient: receiverId,
      sender: req.user._id,
      type: 'message',
      message: `${req.user.username} sent you a message`
    });

    if (shouldSendNewMessageEmail(receiver) && receiver.email) {
      enqueueEmailJob(
        'new-message',
        {
          email: receiver.email,
          username: receiver.username,
          senderName: req.user.username,
          messagePreview: messageContent,
          chatUrl: '/chat'
        },
        { jobId: `new-message:${message._id}` }
      ).catch((error) => {
        logMessageError('Failed to queue new message email:', error);
      });
    }

    res.status(201).json({ success: true, message: 'Message sent successfully', data: message });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get conversations
exports.getConversations = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const limit = parseBoundedLimit(
      req.query.limit,
      CONVERSATION_LIST_DEFAULT_LIMIT,
      CONVERSATION_LIST_MAX_LIMIT
    );

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ],
          deletedBy: { $ne: req.user._id }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiver', req.user._id] }, { $eq: ['$read', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: 1,
            name: 1,
            username: 1,
            fullName: 1,
            profileImage: 1,
            description: 1,
            lastSeen: 1
          },
          lastMessage: 1,
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $limit: limit
      }
    ]).option({ maxTimeMS: MESSAGE_QUERY_MAX_TIME_MS });

    const conversationUserIds = messages
      .map((conv) => conv.user?._id)
      .filter(Boolean);
    const lastCalls = conversationUserIds.length
      ? await CallLog.aggregate([
        {
          $match: {
            deletedBy: { $ne: req.user._id },
            $or: [
              { caller: req.user._id, receiver: { $in: conversationUserIds } },
              { receiver: req.user._id, caller: { $in: conversationUserIds } }
            ]
          }
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$caller', req.user._id] },
                '$receiver',
                '$caller'
              ]
            },
            lastCall: { $first: '$$ROOT' }
          }
        }
      ]).option({ maxTimeMS: MESSAGE_QUERY_MAX_TIME_MS })
      : [];
    const lastCallByUser = new Map(
      lastCalls.map((entry) => [String(entry._id), entry.lastCall])
    );

    // For each conversation, check if there's a more recent call log
    const conversationsWithCalls = messages.map((conv) => {
      const lastCall = lastCallByUser.get(String(conv.user._id));

      // Compare timestamps and use the most recent
      if (lastCall && new Date(lastCall.createdAt) > new Date(conv.lastMessage.createdAt)) {
        const isOutgoing = lastCall.caller.toString() === req.user._id.toString();
        return {
          ...conv,
          lastMessage: {
            type: 'call',
            callType: lastCall.type,
            status: lastCall.status,
            duration: lastCall.duration,
            createdAt: lastCall.createdAt,
            isOutgoing: isOutgoing,
            content: lastCall.status === 'missed' ? 'Missed call' : (isOutgoing ? 'Outgoing call' : 'Incoming call')
          }
        };
      }

      return {
        ...conv,
        lastMessage: sanitizeMessageMediaForDelivery({
          ...conv.lastMessage,
          content: conv.lastMessage.encrypted ? decrypt(conv.lastMessage.content) : conv.lastMessage.content
        })
      };
    });

    res.json({
      conversations: conversationsWithCalls,
      pagination: {
        mode: 'limit',
        limit
      }
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get messages with specific user
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseBoundedLimit(req.query.limit, MESSAGE_LIST_DEFAULT_LIMIT, MESSAGE_LIST_MAX_LIMIT);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ],
      deletedBy: { $ne: req.user._id }
    })
      .populate('sender', 'name username fullName profileImage')
      .populate('receiver', 'name username fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    const decryptedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      sender: msg.sender,
      receiver: msg.receiver,
      content: msg.encrypted ? decrypt(msg.content) : msg.content,
      type: msg.type,
      voiceUrl: '',
      voiceDuration: msg.voiceDuration,
      fileUrl: '',
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType,
      caption: msg.encrypted && msg.caption ? decrypt(msg.caption) : msg.caption,
      deletedForEveryone: msg.deletedForEveryone,
      delivered: msg.delivered,
      read: msg.read,
      readAt: msg.readAt,
      reactions: msg.reactions,
      replyTo: msg.replyTo,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));

    // Populate replyTo messages
    await Message.populate(decryptedMessages, {
      path: 'replyTo',
      select: 'content sender receiver group createdAt type fileUrl caption encrypted',
      populate: { path: 'sender', select: 'name username fullName' }
    });

    // Decrypt replyTo content if exists
    decryptedMessages.forEach(msg => {
      if (msg.replyTo && msg.replyTo.content) {
        if (!isDirectReplyForMessage(msg, msg.replyTo)) {
          msg.replyTo = null;
          return;
        }
        msg.replyTo.content = msg.replyTo.encrypted ? decrypt(msg.replyTo.content) : msg.replyTo.content;
        msg.replyTo = sanitizeMessageMediaForDelivery(msg.replyTo);
      }
    });

    res.json({
      messages: decryptedMessages,
      pagination: {
        mode: 'limit',
        limit
      }
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { deleteFor } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }

    const message = await Message.findById(req.params.id)
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const currentUserId = req.user._id.toString();
    const isSender = isSameId(message.sender, currentUserId);
    const isGroupMessage = Boolean(message.group);
    const isParticipant = isGroupMessage
      ? Boolean(await Group.exists({ _id: message.group, members: req.user._id })
        .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS))
      : isSender || isSameId(message.receiver, currentUserId);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (deleteFor === 'everyone') {
      if (!isSender) {
        return res.status(403).json({ message: 'You can only delete your own messages for everyone' });
      }
      
      // Delete from Cloudinary if exists
      if (message.cloudinaryPublicId) {
        try {
          await deleteCloudinaryPublicIdAcrossResourceTypes(message.cloudinaryPublicId);
        } catch (error) {
          logMessageError('[message] Failed to delete associated Cloudinary file:', error);
        }
      }
      
      await Message.updateOne(
        { _id: message._id, sender: req.user._id },
        {
          $set: {
            content: 'This message was deleted',
            deletedForEveryone: true,
            type: 'text',
            fileUrl: null,
            fileName: null,
            fileSize: null,
            mimeType: null,
            caption: null,
            voiceUrl: null,
            voiceDuration: null,
            cloudinaryPublicId: null
          }
        }
      ).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
      return res.json({ message: 'Message deleted for everyone' });
    }

    // Delete for me
    await Message.updateOne(
      { _id: message._id },
      { $addToSet: { deletedBy: req.user._id } }
    ).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    if (isGroupMessage) {
      return res.json({ message: 'Message deleted' });
    }

    // Check if both users have deleted - permanently delete from DB
    const otherUserId = isSender
      ? message.receiver?.toString()
      : message.sender?.toString();
    if (!otherUserId) {
      return res.json({ message: 'Message deleted' });
    }

    const deletionState = await Message.findById(message._id)
      .select('sender receiver deletedBy cloudinaryPublicId')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (!deletionState) {
      return res.json({ message: 'Message deleted' });
    }
    const deletedByIds = (deletionState?.deletedBy || []).map((userId) => userId.toString());
    
    if (deletedByIds.includes(currentUserId) && deletedByIds.includes(otherUserId)) {
      // Delete from Cloudinary if exists
      if (deletionState.cloudinaryPublicId) {
        try {
          await deleteCloudinaryPublicIdAcrossResourceTypes(deletionState.cloudinaryPublicId);
        } catch (error) {
          logMessageError('[message] Failed to delete associated Cloudinary file:', error);
        }
      }
      
      await Message.deleteOne({
        _id: message._id,
        deletedBy: { $all: [req.user._id, otherUserId] }
      }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      read: false
    }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    res.json({ unreadCount: count });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Search users for chat
exports.searchUsers = async (req, res) => {
  try {
    const query = String(req.query.query || '').trim().slice(0, CHAT_SEARCH_MAX_QUERY_LENGTH);
    
    if (!query) {
      return res.json({ users: [] });
    }

    const escapedQuery = escapeRegex(query);

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { username: { $regex: escapedQuery, $options: 'i' } },
        { fullName: { $regex: escapedQuery, $options: 'i' } }
      ]
    })
    .select('name username fullName profileImage description lastSeen')
    .limit(10)
    .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    res.json({ users });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Hide conversation for the current user.
exports.deleteConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    await Message.updateMany(
      {
        ...directConversationQuery(req.user._id, userId),
        deletedBy: { $ne: req.user._id }
      },
      { $addToSet: { deletedBy: req.user._id } }
    ).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    const cleanup = await cleanupBothDeletedDirectMessages({
      currentUserId: req.user._id,
      otherUserId: userId,
    });

    res.json({ message: 'Conversation deleted successfully', cleanup });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Clear chat (mark all as deleted for current user)
exports.clearChat = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    // Mark messages as deleted by current user
    await Message.updateMany(
      {
        ...directConversationQuery(req.user._id, userId),
        deletedBy: { $ne: req.user._id }
      },
      { $addToSet: { deletedBy: req.user._id } }
    ).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    const cleanup = await cleanupBothDeletedDirectMessages({
      currentUserId: req.user._id,
      otherUserId: userId,
    });

    res.json({ message: 'Chat cleared successfully', cleanup });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    if (isSameId(userId, req.user._id)) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }
    const targetUser = await User.exists({ _id: userId }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userId }
    }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    // Don't delete messages - keep conversation history

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: userId }
    }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get blocked users list
exports.getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'name username fullName profileImage')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    
    res.json({ blockedUsers: user.blockedUsers || [] });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Mute user
exports.muteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    if (isSameId(userId, req.user._id)) {
      return res.status(400).json({ message: 'Cannot mute yourself' });
    }
    const targetUser = await User.exists({ _id: userId }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { mutedUsers: userId }
    }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    res.json({ message: 'User muted successfully' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Unmute user
exports.unmuteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { mutedUsers: userId }
    }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    res.json({ message: 'User unmuted successfully' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get muted users list
exports.getMutedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('mutedUsers', 'name username fullName profileImage')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    
    res.json({ mutedUsers: user.mutedUsers || [] });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Mark all messages from a user as read
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    ).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Add reaction to message
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }

    const reactionValidation = validateReactionEmoji(emoji);
    if (reactionValidation.error) {
      return res.status(400).json({ message: reactionValidation.error });
    }
    const reactionEmoji = reactionValidation.value;

    const message = await Message.findById(messageId)
      .select('sender receiver group')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (!await canAccessMessage(message, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedMessage = await Message.findOneAndUpdate(
      { _id: messageId, deletedForEveryone: { $ne: true } },
      [
        {
          $set: {
            reactions: {
              $concatArrays: [
                {
                  $filter: {
                    input: { $ifNull: ['$reactions', []] },
                    as: 'reaction',
                    cond: { $ne: ['$$reaction.user', req.user._id] },
                  },
                },
                [{ user: req.user._id, emoji: reactionEmoji }],
              ],
            },
          },
        },
      ],
      { new: true }
    )
      .select('reactions')
      .populate('reactions.user', 'name username fullName')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ message: 'Reaction added', reactions: updatedMessage.reactions });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Remove reaction from message
exports.removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }

    const message = await Message.findById(messageId)
      .select('sender receiver group')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (!await canAccessMessage(message, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedMessage = await Message.findOneAndUpdate(
      { _id: messageId, deletedForEveryone: { $ne: true } },
      { $pull: { reactions: { user: req.user._id } } },
      { new: true }
    )
      .select('reactions')
      .populate('reactions.user', 'name username fullName')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ message: 'Reaction removed', reactions: updatedMessage.reactions });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Update last seen
exports.updateLastSeen = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      lastSeen: new Date()
    }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    res.json({ message: 'Last seen updated' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Pin message
exports.pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { duration } = req.body;

    if (!messageId) {
      return res.status(400).json({ message: 'Message ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }

    const durationValidation = parsePinDurationHours(duration);
    if (durationValidation.error) {
      return res.status(400).json({ message: durationValidation.error });
    }
    const durationHours = durationValidation.value;

    const message = await Message.findById(messageId)
      .select('sender receiver group')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.group) {
      return res.status(400).json({ message: 'Pinning group messages is not supported here' });
    }

    const isParticipant = isSameId(message.sender, req.user._id) ||
                          isSameId(message.receiver, req.user._id);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to pin this message' });
    }

    // Get other user ID
    const otherUserId = isSameId(message.sender, req.user._id)
      ? message.receiver?.toString()
      : message.sender?.toString();
    if (!otherUserId) {
      return res.status(400).json({ message: 'Invalid direct message participants' });
    }

    // Check total pinned messages in conversation (max 5)
    const now = new Date();
    const pinnedCount = await Message.countDocuments({
      $or: [
        { sender: req.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user._id }
      ],
      pinnedBy: { $exists: true, $ne: [] },
      'pinnedBy.expiresAt': { $gt: now }
    }).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    if (pinnedCount >= 5) {
      return res.status(400).json({ message: 'Maximum 5 messages can be pinned per conversation' });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);
    const pinResult = await Message.updateOne(
      {
        _id: messageId,
        group: null,
        $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      },
      [
        {
          $set: {
            pinnedBy: {
              $concatArrays: [
                {
                  $filter: {
                    input: { $ifNull: ['$pinnedBy', []] },
                    as: 'pin',
                    cond: { $ne: ['$$pin.user', req.user._id] },
                  },
                },
                [{ user: req.user._id, expiresAt }],
              ],
            },
          },
        },
      ]
    ).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    if (pinResult.matchedCount !== 1) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message pinned successfully' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Unpin message
exports.unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }

    const message = await Message.findById(messageId)
      .select('sender receiver group')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.group) {
      return res.status(400).json({ message: 'Unpinning group messages is not supported here' });
    }
    const isParticipant = isSameId(message.sender, req.user._id) ||
                          isSameId(message.receiver, req.user._id);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to unpin this message' });
    }

    await Message.updateOne(
      {
        _id: messageId,
        group: null,
        $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      },
      { $pull: { pinnedBy: { user: req.user._id } } }
    ).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    res.json({ message: 'Message unpinned successfully' });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get pinned messages
exports.getPinnedMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ],
      pinnedBy: { $exists: true, $ne: [] },
      deletedBy: { $ne: req.user._id }
    })
      .populate('sender', 'name username fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(20)
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();

    const validMessages = [];
    const messagesWithExpiredPins = [];
    for (const msg of messages) {
      if (msg.pinnedBy) {
        msg.pinnedBy = msg.pinnedBy.filter(pin => pin && pin.user);
      }
      
      // Check if any pin is still valid (not expired) from EITHER user
      const validPins = msg.pinnedBy?.filter(pin => pin.expiresAt > now) || [];
      if (validPins.length !== (msg.pinnedBy?.length || 0)) {
        messagesWithExpiredPins.push(msg._id);
      }
      msg.pinnedBy = validPins;

      if (validPins.length > 0) {
        validMessages.push(msg);
      }
    }

    if (messagesWithExpiredPins.length > 0) {
      await Message.updateMany(
        { _id: { $in: messagesWithExpiredPins } },
        { $pull: { pinnedBy: { expiresAt: { $lte: now } } } }
      ).maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);
    }

    // Sort by most recent pin and limit to 5
    const sortedMessages = validMessages
      .sort((a, b) => {
        const aLatest = Math.max(...a.pinnedBy.map(p => p.expiresAt));
        const bLatest = Math.max(...b.pinnedBy.map(p => p.expiresAt));
        return bLatest - aLatest;
      })
      .slice(0, 5);

    const decryptedMessages = sortedMessages.map(msg => ({
      _id: msg._id,
      sender: msg.sender,
      content: msg.encrypted ? decrypt(msg.content) : msg.content,
      createdAt: msg.createdAt
    }));

    res.json({ pinnedMessages: decryptedMessages });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get group messages
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseBoundedLimit(req.query.limit, MESSAGE_LIST_DEFAULT_LIMIT, MESSAGE_LIST_MAX_LIMIT);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }

    const group = await Group.findById(groupId)
      .select('members')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members || !Array.isArray(group.members) || group.members.length === 0) {
      return res.status(400).json({ message: 'Invalid group data' });
    }

    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const messages = await Message.find({
      group: groupId,
      deletedForEveryone: { $ne: true },
      deletedBy: { $ne: req.user._id },
    })
      .populate({
        path: 'sender',
        select: 'name username fullName profileImage',
        options: { maxTimeMS: MESSAGE_QUERY_MAX_TIME_MS },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS);

    const decryptedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      sender: msg.sender,
      group: msg.group,
      content: msg.encrypted ? decrypt(msg.content) : msg.content,
      type: msg.type,
      voiceUrl: '',
      voiceDuration: msg.voiceDuration,
      fileUrl: '',
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType,
      caption: msg.encrypted && msg.caption ? decrypt(msg.caption) : msg.caption,
      callData: msg.callData,
      reactions: msg.reactions,
      replyTo: msg.replyTo,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));

    res.json({
      messages: decryptedMessages,
      pagination: {
        mode: 'limit',
        limit
      }
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Send group message
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId, content, type = 'text' } = req.body;

    if (!groupId) {
      return res.status(400).json({ message: 'Group is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }

    const typeValidation = validateTextMessageType(type);
    if (typeValidation.error) {
      return res.status(400).json({ message: typeValidation.error });
    }

    const contentValidation = validateTextMessageContent(content);
    if (contentValidation.error) {
      return res.status(400).json({ message: contentValidation.error });
    }
    const messageContent = contentValidation.value;

    const group = await Group.findById(groupId)
      .select('members admins settings')
      .maxTimeMS(MESSAGE_QUERY_MAX_TIME_MS)
      .lean();
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Fix: Convert ObjectId to string for comparison
    const isMember = group.members.some(memberId => memberId.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const isAdmin = group.admins.some(adminId => adminId.toString() === req.user._id.toString());
    if (group.settings?.onlyAdminsCanSend && !isAdmin) {
      return res.status(403).json({ message: 'Only admins can send messages in this group' });
    }

    const message = await Message.create({
      sender: req.user._id,
      group: groupId,
      content: encrypt(messageContent),
      type: typeValidation.value,
      encrypted: true
    });

    await message.populate('sender', 'username fullName profileImage');
    await incrementGroupUnreadCounts({
      groupId,
      senderId: req.user._id,
      memberIds: group.members,
    });
    const responseMessage = {
      ...message.toObject(),
      content: messageContent,
    };
    emitGroupMessageToOnlineMembers(req, group, req.user._id, responseMessage);

    res.status(201).json({ success: true, message: 'Message sent', data: responseMessage });
  } catch (error) {
    return sendServerError(res, error);
  }
};
