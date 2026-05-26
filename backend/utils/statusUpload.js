const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

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
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter,
});

module.exports = statusUpload;

