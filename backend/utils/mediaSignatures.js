const fs = require('fs');

const normalizeMime = (value) =>
  String(value || '').toLowerCase().split(';')[0].trim();

const readHeader = async (filePath, length = 4096) => {
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

const asciiAt = (buffer, start, end) =>
  buffer.length >= end ? buffer.subarray(start, end).toString('ascii') : '';

const isMp3FrameHeader = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || (buffer[1] & 0xe0) !== 0xe0) return false;
  const versionId = (buffer[1] >> 3) & 0x03;
  const layer = (buffer[1] >> 1) & 0x03;
  const bitrateIndex = (buffer[2] >> 4) & 0x0f;
  const sampleRateIndex = (buffer[2] >> 2) & 0x03;
  return versionId !== 0x01 && layer !== 0x00 && bitrateIndex !== 0x00 &&
    bitrateIndex !== 0x0f && sampleRateIndex !== 0x03;
};

const mp4Brands = (buffer) => {
  if (buffer.length < 12 || asciiAt(buffer, 4, 8) !== 'ftyp') return [];
  const brands = [asciiAt(buffer, 8, 12)];
  for (let offset = 16; offset + 4 <= Math.min(buffer.length, 128); offset += 4) {
    brands.push(asciiAt(buffer, offset, offset + 4));
  }
  return brands.filter(Boolean);
};

const hasAnyBrand = (brands, values) => brands.some((brand) => values.has(brand));

const detectMediaFormatFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;

  if (buffer.length >= 3 && asciiAt(buffer, 0, 3) === 'ID3') {
    return { label: 'mp3', mimes: new Set(['audio/mpeg', 'audio/mp3']) };
  }
  if (buffer.length >= 12 && asciiAt(buffer, 0, 4) === 'RIFF' && asciiAt(buffer, 8, 12) === 'WAVE') {
    return { label: 'wav', mimes: new Set(['audio/wav', 'audio/wave', 'audio/x-wav']) };
  }
  if (buffer.length >= 4 && asciiAt(buffer, 0, 4) === 'OggS') {
    return { label: 'ogg', mimes: new Set(['audio/ogg', 'application/ogg']) };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) {
    return { label: 'aac', mimes: new Set(['audio/aac', 'audio/aacp']) };
  }
  if (isMp3FrameHeader(buffer)) {
    return { label: 'mp3', mimes: new Set(['audio/mpeg', 'audio/mp3']) };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    const headerText = buffer.toString('latin1').toLowerCase();
    if (headerText.includes('webm')) {
      return { label: 'webm', mimes: new Set(['audio/webm', 'video/webm']) };
    }
  }

  const brands = mp4Brands(buffer);
  if (brands.length > 0) {
    if (hasAnyBrand(brands, new Set(['qt  ']))) {
      return { label: 'quicktime', mimes: new Set(['video/quicktime']) };
    }
    if (hasAnyBrand(brands, new Set(['M4A ', 'M4B ', 'M4P ']))) {
      return { label: 'm4a', mimes: new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a']) };
    }
    return {
      label: 'mp4',
      mimes: new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'video/mp4']),
    };
  }

  return null;
};

const getMediaFileSignatureValidationError = async (file, allowedMimeTypes) => {
  const allowed = new Set(
    [...(allowedMimeTypes || [])].map(normalizeMime).filter(Boolean)
  );
  const declaredMime = normalizeMime(file?.mimetype);
  const detected = detectMediaFormatFromBuffer(await readHeader(file?.path));

  if (!detected) {
    return 'Uploaded media content is not a supported audio or video file.';
  }
  if (![...detected.mimes].some((mime) => allowed.has(mime))) {
    return 'Uploaded media type is not allowed.';
  }
  if (declaredMime && allowed.has(declaredMime) && !detected.mimes.has(declaredMime)) {
    return 'Uploaded media type does not match the file content.';
  }
  return '';
};

module.exports = {
  detectMediaFormatFromBuffer,
  getMediaFileSignatureValidationError,
  normalizeMime,
};
