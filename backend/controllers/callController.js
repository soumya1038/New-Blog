const CallLog = require('../models/CallLog');
const User = require('../models/User');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { enqueueEmailJob } = require('../jobs/queueService');
const { isEmailNotificationEnabled } = require('../utils/emailPreferences');
const { logError } = require('../utils/safeErrorLog');

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const normalizeTurnUrl = (value = '') => {
  const rawUrl = String(value || '').trim();
  if (!rawUrl) return '';
  if (/^turns?:/i.test(rawUrl)) return rawUrl;
  return `turn:${rawUrl}:3478`;
};

const buildEphemeralTurnServer = (userId) => {
  const turnUrl = normalizeTurnUrl(process.env.TURN_URL || process.env.TURN_HOST);
  const staticAuthSecret = process.env.TURN_STATIC_AUTH_SECRET;
  if (!turnUrl || !staticAuthSecret) return null;

  const ttlSeconds = Number(process.env.TURN_CREDENTIAL_TTL_SECONDS || 600);
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds);
  const username = `${expiresAt}:${userId}`;
  const credential = crypto
    .createHmac('sha1', staticAuthSecret)
    .update(username)
    .digest('base64');

  return { urls: [turnUrl], username, credential };
};

const CALL_TYPES = new Set(['audio', 'video']);
const CALL_STATUSES = new Set(['completed', 'missed', 'rejected', 'failed']);
const MAX_CALL_DURATION_SECONDS = 12 * 60 * 60;
const CALL_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.CALL_QUERY_MAX_TIME_MS) || 5000);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const isSameId = (left, right) => String(left || '') === String(right || '');

const parseCallDuration = (duration) => {
  const parsed = Number(duration);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(Math.floor(parsed), MAX_CALL_DURATION_SECONDS);
};

const buildParticipantCallLogFilter = (callLogId, userId) => ({
  _id: callLogId,
  $or: [
    { caller: userId },
    { receiver: userId },
  ],
});

const serializeCallLog = (callLog) => {
  const value = callLog?.toObject ? callLog.toObject() : { ...(callLog || {}) };
  delete value.deletedBy;
  delete value.__v;
  return value;
};

exports.getIceServers = async (req, res) => {
  try {
    const turnServer = buildEphemeralTurnServer(req.user._id);
    res.json({
      iceServers: turnServer ? [...DEFAULT_ICE_SERVERS, turnServer] : DEFAULT_ICE_SERVERS,
      turnEnabled: Boolean(turnServer),
    });
  } catch (error) {
    logError('Get ICE servers error:', error);
    res.status(500).json({ message: 'Failed to load ICE server configuration' });
  }
};

// Get call history between two users (last 3 calls)
exports.getCallHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const callLogs = await CallLog.find({
      $or: [
        { caller: currentUserId, receiver: userId },
        { caller: userId, receiver: currentUserId }
      ],
      deletedBy: { $ne: currentUserId }
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .maxTimeMS(CALL_QUERY_MAX_TIME_MS)
      .populate('caller', 'fullName username profileImage')
      .populate('receiver', 'fullName username profileImage');

    res.json({ callLogs: callLogs.map(serializeCallLog) });
  } catch (error) {
    logError('Get call history error:', error);
    res.status(500).json({ message: 'Failed to fetch call history' });
  }
};

// Create call log
exports.createCallLog = async (req, res) => {
  try {
    const { receiverId, type } = req.body;
    if (!isValidObjectId(receiverId)) {
      return res.status(400).json({ message: 'Invalid receiver' });
    }
    if (isSameId(receiverId, req.user._id)) {
      return res.status(400).json({ message: 'Cannot call yourself' });
    }
    if (!CALL_TYPES.has(type)) {
      return res.status(400).json({ message: 'Invalid call type' });
    }

    const [caller, receiver] = await Promise.all([
      User.findById(req.user._id).select('blockedUsers'),
      User.findById(receiverId).select('blockedUsers')
    ]);

    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }
    if (receiver.blockedUsers?.some((id) => isSameId(id, req.user._id))) {
      return res.status(403).json({ message: 'You cannot call this user' });
    }
    if (caller?.blockedUsers?.some((id) => isSameId(id, receiverId))) {
      return res.status(403).json({ message: 'You have blocked this user' });
    }

    const callLog = await CallLog.create({
      caller: req.user._id,
      receiver: receiverId,
      type,
      status: 'missed',
      duration: 0
    });

    res.status(201).json({ callLog: serializeCallLog(callLog) });
  } catch (error) {
    logError('Create call log error:', error);
    res.status(500).json({ message: 'Failed to create call log' });
  }
};

// Update call log (end call, update duration)
exports.updateCallLog = async (req, res) => {
  try {
    const { callLogId } = req.params;
    const { status, duration, endedAt } = req.body;
    if (!isValidObjectId(callLogId)) {
      return res.status(400).json({ message: 'Invalid call log id' });
    }
    if (status !== undefined && !CALL_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Invalid call status' });
    }

    const callLog = await CallLog.findOne(buildParticipantCallLogFilter(callLogId, req.user._id))
      .maxTimeMS(CALL_QUERY_MAX_TIME_MS);

    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }

    const previousStatus = callLog.status;
    if (status !== undefined) callLog.status = status;
    if (duration !== undefined) callLog.duration = parseCallDuration(duration);
    if (endedAt !== undefined) {
      const parsedEndedAt = new Date(endedAt);
      if (Number.isNaN(parsedEndedAt.getTime())) {
        return res.status(400).json({ message: 'Invalid endedAt timestamp' });
      }
      callLog.endedAt = parsedEndedAt;
    } else if (status !== undefined && CALL_STATUSES.has(status)) {
      callLog.endedAt = new Date();
    }
    await callLog.save();

    if (previousStatus !== 'missed' && callLog.status === 'missed') {
      const [caller, receiver] = await Promise.all([
        User.findById(callLog.caller).select('username'),
        User.findById(callLog.receiver).select('username email emailNotifications')
      ]);

      if (receiver?.email && isEmailNotificationEnabled(receiver, 'missedCall')) {
        enqueueEmailJob(
          'missed-call',
          {
            email: receiver.email,
            username: receiver.username,
            callerName: caller?.username || 'A user',
            callType: callLog.type || 'audio',
            callTime: callLog.createdAt || Date.now()
          },
          { jobId: `missed-call:${callLog._id}` }
        ).catch((error) => {
          logError('Failed to queue missed call email:', error);
        });
      }
    }

    res.json({ callLog: serializeCallLog(callLog) });
  } catch (error) {
    logError('Update call log error:', error);
    res.status(500).json({ message: 'Failed to update call log' });
  }
};

// Delete individual call log
exports.deleteCallLog = async (req, res) => {
  try {
    const { callLogId } = req.params;
    if (!isValidObjectId(callLogId)) {
      return res.status(400).json({ message: 'Invalid call log id' });
    }

    const callLog = await CallLog.findOne(buildParticipantCallLogFilter(callLogId, req.user._id))
      .maxTimeMS(CALL_QUERY_MAX_TIME_MS);
    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }

    if (!callLog.deletedBy.some((userId) => userId.toString() === req.user._id.toString())) {
      callLog.deletedBy.push(req.user._id);
      await callLog.save();
    }

    if (
      callLog.deletedBy.some((userId) => userId.toString() === callLog.caller.toString()) &&
      callLog.deletedBy.some((userId) => userId.toString() === callLog.receiver.toString())
    ) {
      await CallLog.deleteOne({ _id: callLogId });
    }
    res.json({ message: 'Call log deleted successfully' });
  } catch (error) {
    logError('Delete call log error:', error);
    res.status(500).json({ message: 'Failed to delete call log' });
  }
};
