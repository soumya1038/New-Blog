import axios from 'axios';
import { API_BASE_URL } from './apiBaseUrl';

export const TELEGRAM_AUTH_ORIGIN = String(
  process.env.REACT_APP_TELEGRAM_AUTH_ORIGIN || 'https://lekhon-development.netlify.app'
).replace(/\/+$/, '');

let telegramReadyPromise;

const loadTelegramWidget = () => new Promise((resolve, reject) => {
  if (window.Telegram?.Login?.auth) {
    resolve();
    return;
  }

  let script = document.querySelector('script[data-lekhon-telegram-login]');
  if (!script) {
    script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.dataset.lekhonTelegramLogin = 'true';
    document.head.appendChild(script);
  }

  script.addEventListener('load', resolve, { once: true });
  script.addEventListener('error', () => reject(new Error('Telegram is unavailable.')), { once: true });
});

export const isTelegramAuthOrigin = () => window.location.origin === TELEGRAM_AUTH_ORIGIN;

export const prepareTelegramAuth = () => {
  if (!telegramReadyPromise) {
    telegramReadyPromise = Promise.all([
      loadTelegramWidget(),
      axios.get(`${API_BASE_URL}/api/auth/telegram/config`),
    ]).then(([, response]) => {
      const botId = Number(response?.data?.botId);
      if (!botId || !window.Telegram?.Login?.auth) throw new Error('Telegram is unavailable.');
      return botId;
    }).catch((error) => {
      telegramReadyPromise = undefined;
      throw error;
    });
  }
  return telegramReadyPromise;
};

export const authorizeWithTelegram = async () => {
  const botId = await prepareTelegramAuth();
  return new Promise((resolve, reject) => {
    window.Telegram.Login.auth({ bot_id: botId, request_access: true }, (telegramUser) => {
      if (telegramUser) resolve(telegramUser);
      else reject(new Error('Telegram authorization was cancelled.'));
    });
  });
};
