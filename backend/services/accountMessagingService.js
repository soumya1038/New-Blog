const { enqueueEmailJob } = require('../jobs/queueService');
const { sendTelegramMessage } = require('../utils/telegramMessages');
const { logError } = require('../utils/safeErrorLog');

const getAccountDeliveryChannels = (user = {}) => ({
  email: Boolean(String(user.email || '').trim()),
  telegram: Boolean(String(user?.oauthProviders?.telegram?.id || '').trim()),
  // SMS is intentionally reserved for a future provider implementation.
  sms: false,
});

const sendAccountMessage = async ({
  user,
  emailJobType = '',
  emailPayload = {},
  emailJobOptions = {},
  telegramText = '',
  telegramErrorContext = 'Telegram account message',
}) => {
  const available = getAccountDeliveryChannels(user);
  const delivered = { email: false, telegram: false, sms: false };

  if (available.email && emailJobType) {
    try {
      await enqueueEmailJob(emailJobType, { ...emailPayload, email: user.email }, emailJobOptions);
      delivered.email = true;
    } catch (error) {
      logError(`Failed to enqueue ${emailJobType}:`, error);
    }
  }

  if (available.telegram && telegramText) {
    delivered.telegram = await sendTelegramMessage({
      telegramUserId: user.oauthProviders.telegram.id,
      text: telegramText,
      errorContext: telegramErrorContext,
    });
  }

  return {
    available,
    delivered,
    channels: Object.keys(delivered).filter((channel) => delivered[channel]),
    anyDelivered: Object.values(delivered).some(Boolean),
  };
};

module.exports = { getAccountDeliveryChannels, sendAccountMessage };
