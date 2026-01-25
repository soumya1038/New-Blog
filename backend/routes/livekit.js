const express = require('express');
const router = express.Router();
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { protect } = require('../middleware/auth');
const GroupCall = require('../models/GroupCall');

// Generate LiveKit token for group call
router.post('/token', protect, async (req, res) => {
  try {
    const { roomName, participantName, groupId } = req.body;
    
    if (!roomName || !participantName) {
      return res.status(400).json({ message: 'Room name and participant name required' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_WS_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return res.status(500).json({ message: 'LiveKit not configured' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: req.user.id,
      name: participantName,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true
    });

    const token = await at.toJwt();

    // Track call participation
    if (groupId) {
      let call = await GroupCall.findOne({ group: groupId, status: 'active' });
      
      if (!call) {
        call = await GroupCall.create({
          group: groupId,
          roomName,
          initiator: req.user.id,
          participants: [{ user: req.user.id }]
        });
      } else {
        const alreadyJoined = call.participants.some(p => p.user.toString() === req.user.id);
        if (!alreadyJoined) {
          call.participants.push({ user: req.user.id });
          await call.save();
        }
      }
    }

    res.json({ token, wsUrl });
  } catch (error) {
    console.error('LiveKit token error:', error);
    res.status(500).json({ message: 'Failed to generate token' });
  }
});

// Start group call
router.post('/start', protect, async (req, res) => {
  try {
    const { groupId, roomName, callType = 'video' } = req.body;
    
    const call = await GroupCall.create({
      group: groupId,
      roomName,
      callType,
      initiator: req.user.id,
      participants: [{ user: req.user.id }]
    });

    res.json({ call });
  } catch (error) {
    console.error('Start call error:', error);
    res.status(500).json({ message: 'Failed to start call' });
  }
});

// End group call
router.post('/end/:callId', protect, async (req, res) => {
  try {
    const call = await GroupCall.findById(req.params.callId).populate('initiator participants.user', 'fullName profileImage');
    
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    call.status = 'ended';
    call.endedAt = new Date();
    call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
    await call.save();

    // Create call history message
    const Message = require('../models/Message');
    const callTypeText = call.callType === 'audio' ? 'Audio call' : 'Video call';
    const historyMsg = await Message.create({
      group: call.group,
      sender: call.initiator._id,
      content: `${callTypeText} ended - ${call.participants.length} participant(s) - ${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}`,
      type: 'groupcall',
      callData: {
        callType: call.callType,
        initiator: call.initiator,
        participants: call.participants,
        duration: call.duration
      }
    });

    res.json({ call });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ message: 'Failed to end call' });
  }
});

// Get active call for group
router.get('/active/:groupId', protect, async (req, res) => {
  try {
    const call = await GroupCall.findOne({ 
      group: req.params.groupId, 
      status: 'active' 
    }).populate('initiator participants.user', 'fullName profileImage');

    if (!call) {
      return res.json({ call: null });
    }

    // Check if anyone is actually in the LiveKit room
    const roomService = new RoomServiceClient(
      process.env.LIVEKIT_WS_URL.replace('wss://', 'https://').replace('ws://', 'http://'),
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );

    try {
      const participants = await roomService.listParticipants(call.roomName);
      
      // If no one in room, end the call
      if (participants.length === 0) {
        call.status = 'ended';
        call.endedAt = new Date();
        call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
        await call.save();
        return res.json({ call: null });
      }
      
      // Get user details for current participants
      const User = require('../models/User');
      const participantIds = participants.map(p => p.identity);
      const users = await User.find({ _id: { $in: participantIds } }).select('fullName profileImage');
      
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
        call.status = 'ended';
        call.endedAt = new Date();
        call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
        await call.save();
        return res.json({ call: null });
      }
      throw err;
    }
  } catch (error) {
    console.error('Get active call error:', error);
    res.status(500).json({ message: 'Failed to get active call' });
  }
});

// Get call history for group
router.get('/history/:groupId', protect, async (req, res) => {
  try {
    const calls = await GroupCall.find({ 
      group: req.params.groupId,
      status: 'ended'
    })
    .populate('initiator participants.user', 'fullName profileImage')
    .sort({ startedAt: -1 })
    .limit(20);

    res.json({ calls });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ message: 'Failed to get call history' });
  }
});

module.exports = router;
