const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cloudinary = require('../utils/cloudinary');
const { protect } = require('../middleware/auth');
const {
  chatFileUploadLimiter,
  messageMediaAccessLimiter,
} = require('../middleware/uploadLimiters');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const { getDocumentFileSignatureValidationError } = require('../utils/documentSignatures');
const { getImageFileSignatureValidationError } = require('../utils/imageSignatures');
const { logError } = require('../utils/safeErrorLog');
const { decrypt, encrypt } = require('../utils/encryption');
const {
  normalizeFileName,
  normalizeOptionalFileCaption,
} = require('../utils/messageValidation');
const { sanitizeMessageMediaForDelivery } = require('../utils/messageMediaAccess');

const chatFileMaxMb = Math.max(1, Number(process.env.CHAT_FILE_UPLOAD_MAX_MB) || 50);
const chatFileTempDir = path.resolve(
  process.env.CHAT_FILE_UPLOAD_TEMP_DIR || path.join(__dirname, '..', 'tmp', 'chat-files')
);
fs.mkdirSync(chatFileTempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatFileTempDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `${unique}${ext}`);
  }
});
const allowedFileExtensions = new Set([
  '.jpeg', '.jpg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar'
]);
const allowedFileMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed'
]);
const chatImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const chatDocumentMimeTypes = new Set(
  [...allowedFileMimeTypes].filter((mime) => !chatImageMimeTypes.has(mime))
);
const upload = multer({
  storage,
  limits: { fileSize: chatFileMaxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    
    if (allowedFileExtensions.has(ext) && allowedFileMimeTypes.has(mime)) {
      return cb(null, true);
    }
    cb(new Error('Only images and documents are allowed'));
  }
});

const getFileUploadErrorMessage = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return `File must be ${chatFileMaxMb}MB or smaller`;
  }
  if (error.message === 'Only images and documents are allowed') {
    return error.message;
  }
  return 'Invalid file upload';
};

const cleanupTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logError('Chat file temp cleanup error:', error);
    }
  }
};

const messageMediaUrlTtlSeconds = Math.max(
  60,
  Math.min(60 * 60, Number(process.env.MESSAGE_MEDIA_URL_TTL_SECONDS) || 300)
);
const messageQueryMaxTimeMs = Math.max(
  100,
  Number(process.env.MESSAGE_QUERY_MAX_TIME_MS) || 5000
);

const inferCloudinaryFormat = (message) => {
  const storedFormat = String(message?.cloudinaryFormat || '').trim().toLowerCase();
  if (/^[a-z0-9]+$/.test(storedFormat)) return storedFormat;

  const extension = path.extname(message?.fileName || '').replace(/^\./, '').toLowerCase();
  if (/^[a-z0-9]+$/.test(extension)) return extension;

  const mimeSubtype = String(message?.mimeType || '').split('/')[1]?.split(/[;+]/)[0]?.toLowerCase();
  if (mimeSubtype === 'jpeg') return 'jpg';
  return /^[a-z0-9]+$/.test(mimeSubtype || '') ? mimeSubtype : 'bin';
};

const canAccessMessageMedia = async (message, userId) => {
  const normalizedUserId = String(userId || '');
  if (!message || !normalizedUserId || message.deletedForEveryone) return false;
  if (
    String(message.sender || '') === normalizedUserId ||
    String(message.receiver || '') === normalizedUserId
  ) {
    return true;
  }
  if (!message.group) return false;
  return Boolean(await Group.exists({ _id: message.group, members: userId })
    .maxTimeMS(messageQueryMaxTimeMs));
};

router.get('/messages/:messageId/access', protect, messageMediaAccessLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.messageId)) {
      return res.status(400).json({ success: false, message: 'Invalid media request' });
    }

    const message = await Message.findById(req.params.messageId)
      .select('+cloudinaryResourceType +cloudinaryDeliveryType +cloudinaryFormat')
      .maxTimeMS(messageQueryMaxTimeMs);
    if (!message || !(await canAccessMessageMedia(message, req.user._id))) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }
    if (!['voice', 'image', 'document'].includes(message.type)) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    let url = '';
    if (message.cloudinaryPublicId) {
      url = cloudinary.utils.private_download_url(
        message.cloudinaryPublicId,
        inferCloudinaryFormat(message),
        {
          expires_at: Math.floor(Date.now() / 1000) + messageMediaUrlTtlSeconds,
          resource_type: message.cloudinaryResourceType || (message.type === 'voice' ? 'video' : 'raw'),
          type: message.cloudinaryDeliveryType || 'upload',
          attachment: message.type === 'document',
        }
      );
    } else {
      url = String(message.voiceUrl || message.fileUrl || '').trim();
    }

    if (!/^https:\/\//i.test(url) || url.length > 8192) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    res.set('Cache-Control', 'private, no-store');
    return res.json({ success: true, url, expiresIn: messageMediaUrlTtlSeconds });
  } catch (error) {
    logError('Message media access error:', error);
    return res.status(500).json({ success: false, message: 'Unable to access media' });
  }
});

const handleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message: getFileUploadErrorMessage(error)
    });
  });
};

// Upload file
router.post('/', protect, chatFileUploadLimiter, handleFileUpload, async (req, res) => {
  try {
    const { receiverId, caption } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: 'Valid receiver is required' });
    }
    if (receiverId === senderId.toString()) {
      return res.status(400).json({ message: 'Cannot send files to yourself' });
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select('blockedUsers').maxTimeMS(messageQueryMaxTimeMs),
      User.findById(receiverId).select('blockedUsers').maxTimeMS(messageQueryMaxTimeMs)
    ]);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }
    if (receiver.blockedUsers?.some(userId => userId.toString() === senderId.toString())) {
      return res.status(403).json({ message: 'You cannot send files to this user' });
    }
    if (sender?.blockedUsers?.some(userId => userId.toString() === receiverId)) {
      return res.status(403).json({ message: 'You have blocked this user' });
    }

    // Determine message type
    const isImage = chatImageMimeTypes.has(String(req.file.mimetype || '').toLowerCase());
    const messageType = isImage ? 'image' : 'document';
    const captionValidation = normalizeOptionalFileCaption(caption);
    if (captionValidation.error) {
      return res.status(400).json({ message: captionValidation.error });
    }
    const safeCaption = captionValidation.value;
    const safeFileName = normalizeFileName(req.file.originalname, `chat-${messageType === 'image' ? 'image' : 'file'}`);

    if (isImage) {
      const signatureError = await getImageFileSignatureValidationError(req.file, chatImageMimeTypes);
      if (signatureError) {
        return res.status(400).json({ message: signatureError });
      }
    } else {
      const signatureError = await getDocumentFileSignatureValidationError(req.file, chatDocumentMimeTypes);
      if (signatureError) {
        return res.status(400).json({ message: signatureError });
      }
    }

    let result;
    try {
      result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        type: 'authenticated',
        folder: `chat-files/${messageType}s`,
        public_id: `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`
      });
    } catch (cloudinaryError) {
      logError('Cloudinary upload error:', cloudinaryError);
      return res.status(500).json({ message: 'Failed to upload file' });
    }

    try {
      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        type: messageType,
        content: encrypt(safeCaption || `[${messageType === 'image' ? 'Image' : 'File'}]`),
        caption: safeCaption ? encrypt(safeCaption) : null,
        fileUrl: '',
        fileName: safeFileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        cloudinaryPublicId: result.public_id,
        cloudinaryResourceType: result.resource_type,
        cloudinaryDeliveryType: 'authenticated',
        cloudinaryFormat: result.format || path.extname(req.file.originalname || '').replace(/^\./, ''),
        encrypted: true,
        delivered: true
      });

      await message.populate('sender', 'username name profileImage');

      const safeMessage = sanitizeMessageMediaForDelivery(message);
      safeMessage.content = decrypt(safeMessage.content);
      safeMessage.caption = safeMessage.caption ? decrypt(safeMessage.caption) : null;
      const io = req.app.get('io');
      if (io) io.to(`user:${receiverId}`).emit('message:receive', safeMessage);

      res.status(201).json({ message: safeMessage });
    } catch (dbError) {
      await cloudinary.uploader.destroy(
        result.public_id,
        {
          ...(result.resource_type ? { resource_type: result.resource_type } : {}),
          type: 'authenticated',
        }
      ).catch(() => {});
      logError('Database error:', dbError);
      res.status(500).json({ message: 'Failed to save message' });
    }
  } catch (error) {
    logError('File upload error:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  } finally {
    await cleanupTempFile(req.file?.path);
  }
});

module.exports = router;
