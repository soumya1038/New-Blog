const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const cloudinary = require('../utils/cloudinary');
const groq = require('../utils/openai');
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const { createRedisRateLimitStore } = require('../utils/redisRateLimitStore');
const {
  getMediaFileSignatureValidationError,
  normalizeMime,
} = require('../utils/mediaSignatures');
const { logError } = require('../utils/safeErrorLog');
const { incrementGroupUnreadCounts } = require('../utils/groupUnreadCounts');
const { sanitizeMessageMediaForDelivery } = require('../utils/messageMediaAccess');

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const voiceUploadMaxMb = Math.max(1, Number(process.env.VOICE_UPLOAD_MAX_MB) || 10);
const whisperUploadMaxMb = Math.max(1, Number(process.env.WHISPER_UPLOAD_MAX_MB) || 25);
const whisperRateLimitWindowMs = toPositiveInt(process.env.WHISPER_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const voiceUploadTempDir = path.resolve(
  process.env.VOICE_UPLOAD_TEMP_DIR || path.join(__dirname, '..', 'tmp', 'voice')
);
fs.mkdirSync(voiceUploadTempDir, { recursive: true });
const whisperRateLimitFailOpen =
  process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_FAIL_OPEN === 'true';

const createWhisperLimiter = ({ prefix, max, message }) => {
  const store = createRedisRateLimitStore({ prefix, windowMs: whisperRateLimitWindowMs });

  return rateLimit({
    windowMs: whisperRateLimitWindowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(store ? { store } : {}),
    passOnStoreError: Boolean(store) && whisperRateLimitFailOpen,
    message: {
      ok: false,
      error: {
        code: 'rate_limited',
        message,
      },
    },
  });
};

const whisperStatusLimiter = createWhisperLimiter({
  prefix: 'whisper-status',
  max: toPositiveInt(process.env.WHISPER_STATUS_RATE_LIMIT_MAX, 120),
  message: 'Too many voice status checks. Please wait a moment and try again.',
});

const whisperTranscribeLimiter = createWhisperLimiter({
  prefix: 'whisper-transcribe',
  max: toPositiveInt(process.env.WHISPER_TRANSCRIBE_RATE_LIMIT_MAX, 12),
  message: 'Too many voice transcription requests. Please wait a moment and try again.',
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, voiceUploadTempDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `${unique}${ext}`);
  }
});

const allowedVoiceExtensions = new Set(['.webm', '.ogg', '.mp3', '.mpeg', '.mp4', '.m4a', '.wav', '.aac']);
const allowedVoiceMimeTypes = new Set([
  'audio/webm',
  'video/webm',
  'audio/ogg',
  'application/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aac',
  'audio/aacp',
]);

const isAllowedVoiceFile = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = normalizeMime(file.mimetype);
  return allowedVoiceExtensions.has(ext) && allowedVoiceMimeTypes.has(mime);
};

const cleanupTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logError('Voice temp cleanup error:', error);
    }
  }
};

const upload = multer({
  storage,
  limits: { fileSize: voiceUploadMaxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedVoiceFile(file)) {
      return cb(null, true);
    }
    cb(new Error('Only audio files are allowed'));
  }
});
const whisperUpload = multer({
  storage,
  limits: { fileSize: whisperUploadMaxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedVoiceFile(file)) {
      return cb(null, true);
    }
    cb(new Error('Only audio files are allowed'));
  }
});

const getVoiceUploadErrorMessage = (error, sizeMessage, fallbackMessage) => {
  if (error.code === 'LIMIT_FILE_SIZE') return sizeMessage;
  if (error.message === 'Only audio files are allowed') return error.message;
  return fallbackMessage;
};

const getWhisperModelStatus = () => ({
  loaded: Boolean(process.env.GROQ_API_KEY),
  mode: 'upload'
});

const handleWhisperUpload = (req, res, next) => {
  whisperUpload.single('files')(req, res, (error) => {
    if (!error) return next();

    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      ok: false,
      error: {
        code: error.code === 'LIMIT_FILE_SIZE' ? 'audio_too_large' : 'invalid_audio',
        message: getVoiceUploadErrorMessage(
          error,
          `Voice dictation audio must be less than ${whisperUploadMaxMb}MB`,
          'Invalid dictation audio upload'
        )
      }
    });
  });
};

const parseVoiceDuration = (duration) => {
  const parsed = Number.parseInt(duration, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 60 * 60);
};

const uploadVoiceToCloudinary = (file) => {
  return cloudinary.uploader.upload(file.path, {
    resource_type: 'video',
    type: 'authenticated',
    folder: 'chat-voice-messages',
    public_id: `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`
  });
};

const isMemberId = (ids = [], userId) => ids.some((id) => id.toString() === userId.toString());

const emitDirectVoiceMessage = (req, receiverId, message) => {
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${receiverId.toString()}`).emit('message:receive', message);
  }
};

const emitGroupVoiceMessage = (req, group, senderId, message) => {
  const io = req.app.get('io');
  if (!io) return;

  group.members.forEach((memberId) => {
    const memberIdStr = memberId.toString();
    if (memberIdStr === senderId.toString()) return;

    io.to(`user:${memberIdStr}`).emit('message:receive:group', message);
  });
};

const handleMulterUpload = (req, res, next) => {
  upload.single('voice')(req, res, (error) => {
    if (!error) return next();

    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message: getVoiceUploadErrorMessage(
        error,
        `Voice message must be less than ${voiceUploadMaxMb}MB`,
        'Invalid voice message upload'
      )
    });
  });
};

router.get('/whisper/health', protect, whisperStatusLimiter, (req, res) => {
  res.json({
    ok: true,
    model: getWhisperModelStatus()
  });
});

router.post('/whisper/wake', protect, whisperStatusLimiter, (req, res) => {
  res.json({
    ok: true,
    model: getWhisperModelStatus()
  });
});

router.post('/whisper/transcribe', protect, whisperTranscribeLimiter, handleWhisperUpload, async (req, res) => {
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
    const signatureError = await getMediaFileSignatureValidationError(req.file, allowedVoiceMimeTypes);
    if (signatureError) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'invalid_audio',
          message: signatureError
        }
      });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
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
    logError('Voice dictation transcription error:', error);
    return res.status(502).json({
      ok: false,
      error: {
        code: 'transcription_failed',
        message: 'Voice transcription failed'
      }
    });
  } finally {
    await cleanupTempFile(req.file?.path);
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
    const signatureError = await getMediaFileSignatureValidationError(req.file, allowedVoiceMimeTypes);
    if (signatureError) {
      return res.status(400).json({ message: signatureError });
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
        voiceUrl: '',
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryResourceType: cloudinaryResult.resource_type,
        cloudinaryDeliveryType: 'authenticated',
        cloudinaryFormat: cloudinaryResult.format || path.extname(req.file.originalname || '').replace(/^\./, '')
      });

      await message.populate('sender', 'username name fullName profileImage');
      await message.populate('receiver', 'username name fullName profileImage');
      const safeMessage = sanitizeMessageMediaForDelivery(message);
      emitDirectVoiceMessage(req, receiverId, safeMessage);

      return res.status(201).json({ message: safeMessage });
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
      voiceUrl: '',
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryResourceType: cloudinaryResult.resource_type,
      cloudinaryDeliveryType: 'authenticated',
      cloudinaryFormat: cloudinaryResult.format || path.extname(req.file.originalname || '').replace(/^\./, '')
    });

    await message.populate('sender', 'username name fullName profileImage');
    await incrementGroupUnreadCounts({
      groupId,
      senderId,
      memberIds: group.members,
    });
    const safeMessage = sanitizeMessageMediaForDelivery(message);
    emitGroupVoiceMessage(req, group, senderId, safeMessage);

    return res.status(201).json({ message: safeMessage });
  } catch (error) {
    logError('Voice upload error:', error);

    if (cloudinaryResult?.public_id) {
      try {
        await cloudinary.uploader.destroy(cloudinaryResult.public_id, {
          resource_type: 'video',
          type: 'authenticated',
        });
      } catch (cleanupError) {
        logError('Failed to cleanup voice upload:', cleanupError);
      }
    }

    return res.status(500).json({ message: 'Failed to upload voice message' });
  } finally {
    await cleanupTempFile(req.file?.path);
  }
});

module.exports = router;
