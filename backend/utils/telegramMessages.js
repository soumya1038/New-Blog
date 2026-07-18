const axios = require('axios');
const { logError } = require('./safeErrorLog');

const getTelegramBotToken = () => String(process.env.TELEGRAM_BOT_TOKEN || '').trim();

const sendTelegramMessage = async ({ telegramUserId, text, errorContext = 'Telegram message' }) => {
  const botToken = getTelegramBotToken();
  const chatId = String(telegramUserId || '').trim();
  if (!botToken || !chatId || !text) return false;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      { chat_id: chatId, text, protect_content: true },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    return Boolean(response?.data?.ok);
  } catch (error) {
    logError(`Failed to deliver ${errorContext}:`, error);
    return false;
  }
};

module.exports = { sendTelegramMessage };
