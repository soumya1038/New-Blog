const fs = require('fs');
const { normalizeMime } = require('./mediaSignatures');

const readHeader = async (filePath, length = 512) => {
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

const startsWith = (buffer, bytes) =>
  buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);

const isLikelyText = (buffer) => {
  if (buffer.length === 0) return true;
  let suspicious = 0;
  for (const byte of buffer) {
    if (byte === 0x00) return false;
    const printable = byte === 0x09 || byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte <= 0x7e) || byte >= 0x80;
    if (!printable) suspicious += 1;
  }
  return suspicious / buffer.length < 0.05;
};

const detectDocumentFormatFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;

  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { label: 'pdf', mimes: new Set(['application/pdf']) };
  }
  if (
    startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(buffer, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(buffer, [0x50, 0x4b, 0x07, 0x08])
  ) {
    return {
      label: 'zip',
      mimes: new Set([
        'application/zip',
        'application/x-zip-compressed',
        'application/epub+zip',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ]),
    };
  }
  if (
    startsWith(buffer, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]) ||
    startsWith(buffer, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])
  ) {
    return { label: 'rar', mimes: new Set(['application/vnd.rar', 'application/x-rar-compressed']) };
  }
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return {
      label: 'compound-office',
      mimes: new Set([
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
      ]),
    };
  }
  if (isLikelyText(buffer)) {
    return { label: 'text', mimes: new Set(['text/plain']) };
  }

  return null;
};

const getDocumentFileSignatureValidationError = async (file, allowedMimeTypes) => {
  const allowed = new Set(
    [...(allowedMimeTypes || [])].map(normalizeMime).filter(Boolean)
  );
  const declaredMime = normalizeMime(file?.mimetype);
  const detected = detectDocumentFormatFromBuffer(await readHeader(file?.path));

  if (!detected) {
    return 'Uploaded document content is not a supported file type.';
  }
  if (![...detected.mimes].some((mime) => allowed.has(mime))) {
    return 'Uploaded document type is not allowed.';
  }
  if (declaredMime && allowed.has(declaredMime) && !detected.mimes.has(declaredMime)) {
    return 'Uploaded document type does not match the file content.';
  }
  return '';
};

module.exports = {
  detectDocumentFormatFromBuffer,
  getDocumentFileSignatureValidationError,
};
