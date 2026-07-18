const express = require('express');
const multer = require('multer');
const { mediaUploadLimiter } = require('../middleware/uploadLimiters');
const path = require('path');
const cloudinary = require('../utils/cloudinary');
const {
  BACKGROUND_REMOVAL_FAILED_MESSAGE,
  removeImageUrlToCloudinary,
} = require('../services/backgroundRemovalService');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const Short = require('../models/Short');
const {
  getUserScopedImageFolder,
  getUserScopedProductFolder,
  normalizeCloudinaryPublicId,
  isUserScopedContentPublicId
} = require('../utils/cloudinaryPublicIds');
const { getImageSignatureValidationError } = require('../utils/imageSignatures');
const {
  createBlog,
  getBlogs,
  getBlog,
  getRelatedBlogContent,
  getAuthorBlogContent,
  updateBlog,
  deleteBlog,
  toggleLike,
  trackView,
  getShortBlogs
} = require('../controllers/blogController');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireSensitiveActionToken, requireTwoFactorForAction } = require('../utils/twoFactor');
const trackActivity = require('../middleware/trackActivity');
const contentViewLimiter = require('../middleware/contentViewLimiter');
const { sendSafeServerError } = require('../utils/safeErrorLog');

const router = express.Router();

const sendBlogRouteServerError = (res, error) =>
  sendSafeServerError(res, '[blogRoutes] request failed:', error, 'Unable to process blog media request');

const userOwnsReferencedPublicId = async (userId, publicId) => {
  const ownerFilter = { author: userId };
  const contentImageFilter = {
    $or: [
      { cloudinaryPublicId: publicId },
      { galleryImagePublicIds: publicId }
    ]
  };

  const [blog, article, short] = await Promise.all([
    Blog.exists({ ...ownerFilter, ...contentImageFilter }),
    Article.exists({ ...ownerFilter, ...contentImageFilter }),
    Short.exists({ ...ownerFilter, cloudinaryPublicId: publicId })
  ]);

  return Boolean(blog || article || short);
};

const deleteUploadedImage = async (req, res) => {
  try {
    const publicId = normalizeCloudinaryPublicId(
      req.query.publicId || req.body?.publicId || req.params.publicId
    );

    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Invalid image id' });
    }

    const userId = req.user._id;
    const allowed = isUserScopedContentPublicId(userId, publicId) ||
      await userOwnsReferencedPublicId(userId, publicId);

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this image' });
    }

    await cloudinary.uploader.destroy(publicId);
    return res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Image deletion failed' });
  }
};

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const isAllowedImageUpload = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  return allowedImageExtensions.has(ext) && allowedImageMimeTypes.has(mime);
};
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (isAllowedImageUpload(file)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'), false);
    }
  }
});
const productImageUpload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedImageUpload(file)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'), false);
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
router.post('/upload-image', protect, mediaUploadLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }
    const signatureError = getImageSignatureValidationError(req.file, allowedImageMimeTypes);
    if (signatureError) {
      return res.status(400).json({ success: false, message: signatureError });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: getUserScopedImageFolder(req.user._id) },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({ success: true, url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    return sendBlogRouteServerError(res, error);
  }
});

router.post('/upload-product-image', protect, singleProductImageUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }
    const signatureError = getImageSignatureValidationError(req.file, allowedImageMimeTypes);
    if (signatureError) {
      return res.status(400).json({ success: false, message: signatureError });
    }

    const original = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: getUserScopedProductFolder(req.user._id, 'originals') },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    try {
      const processed = await removeImageUrlToCloudinary(original.secure_url, {
        folder: getUserScopedProductFolder(req.user._id, 'transparent'),
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
        backgroundRemovalError: BACKGROUND_REMOVAL_FAILED_MESSAGE,
      });
    }
  } catch (error) {
    return sendBlogRouteServerError(res, error);
  }
});

router.delete('/delete-image', protect, deleteUploadedImage);
router.delete('/delete-image/:publicId', protect, deleteUploadedImage);

router.post('/', protect, trackActivity, createBlog);
router.get('/', optionalAuth, getBlogs);
router.get('/short/all', getShortBlogs);
router.get('/:id/related', optionalAuth, getRelatedBlogContent);
router.get('/:id/author-content', optionalAuth, getAuthorBlogContent);
router.get('/:id', optionalAuth, getBlog);
router.post('/:id/view', optionalAuth, contentViewLimiter, trackView);
router.put('/:id', protect, trackActivity, updateBlog);
router.delete('/:id', protect, requireSensitiveActionToken('delete_blog'), requireTwoFactorForAction('delete_blog'), trackActivity, deleteBlog);
router.post('/:id/like', protect, trackActivity, toggleLike);

module.exports = router;
