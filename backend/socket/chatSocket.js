const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { encrypt, decrypt } = require('../utils/encryption');

module.exports = (io, onlineUsers = new Map()) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user:online', async (userId) => {
      onlineUsers.set(userId, { socketId: socket.id, currentRoute: null });
      socket.userId = userId;
      socket.join(`user:${userId}`);
      
      // Update last seen
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      
      io.emit('user:status', { userId, status: 'online' });
      
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit('users:online', onlineUserIds);
      
      // Update delivery status for pending messages
      try {
        const pendingMessages = await Message.find({
          receiver: userId,
          delivered: false
        });
        
        for (const msg of pendingMessages) {
          msg.delivered = true;
          await msg.save();
          
          // Notify sender that message is now delivered
          const senderSocketId = onlineUsers.get(msg.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message:status', {
              messageId: msg._id,
              status: 'delivered'
            });
          }
        }
      } catch (error) {
        console.error('Error updating delivery status:', error);
      }
    });

    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content, replyTo } = data;
        const senderId = socket.userId;

        if (!senderId || !receiverId) {
          socket.emit('message:error', { error: 'Invalid sender or receiver' });
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
          const senderSocketId = onlineUsers.get(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message:status', {
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
          
          const senderSocketId = onlineUsers.get(senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit('message:status', {
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
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:pinned', { messageId, pinned: true });
        }
      } catch (error) {
        console.error('Pin notification error:', error);
      }
    });

    socket.on('message:unpin', async (data) => {
      try {
        const { messageId, receiverId } = data;
        
        // Notify the other user about the unpin
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:pinned', { messageId, pinned: false });
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
        
        console.log('📞 Call initiate received:', { receiverId, type, callerId });
        
        const receiverData = onlineUsers.get(receiverId);
        if (receiverData) {
          const caller = await User.findById(callerId).select('fullName username profileImage');
          console.log('✅ Emitting call:incoming to receiver:', receiverData.socketId);
          io.to(receiverData.socketId).emit('call:incoming', {
            callerId,
            caller,
            callType: type,
            callLogId
          });
        } else {
          console.log('❌ Receiver not online:', receiverId);
        }
      } catch (error) {
        console.error('Call initiate error:', error);
      }
    });

    socket.on('call:accept', (data) => {
      const { callerId } = data;
      const callerData = onlineUsers.get(callerId);
      if (callerData) {
        io.to(callerData.socketId).emit('call:accepted', {
          receiverId: socket.userId
        });
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
      const receiverData = onlineUsers.get(receiverId);
      if (receiverData) {
        io.to(receiverData.socketId).emit('call:offer', {
          callerId: socket.userId,
          offer
        });
      }
    });

    socket.on('call:answer', (data) => {
      const { callerId, answer } = data;
      const callerData = onlineUsers.get(callerId);
      if (callerData) {
        io.to(callerData.socketId).emit('call:answer', {
          receiverId: socket.userId,
          answer
        });
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

    socket.on('disconnect', async () => {
      if (socket.userId) {
        // Update last seen on disconnect
        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
        onlineUsers.delete(socket.userId);
        io.emit('user:status', { userId: socket.userId, status: 'offline' });
      }
      console.log('User disconnected:', socket.id);
    });
  });
};
