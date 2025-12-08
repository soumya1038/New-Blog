const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const { encrypt, decrypt } = require('../utils/encryption');

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!content || !receiverId) {
      return res.status(400).json({ message: 'Content and receiver are required' });
    }

    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Check if sender is blocked by receiver
    if (receiver.blockedUsers && receiver.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ message: 'You cannot send messages to this user' });
    }

    // Check if receiver is blocked by sender
    const sender = await User.findById(req.user._id);
    if (sender.blockedUsers && sender.blockedUsers.includes(receiverId)) {
      return res.status(403).json({ message: 'You have blocked this user' });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content
    });

    await message.populate('sender', 'username profileImage');
    await message.populate('receiver', 'username profileImage');

    // Create notification
    await Notification.create({
      user: receiverId,
      type: 'message',
      message: `${req.user.username} sent you a message`,
      link: '/chat'
    });

    res.status(201).json({ success: true, message: 'Message sent successfully', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get conversations
exports.getConversations = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

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
      }
    ]);

    const decryptedConversations = messages.map(conv => ({
      ...conv,
      lastMessage: {
        ...conv.lastMessage,
        content: conv.lastMessage.encrypted ? decrypt(conv.lastMessage.content) : conv.lastMessage.content
      }
    }));

    res.json({ conversations: decryptedConversations });
  } catch (error) {
    console.error('GetConversations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get messages with specific user
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

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
      .limit(limit);

    const decryptedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      sender: msg.sender,
      receiver: msg.receiver,
      content: msg.encrypted ? decrypt(msg.content) : msg.content,
      type: msg.type,
      voiceUrl: msg.voiceUrl,
      voiceDuration: msg.voiceDuration,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType,
      caption: msg.caption,
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
      select: 'content sender createdAt type fileUrl caption',
      populate: { path: 'sender', select: 'name username fullName' }
    });

    // Decrypt replyTo content if exists
    decryptedMessages.forEach(msg => {
      if (msg.replyTo && msg.replyTo.content) {
        msg.replyTo.content = decrypt(msg.replyTo.content);
      }
    });

    res.json({ messages: decryptedMessages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { deleteFor } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const isParticipant = message.sender.toString() === req.user._id.toString() || 
                          message.receiver.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (deleteFor === 'everyone') {
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only delete your own messages for everyone' });
      }
      
      // Delete from Cloudinary if exists
      if (message.cloudinaryPublicId) {
        try {
          const cloudinary = require('../utils/cloudinary');
          await cloudinary.uploader.destroy(message.cloudinaryPublicId);
          console.log(`✅ Deleted from Cloudinary: ${message.cloudinaryPublicId}`);
        } catch (error) {
          console.error('❌ Failed to delete from Cloudinary:', error);
        }
      }
      
      message.content = 'This message was deleted';
      message.deletedForEveryone = true;
      message.type = 'text';
      message.fileUrl = null;
      message.fileName = null;
      message.fileSize = null;
      message.mimeType = null;
      message.caption = null;
      message.voiceUrl = null;
      message.voiceDuration = null;
      message.cloudinaryPublicId = null;
      await message.save();
      return res.json({ message: 'Message deleted for everyone' });
    }

    // Delete for me
    if (!message.deletedBy.includes(req.user._id)) {
      message.deletedBy.push(req.user._id);
      await message.save();
    }

    // Check if both users have deleted - permanently delete from DB
    const otherUserId = message.sender.toString() === req.user._id.toString() 
      ? message.receiver.toString() 
      : message.sender.toString();
    
    if (message.deletedBy.length === 2 && message.deletedBy.includes(otherUserId)) {
      // Delete from Cloudinary if exists
      if (message.cloudinaryPublicId) {
        try {
          const cloudinary = require('../utils/cloudinary');
          await cloudinary.uploader.destroy(message.cloudinaryPublicId);
          console.log(`✅ Both users deleted - Removed from Cloudinary: ${message.cloudinaryPublicId}`);
        } catch (error) {
          console.error('❌ Failed to delete from Cloudinary:', error);
        }
      }
      
      await Message.deleteOne({ _id: message._id });
      console.log(`✅ Both users deleted - Permanently removed message: ${message._id}`);
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      read: false
    });

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search users for chat
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name username fullName profileImage email description lastSeen')
    .limit(10);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete entire conversation
exports.deleteConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const cloudinary = require('../utils/cloudinary');
    
    // Find all messages with Cloudinary files
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ],
      cloudinaryPublicId: { $exists: true, $ne: null }
    });

    // Delete from Cloudinary
    for (const msg of messages) {
      if (msg.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(msg.cloudinaryPublicId);
          console.log(`✅ Deleted Cloudinary file: ${msg.cloudinaryPublicId}`);
        } catch (error) {
          console.error('❌ Failed to delete Cloudinary file:', error);
        }
      }
    }
    
    // Delete messages from database
    await Message.deleteMany({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Clear chat (mark all as deleted for current user)
exports.clearChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const cloudinary = require('../utils/cloudinary');
    
    // Mark messages as deleted by current user
    await Message.updateMany(
      {
        $or: [
          { sender: req.user._id, receiver: userId },
          { sender: userId, receiver: req.user._id }
        ],
        deletedBy: { $ne: req.user._id }
      },
      { $push: { deletedBy: req.user._id } }
    );

    // Find messages where both users have deleted (deletedBy array has 2 users)
    const messagesToDelete = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ],
      deletedBy: { $all: [req.user._id, userId], $size: 2 }
    });

    // Permanently delete messages where both users cleared
    if (messagesToDelete.length > 0) {
      // Delete from Cloudinary
      for (const msg of messagesToDelete) {
        if (msg.cloudinaryPublicId) {
          try {
            await cloudinary.uploader.destroy(msg.cloudinaryPublicId);
            console.log(`✅ Both users cleared - Deleted from Cloudinary: ${msg.cloudinaryPublicId}`);
          } catch (error) {
            console.error('❌ Failed to delete from Cloudinary:', error);
          }
        }
      }
      
      // Delete from database
      await Message.deleteMany({
        _id: { $in: messagesToDelete.map(m => m._id) }
      });
      
      console.log(`✅ Both users cleared - Permanently deleted ${messagesToDelete.length} messages`);
    }

    res.json({ message: 'Chat cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userId }
    });

    // Don't delete messages - keep conversation history

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: userId }
    });

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get blocked users list
exports.getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'name username fullName profileImage email');
    
    res.json({ blockedUsers: user.blockedUsers || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mute user
exports.muteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { mutedUsers: userId }
    });

    res.json({ message: 'User muted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Unmute user
exports.unmuteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { mutedUsers: userId }
    });

    res.json({ message: 'User unmuted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get muted users list
exports.getMutedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('mutedUsers', 'name username fullName profileImage email');
    
    res.json({ mutedUsers: user.mutedUsers || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark all messages from a user as read
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    
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
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add reaction to message
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingReaction) {
      // Update existing reaction
      existingReaction.emoji = emoji;
    } else {
      // Add new reaction
      message.reactions.push({
        user: req.user._id,
        emoji
      });
    }

    await message.save();
    await message.populate('reactions.user', 'name username fullName');

    res.json({ message: 'Reaction added', reactions: message.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove reaction from message
exports.removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.reactions = message.reactions.filter(
      r => r.user.toString() !== req.user._id.toString()
    );

    await message.save();

    res.json({ message: 'Reaction removed', reactions: message.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update last seen
exports.updateLastSeen = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      lastSeen: new Date()
    });

    res.json({ message: 'Last seen updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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

    if (!duration) {
      return res.status(400).json({ message: 'Duration is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const isParticipant = message.sender.toString() === req.user._id.toString() || 
                          message.receiver.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to pin this message' });
    }

    // Get other user ID
    const otherUserId = message.sender.toString() === req.user._id.toString() 
      ? message.receiver.toString() 
      : message.sender.toString();

    // Check total pinned messages in conversation (max 5)
    const now = new Date();
    const pinnedCount = await Message.countDocuments({
      $or: [
        { sender: req.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user._id }
      ],
      pinnedBy: { $exists: true, $ne: [] },
      'pinnedBy.expiresAt': { $gt: now }
    });

    if (pinnedCount >= 5) {
      return res.status(400).json({ message: 'Maximum 5 messages can be pinned per conversation' });
    }

    if (!message.pinnedBy) {
      message.pinnedBy = [];
    } else {
      message.pinnedBy = message.pinnedBy.filter(pin => pin && pin.user);
    }

    message.pinnedBy = message.pinnedBy.filter(
      pin => pin.user.toString() !== req.user._id.toString()
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(duration));
    
    message.pinnedBy.push({
      user: req.user._id,
      expiresAt
    });
    
    await message.save();

    res.json({ success: true, message: 'Message pinned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Unpin message
exports.unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Initialize and clean invalid entries
    if (!message.pinnedBy) {
      message.pinnedBy = [];
    } else {
      message.pinnedBy = message.pinnedBy.filter(pin => pin && pin.user);
    }

    message.pinnedBy = message.pinnedBy.filter(
      pin => pin.user.toString() !== req.user._id.toString()
    );
    await message.save();

    res.json({ message: 'Message unpinned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get pinned messages
exports.getPinnedMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

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
      .limit(20);

    const validMessages = [];
    for (const msg of messages) {
      if (msg.pinnedBy) {
        msg.pinnedBy = msg.pinnedBy.filter(pin => pin && pin.user);
      }
      
      // Check if any pin is still valid (not expired) from EITHER user
      const validPins = msg.pinnedBy?.filter(pin => pin.expiresAt > now) || [];
      
      if (validPins.length > 0) {
        validMessages.push(msg);
      } else {
        // Remove all expired pins
        msg.pinnedBy = [];
        await msg.save();
      }
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get group messages
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'name username fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(limit);

    const decryptedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      sender: msg.sender,
      group: msg.group,
      content: msg.encrypted ? decrypt(msg.content) : msg.content,
      type: msg.type,
      voiceUrl: msg.voiceUrl,
      voiceDuration: msg.voiceDuration,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType,
      caption: msg.caption,
      reactions: msg.reactions,
      replyTo: msg.replyTo,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));

    res.json({ messages: decryptedMessages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send group message
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId, content, type = 'text' } = req.body;

    if (!content || !groupId) {
      return res.status(400).json({ message: 'Content and group are required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    if (group.settings.onlyAdminsCanSend && !group.admins.includes(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can send messages in this group' });
    }

    const message = await Message.create({
      sender: req.user._id,
      group: groupId,
      content,
      type,
      encrypted: false
    });

    await message.populate('sender', 'username fullName profileImage');

    res.status(201).json({ success: true, message: 'Message sent', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
