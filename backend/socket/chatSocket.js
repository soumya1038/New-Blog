const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const CallLog = require('../models/CallLog');
const Group = require('../models/Group');
const GroupCall = require('../models/GroupCall');
const { encrypt, decrypt } = require('../utils/encryption');
const mongoose = require('mongoose');
const { RoomServiceClient } = require('livekit-server-sdk');
const { parsePositiveInt } = require('../utils/cacheStore');
const {
  validateTextMessageContent,
  validateReactionEmoji,
  validateTextMessageType
} = require('../utils/messageValidation');
const { incrementGroupUnreadCounts } = require('../utils/groupUnreadCounts');
const { isAccessTokenCurrent, verifyAccessToken } = require('../middleware/auth');
const { getLiveKitProviderTimeoutMs, withProviderTimeout } = require('../utils/providerTimeouts');

const isSameId = (left, right) => String(left || '') === String(right || '');
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const DIRECT_CALL_SESSION_TTL_MS = Math.min(
  parsePositiveInt(process.env.SOCKET_DIRECT_CALL_SESSION_TTL_SECONDS, 2 * 60 * 60),
  24 * 60 * 60
) * 1000;
const DIRECT_CALL_SESSION_MAX_ENTRIES = Math.min(
  parsePositiveInt(process.env.SOCKET_DIRECT_CALL_SESSION_MAX_ENTRIES, 10000),
  100000
);
const SOCKET_PENDING_DELIVERY_BATCH_LIMIT = parsePositiveInt(process.env.SOCKET_PENDING_DELIVERY_BATCH_LIMIT, 200);
const SOCKET_MARK_READ_BATCH_LIMIT = parsePositiveInt(process.env.SOCKET_MARK_READ_BATCH_LIMIT, 200);
const SOCKET_ROOM_NAME_MAX_LENGTH = parsePositiveInt(process.env.SOCKET_ROOM_NAME_MAX_LENGTH, 120);
const SOCKET_ROUTE_MAX_LENGTH = parsePositiveInt(process.env.SOCKET_ROUTE_MAX_LENGTH, 120);
const SOCKET_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.SOCKET_QUERY_MAX_TIME_MS) || 5000);
const LIVEKIT_PROVIDER_TIMEOUT_MS = getLiveKitProviderTimeoutMs();
const SOCKET_AUTH_TOKEN_MAX_LENGTH = Math.min(
  parsePositiveInt(process.env.AUTH_BEARER_TOKEN_MAX_LENGTH, 4096),
  8192
);
const CALL_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.CALL_QUERY_MAX_TIME_MS) || 5000);
const SOCKET_CALL_SDP_MAX_LENGTH = Math.min(
  parsePositiveInt(process.env.SOCKET_CALL_SDP_MAX_LENGTH, 128 * 1024),
  256 * 1024
);
const SOCKET_CALL_CANDIDATE_MAX_LENGTH = Math.min(
  parsePositiveInt(process.env.SOCKET_CALL_CANDIDATE_MAX_LENGTH, 4096),
  16 * 1024
);
const SOCKET_CALL_MID_MAX_LENGTH = Math.min(
  parsePositiveInt(process.env.SOCKET_CALL_MID_MAX_LENGTH, 64),
  256
);
const SOCKET_CALL_INITIATE_MAX_AGE_MS = Math.min(
  parsePositiveInt(process.env.SOCKET_CALL_INITIATE_MAX_AGE_SECONDS, 600),
  60 * 60
) * 1000;
const directCallSessions = new Map();

const formatErrorLogMessage = (error) => {
  const message = error && typeof error === 'object'
    ? (error.message || error.name)
    : error;
  return String(message || 'Unknown error').slice(0, 500);
};

const logSocketError = (message, error) => {
  console.error(message, formatErrorLogMessage(error));
};

const normalizeSocketRoomName = (value) => {
  const roomName = String(value || '').trim();
  if (!roomName || roomName.length > SOCKET_ROOM_NAME_MAX_LENGTH) return '';
  return /^[A-Za-z0-9._:-]+$/.test(roomName) ? roomName : '';
};

const normalizeSocketCallType = (value) => {
  const callType = String(value || 'video').trim().toLowerCase();
  return ['audio', 'video'].includes(callType) ? callType : '';
};

const isLiveKitRoomMissingError = (error) => (
  error?.code === 'not_found' ||
  error?.status === 404 ||
  error?.statusCode === 404
);

const buildEndedGroupCallFields = (call) => {
  const endedAt = new Date();
  const startedAtMs = new Date(call?.startedAt).getTime();
  const duration = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((endedAt.getTime() - startedAtMs) / 1000))
    : 0;

  return { status: 'ended', endedAt, duration };
};

const populateGroupCallParticipants = (query) =>
  query.populate({
    path: 'participants.user',
    select: 'fullName profileImage',
    options: { maxTimeMS: CALL_QUERY_MAX_TIME_MS }
  });

const findSocketGroupForMember = (groupId, userId, select = '_id members name') => {
  if (!isValidObjectId(groupId) || !isValidObjectId(userId)) return null;

  return Group.findOne({ _id: groupId, members: userId })
    .select(select)
    .lean()
    .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
};

const normalizeDirectCallType = (value) => {
  const callType = String(value || '').trim().toLowerCase();
  return ['audio', 'video'].includes(callType) ? callType : '';
};

const normalizeObjectIdString = (value) => (isValidObjectId(value) ? String(value) : '');

const normalizeCallSessionDescription = (value, expectedType) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const type = String(value.type || '').trim().toLowerCase();
  const sdp = typeof value.sdp === 'string' ? value.sdp : '';

  if (type !== expectedType) return null;
  if (!sdp || sdp.length > SOCKET_CALL_SDP_MAX_LENGTH) return null;
  if (!/^v=0(?:\r\n|\n)/.test(sdp) || sdp.includes('\0')) return null;

  return { type, sdp };
};

const normalizeOptionalSignalingString = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return null;
  if (value.length > SOCKET_CALL_MID_MAX_LENGTH) return null;
  if (/[\0\r\n]/.test(value)) return null;
  return value;
};

const normalizeIceCandidate = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const candidate = typeof value.candidate === 'string' ? value.candidate.trim() : '';
  if (!candidate || candidate.length > SOCKET_CALL_CANDIDATE_MAX_LENGTH) return null;
  if (!candidate.startsWith('candidate:') || /[\0\r\n]/.test(candidate)) return null;

  const normalized = { candidate };
  const sdpMid = normalizeOptionalSignalingString(value.sdpMid);
  const usernameFragment = normalizeOptionalSignalingString(value.usernameFragment);

  if (sdpMid === null || usernameFragment === null) return null;
  if (sdpMid !== undefined) normalized.sdpMid = sdpMid;
  if (usernameFragment !== undefined) normalized.usernameFragment = usernameFragment;

  if (value.sdpMLineIndex !== undefined && value.sdpMLineIndex !== null) {
    const sdpMLineIndex = Number(value.sdpMLineIndex);
    if (!Number.isInteger(sdpMLineIndex) || sdpMLineIndex < 0 || sdpMLineIndex > 64) {
      return null;
    }
    normalized.sdpMLineIndex = sdpMLineIndex;
  }

  if (normalized.sdpMid === undefined && normalized.sdpMLineIndex === undefined) {
    return null;
  }

  return normalized;
};

const getLiveKitConfig = () => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_WS_URL;

  if (!apiKey || !apiSecret || !wsUrl) return null;

  return {
    apiKey,
    apiSecret,
    httpUrl: wsUrl.replace('wss://', 'https://').replace('ws://', 'http://')
  };
};

const getDirectCallKey = (left, right) => [String(left || ''), String(right || '')].sort().join(':');

const pruneDirectCallSessions = () => {
  const now = Date.now();
  for (const [key, session] of directCallSessions.entries()) {
    if (!session || session.expiresAt <= now) {
      directCallSessions.delete(key);
    }
  }
  while (directCallSessions.size > DIRECT_CALL_SESSION_MAX_ENTRIES) {
    const oldestKey = directCallSessions.keys().next().value;
    if (!oldestKey) break;
    directCallSessions.delete(oldestKey);
  }
};

const setDirectCallSession = ({ callerId, receiverId, callLogId, type }) => {
  pruneDirectCallSessions();
  directCallSessions.set(getDirectCallKey(callerId, receiverId), {
    callerId: String(callerId),
    receiverId: String(receiverId),
    callLogId: String(callLogId),
    type,
    expiresAt: Date.now() + DIRECT_CALL_SESSION_TTL_MS,
  });
  pruneDirectCallSessions();
};

const getDirectCallSession = (left, right) => {
  const key = getDirectCallKey(left, right);
  const session = directCallSessions.get(key);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    directCallSessions.delete(key);
    return null;
  }
  return session;
};

const clearDirectCallSession = (left, right) => {
  directCallSessions.delete(getDirectCallKey(left, right));
};

const isDirectCallParticipant = (left, right) => Boolean(getDirectCallSession(left, right));
const SOCKET_EVENT_LIMITS = {
  default: { limit: 120, windowMs: 60 * 1000 },
  'user:online': { limit: 20, windowMs: 60 * 1000 },
  'message:send': { limit: 60, windowMs: 60 * 1000 },
  'message:send:group': { limit: 60, windowMs: 60 * 1000 },
  'message:read': { limit: 240, windowMs: 60 * 1000 },
  'messages:mark-read': { limit: 120, windowMs: 60 * 1000 },
  'message:react': { limit: 120, windowMs: 60 * 1000 },
  'message:unreact': { limit: 120, windowMs: 60 * 1000 },
  'message:pin': { limit: 60, windowMs: 60 * 1000 },
  'message:unpin': { limit: 60, windowMs: 60 * 1000 },
  'route:change': { limit: 120, windowMs: 60 * 1000 },
  'typing:start': { limit: 180, windowMs: 60 * 1000 },
  'typing:stop': { limit: 180, windowMs: 60 * 1000 },
  'call:ice-candidate': { limit: 900, windowMs: 60 * 1000 },
  'call:offer': { limit: 60, windowMs: 60 * 1000 },
  'call:answer': { limit: 60, windowMs: 60 * 1000 },
  'call:initiate': { limit: 30, windowMs: 60 * 1000 },
  'call:accept': { limit: 120, windowMs: 60 * 1000 },
  'call:reject': { limit: 120, windowMs: 60 * 1000 },
  'call:end': { limit: 120, windowMs: 60 * 1000 },
  'groupcall:start': { limit: 20, windowMs: 60 * 1000 },
  'groupcall:join': { limit: 60, windowMs: 60 * 1000 },
  'groupcall:leave': { limit: 60, windowMs: 60 * 1000 },
};

const createSocketEventLimiter = (socket) => {
  const buckets = new Map();

  return (eventName) => {
    const config = SOCKET_EVENT_LIMITS[eventName] || SOCKET_EVENT_LIMITS.default;
    const now = Date.now();
    const bucket = buckets.get(eventName);
    const current = bucket && bucket.resetAt > now
      ? bucket
      : { count: 0, resetAt: now + config.windowMs };

    current.count += 1;
    buckets.set(eventName, current);

    if (current.count > config.limit) {
      socket.emit('rate-limit:error', {
        event: eventName,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      });
      return false;
    }

    return true;
  };
};

const getSocketToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  const header = socket.handshake?.headers?.authorization || '';
  const token = authToken || (header.startsWith('Bearer ') ? header.slice(7) : '');
  if (!token || typeof token !== 'string') return '';
  if (token.length > SOCKET_AUTH_TOKEN_MAX_LENGTH) return '';
  if (/[\0\r\n]/.test(token)) return '';
  return token;
};

const getOnlineSocketIds = (userData) => {
  if (!userData) return [];
  if (userData.socketIds instanceof Set) return Array.from(userData.socketIds);
  if (Array.isArray(userData.socketIds)) return userData.socketIds.map(String).filter(Boolean);
  return userData.socketId ? [String(userData.socketId)] : [];
};

const getOnlineRouteMap = (userData) => {
  const routes = userData?.currentRoutes instanceof Map
    ? new Map(userData.currentRoutes)
    : new Map();

  if (userData?.socketId && userData.currentRoute !== undefined && !routes.has(userData.socketId)) {
    routes.set(String(userData.socketId), userData.currentRoute);
  }

  return routes;
};

const markUserSocketOnline = (onlineUsers, userId, socketId) => {
  const userKey = String(userId);
  const existing = onlineUsers.get(userKey) || {};
  const socketIds = new Set(getOnlineSocketIds(existing));
  const wasOffline = socketIds.size === 0;
  socketIds.add(socketId);

  const currentRoutes = getOnlineRouteMap(existing);
  if (!currentRoutes.has(socketId)) currentRoutes.set(socketId, null);

  onlineUsers.set(userKey, {
    socketId,
    socketIds,
    currentRoute: currentRoutes.get(socketId) || existing.currentRoute || null,
    currentRoutes,
  });

  return wasOffline;
};

const setOnlineUserRoute = (onlineUsers, userId, socketId, route) => {
  const userKey = String(userId);
  const existing = onlineUsers.get(userKey);
  if (!existing) return;

  const socketIds = new Set(getOnlineSocketIds(existing));
  socketIds.add(socketId);

  const currentRoutes = getOnlineRouteMap(existing);
  currentRoutes.set(socketId, route);

  onlineUsers.set(userKey, {
    socketId: existing.socketId || socketId,
    socketIds,
    currentRoute: route,
    currentRoutes,
  });
};

const isOnlineUserOnRoute = (onlineUsers, userId, route) => {
  const userData = onlineUsers.get(String(userId));
  if (!userData) return false;

  const currentRoutes = getOnlineRouteMap(userData);
  if (currentRoutes.size > 0) {
    return Array.from(currentRoutes.values()).some((currentRoute) => currentRoute === route);
  }

  return userData.currentRoute === route;
};

const removeOnlineUserSocket = (onlineUsers, userId, socketId) => {
  const userKey = String(userId);
  const existing = onlineUsers.get(userKey);
  if (!existing) return true;

  const socketIds = new Set(getOnlineSocketIds(existing));
  socketIds.delete(socketId);

  if (socketIds.size === 0) {
    onlineUsers.delete(userKey);
    return true;
  }

  const currentRoutes = getOnlineRouteMap(existing);
  currentRoutes.delete(socketId);
  const nextSocketId = Array.from(socketIds).pop();

  onlineUsers.set(userKey, {
    socketId: nextSocketId,
    socketIds,
    currentRoute: currentRoutes.get(nextSocketId) || null,
    currentRoutes,
  });

  return false;
};

const emitToOnlineUser = (io, onlineUsers, userId, eventName, payload) => {
  const socketIds = getOnlineSocketIds(onlineUsers.get(String(userId)));
  if (socketIds.length === 0) return false;

  socketIds.forEach((socketId) => {
    io.to(socketId).emit(eventName, payload);
  });

  return true;
};

const canDirectUsersInteract = async (senderId, receiverId) => {
  if (!senderId || !receiverId || isSameId(senderId, receiverId)) return false;
  if (!isValidObjectId(senderId) || !isValidObjectId(receiverId)) return false;

  const [sender, receiver] = await Promise.all([
    User.findById(senderId).select('blockedUsers').lean().maxTimeMS(SOCKET_QUERY_MAX_TIME_MS),
    User.findById(receiverId).select('blockedUsers').lean().maxTimeMS(SOCKET_QUERY_MAX_TIME_MS),
  ]);

  const allowed = Boolean(
    sender &&
    receiver &&
    !sender.blockedUsers?.some((id) => isSameId(id, receiverId)) &&
    !receiver.blockedUsers?.some((id) => isSameId(id, senderId))
  );

  return allowed;
};

const isGroupMember = async (groupId, userId) => {
  if (!groupId || !userId) return false;
  return Boolean(await Group.exists({ _id: groupId, members: userId }).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS));
};

const canAccessMessage = async (message, userId) => {
  if (!message || !userId) return false;
  if (message.group) return isGroupMember(message.group, userId);
  return isSameId(message.sender, userId) || isSameId(message.receiver, userId);
};

const normalizeSocketRoute = (value) => {
  const route = String(value || '').trim();
  if (!route || route.length > SOCKET_ROUTE_MAX_LENGTH) return '';
  if (!route.startsWith('/') || /[\0\r\n]/.test(route)) return '';
  return route;
};

const isDirectReplyForParticipants = (reply, leftUserId, rightUserId) => {
  if (!reply || reply.group) return false;
  const replySenderId = reply.sender?._id || reply.sender;
  const replyReceiverId = reply.receiver?._id || reply.receiver;

  return (
    isSameId(replySenderId, leftUserId) &&
    isSameId(replyReceiverId, rightUserId)
  ) || (
    isSameId(replySenderId, rightUserId) &&
    isSameId(replyReceiverId, leftUserId)
  );
};

const emitMessageReaction = async (io, onlineUsers, message, reactionData) => {
  if (message.group) {
    const group = await Group.findById(message.group)
      .select('members')
      .lean()
      .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
    (group?.members || []).forEach((memberId) => {
      emitToOnlineUser(io, onlineUsers, memberId, 'message:reaction', reactionData);
    });
    return;
  }

  if (message.receiver) emitToOnlineUser(io, onlineUsers, message.receiver, 'message:reaction', reactionData);
  if (message.sender) emitToOnlineUser(io, onlineUsers, message.sender, 'message:reaction', reactionData);
};

module.exports = (io, onlineUsers = new Map()) => {
  io.use(async (socket, next) => {
    try {
      const token = getSocketToken(socket);
      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id)
        .select('_id username fullName profileImage role authVersion isActive suspendedUntil isGuest guestExpiresAt')
        .lean()
        .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
      if (!user) return next(new Error('User not found'));
      if (!isAccessTokenCurrent(decoded, user)) return next(new Error('Session expired'));
      if (!user.isActive || (user.suspendedUntil && new Date() < new Date(user.suspendedUntil))) {
        return next(new Error('Account unavailable'));
      }
      if (user.isGuest && user.guestExpiresAt && new Date() >= user.guestExpiresAt) {
        return next(new Error('Guest session expired'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const allowSocketEvent = createSocketEventLimiter(socket);
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('user:online', async (userId) => {
      if (!allowSocketEvent('user:online')) return;
      const authenticatedUserId = socket.userId;
      if (userId && String(userId) !== authenticatedUserId) {
        socket.emit('auth:error', { error: 'Socket user mismatch' });
        return;
      }
      
      const wasOffline = markUserSocketOnline(onlineUsers, authenticatedUserId, socket.id);
      socket.join(`user:${authenticatedUserId}`);
      
      try {
        await User.findByIdAndUpdate(authenticatedUserId, { lastSeen: new Date() })
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
      } catch (error) {
        logSocketError('Online lastSeen update error:', error);
      }
      
      if (wasOffline) {
        io.emit('user:status', { userId: authenticatedUserId, status: 'online' });
      }
      
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit('users:online', onlineUserIds);
      
      try {
        const pendingMessages = await Message.find({
          receiver: authenticatedUserId,
          delivered: false
        })
          .select('_id sender')
          .sort({ createdAt: 1, _id: 1 })
          .limit(SOCKET_PENDING_DELIVERY_BATCH_LIMIT)
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS)
          .lean();

        const pendingMessageIds = pendingMessages.map((message) => message._id);
        if (pendingMessageIds.length > 0) {
          await Message.updateMany(
            {
              _id: { $in: pendingMessageIds },
              receiver: authenticatedUserId,
              delivered: false
            },
            { $set: { delivered: true } }
          ).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        }

        for (const msg of pendingMessages) {
          emitToOnlineUser(io, onlineUsers, msg.sender, 'message:status', {
            messageId: msg._id,
            status: 'delivered'
          });
        }

        if (pendingMessages.length === SOCKET_PENDING_DELIVERY_BATCH_LIMIT) {
          const remainingPending = await Message.exists({
            receiver: authenticatedUserId,
            delivered: false
          }).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
          if (remainingPending) {
            socket.emit('messages:delivery-sync:pending', {
              limit: SOCKET_PENDING_DELIVERY_BATCH_LIMIT
            });
          }
        }
      } catch (error) {
        logSocketError('Error updating delivery status:', error);
      }
    });

    socket.on('message:send:group', async (data) => {
      if (!allowSocketEvent('message:send:group')) return;
      try {
        const { groupId, content, type = 'text' } = data;
        const senderId = socket.userId;
        const safeGroupId = normalizeObjectIdString(groupId);

        if (!senderId) {
          socket.emit('message:error', { error: 'Not authenticated' });
          return;
        }

        if (!safeGroupId) {
          socket.emit('message:error', { error: 'Invalid group' });
          return;
        }

        const typeValidation = validateTextMessageType(type);
        if (typeValidation.error) {
          socket.emit('message:error', { error: typeValidation.error });
          return;
        }

        const contentValidation = validateTextMessageContent(content);
        if (contentValidation.error) {
          socket.emit('message:error', { error: contentValidation.error });
          return;
        }
        const messageContent = contentValidation.value;

        const group = await findSocketGroupForMember(safeGroupId, senderId, '_id members admins settings');
        if (!group) {
          socket.emit('message:error', { error: 'Not a member of this group' });
          return;
        }

        if (group.settings?.onlyAdminsCanSend && !group.admins.some(adminId => adminId.toString() === senderId)) {
          socket.emit('message:error', { error: 'Only admins can send messages' });
          return;
        }

        const message = await Message.create({
          sender: senderId,
          group: safeGroupId,
          content: encrypt(messageContent),
          type: typeValidation.value,
          encrypted: true
        });

        await message.populate({
          path: 'sender',
          select: 'username name fullName profileImage',
          options: { maxTimeMS: SOCKET_QUERY_MAX_TIME_MS }
        });
        
        const messageData = {
          _id: message._id,
          sender: message.sender,
          group: message.group,
          content: messageContent,
          type: message.type,
          reactions: message.reactions,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        };

        await incrementGroupUnreadCounts({
          groupId: safeGroupId,
          senderId,
          memberIds: group.members
        });

        // Broadcast to all group members
        group.members.forEach(memberId => {
          const memberIdStr = memberId.toString();
          if (memberIdStr !== senderId) {
            emitToOnlineUser(io, onlineUsers, memberIdStr, 'message:receive:group', messageData);
          }
        });

        // Confirm to sender
        socket.emit('message:sent:group', messageData);

      } catch (error) {
        logSocketError('Group message send error:', error);
        socket.emit('message:error', { error: 'Failed to send group message' });
      }
    });

    socket.on('message:send', async (data) => {
      if (!allowSocketEvent('message:send')) return;
      try {
        const { receiverId, content, replyTo } = data;
        const senderId = socket.userId;
        const safeReceiverId = normalizeObjectIdString(receiverId);

        if (!senderId) {
          socket.emit('message:error', { error: 'Not authenticated' });
          return;
        }

        if (!safeReceiverId || safeReceiverId === senderId) {
          socket.emit('message:error', { error: 'Invalid receiver' });
          return;
        }

        const contentValidation = validateTextMessageContent(content);
        if (contentValidation.error) {
          socket.emit('message:error', { error: contentValidation.error });
          return;
        }
        const messageContent = contentValidation.value;

        if (replyTo && !isValidObjectId(replyTo)) {
          socket.emit('message:error', { error: 'Invalid reply target' });
          return;
        }

        // Check if blocked
        const [receiver, sender] = await Promise.all([
          User.findById(safeReceiverId)
            .select('blockedUsers username fullName profileImage')
            .lean()
            .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS),
          User.findById(senderId)
            .select('blockedUsers username fullName profileImage')
            .lean()
            .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS)
        ]);
        
        if (!receiver || !sender) {
          socket.emit('message:error', { error: 'User not found' });
          return;
        }
        
        if (receiver.blockedUsers?.some((id) => id.toString() === senderId)) {
          socket.emit('message:error', { error: 'You cannot send messages to this user' });
          return;
        }
        
        if (sender.blockedUsers?.some((id) => id.toString() === safeReceiverId)) {
          socket.emit('message:error', { error: 'You have blocked this user' });
          return;
        }

        let replyToId = null;
        if (replyTo) {
          const replyTarget = await Message.findById(replyTo)
            .select('_id sender receiver group encrypted deletedForEveryone')
            .lean()
            .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
          if (
            !replyTarget ||
            replyTarget.deletedForEveryone ||
            !isDirectReplyForParticipants(replyTarget, senderId, safeReceiverId)
          ) {
            socket.emit('message:error', { error: 'Invalid reply target' });
            return;
          }
          replyToId = replyTarget._id;
        }

        const encryptedContent = encrypt(messageContent);

        const receiverData = onlineUsers.get(safeReceiverId);
        const receiverIsOnline = getOnlineSocketIds(receiverData).length > 0;

        const message = await Message.create({
          sender: senderId,
          receiver: safeReceiverId,
          content: encryptedContent,
          encrypted: true,
          delivered: receiverIsOnline,
          replyTo: replyToId
        });

        await message.populate({
          path: 'sender',
          select: 'username name fullName profileImage',
          options: { maxTimeMS: SOCKET_QUERY_MAX_TIME_MS }
        });
        
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
            select: 'content sender receiver group encrypted',
            options: { maxTimeMS: SOCKET_QUERY_MAX_TIME_MS },
            populate: {
              path: 'sender',
              select: 'name username fullName',
              options: { maxTimeMS: SOCKET_QUERY_MAX_TIME_MS }
            }
          });
          if (message.replyTo) {
            messageData.replyTo = {
              ...message.replyTo.toObject(),
              content: message.replyTo.encrypted ? decrypt(message.replyTo.content) : message.replyTo.content
            };
          }
        }

        const isReceiverOnChat = isOnlineUserOnRoute(onlineUsers, safeReceiverId, '/chat');
        
        
        // Only create notification if receiver is NOT on /chat route
        if (!isReceiverOnChat) {
          await Notification.create({
            recipient: safeReceiverId,
            sender: senderId,
            type: 'message',
            message: `sent you a message: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
            createdAt: new Date()
          });
          
          // Notify receiver to update notification count - emit to user room
          io.to(`user:${safeReceiverId}`).emit('notification:message', {
            sender: { _id: senderId, username: sender.username, profileImage: sender.profileImage }
          });
        }
        
        // Send message to receiver if online
        if (getOnlineSocketIds(onlineUsers.get(safeReceiverId)).length > 0) {
          messageData.delivered = true;
        }
        if (emitToOnlineUser(io, onlineUsers, safeReceiverId, 'message:receive', messageData)) {
          await Message.updateOne(
            { _id: message._id, delivered: false },
            { $set: { delivered: true } }
          ).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
          messageData.delivered = true;
        }

        socket.emit('message:sent', messageData);

      } catch (error) {
        logSocketError('Message send error:', error);
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });

    socket.on('message:read', async (messageId) => {
      if (!allowSocketEvent('message:read')) return;
      try {
        const userId = socket.userId;
        if (!isValidObjectId(messageId)) return;

        const message = await Message.findOneAndUpdate(
          { _id: messageId, receiver: userId },
          { $set: { read: true, delivered: true, readAt: new Date() } },
          { new: true }
        )
          .select('sender readAt')
          .lean()
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        
        if (message) {
          emitToOnlineUser(io, onlineUsers, message.sender, 'message:status', {
            messageId,
            status: 'read',
            readAt: message.readAt
          });
        }
      } catch (error) {
        logSocketError('Read update error:', error);
      }
    });
    
    socket.on('messages:mark-read', async (data) => {
      if (!allowSocketEvent('messages:mark-read')) return;
      try {
        const { senderId } = data;
        const receiverId = socket.userId;
        if (!isValidObjectId(senderId)) return;

        const messages = await Message.find({
          sender: senderId,
          receiver: receiverId,
          read: false
        })
          .select('_id')
          .sort({ createdAt: 1, _id: 1 })
          .limit(SOCKET_MARK_READ_BATCH_LIMIT)
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS)
          .lean();

        const messageIds = messages.map((message) => message._id);
        const readAt = new Date();
        if (messageIds.length > 0) {
          await Message.updateMany(
            {
              _id: { $in: messageIds },
              sender: senderId,
              receiver: receiverId,
              read: false
            },
            { $set: { read: true, delivered: true, readAt } }
          ).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        }

        if (getOnlineSocketIds(onlineUsers.get(senderId)).length > 0) {
          for (const msg of messages) {
            emitToOnlineUser(io, onlineUsers, senderId, 'message:status', {
              messageId: msg._id,
              status: 'read',
              readAt
            });
          }
        }

        if (messages.length === SOCKET_MARK_READ_BATCH_LIMIT) {
          const remainingUnread = await Message.exists({
            sender: senderId,
            receiver: receiverId,
            read: false
          }).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
          if (remainingUnread) {
            socket.emit('messages:mark-read:pending', {
              senderId,
              limit: SOCKET_MARK_READ_BATCH_LIMIT
            });
          }
        }
      } catch (error) {
        logSocketError('Bulk read update error:', error);
      }
    });

    socket.on('typing:start', async (receiverId) => {
      if (!allowSocketEvent('typing:start')) return;
      const safeReceiverId = normalizeObjectIdString(receiverId);
      if (!safeReceiverId || !(await canDirectUsersInteract(socket.userId, safeReceiverId))) return;
      emitToOnlineUser(io, onlineUsers, safeReceiverId, 'typing:status', {
        userId: socket.userId,
        typing: true
      });
    });

    socket.on('typing:stop', async (receiverId) => {
      if (!allowSocketEvent('typing:stop')) return;
      const safeReceiverId = normalizeObjectIdString(receiverId);
      if (!safeReceiverId || !(await canDirectUsersInteract(socket.userId, safeReceiverId))) return;
      emitToOnlineUser(io, onlineUsers, safeReceiverId, 'typing:status', {
        userId: socket.userId,
        typing: false
      });
    });

    socket.on('message:react', async (data) => {
      if (!allowSocketEvent('message:react')) return;
      try {
        const { messageId, emoji } = data;
        const userId = socket.userId;
        if (!isValidObjectId(messageId)) return;

        const reactionValidation = validateReactionEmoji(emoji);
        if (reactionValidation.error) return;
        const reactionEmoji = reactionValidation.value;

        const message = await Message.findById(messageId)
          .select('_id sender receiver group deletedForEveryone')
          .lean()
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        if (!message || message.deletedForEveryone) return;
        if (!await canAccessMessage(message, userId)) return;

        const reactedAt = new Date();
        const existingUpdate = await Message.updateOne(
          { _id: messageId, deletedForEveryone: { $ne: true }, 'reactions.user': userId },
          {
            $set: {
              'reactions.$.emoji': reactionEmoji,
              'reactions.$.createdAt': reactedAt
            }
          }
        ).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);

        if (existingUpdate.matchedCount === 0) {
          await Message.updateOne(
            { _id: messageId, deletedForEveryone: { $ne: true }, 'reactions.user': { $ne: userId } },
            { $push: { reactions: { user: userId, emoji: reactionEmoji, createdAt: reactedAt } } }
          ).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        }

        const updatedMessage = await Message.findOne({ _id: messageId, deletedForEveryone: { $ne: true } })
          .select('sender receiver group reactions')
          .populate({
            path: 'reactions.user',
            select: 'name username fullName',
            options: { maxTimeMS: SOCKET_QUERY_MAX_TIME_MS }
          })
          .lean()
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        if (!updatedMessage) return;

        const reactionData = { messageId, reactions: updatedMessage.reactions };
        
        await emitMessageReaction(io, onlineUsers, updatedMessage, reactionData);
      } catch (error) {
        logSocketError('Reaction error:', error);
      }
    });

    socket.on('message:unreact', async (data) => {
      if (!allowSocketEvent('message:unreact')) return;
      try {
        const { messageId } = data;
        const userId = socket.userId;
        if (!isValidObjectId(messageId)) return;

        const message = await Message.findById(messageId)
          .select('_id sender receiver group deletedForEveryone')
          .lean()
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        if (!message || message.deletedForEveryone) return;
        if (!await canAccessMessage(message, userId)) return;

        await Message.updateOne(
          { _id: messageId, deletedForEveryone: { $ne: true } },
          { $pull: { reactions: { user: userId } } }
        ).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);

        const updatedMessage = await Message.findOne({ _id: messageId, deletedForEveryone: { $ne: true } })
          .select('sender receiver group reactions')
          .populate({
            path: 'reactions.user',
            select: 'name username fullName',
            options: { maxTimeMS: SOCKET_QUERY_MAX_TIME_MS }
          })
          .lean()
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        if (!updatedMessage) return;

        const reactionData = { messageId, reactions: updatedMessage.reactions };
        
        await emitMessageReaction(io, onlineUsers, updatedMessage, reactionData);
      } catch (error) {
        logSocketError('Unreact error:', error);
      }
    });

    socket.on('message:pin', async (data) => {
      if (!allowSocketEvent('message:pin')) return;
      try {
        const { messageId, receiverId } = data;
        const safeReceiverId = normalizeObjectIdString(receiverId);

        if (!isValidObjectId(messageId) || !safeReceiverId) return;

        const message = await Message.findById(messageId)
          .select('sender receiver group')
          .lean()
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        if (!message || message.group) return;

        const participantIds = [message.sender, message.receiver].map((id) => id?.toString()).filter(Boolean);
        if (!participantIds.includes(socket.userId) || !participantIds.includes(safeReceiverId) || safeReceiverId === socket.userId) {
          return;
        }

        emitToOnlineUser(io, onlineUsers, safeReceiverId, 'message:pinned', { messageId, pinned: true });
      } catch (error) {
        logSocketError('Pin notification error:', error);
      }
    });

    socket.on('message:unpin', async (data) => {
      if (!allowSocketEvent('message:unpin')) return;
      try {
        const { messageId, receiverId } = data;
        const safeReceiverId = normalizeObjectIdString(receiverId);

        if (!isValidObjectId(messageId) || !safeReceiverId) return;

        const message = await Message.findById(messageId)
          .select('sender receiver group')
          .lean()
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        if (!message || message.group) return;

        const participantIds = [message.sender, message.receiver].map((id) => id?.toString()).filter(Boolean);
        if (!participantIds.includes(socket.userId) || !participantIds.includes(safeReceiverId) || safeReceiverId === socket.userId) {
          return;
        }

        emitToOnlineUser(io, onlineUsers, safeReceiverId, 'message:pinned', { messageId, pinned: false });
      } catch (error) {
        logSocketError('Unpin notification error:', error);
      }
    });

    socket.on('route:change', async (route) => {
      if (!allowSocketEvent('route:change')) return;
      const safeRoute = normalizeSocketRoute(route);
      if (!safeRoute) return;

      if (socket.userId) {
        setOnlineUserRoute(onlineUsers, socket.userId, socket.id, safeRoute);
        
        // Delete all message notifications when user opens /chat
        if (safeRoute === '/chat') {
          try {
            await Notification.deleteMany({
              recipient: socket.userId,
              type: 'message'
            }).maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
            
            // Notify frontend to refresh notification count
            socket.emit('notifications:updated');
          } catch (err) {
            logSocketError('Failed to delete notifications:', err);
          }
        }
      }
    });

    // WebRTC Call Signaling Events
    socket.on('call:initiate', async (data) => {
      try {
        if (!allowSocketEvent('call:initiate')) return;
        const payload = data && typeof data === 'object' ? data : {};
        const receiverId = normalizeObjectIdString(payload.receiverId);
        const type = normalizeDirectCallType(payload.type);
        const callLogId = normalizeObjectIdString(payload.callLogId);
        const callerId = socket.userId;
        
        if (!callerId) {
          socket.emit('call:error', { error: 'Not authenticated' });
          return;
        }

        if (!receiverId || !callLogId || !type) {
          socket.emit('call:error', { error: 'Invalid call request' });
          return;
        }
        if (isSameId(callerId, receiverId)) {
          socket.emit('call:error', { error: 'Cannot call yourself' });
          return;
        }

        const callLog = await CallLog.findOne({
          _id: callLogId,
          caller: callerId,
          receiver: receiverId,
          type
        })
          .select('caller receiver type status createdAt')
          .lean()
          .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
        if (!callLog) {
          socket.emit('call:error', { error: 'Call session not found' });
          return;
        }
        const callLogAgeMs = Date.now() - new Date(callLog.createdAt).getTime();
        if (callLog.status !== 'missed' || !Number.isFinite(callLogAgeMs) || callLogAgeMs > SOCKET_CALL_INITIATE_MAX_AGE_MS) {
          socket.emit('call:error', { error: 'Call session expired' });
          return;
        }
        if (!(await canDirectUsersInteract(callerId, receiverId))) {
          socket.emit('call:error', { error: 'You cannot call this user' });
          return;
        }

        if (getOnlineSocketIds(onlineUsers.get(receiverId)).length > 0) {
          const caller = await User.findById(callerId)
            .select('fullName username profileImage')
            .lean()
            .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
          if (!caller) {
            socket.emit('call:error', { error: 'Call session not found' });
            return;
          }
          const delivered = emitToOnlineUser(io, onlineUsers, receiverId, 'call:incoming', {
            callerId,
            caller,
            callType: type,
            callLogId
          });
          if (!delivered) {
            socket.emit('call:error', { error: 'User is offline' });
            return;
          }
          setDirectCallSession({ callerId, receiverId, callLogId, type });
        } else {
          socket.emit('call:error', { error: 'User is offline' });
        }
      } catch (error) {
        logSocketError('Call initiate error:', error);
        socket.emit('call:error', { error: 'Failed to initiate call' });
      }
    });

    socket.on('call:accept', (data) => {
      if (!allowSocketEvent('call:accept')) return;
      const payload = data && typeof data === 'object' ? data : {};
      const callerId = normalizeObjectIdString(payload.callerId);
      const receiverId = socket.userId;
      
      if (!receiverId || !callerId) {
        socket.emit('call:error', { error: 'Invalid call request' });
        return;
      }
      
      const session = getDirectCallSession(callerId, receiverId);
      if (!session || session.receiverId !== receiverId) {
        socket.emit('call:error', { error: 'Call session not found' });
        return;
      }

      emitToOnlineUser(io, onlineUsers, callerId, 'call:accepted', { receiverId });
    });

    socket.on('call:reject', (data) => {
      if (!allowSocketEvent('call:reject')) return;
      const payload = data && typeof data === 'object' ? data : {};
      const callerId = normalizeObjectIdString(payload.callerId);
      const receiverId = socket.userId;
      if (!receiverId || !callerId) {
        socket.emit('call:error', { error: 'Invalid call request' });
        return;
      }

      const session = getDirectCallSession(callerId, receiverId);
      if (!session || session.receiverId !== receiverId) {
        socket.emit('call:error', { error: 'Call session not found' });
        return;
      }

      emitToOnlineUser(io, onlineUsers, callerId, 'call:rejected', {
        receiverId
      });
      clearDirectCallSession(callerId, receiverId);
    });

    socket.on('call:end', (data) => {
      if (!allowSocketEvent('call:end')) return;
      const payload = data && typeof data === 'object' ? data : {};
      const userId = normalizeObjectIdString(payload.userId);
      const currentUserId = socket.userId;
      if (!currentUserId || !userId) {
        socket.emit('call:error', { error: 'Invalid call request' });
        return;
      }
      if (!isDirectCallParticipant(currentUserId, userId)) {
        socket.emit('call:error', { error: 'Call session not found' });
        return;
      }

      emitToOnlineUser(io, onlineUsers, userId, 'call:ended');
      clearDirectCallSession(currentUserId, userId);
    });

    socket.on('call:offer', (data) => {
      if (!allowSocketEvent('call:offer')) return;
      const payload = data && typeof data === 'object' ? data : {};
      const receiverId = normalizeObjectIdString(payload.receiverId);
      const offer = normalizeCallSessionDescription(payload.offer, 'offer');
      const callerId = socket.userId;
      
      if (!callerId) {
        return;
      }
      if (!receiverId || !offer) {
        socket.emit('call:error', { error: 'Invalid call offer' });
        return;
      }
      
      const session = getDirectCallSession(callerId, receiverId);
      if (!session || session.callerId !== callerId) {
        socket.emit('call:error', { error: 'Call session not found' });
        return;
      }

      emitToOnlineUser(io, onlineUsers, receiverId, 'call:offer', { callerId, offer });
    });

    socket.on('call:answer', (data) => {
      if (!allowSocketEvent('call:answer')) return;
      const payload = data && typeof data === 'object' ? data : {};
      const callerId = normalizeObjectIdString(payload.callerId);
      const answer = normalizeCallSessionDescription(payload.answer, 'answer');
      const receiverId = socket.userId;
      
      if (!receiverId) {
        return;
      }
      if (!callerId || !answer) {
        socket.emit('call:error', { error: 'Invalid call answer' });
        return;
      }
      
      const session = getDirectCallSession(callerId, receiverId);
      if (!session || session.receiverId !== receiverId) {
        socket.emit('call:error', { error: 'Call session not found' });
        return;
      }

      emitToOnlineUser(io, onlineUsers, callerId, 'call:answer', { receiverId, answer });
    });

    socket.on('call:ice-candidate', (data) => {
      if (!allowSocketEvent('call:ice-candidate')) return;
      const payload = data && typeof data === 'object' ? data : {};
      const receiverId = normalizeObjectIdString(payload.receiverId);
      const candidate = normalizeIceCandidate(payload.candidate);
      if (!receiverId || !candidate) {
        socket.emit('call:error', { error: 'Invalid ICE candidate' });
        return;
      }
      if (!isDirectCallParticipant(socket.userId, receiverId)) {
        socket.emit('call:error', { error: 'Call session not found' });
        return;
      }

      emitToOnlineUser(io, onlineUsers, receiverId, 'call:ice-candidate', {
        candidate
      });
    });

    // Group Call Events
    socket.on('groupcall:start', async (data) => {
      try {
        if (!allowSocketEvent('groupcall:start')) return;
        const { groupId, roomName, callType = 'video' } = data;
        const initiatorId = socket.userId;
        const safeGroupId = normalizeObjectIdString(groupId);
        const safeRoomName = normalizeSocketRoomName(roomName);
        const safeCallType = normalizeSocketCallType(callType);

        if (!safeGroupId || !safeRoomName || !safeCallType) {
          socket.emit('groupcall:error', { error: 'Invalid group call request' });
          return;
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[groupcall] Start requested');
        }
        
        const group = await findSocketGroupForMember(safeGroupId, initiatorId, '_id name members');
        if (!group) {
          socket.emit('groupcall:error', { error: 'Not a member of this group' });
          return;
        }

        const activeCall = await GroupCall.findOne({
          group: safeGroupId,
          status: 'active',
          roomName: safeRoomName
        })
          .select('initiator callType')
          .lean()
          .maxTimeMS(CALL_QUERY_MAX_TIME_MS);

        if (!activeCall) {
          socket.emit('groupcall:error', { error: 'Active call not found' });
          return;
        }
        if (!isSameId(activeCall.initiator, initiatorId)) {
          socket.emit('groupcall:error', { error: 'Only the call initiator can invite participants' });
          return;
        }
        if ((activeCall.callType || 'video') !== safeCallType) {
          socket.emit('groupcall:error', { error: 'Call type does not match the active group call' });
          return;
        }
        
        const initiator = await User.findById(initiatorId)
          .select('fullName profileImage')
          .lean()
          .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
        if (!initiator) {
          socket.emit('groupcall:error', { error: 'Not authenticated' });
          return;
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[groupcall] Broadcasting invitation', { memberCount: group.members.length });
        }
        
        // Notify all online group members except initiator
        let notifiedCount = 0;
        group.members.forEach(member => {
          const memberId = member.toString();
          if (memberId !== initiatorId) {
            if (emitToOnlineUser(io, onlineUsers, memberId, 'groupcall:invitation', {
                groupId: safeGroupId,
                groupName: group.name,
                roomName: safeRoomName,
                callType: safeCallType,
                initiator: {
                  _id: initiatorId,
                  fullName: initiator.fullName,
                  profileImage: initiator.profileImage
                }
              })) {
              notifiedCount++;
            }
          }
        });
        if (process.env.NODE_ENV !== 'production') {
          console.log('[groupcall] Invitation fanout complete', { notifiedCount });
        }
      } catch (error) {
        logSocketError('Group call start error:', error);
      }
    });

    socket.on('groupcall:join', async (data) => {
      try {
        if (!allowSocketEvent('groupcall:join')) return;
        const { groupId, roomName } = data;
        const userId = socket.userId;
        const safeGroupId = normalizeObjectIdString(groupId);
        const safeRoomName = normalizeSocketRoomName(roomName);
        if (!safeGroupId || !safeRoomName) {
          socket.emit('groupcall:error', { error: 'Invalid group call request' });
          return;
        }
        
        const group = await findSocketGroupForMember(safeGroupId, userId, '_id members');
        if (!group) {
          socket.emit('groupcall:error', { error: 'Not a member of this group' });
          return;
        }

        const call = await GroupCall.findOne({
          group: safeGroupId,
          status: 'active',
          roomName: safeRoomName
        })
          .select('_id roomName')
          .lean()
          .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
        if (!call) {
          socket.emit('groupcall:error', { error: 'Active call not found' });
          return;
        }
        const joinUpdate = await GroupCall.updateOne(
          {
            _id: call._id,
            status: 'active',
            roomName: safeRoomName,
            'participants.user': { $ne: userId }
          },
          {
            $push: { participants: { user: userId } }
          }
        ).maxTimeMS(CALL_QUERY_MAX_TIME_MS);
        if (joinUpdate.modifiedCount === 0) return;
        
        const user = await User.findById(userId)
          .select('fullName profileImage')
          .lean()
          .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
        if (!user) return;
        
        // Notify all group members that someone joined
        group.members.forEach(memberId => {
          const memberIdStr = memberId.toString();
          emitToOnlineUser(io, onlineUsers, memberIdStr, 'groupcall:user-joined', {
              groupId: safeGroupId,
              roomName: safeRoomName,
              user: {
                _id: userId,
                fullName: user.fullName,
                profileImage: user.profileImage
              }
            });
        });
      } catch (error) {
        logSocketError('Group call join error:', error);
      }
    });

    socket.on('groupcall:leave', async (data) => {
      try {
        if (!allowSocketEvent('groupcall:leave')) return;
        const { groupId, roomName } = data;
        const userId = socket.userId;
        const safeGroupId = normalizeObjectIdString(groupId);
        const safeRoomName = normalizeSocketRoomName(roomName);
        if (!safeGroupId || !safeRoomName) {
          socket.emit('groupcall:error', { error: 'Invalid group call request' });
          return;
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[groupcall] Leave requested');
        }
        
        const group = await findSocketGroupForMember(safeGroupId, userId, '_id members');
        if (!group) {
          socket.emit('groupcall:error', { error: 'Not a member of this group' });
          return;
        }

        const call = await GroupCall.findOne({
          group: safeGroupId,
          status: 'active',
          roomName: safeRoomName
        })
          .select('_id roomName status startedAt initiator callType participants')
          .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
        if (!call) return;
        const livekitConfig = getLiveKitConfig();
        if (!livekitConfig) {
          socket.emit('groupcall:error', { error: 'LiveKit not configured' });
          return;
        }
        
        // Update participant left time
        const leaveUpdate = await GroupCall.updateOne(
          {
            _id: call._id,
            status: 'active',
            participants: { $elemMatch: { user: userId, leftAt: { $exists: false } } }
          },
          { $set: { 'participants.$.leftAt': new Date() } }
        ).maxTimeMS(CALL_QUERY_MAX_TIME_MS);
        if (leaveUpdate.modifiedCount === 0) return;
        
        // Notify members someone left
        group.members.forEach(memberId => {
          const memberIdStr = memberId.toString();
          emitToOnlineUser(io, onlineUsers, memberIdStr, 'groupcall:user-left', {
              groupId: safeGroupId,
              roomName: safeRoomName,
              userId
            });
        });
        
        // Check if anyone is still in the LiveKit room
        const roomService = new RoomServiceClient(
          livekitConfig.httpUrl,
          livekitConfig.apiKey,
          livekitConfig.apiSecret
        );
        
        let participantCount = 0;
        try {
          const participants = await withProviderTimeout(
            roomService.listParticipants(safeRoomName),
            'LiveKit participant lookup',
            LIVEKIT_PROVIDER_TIMEOUT_MS
          );
          participantCount = participants.length;
        } catch (err) {
          if (isLiveKitRoomMissingError(err)) {
            participantCount = 0;
          } else {
            logSocketError('Group call LiveKit participant check error:', err);
            return;
          }
        }
        
        // If no one in room, end the call (only once)
        if (participantCount === 0 && call.status === 'active') {
          const endedCall = await populateGroupCallParticipants(
            GroupCall.findOneAndUpdate(
              { _id: call._id, status: 'active' },
              { $set: buildEndedGroupCallFields(call) },
              { new: true, runValidators: true }
            )
          ).maxTimeMS(CALL_QUERY_MAX_TIME_MS);

          if (!endedCall) return;
          
          // Create history message
          // Get unique users who actually joined
          const uniqueUserMap = new Map();
          endedCall.participants.forEach(p => {
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
          const minutes = Math.floor(endedCall.duration / 60);
          const seconds = endedCall.duration % 60;
          const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          const historyMsg = await Message.create({
            group: safeGroupId,
            sender: endedCall.initiator,
            content: `${endedCall.callType === 'audio' ? 'Audio' : 'Video'} call ended`,
            type: 'groupcall',
            callData: {
              duration: endedCall.duration,
              durationText,
              joinedCount,
              joinedUsers,
              callType: endedCall.callType
            }
          });
          
          await historyMsg.populate({
            path: 'sender',
            select: 'fullName profileImage',
            options: { maxTimeMS: CALL_QUERY_MAX_TIME_MS }
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('[groupcall] Broadcasting ended event', { memberCount: group.members.length });
          }
          // Notify all members
          const notifiedMembers = new Set();
          group.members.forEach(memberId => {
            const memberIdStr = memberId.toString();
            if (!notifiedMembers.has(memberIdStr)) {
              notifiedMembers.add(memberIdStr);
              emitToOnlineUser(io, onlineUsers, memberIdStr, 'groupcall:ended', { groupId: safeGroupId });
              emitToOnlineUser(io, onlineUsers, memberIdStr, 'message:receive:group', historyMsg);
            }
          });
        }
      } catch (error) {
        logSocketError('Group call leave error:', error);
      }
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        const wentOffline = removeOnlineUserSocket(onlineUsers, socket.userId, socket.id);
        if (wentOffline) {
          try {
            await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() })
              .maxTimeMS(SOCKET_QUERY_MAX_TIME_MS);
          } catch (error) {
            logSocketError('Disconnect lastSeen update error:', error);
          }
          io.emit('user:status', { userId: socket.userId, status: 'offline' });
        }
      }
    });
  });
};

