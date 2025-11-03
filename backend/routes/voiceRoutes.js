const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/voice');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for voice message uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /webm|ogg|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only audio files are allowed'));
  }
});

// Upload voice message
router.post('/', protect, upload.single('voice'), async (req, res) => {
  try {
    const { receiverId, duration } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No voice file uploaded' });
    }

    const voiceUrl = `/uploads/voice/${req.file.filename}`;

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      type: 'voice',
      voiceUrl,
      voiceDuration: parseInt(duration),
      content: '[Voice Message]',
      encrypted: false,
      delivered: true
    });

    await message.populate('sender', 'username name profileImage');

    // Emit socket event
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const receiverData = onlineUsers?.get(receiverId);
    
    if (receiverData) {
      io.to(receiverData.socketId).emit('message:receive', message);
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Voice upload error:', error);
    res.status(500).json({ message: 'Failed to upload voice message' });
  }
});

module.exports = router;
