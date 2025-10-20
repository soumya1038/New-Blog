const express = require('express');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const {
  createBlog,
  getBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
  toggleLike
} = require('../controllers/blogController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Image upload route
router.post('/upload-image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'blog-images' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({ success: true, url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/delete-image/:publicId', protect, async (req, res) => {
  try {
    const publicId = req.params.publicId;
    await cloudinary.uploader.destroy(publicId);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, createBlog);
router.get('/', optionalAuth, getBlogs);
router.get('/:id', getBlog);
router.put('/:id', protect, updateBlog);
router.delete('/:id', protect, deleteBlog);
router.post('/:id/like', protect, toggleLike);

module.exports = router;
