const multer = require('multer');
const path = require('path');

// Use memory storage for cloud deployment (Render/Heroku)
const storage = multer.memoryStorage();
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png']);
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png']);

const fileFilter = (req, file, cb) => {
  const extname = allowedImageExtensions.has(path.extname(file.originalname || '').toLowerCase());
  const mimetype = allowedImageMimeTypes.has(String(file.mimetype || '').toLowerCase());

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG and PNG images allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

module.exports = upload;
