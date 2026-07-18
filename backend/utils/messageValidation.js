const { parsePositiveInt } = require('./cacheStore');

const MESSAGE_TEXT_MAX_LENGTH = parsePositiveInt(process.env.MESSAGE_TEXT_MAX_LENGTH, 4000);
const MESSAGE_REACTION_MAX_LENGTH = parsePositiveInt(process.env.MESSAGE_REACTION_MAX_LENGTH, 16);
const MESSAGE_PIN_MAX_HOURS = parsePositiveInt(process.env.MESSAGE_PIN_MAX_HOURS, 720);
const MESSAGE_FILE_CAPTION_MAX_LENGTH = parsePositiveInt(process.env.MESSAGE_FILE_CAPTION_MAX_LENGTH, 1000);
const MESSAGE_FILE_NAME_MAX_LENGTH = parsePositiveInt(process.env.MESSAGE_FILE_NAME_MAX_LENGTH, 180);

const validateTextMessageContent = (value) => {
  if (typeof value !== 'string') {
    return { error: 'Message content must be text' };
  }
  const content = value.trim();
  if (!content) {
    return { error: 'Message content is required' };
  }
  if (content.length > MESSAGE_TEXT_MAX_LENGTH) {
    return { error: `Message content must be ${MESSAGE_TEXT_MAX_LENGTH} characters or fewer` };
  }
  return { value: content };
};

const validateReactionEmoji = (value) => {
  if (typeof value !== 'string') {
    return { error: 'Reaction must be text' };
  }
  const emoji = value.trim();
  if (!emoji) {
    return { error: 'Reaction is required' };
  }
  if (emoji.length > MESSAGE_REACTION_MAX_LENGTH) {
    return { error: 'Reaction is too long' };
  }
  return { value: emoji };
};

const validateTextMessageType = (value = 'text') => {
  const type = String(value || 'text').trim().toLowerCase();
  if (type !== 'text') {
    return { error: 'Unsupported message type' };
  }
  return { value: 'text' };
};

const normalizeOptionalFileCaption = (value) => {
  if (value === undefined || value === null) return { value: '' };
  if (typeof value !== 'string') {
    return { error: 'File caption must be text' };
  }
  const caption = value.replace(/\s+/g, ' ').trim();
  if (caption.length > MESSAGE_FILE_CAPTION_MAX_LENGTH) {
    return { error: `File caption must be ${MESSAGE_FILE_CAPTION_MAX_LENGTH} characters or fewer` };
  }
  return { value: caption };
};

const normalizeFileName = (value, fallback = 'file') => {
  const rawName = String(value || fallback)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/-+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+/, '')
    .replace(/[.\s-]+$/, '')
    .trim();
  const fileName = rawName || fallback;
  if (fileName.length <= MESSAGE_FILE_NAME_MAX_LENGTH) return fileName;

  const extensionMatch = fileName.match(/(\.[A-Za-z0-9]{1,12})$/);
  const extension = extensionMatch ? extensionMatch[1] : '';
  const baseLength = Math.max(1, MESSAGE_FILE_NAME_MAX_LENGTH - extension.length);
  return `${fileName.slice(0, baseLength).trim()}${extension}`;
};

const parsePinDurationHours = (value) => {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 1 || duration > MESSAGE_PIN_MAX_HOURS) {
    return { error: `Pin duration must be between 1 and ${MESSAGE_PIN_MAX_HOURS} hours` };
  }
  return { value: duration };
};

module.exports = {
  MESSAGE_TEXT_MAX_LENGTH,
  MESSAGE_REACTION_MAX_LENGTH,
  MESSAGE_PIN_MAX_HOURS,
  MESSAGE_FILE_CAPTION_MAX_LENGTH,
  MESSAGE_FILE_NAME_MAX_LENGTH,
  validateTextMessageContent,
  validateReactionEmoji,
  validateTextMessageType,
  normalizeOptionalFileCaption,
  normalizeFileName,
  parsePinDurationHours
};
