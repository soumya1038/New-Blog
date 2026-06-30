const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const { Readable } = require('stream');
const { toFile } = require('groq-sdk');
const cloudinary = require('../utils/cloudinary');
const groq = require('../utils/openai');
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /webm|ogg|mp3|mpeg|mp4|m4a|wav|aac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /^audio\//.test(file.mimetype || '') || allowedTypes.test(file.mimetype || '');

    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error('Only audio files are allowed'));
  }
});
const whisperUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /webm|ogg|mp3|mpeg|mp4|m4a|wav|aac/;
    const extname = allowedTypes.test(path.extname(file.originalname || '').toLowerCase());
    const mimetype = /^audio\//.test(file.mimetype || '') || allowedTypes.test(file.mimetype || '');

    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error('Only audio files are allowed'));
  }
});

const getWhisperModelStatus = () => ({
  provider: 'groq',
  loaded: Boolean(process.env.GROQ_API_KEY),
  mode: 'upload',
  model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo'
});

const handleWhisperUpload = (req, res, next) => {
  whisperUpload.single('files')(req, res, (error) => {
    if (!error) return next();

    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      ok: false,
      error: {
        code: error.code === 'LIMIT_FILE_SIZE' ? 'audio_too_large' : 'invalid_audio',
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Voice dictation audio must be less than 25MB'
          : error.message || 'Invalid dictation audio upload'
      }
    });
  });
};

const parseVoiceDuration = (duration) => {
  const parsed = Number.parseInt(duration, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 60 * 60);
};

const uploadVoiceToCloudinary = (file) => new Promise((resolve, reject) => {
  const originalBaseName = path
    .basename(file.originalname || 'voice-message', path.extname(file.originalname || ''))
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'voice-message';

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: 'video',
      folder: 'chat-voice-messages',
      public_id: `${Date.now()}-${originalBaseName}`
    },
    (error, result) => {
      if (error) return reject(error);
      resolve(result);
    }
  );

  Readable.from(file.buffer).pipe(uploadStream);
});

const isMemberId = (ids = [], userId) => ids.some((id) => id.toString() === userId.toString());

const incrementGroupUnreadCounts = (group, senderId) => {
  group.members.forEach((memberId) => {
    const memberIdStr = memberId.toString();
    if (memberIdStr === senderId.toString()) return;

    let unreadEntry = group.unreadCount?.find((entry) => entry.user.toString() === memberIdStr);
    if (!unreadEntry) {
      if (!group.unreadCount) group.unreadCount = [];
      group.unreadCount.push({ user: memberId, count: 1 });
      return;
    }

    unreadEntry.count += 1;
  });
};

const emitDirectVoiceMessage = (req, receiverId, message) => {
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers');
  const receiverData = onlineUsers?.get(receiverId.toString());

  if (io && receiverData?.socketId) {
    io.to(receiverData.socketId).emit('message:receive', message);
  }
};

const emitGroupVoiceMessage = (req, group, senderId, message) => {
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers');
  if (!io || !onlineUsers) return;

  group.members.forEach((memberId) => {
    const memberIdStr = memberId.toString();
    if (memberIdStr === senderId.toString()) return;

    const memberData = onlineUsers.get(memberIdStr);
    if (memberData?.socketId) {
      io.to(memberData.socketId).emit('message:receive:group', message);
    }
  });
};

const handleMulterUpload = (req, res, next) => {
  upload.single('voice')(req, res, (error) => {
    if (!error) return next();

    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'Voice message must be less than 10MB'
        : error.message || 'Invalid voice message upload'
    });
  });
};

router.get('/whisper/health', protect, (req, res) => {
  res.json({
    ok: true,
    model: getWhisperModelStatus()
  });
});

router.post('/whisper/wake', protect, (req, res) => {
  res.json({
    ok: true,
    model: getWhisperModelStatus()
  });
});

router.post('/whisper/transcribe', protect, handleWhisperUpload, async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        ok: false,
        error: {
          code: 'voice_proxy_failed',
          message: 'Voice transcription is not configured'
        }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'empty_audio',
          message: 'No audio file uploaded'
        }
      });
    }

    const filename = req.file.originalname || 'dictation.webm';
    const file = await toFile(req.file.buffer, filename, {
      type: req.file.mimetype || 'audio/webm'
    });
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo',
      language: req.body.language || undefined,
      temperature: 0,
      response_format: 'json'
    });
    const text = (transcription?.text || '').trim();

    return res.json({
      ok: true,
      result: { text },
      data: { text },
      model: getWhisperModelStatus()
    });
  } catch (error) {
    console.error('Voice dictation transcription error:', error);
    return res.status(502).json({
      ok: false,
      error: {
        code: 'transcription_failed',
        message: 'Voice transcription failed'
      }
    });
  }
});

router.post('/', protect, handleMulterUpload, async (req, res) => {
  let cloudinaryResult = null;

  try {
    const { receiverId, groupId, duration } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No voice file uploaded' });
    }

    if ((receiverId && groupId) || (!receiverId && !groupId)) {
      return res.status(400).json({ message: 'Choose either a receiver or a group for the voice message' });
    }

    const baseMessagePayload = {
      sender: senderId,
      type: 'voice',
      voiceDuration: parseVoiceDuration(duration),
      content: '[Voice Message]',
      mimeType: req.file.mimetype,
      encrypted: false,
      delivered: true
    };

    if (receiverId) {
      if (!mongoose.Types.ObjectId.isValid(receiverId)) {
        return res.status(400).json({ message: 'Invalid receiver' });
      }

      if (receiverId === senderId.toString()) {
        return res.status(400).json({ message: 'Cannot send message to yourself' });
      }

      const [sender, receiver] = await Promise.all([
        User.findById(senderId).select('blockedUsers'),
        User.findById(receiverId).select('blockedUsers')
      ]);

      if (!receiver) {
        return res.status(404).json({ message: 'Receiver not found' });
      }

      if (receiver.blockedUsers?.some((id) => id.toString() === senderId.toString())) {
        return res.status(403).json({ message: 'You cannot send messages to this user' });
      }

      if (sender?.blockedUsers?.some((id) => id.toString() === receiverId.toString())) {
        return res.status(403).json({ message: 'You have blocked this user' });
      }

      cloudinaryResult = await uploadVoiceToCloudinary(req.file);
      const message = await Message.create({
        ...baseMessagePayload,
        receiver: receiverId,
        voiceUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id
      });

      await message.populate('sender', 'username name fullName profileImage');
      await message.populate('receiver', 'username name fullName profileImage');
      emitDirectVoiceMessage(req, receiverId, message);

      return res.status(201).json({ message });
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isMemberId(group.members, senderId)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    if (group.settings?.onlyAdminsCanSend && !isMemberId(group.admins, senderId)) {
      return res.status(403).json({ message: 'Only admins can send messages in this group' });
    }

    cloudinaryResult = await uploadVoiceToCloudinary(req.file);
    const message = await Message.create({
      ...baseMessagePayload,
      group: groupId,
      voiceUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id
    });

    await message.populate('sender', 'username name fullName profileImage');
    incrementGroupUnreadCounts(group, senderId);
    await group.save();
    emitGroupVoiceMessage(req, group, senderId, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error('Voice upload error:', error);

    if (cloudinaryResult?.public_id) {
      try {
        await cloudinary.uploader.destroy(cloudinaryResult.public_id, { resource_type: 'video' });
      } catch (cleanupError) {
        console.error('Failed to cleanup voice upload:', cleanupError);
      }
    }

    return res.status(500).json({ message: 'Failed to upload voice message' });
  }
});

module.exports = router;
