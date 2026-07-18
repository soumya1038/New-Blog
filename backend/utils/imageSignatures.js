const fs = require('fs');

const SIGNATURES = [
  {
    mime: 'image/jpeg',
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    mime: 'image/png',
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    mime: 'image/gif',
    matches: (buffer) =>
      buffer.length >= 6 &&
      (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
        buffer.subarray(0, 6).toString('ascii') === 'GIF89a'),
  },
  {
    mime: 'image/webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

const detectImageMimeFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return '';
  const match = SIGNATURES.find((signature) => signature.matches(buffer));
  return match?.mime || '';
};

const readHeader = async (filePath, length = 32) => {
  if (!filePath) return Buffer.alloc(0);
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

const getImageSignatureValidationError = (file, allowedMimeTypes) => {
  const allowed = new Set(
    [...(allowedMimeTypes || [])].map((mime) => String(mime || '').toLowerCase())
  );
  const declaredMime = String(file?.mimetype || '').toLowerCase();
  const detectedMime = detectImageMimeFromBuffer(file?.buffer);

  if (!detectedMime) {
    return 'Uploaded file content is not a supported image.';
  }
  if (!allowed.has(detectedMime)) {
    return 'Uploaded image type is not allowed.';
  }
  if (declaredMime && declaredMime !== detectedMime) {
    return 'Uploaded image type does not match the file content.';
  }
  return '';
};

const getImageListSignatureValidationError = (files, allowedMimeTypes) => {
  const list = Array.isArray(files) ? files : [];
  for (const file of list) {
    const message = getImageSignatureValidationError(file, allowedMimeTypes);
    if (message) return message;
  }
  return '';
};

const getImageFileSignatureValidationError = async (file, allowedMimeTypes) => {
  const header = await readHeader(file?.path);
  return getImageSignatureValidationError(
    { ...file, buffer: header },
    allowedMimeTypes
  );
};

module.exports = {
  detectImageMimeFromBuffer,
  getImageFileSignatureValidationError,
  getImageSignatureValidationError,
  getImageListSignatureValidationError,
};
