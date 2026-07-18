const express = require('express');
const router = express.Router();
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { protect } = require('../middleware/auth');
const GroupCall = require('../models/GroupCall');
const Group = require('../models/Group');
const mongoose = require('mongoose');
const { logError } = require('../utils/safeErrorLog');
const { normalizeHttpUrl } = require('../utils/safeUrls');
const { getLiveKitProviderTimeoutMs, withProviderTimeout } = require('../utils/providerTimeouts');

const GROUP_CALL_HISTORY_DEFAULT_LIMIT = Math.max(1, Number(process.env.GROUP_CALL_HISTORY_DEFAULT_LIMIT) || 20);
const GROUP_CALL_HISTORY_MAX_LIMIT = Math.max(1, Number(process.env.GROUP_CALL_HISTORY_MAX_LIMIT) || 100);
const GROUP_CALL_ROOM_NAME_MAX_LENGTH = Math.max(
  1,
  Number(process.env.GROUP_CALL_ROOM_NAME_MAX_LENGTH || process.env.SOCKET_ROOM_NAME_MAX_LENGTH) || 120
);
const GROUP_CALL_PARTICIPANT_NAME_MAX_LENGTH = Math.max(
  1,
  Number(process.env.GROUP_CALL_PARTICIPANT_NAME_MAX_LENGTH) || 80
);
const CALL_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.CALL_QUERY_MAX_TIME_MS) || 5000);
const LIVEKIT_PROVIDER_TIMEOUT_MS = getLiveKitProviderTimeoutMs();

const parseBoundedLimit = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(safeValue, max);
};

const isSameId = (left, right) => String(left || '') === String(right || '');

const normalizeGroupCallRoomName = (value) => {
  const roomName = typeof value === 'string' ? value.trim() : '';
  if (!roomName || roomName.length > GROUP_CALL_ROOM_NAME_MAX_LENGTH) return '';
  return /^[A-Za-z0-9._:-]+$/.test(roomName) ? roomName : '';
};

const normalizeGroupCallType = (value = 'video') => {
  const callType = String(value || 'video').trim().toLowerCase();
  return ['audio', 'video'].includes(callType) ? callType : '';
};

const normalizeParticipantName = (value, fallback) => {
  const rawName = typeof value === 'string' ? value : fallback;
  const name = String(rawName || '').trim().slice(0, GROUP_CALL_PARTICIPANT_NAME_MAX_LENGTH);
  return name || 'User';
};

const getUiAvatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0D8ABC&color=fff`;

const getSafeAvatarUrl = (value, fallbackName) =>
  normalizeHttpUrl(value, { maxLength: 500, allowBareDomain: false }) || getUiAvatarUrl(fallbackName);

const populateCallUsers = (query) =>
  query
    .populate({
      path: 'initiator',
      select: 'fullName profileImage',
      options: { maxTimeMS: CALL_QUERY_MAX_TIME_MS }
    })
    .populate({
      path: 'participants.user',
      select: 'fullName profileImage',
      options: { maxTimeMS: CALL_QUERY_MAX_TIME_MS }
    });

const buildEndedCallFields = (call) => {
  const endedAt = new Date();
  const startedAt = new Date(call.startedAt);
  const startedAtMs = startedAt.getTime();
  const duration = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((endedAt.getTime() - startedAtMs) / 1000))
    : 0;

  return { status: 'ended', endedAt, duration };
};

const endActiveCallIfCurrent = (call) =>
  GroupCall.findOneAndUpdate(
    { _id: call._id, status: 'active' },
    { $set: buildEndedCallFields(call) },
    { new: true, runValidators: true }
  ).maxTimeMS(CALL_QUERY_MAX_TIME_MS);

const getLiveKitConfig = () => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_WS_URL;

  if (!apiKey || !apiSecret || !wsUrl) return null;

  return {
    apiKey,
    apiSecret,
    wsUrl,
    httpUrl: wsUrl.replace('wss://', 'https://').replace('ws://', 'http://')
  };
};

const findGroupForMember = async (groupId, userId) => {
  if (!groupId) return null;
  if (!mongoose.isValidObjectId(groupId)) return null;
  return Group.findOne({ _id: groupId, members: userId })
    .select('_id admins coAdmins')
    .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
};

const canEndCall = (call, userId, group) => {
  if (!call || !userId || !group) return false;
  if (isSameId(call.initiator?._id || call.initiator, userId)) return true;
  if ((group.admins || []).some((adminId) => isSameId(adminId, userId))) return true;
  if ((group.coAdmins || []).some((adminId) => isSameId(adminId, userId))) return true;
  return (call.participants || []).some((participant) => isSameId(participant.user?._id || participant.user, userId));
};

// Generate LiveKit token for group call
router.post('/token', protect, async (req, res) => {
  try {
    const { roomName, groupId } = req.body;
    const safeRoomName = normalizeGroupCallRoomName(roomName);
    const safeCallType = normalizeGroupCallType(req.body.callType || 'video');
    const finalParticipantName = normalizeParticipantName(
      req.user.fullName || req.user.username,
      req.user.fullName || req.user.username || 'User'
    );
    
    if (!safeRoomName) {
      return res.status(400).json({ message: 'Invalid room name' });
    }
    if (!groupId) {
      return res.status(400).json({ message: 'Group is required' });
    }
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }
    if (!safeCallType) {
      return res.status(400).json({ message: 'Invalid call type' });
    }

    const group = await findGroupForMember(groupId, req.user._id);
    if (!group) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const livekitConfig = getLiveKitConfig();
    if (!livekitConfig) {
      return res.status(503).json({ message: 'LiveKit not configured' });
    }

    const at = new AccessToken(livekitConfig.apiKey, livekitConfig.apiSecret, {
      identity: req.user.id,
      name: finalParticipantName,
      metadata: JSON.stringify({
        avatar: getSafeAvatarUrl(req.user.profileImage, finalParticipantName)
      })
    });

    at.addGrant({
      room: safeRoomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: false
    });

    const token = await at.toJwt();

    // Track call participation only after group membership is proven.
    let call = await GroupCall.findOne({ group: groupId, status: 'active' })
      .maxTimeMS(CALL_QUERY_MAX_TIME_MS);

    if (!call) {
      try {
        call = await GroupCall.create({
          group: groupId,
          roomName: safeRoomName,
          callType: safeCallType,
          initiator: req.user.id,
          participants: [{ user: req.user.id }]
        });
      } catch (createError) {
        if (createError?.code !== 11000) throw createError;
        call = await GroupCall.findOne({ group: groupId, status: 'active' })
          .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
      }
    }

    if (!call) {
      return res.status(409).json({ message: 'Group already has an active call' });
    }
    if (call.roomName !== safeRoomName) {
      return res.status(409).json({ message: 'Room does not match the active group call' });
    }
    if ((call.callType || 'video') !== safeCallType) {
      return res.status(409).json({ message: 'Call type does not match the active group call' });
    }
    const alreadyJoined = (call.participants || []).some((p) =>
      isSameId(p.user?._id || p.user, req.user._id)
    );
    if (!alreadyJoined) {
      const joinedCall = await GroupCall.findOneAndUpdate(
        { _id: call._id, status: 'active', 'participants.user': { $ne: req.user._id } },
        { $push: { participants: { user: req.user._id } } },
        { new: true, runValidators: true }
      ).maxTimeMS(CALL_QUERY_MAX_TIME_MS);

      if (!joinedCall) {
        call = await GroupCall.findOne({
          _id: call._id,
          status: 'active',
          'participants.user': req.user._id
        }).maxTimeMS(CALL_QUERY_MAX_TIME_MS);

        if (!call) {
          return res.status(409).json({ message: 'Active group call changed; request a new token' });
        }
      }
    }

    res.json({ token, wsUrl: livekitConfig.wsUrl });
  } catch (error) {
    logError('LiveKit token error:', error);
    res.status(500).json({ message: 'Failed to generate token' });
  }
});

// Start group call
router.post('/start', protect, async (req, res) => {
  try {
    const { groupId, roomName, callType = 'video' } = req.body;
    const safeRoomName = normalizeGroupCallRoomName(roomName);
    const safeCallType = normalizeGroupCallType(callType);

    if (!groupId || !safeRoomName) {
      return res.status(400).json({ message: 'Group and room name are required' });
    }
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }
    if (!safeCallType) {
      return res.status(400).json({ message: 'Invalid call type' });
    }
    const group = await findGroupForMember(groupId, req.user._id);
    if (!group) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const existingActiveCall = await GroupCall.findOne({ group: groupId, status: 'active' })
      .select('_id roomName')
      .maxTimeMS(CALL_QUERY_MAX_TIME_MS)
      .lean();
    if (existingActiveCall) {
      return res.status(409).json({ message: 'Group already has an active call' });
    }

    let call;
    try {
      call = await GroupCall.create({
        group: groupId,
        roomName: safeRoomName,
        callType: safeCallType,
        initiator: req.user.id,
        participants: [{ user: req.user.id }]
      });
    } catch (createError) {
      if (createError?.code === 11000) {
        return res.status(409).json({ message: 'Group already has an active call' });
      }
      throw createError;
    }

    res.json({ call });
  } catch (error) {
    logError('Start call error:', error);
    res.status(500).json({ message: 'Failed to start call' });
  }
});

// End group call
router.post('/end/:callId', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.callId)) {
      return res.status(400).json({ message: 'Invalid call ID format' });
    }

    const call = await populateCallUsers(GroupCall.findById(req.params.callId))
      .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
    
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    const group = await findGroupForMember(call.group, req.user._id);
    if (!group || !canEndCall(call, req.user._id, group)) {
      return res.status(403).json({ message: 'Not allowed to end this call' });
    }
    if (call.status !== 'active') {
      return res.json({ call });
    }

    const endedCall = await populateCallUsers(
      GroupCall.findOneAndUpdate(
        { _id: call._id, status: 'active' },
        { $set: buildEndedCallFields(call) },
        { new: true, runValidators: true }
      )
    ).maxTimeMS(CALL_QUERY_MAX_TIME_MS);

    if (!endedCall) {
      const currentCall = await populateCallUsers(GroupCall.findById(call._id))
        .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
      return res.json({ call: currentCall || call });
    }

    // Create call history message
    const Message = require('../models/Message');
    const callTypeText = endedCall.callType === 'audio' ? 'Audio call' : 'Video call';
    await Message.create({
      group: endedCall.group,
      sender: endedCall.initiator?._id || endedCall.initiator,
      content: `${callTypeText} ended - ${endedCall.participants.length} participant(s) - ${Math.floor(endedCall.duration / 60)}:${(endedCall.duration % 60).toString().padStart(2, '0')}`,
      type: 'groupcall',
      callData: {
        callType: endedCall.callType,
        initiator: endedCall.initiator,
        participants: endedCall.participants,
        duration: endedCall.duration
      }
    });

    res.json({ call: endedCall });
  } catch (error) {
    logError('End call error:', error);
    res.status(500).json({ message: 'Failed to end call' });
  }
});

// Get active call for group
router.get('/active/:groupId', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }

    const group = await findGroupForMember(req.params.groupId, req.user._id);
    if (!group) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const call = await populateCallUsers(GroupCall.findOne({
      group: req.params.groupId, 
      status: 'active' 
    })).maxTimeMS(CALL_QUERY_MAX_TIME_MS);

    if (!call) {
      return res.json({ call: null });
    }

    const livekitConfig = getLiveKitConfig();
    if (!livekitConfig) {
      return res.status(503).json({ message: 'LiveKit not configured' });
    }

    // Check if anyone is actually in the LiveKit room
    const roomService = new RoomServiceClient(
      livekitConfig.httpUrl,
      livekitConfig.apiKey,
      livekitConfig.apiSecret
    );

    try {
      const participants = await withProviderTimeout(
        roomService.listParticipants(call.roomName),
        'LiveKit participant lookup',
        LIVEKIT_PROVIDER_TIMEOUT_MS
      );
      
      // If no one in room, end the call
      if (participants.length === 0) {
        await endActiveCallIfCurrent(call);
        return res.json({ call: null });
      }
      
      // Get user details for current participants
      const User = require('../models/User');
      const participantIds = participants
        .map((p) => p.identity)
        .filter((identity) => mongoose.isValidObjectId(identity));
      const users = participantIds.length
        ? await User.find({ _id: { $in: participantIds } })
          .select('fullName profileImage')
          .maxTimeMS(CALL_QUERY_MAX_TIME_MS)
        : [];
      
      // Return call with current participants
      const callData = {
        _id: call._id,
        group: call.group.toString(),
        roomName: call.roomName,
        callType: call.callType || 'video',
        initiator: call.initiator,
        status: call.status,
        startedAt: call.startedAt,
        participants: users.map(u => ({
          _id: u._id,
          fullName: u.fullName,
          profileImage: u.profileImage
        }))
      };
      
      res.json({ call: callData });
    } catch (err) {
      // Room doesn't exist = no participants
      if (err.code === 'not_found' || err.status === 404) {
        await endActiveCallIfCurrent(call);
        return res.json({ call: null });
      }
      throw err;
    }
  } catch (error) {
    logError('Get active call error:', error);
    res.status(500).json({ message: 'Failed to get active call' });
  }
});

// Get call history for group
router.get('/history/:groupId', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format' });
    }
    const limit = parseBoundedLimit(
      req.query.limit,
      GROUP_CALL_HISTORY_DEFAULT_LIMIT,
      GROUP_CALL_HISTORY_MAX_LIMIT
    );

    const group = await findGroupForMember(req.params.groupId, req.user._id);
    if (!group) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const calls = await populateCallUsers(GroupCall.find({
      group: req.params.groupId,
      status: 'ended'
    }))
    .sort({ startedAt: -1 })
    .limit(limit)
    .maxTimeMS(CALL_QUERY_MAX_TIME_MS);

    res.json({
      calls,
      pagination: {
        mode: 'limit',
        limit
      }
    });
  } catch (error) {
    logError('Get call history error:', error);
    res.status(500).json({ message: 'Failed to get call history' });
  }
});

module.exports = router;
