const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|xls|xlsx|ppt|pptx|zip|rar/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error('Only images and documents are allowed'));
  }
});

// Upload file
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Determine message type
    const isImage = req.file.mimetype.startsWith('image/');
    const messageType = isImage ? 'image' : 'document';

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: `chat-files/${messageType}s`,
        public_id: `${Date.now()}-${req.file.originalname.split('.')[0]}`
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ message: 'Failed to upload file' });
        }

        try {
          const message = await Message.create({
            sender: senderId,
            receiver: receiverId,
            type: messageType,
            content: `[${messageType === 'image' ? 'Image' : 'File'}]`,
            fileUrl: result.secure_url,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            cloudinaryPublicId: result.public_id,
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
        } catch (dbError) {
          // If DB save fails, delete from Cloudinary
          await cloudinary.uploader.destroy(result.public_id);
          console.error('Database error:', dbError);
          res.status(500).json({ message: 'Failed to save message' });
        }
      }
    );

    // Pipe file buffer to Cloudinary
    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

module.exports = router;
