const getMessageMediaAccessPath = (message) => {
  const messageId = message?._id || message?.id;
  return messageId ? `/api/files/messages/${messageId}/access` : '';
};

const sanitizeMessageMediaForDelivery = (message) => {
  if (!message) return message;
  const safe = typeof message.toObject === 'function' ? message.toObject() : { ...message };

  delete safe.cloudinaryPublicId;
  delete safe.cloudinaryResourceType;
  delete safe.cloudinaryDeliveryType;
  delete safe.cloudinaryFormat;
  delete safe.cleanupStartedAt;

  if (safe.type === 'voice') safe.voiceUrl = '';
  if (safe.type === 'image' || safe.type === 'document') safe.fileUrl = '';
  if (safe.replyTo && typeof safe.replyTo === 'object') {
    safe.replyTo = sanitizeMessageMediaForDelivery(safe.replyTo);
  }

  return safe;
};

module.exports = {
  getMessageMediaAccessPath,
  sanitizeMessageMediaForDelivery,
};
