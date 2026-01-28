const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { encrypt, decrypt } = require('../utils/encryption');

module.exports = (io, onlineUsers = new Map()) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user:online', async (userId) => {
      if (!userId) {
        console.error('❌ user:online called without userId');
        return;
      }
      
      onlineUsers.set(userId, { socketId: socket.id, currentRoute: null });
      socket.userId = userId;
      socket.join(`user:${userId}`);
      
      console.log(`✅ User ${userId} online, socket: ${socket.id}`);
      
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      
      io.emit('user:status', { userId, status: 'online' });
      
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit('users:online', onlineUserIds);
      
      try {
        const pendingMessages = await Message.find({
          receiver: userId,
          delivered: false
        });
        
        for (const msg of pendingMessages) {
          msg.delivered = true;
          await msg.save();

          const senderData = onlineUsers.get(msg.sender.toString());
          if (senderData && senderData.socketId) {
            io.to(senderData.socketId).emit('message:status', {
              messageId: msg._id,
              status: 'delivered'
            });
          }
        }
      } catch (error) {
        console.error('Error updating delivery status:', error);
      }
    });

    socket.on('message:send:group', async (data) => {
      try {
        const { groupId, content, type = 'text' } = data;
        const senderId = socket.userId;

        if (!senderId) {
          console.error('❌ message:send:group: socket.userId not set');
          socket.emit('message:error', { error: 'Not authenticated' });
          return;
        }

        if (!groupId) {
          socket.emit('message:error', { error: 'Invalid group' });
          return;
        }

        const Group = require('../models/Group');
        const group = await Group.findById(groupId);
        
        if (!group) {
          socket.emit('message:error', { error: 'Group not found' });
          return;
        }
        
        if (!group.members.includes(senderId)) {
          socket.emit('message:error', { error: 'Not a member of this group' });
          return;
        }

        if (group.settings.onlyAdminsCanSend && !group.admins.includes(senderId)) {
          socket.emit('message:error', { error: 'Only admins can send messages' });
          return;
        }

        const message = await Message.create({
          sender: senderId,
          group: groupId,
          content,
          type,
          encrypted: false
        });

        await message.populate('sender', 'username name fullName profileImage');
        
        const messageData = {
          _id: message._id,
          sender: message.sender,
          group: message.group,
          content: message.content,
          type: message.type,
          reactions: message.reactions,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        };

        // Broadcast to all group members
        group.members.forEach(memberId => {
          const memberIdStr = memberId.toString();
          if (memberIdStr !== senderId) {
            const memberData = onlineUsers.get(memberIdStr);
            if (memberData) {
              io.to(memberData.socketId).emit('message:receive:group', messageData);
            }
          }
        });

        // Confirm to sender
        socket.emit('message:sent:group', messageData);

      } catch (error) {
        console.error('Group message send error:', error);
        socket.emit('message:error', { error: 'Failed to send group message' });
      }
    });

    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content, replyTo } = data;
        const senderId = socket.userId;

        if (!senderId) {
          console.error('❌ message:send: socket.userId not set');
          socket.emit('message:error', { error: 'Not authenticated' });
          return;
        }

        if (!receiverId) {
          socket.emit('message:error', { error: 'Invalid receiver' });
          return;
        }

        // Check if blocked
        const receiver = await User.findById(receiverId);
        const sender = await User.findById(senderId);
        
        if (!receiver || !sender) {
          socket.emit('message:error', { error: 'User not found' });
          return;
        }
        
        if (receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
          socket.emit('message:error', { error: 'You cannot send messages to this user' });
          return;
        }
        
        if (sender.blockedUsers && sender.blockedUsers.includes(receiverId)) {
          socket.emit('message:error', { error: 'You have blocked this user' });
          return;
        }

        const encryptedContent = encrypt(content);

        const message = await Message.create({
          sender: senderId,
          receiver: receiverId,
          content: encryptedContent,
          encrypted: true,
          delivered: onlineUsers.has(receiverId),
          replyTo: replyTo || null
        });

        await message.populate('sender', 'username name profileImage');
        
        const messageData = {
          _id: message._id,
          sender: message.sender,
          receiver: message.receiver,
          content: decrypt(message.content),
          delivered: message.delivered,
          read: message.read,
          replyTo: message.replyTo,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        };

        // Populate replyTo
        if (message.replyTo) {
          await message.populate({
            path: 'replyTo',
            select: 'content sender',
            populate: { path: 'sender', select: 'name username fullName' }
          });
          if (message.replyTo) {
            messageData.replyTo = {
              ...message.replyTo.toObject(),
              content: decrypt(message.replyTo.content)
            };
          }
        }

        // Get receiver data
        const receiverData = onlineUsers.get(receiverId);
        const isReceiverOnChat = receiverData && receiverData.currentRoute === '/chat';
        
        console.log(`📨 Sending message to ${receiverId}, on /chat: ${isReceiverOnChat}`);
        
        // Only create notification if receiver is NOT on /chat route
        if (!isReceiverOnChat) {
          await Notification.create({
            recipient: receiverId,
            sender: senderId,
            type: 'message',
            message: `sent you a message: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            createdAt: new Date()
          });
          
          // Notify receiver to update notification count - emit to user room
          io.to(`user:${receiverId}`).emit('notification:message', {
            sender: { _id: senderId, username: sender.username, profileImage: sender.profileImage }
          });
        }
        
        // Send message to receiver if online
        if (receiverData) {
          console.log(`✅ Emitting message:receive to ${receiverData.socketId}`);
          io.to(receiverData.socketId).emit('message:receive', messageData);
          message.delivered = true;
          await message.save();
        } else {
          console.log(`❌ Receiver ${receiverId} not online`);
        }

        socket.emit('message:sent', messageData);

      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });

    socket.on('message:read', async (messageId) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { read: true, delivered: true, readAt: new Date() },
          { new: true }
        );
        
        if (message) {
          const senderData = onlineUsers.get(message.sender.toString());
          if (senderData && senderData.socketId) {
            io.to(senderData.socketId).emit('message:status', {
              messageId,
              status: 'read',
              readAt: message.readAt
            });
          }
        }
      } catch (error) {
        console.error('Read update error:', error);
      }
    });
    
    socket.on('messages:mark-read', async (data) => {
      try {
        const { senderId } = data;
        const receiverId = socket.userId;
        
        const messages = await Message.find({
          sender: senderId,
          receiver: receiverId,
          read: false
        });
        
        for (const msg of messages) {
          msg.read = true;
          msg.delivered = true;
          msg.readAt = new Date();
          await msg.save();
          
          const senderData = onlineUsers.get(senderId);
          if (senderData && senderData.socketId) {
            io.to(senderData.socketId).emit('message:status', {
              messageId: msg._id,
              status: 'read',
              readAt: msg.readAt
            });
          }
        }
      } catch (error) {
        console.error('Bulk read update error:', error);
      }
    });

    socket.on('typing:start', (receiverId) => {
      const receiverData = onlineUsers.get(receiverId);
      if (receiverData) {
        console.log(`⌨️ Emitting typing:start from ${socket.userId} to ${receiverId}`);
        io.to(receiverData.socketId).emit('typing:status', {
          userId: socket.userId,
          typing: true
        });
      }
    });

    socket.on('typing:stop', (receiverId) => {
      const receiverData = onlineUsers.get(receiverId);
      if (receiverData) {
        console.log(`⌨️ Emitting typing:stop from ${socket.userId} to ${receiverId}`);
        io.to(receiverData.socketId).emit('typing:status', {
          userId: socket.userId,
          typing: false
        });
      }
    });

    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji } = data;
        const userId = socket.userId;

        const message = await Message.findById(messageId);
        if (!message) return;

        const existingReaction = message.reactions.find(
          r => r.user.toString() === userId
        );

        if (existingReaction) {
          existingReaction.emoji = emoji;
        } else {
          message.reactions.push({ user: userId, emoji });
        }

        await message.save();
        await message.populate('reactions.user', 'name username fullName');

        // Notify both users
        const receiverData = onlineUsers.get(message.receiver.toString());
        const senderData = onlineUsers.get(message.sender.toString());
        
        const reactionData = { messageId, reactions: message.reactions };
        
        console.log(`👍 Reaction added to message ${messageId}`);
        if (receiverData) {
          io.to(receiverData.socketId).emit('message:reaction', reactionData);
        }
        if (senderData) {
          io.to(senderData.socketId).emit('message:reaction', reactionData);
        }
      } catch (error) {
        console.error('Reaction error:', error);
      }
    });

    socket.on('message:unreact', async (data) => {
      try {
        const { messageId } = data;
        const userId = socket.userId;

        const message = await Message.findById(messageId);
        if (!message) return;

        message.reactions = message.reactions.filter(
          r => r.user.toString() !== userId
        );

        await message.save();

        // Notify both users
        const receiverData = onlineUsers.get(message.receiver.toString());
        const senderData = onlineUsers.get(message.sender.toString());
        
        const reactionData = { messageId, reactions: message.reactions };
        
        if (receiverData) {
          io.to(receiverData.socketId).emit('message:reaction', reactionData);
        }
        if (senderData) {
          io.to(senderData.socketId).emit('message:reaction', reactionData);
        }
      } catch (error) {
        console.error('Unreact error:', error);
      }
    });

    socket.on('message:pin', async (data) => {
      try {
        const { messageId, receiverId } = data;
        
        // Notify the other user about the pin
        const receiverData = onlineUsers.get(receiverId);
        if (receiverData && receiverData.socketId) {
          io.to(receiverData.socketId).emit('message:pinned', { messageId, pinned: true });
        }
      } catch (error) {
        console.error('Pin notification error:', error);
      }
    });

    socket.on('message:unpin', async (data) => {
      try {
        const { messageId, receiverId } = data;
        
        // Notify the other user about the unpin
        const receiverData = onlineUsers.get(receiverId);
        if (receiverData && receiverData.socketId) {
          io.to(receiverData.socketId).emit('message:pinned', { messageId, pinned: false });
        }
      } catch (error) {
        console.error('Unpin notification error:', error);
      }
    });

    socket.on('route:change', async (route) => {
      if (socket.userId) {
        const userData = onlineUsers.get(socket.userId);
        if (userData) {
          userData.currentRoute = route;
          onlineUsers.set(socket.userId, userData);
          console.log(`📍 User ${socket.userId} route changed to: ${route}`);
        }
        
        // Delete all message notifications when user opens /chat
        if (route === '/chat') {
          try {
            await Notification.deleteMany({
              recipient: socket.userId,
              type: 'message'
            });
            
            // Notify frontend to refresh notification count
            socket.emit('notifications:updated');
          } catch (err) {
            console.error('Failed to delete notifications:', err);
          }
        }
      }
    });

    // WebRTC Call Signaling Events
    socket.on('call:initiate', async (data) => {
      try {
        const { receiverId, type, callLogId } = data;
        const callerId = socket.userId;
        
        if (!callerId) {
          console.error('❌ Call initiate: socket.userId not set');
          socket.emit('call:error', { error: 'Not authenticated' });
          return;
        }
        
        console.log('📞 Call initiate:', { receiverId, type, callerId });
        
        const receiverData = onlineUsers.get(receiverId);
        if (receiverData) {
          const caller = await User.findById(callerId).select('fullName username profileImage');
          console.log('✅ Emitting call:incoming to:', receiverData.socketId);
          io.to(receiverData.socketId).emit('call:incoming', {
            callerId,
            caller,
            callType: type,
            callLogId
          });
        } else {
          console.log('❌ Receiver not online:', receiverId);
          socket.emit('call:error', { error: 'User is offline' });
        }
      } catch (error) {
        console.error('Call initiate error:', error);
        socket.emit('call:error', { error: 'Failed to initiate call' });
      }
    });

    socket.on('call:accept', (data) => {
      const { callerId } = data;
      const receiverId = socket.userId;
      
      if (!receiverId) {
        console.error('❌ Call accept: socket.userId not set');
        return;
      }
      
      const callerData = onlineUsers.get(callerId);
      if (callerData) {
        console.log('✅ Call accepted, notifying caller:', callerId);
        io.to(callerData.socketId).emit('call:accepted', { receiverId });
      }
    });

    socket.on('call:reject', (data) => {
      const { callerId } = data;
      const callerData = onlineUsers.get(callerId);
      if (callerData) {
        io.to(callerData.socketId).emit('call:rejected', {
          receiverId: socket.userId
        });
      }
    });

    socket.on('call:end', (data) => {
      const { userId } = data;
      const userData = onlineUsers.get(userId);
      if (userData) {
        io.to(userData.socketId).emit('call:ended');
      }
    });

    socket.on('call:offer', (data) => {
      const { receiverId, offer } = data;
      const callerId = socket.userId;
      
      if (!callerId) {
        console.error('❌ Call offer: socket.userId not set');
        return;
      }
      
      const receiverData = onlineUsers.get(receiverId);
      if (receiverData) {
        console.log('📞 Forwarding offer from', callerId, 'to', receiverId);
        io.to(receiverData.socketId).emit('call:offer', { callerId, offer });
      } else {
        console.error('❌ Receiver not found for offer:', receiverId);
      }
    });

    socket.on('call:answer', (data) => {
      const { callerId, answer } = data;
      const receiverId = socket.userId;
      
      if (!receiverId) {
        console.error('❌ Call answer: socket.userId not set');
        return;
      }
      
      const callerData = onlineUsers.get(callerId);
      if (callerData) {
        console.log('📞 Forwarding answer from', receiverId, 'to', callerId);
        io.to(callerData.socketId).emit('call:answer', { receiverId, answer });
      } else {
        console.error('❌ Caller not found for answer:', callerId);
      }
    });

    socket.on('call:ice-candidate', (data) => {
      const { receiverId, candidate } = data;
      const userData = onlineUsers.get(receiverId);
      if (userData) {
        io.to(userData.socketId).emit('call:ice-candidate', {
          candidate
        });
      }
    });

    // Group Call Events
    socket.on('groupcall:start', async (data) => {
      try {
        const { groupId, roomName, callType = 'video' } = data;
        const initiatorId = socket.userId;
        
        console.log('🎥 Group call start received:', { groupId, initiatorId });
        
        const Group = require('../models/Group');
        const GroupCall = require('../models/GroupCall');
        
        const group = await Group.findById(groupId).populate('members', 'fullName profileImage');
        
        if (!group) {
          console.log('❌ Group not found:', groupId);
          return;
        }
        
        // Check if there's already an active call
        const existingCall = await GroupCall.findOne({ group: groupId, status: 'active' });
        if (existingCall) {
          console.log('⚠️ Call already active for group:', groupId);
          socket.emit('groupcall:error', { error: 'A call is already active in this group' });
          return;
        }
        
        const initiator = await User.findById(initiatorId).select('fullName profileImage');
        
        console.log(`📡 Broadcasting to ${group.members.length} members`);
        
        // Notify all online group members except initiator
        let notifiedCount = 0;
        group.members.forEach(member => {
          const memberId = member._id.toString();
          if (memberId !== initiatorId) {
            const memberData = onlineUsers.get(memberId);
            if (memberData) {
              console.log(`📨 Sending invitation to ${memberId}`);
              io.to(memberData.socketId).emit('groupcall:invitation', {
                groupId,
                groupName: group.name,
                roomName,
                callType,
                initiator: {
                  _id: initiatorId,
                  fullName: initiator.fullName,
                  profileImage: initiator.profileImage
                }
              });
              notifiedCount++;
            }
          }
        });
        console.log(`✅ Notified ${notifiedCount} members`);
      } catch (error) {
        console.error('Group call start error:', error);
      }
    });

    socket.on('groupcall:join', async (data) => {
      try {
        const { groupId, roomName } = data;
        const userId = socket.userId;
        
        const Group = require('../models/Group');
        const GroupCall = require('../models/GroupCall');
        
        const group = await Group.findById(groupId);
        if (!group) return;
        
        const call = await GroupCall.findOne({ group: groupId, status: 'active' });
        if (call) {
          const alreadyJoined = call.participants.some(p => p.user.toString() === userId);
          if (!alreadyJoined) {
            call.participants.push({ user: userId });
            await call.save();
          }
        }
        
        const user = await User.findById(userId).select('fullName profileImage');
        
        // Notify all group members that someone joined
        group.members.forEach(memberId => {
          const memberIdStr = memberId.toString();
          const memberData = onlineUsers.get(memberIdStr);
          if (memberData) {
            io.to(memberData.socketId).emit('groupcall:user-joined', {
              groupId,
              roomName,
              user: {
                _id: userId,
                fullName: user.fullName,
                profileImage: user.profileImage
              }
            });
          }
        });
      } catch (error) {
        console.error('Group call join error:', error);
      }
    });

    socket.on('groupcall:leave', async (data) => {
      try {
        const { groupId, roomName } = data;
        const userId = socket.userId;
        
        console.log(`🚪 User ${userId} leaving call for group ${groupId}`);
        
        const Group = require('../models/Group');
        const GroupCall = require('../models/GroupCall');
        const { RoomServiceClient } = require('livekit-server-sdk');
        
        const group = await Group.findById(groupId);
        if (!group) return;
        
        const call = await GroupCall.findOne({ group: groupId, status: 'active' });
        if (!call) return;
        
        // Update participant left time
        const participant = call.participants.find(p => p.user.toString() === userId);
        if (participant && !participant.leftAt) {
          participant.leftAt = new Date();
          await call.save();
        }
        
        // Notify members someone left
        group.members.forEach(memberId => {
          const memberIdStr = memberId.toString();
          const memberData = onlineUsers.get(memberIdStr);
          if (memberData) {
            io.to(memberData.socketId).emit('groupcall:user-left', {
              groupId,
              roomName,
              userId
            });
          }
        });
        
        // Check if anyone is still in the LiveKit room
        const roomService = new RoomServiceClient(
          process.env.LIVEKIT_WS_URL.replace('wss://', 'https://').replace('ws://', 'http://'),
          process.env.LIVEKIT_API_KEY,
          process.env.LIVEKIT_API_SECRET
        );
        
        let participantCount = 0;
        try {
          const participants = await roomService.listParticipants(roomName);
          participantCount = participants.length;
          console.log(`📊 Participants in room: ${participantCount}`);
        } catch (err) {
          console.log('❌ Room not found or empty');
          participantCount = 0;
        }
        
        // If no one in room, end the call
        if (participantCount === 0) {
          console.log('🔚 No participants left, ending call');
          
          call.status = 'ended';
          call.endedAt = new Date();
          call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
          await call.save();
          
          // Create history message
          const Message = require('../models/Message');
          await call.populate('participants.user', 'fullName profileImage');
          
          // Get unique users who actually joined
          const uniqueUserMap = new Map();
          call.participants.forEach(p => {
            if (p.user && p.user._id) {
              uniqueUserMap.set(p.user._id.toString(), {
                _id: p.user._id,
                fullName: p.user.fullName,
                profileImage: p.user.profileImage
              });
            }
          });
          
          const joinedUsers = Array.from(uniqueUserMap.values());
          const joinedCount = joinedUsers.length;
          
          // Format duration
          const minutes = Math.floor(call.duration / 60);
          const seconds = call.duration % 60;
          const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          console.log('💾 Saving call history:', { duration: call.duration, joinedCount, callType: call.callType });
          
          const historyMsg = await Message.create({
            group: groupId,
            sender: call.initiator,
            content: `${call.callType === 'audio' ? 'Audio' : 'Video'} call ended`,
            type: 'groupcall',
            callData: {
              duration: call.duration,
              durationText,
              joinedCount,
              joinedUsers,
              callType: call.callType
            }
          });
          
          await historyMsg.populate('sender', 'fullName profileImage');
          
          console.log('📡 Broadcasting groupcall:ended');
          // Notify all members
          group.members.forEach(memberId => {
            const memberIdStr = memberId.toString();
            const memberData = onlineUsers.get(memberIdStr);
            if (memberData) {
              io.to(memberData.socketId).emit('groupcall:ended', { groupId });
              io.to(memberData.socketId).emit('message:receive:group', historyMsg);
            }
          });
        }
      } catch (error) {
        console.error('Group call leave error:', error);
      }
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
        onlineUsers.delete(socket.userId);
        io.emit('user:status', { userId: socket.userId, status: 'offline' });
        console.log(`🔴 User ${socket.userId} disconnected`);
      }
      console.log('Socket disconnected:', socket.id);
    });
  });
};
