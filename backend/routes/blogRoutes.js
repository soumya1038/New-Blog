const express = require('express');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const { removeImageUrlToCloudinary } = require('../services/backgroundRemovalService');
const {
  createBlog,
  getBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
  toggleLike,
  trackView,
  getShortBlogs
} = require('../controllers/blogController');
const { protect, optionalAuth } = require('../middleware/auth');
const trackActivity = require('../middleware/trackActivity');

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
const productImageUpload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const singleProductImageUpload = (req, res, next) => {
  productImageUpload.single('image')(req, res, (error) => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Product image must be 3MB or smaller.'
      : error.message;
    return res.status(400).json({ success: false, message });
  });
};

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

router.post('/upload-product-image', protect, singleProductImageUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const original = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'lekhon/content-products/originals' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    try {
      const processed = await removeImageUrlToCloudinary(original.secure_url, {
        folder: 'lekhon/content-products/transparent',
        publicIdPrefix: 'content-product',
      });

      return res.json({
        success: true,
        url: processed.url,
        public_id: processed.publicId,
        original_url: original.secure_url,
        original_public_id: original.public_id,
        backgroundRemovalStatus: 'done',
      });
    } catch (backgroundError) {
      return res.json({
        success: true,
        url: original.secure_url,
        public_id: original.public_id,
        original_url: original.secure_url,
        original_public_id: original.public_id,
        backgroundRemovalStatus: 'failed',
        backgroundRemovalError: String(backgroundError?.message || backgroundError).slice(0, 200),
      });
    }
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

router.post('/', protect, trackActivity, createBlog);
router.get('/', optionalAuth, getBlogs);
router.get('/short/all', getShortBlogs);
router.get('/:id', optionalAuth, getBlog);
router.post('/:id/view', optionalAuth, trackView);
router.put('/:id', protect, trackActivity, updateBlog);
router.delete('/:id', protect, trackActivity, deleteBlog);
router.post('/:id/like', protect, trackActivity, toggleLike);

module.exports = router;
