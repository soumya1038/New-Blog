const multer = require('multer');
const path = require('path');
const fs = require('fs');

const statusMediaMaxMb = Math.max(1, Number(process.env.STATUS_MEDIA_UPLOAD_MAX_MB) || 25);
const statusMediaTempDir = path.resolve(
  process.env.STATUS_MEDIA_UPLOAD_TEMP_DIR || path.join(__dirname, '..', 'tmp', 'status-media')
);
fs.mkdirSync(statusMediaTempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, statusMediaTempDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExt = /\.(jpeg|jpg|png|mp4|mov|webm)$/i;
  const isImage = /^image\/(jpeg|jpg|png)$/i.test(file.mimetype);
  const isVideo = /^video\/(mp4|quicktime|webm)$/i.test(file.mimetype);
  const hasAllowedExt = allowedExt.test(path.extname(file.originalname || ''));

  if ((isImage || isVideo) && hasAllowedExt) {
    cb(null, true);
    return;
  }

  cb(new Error('Only JPG, PNG, MP4, MOV, and WEBM files are allowed for status media.'));
};

const statusUpload = multer({
  storage,
  limits: { fileSize: statusMediaMaxMb * 1024 * 1024 },
  fileFilter,
});

module.exports = statusUpload;
