const DEFAULT_MAX_ERROR_LOG_LENGTH = 500;

const REDACTION_PATTERNS = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]'],
  [/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]'],
  [/\b(authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|secret|password|signature|otp)\s*[:=]\s*["']?[^"',\s&}]+/gi, '$1=[redacted]'],
  [/([?&](?:access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|secret|password|signature|otp)=)[^&\s]+/gi, '$1[redacted]'],
];

const redactLogText = (value = '') => {
  let text = String(value || '');
  REDACTION_PATTERNS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  return text;
};

const toBoundedLogText = (value, maxLength = DEFAULT_MAX_ERROR_LOG_LENGTH) => {
  const text = redactLogText(value || 'Unknown error').replace(/\s+/g, ' ').trim();
  return text.slice(0, Math.max(1, maxLength));
};

const formatErrorForLog = (error, maxLength = DEFAULT_MAX_ERROR_LOG_LENGTH) => {
  if (error && typeof error === 'object') {
    const parts = [];
    if (error.name) parts.push(error.name);
    if (error.message) parts.push(error.message);
    if (error.code) parts.push(`code=${error.code}`);
    if (error.status || error.statusCode) parts.push(`status=${error.status || error.statusCode}`);
    return toBoundedLogText(parts.join(' ') || 'Unknown error', maxLength);
  }

  return toBoundedLogText(error, maxLength);
};

const logError = (label, error, maxLength) => {
  console.error(label, formatErrorForLog(error, maxLength));
};

const logWarn = (label, error, maxLength) => {
  console.warn(label, formatErrorForLog(error, maxLength));
};

const sendSafeServerError = (res, label, error, message = 'Server error') => {
  logError(label, error);
  return res.status(500).json({ success: false, message });
};

module.exports = {
  DEFAULT_MAX_ERROR_LOG_LENGTH,
  formatErrorForLog,
  logError,
  logWarn,
  redactLogText,
  sendSafeServerError
};
