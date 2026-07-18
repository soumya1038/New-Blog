const { logError, logWarn } = require('../utils/safeErrorLog');

const uploadErrorPattern = /only .* (allowed|files are allowed)|file type is not allowed|invalid .*upload/i;

const getStatusCode = (err) => {
  if (err.statusCode || err.status) return err.statusCode || err.status;
  if (err.type === 'entity.too.large') return 413;
  if (err.name === 'MulterError') return err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  if (uploadErrorPattern.test(err.message || '')) return 400;
  return 500;
};

const getPublicMessage = (err, statusCode) => {
  if (statusCode >= 500) return 'Internal server error';
  if (statusCode === 413) return 'Request payload is too large';
  if (err.name === 'MulterError' || uploadErrorPattern.test(err.message || '')) {
    return 'Invalid upload';
  }
  if (err.publicMessage) return err.publicMessage;
  if (statusCode === 401) return 'Unauthorized';
  if (statusCode === 403) return 'Forbidden';
  if (statusCode === 404) return 'Not found';
  return 'Invalid request';
};

// Global error handler
exports.errorHandler = (err, req, res, next) => {
  const statusCode = getStatusCode(err);
  if (statusCode >= 500) logError('[global error handler]', err);
  else logWarn('[request validation]', err);
  
  res.status(statusCode).json({
    success: false,
    message: getPublicMessage(err, statusCode)
  });
};
