import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FaTelegramPlane } from 'react-icons/fa';
import { API_BASE_URL } from '../utils/apiBaseUrl';
import { storeAuthSession } from '../utils/authSession';
import { clearRedirectAfterLogin } from '../utils/authRedirects';

const DEPLOYED_TELEGRAM_ORIGIN = String(
  process.env.REACT_APP_TELEGRAM_AUTH_ORIGIN || 'https://lekhon-development.netlify.app'
).replace(/\/+$/, '');

const TelegramLoginButton = ({ rememberMe = false, onError, C }) => {
  const [botId, setBotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (window.location.origin !== DEPLOYED_TELEGRAM_ORIGIN) return () => { mountedRef.current = false; };

    let script = document.querySelector('script[data-lekhon-telegram-login]');
    if (!script) {
      script = document.createElement('script');
      script.async = true;
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.dataset.lekhonTelegramLogin = 'true';
      document.head.appendChild(script);
    }

    axios.get(`${API_BASE_URL}/api/auth/telegram/config`)
      .then((response) => {
        if (mountedRef.current) setBotId(String(response?.data?.botId || '').trim());
      })
      .catch(() => {
        // Keep provider configuration failures private; the option simply stays unavailable.
      });

    return () => { mountedRef.current = false; };
  }, []);

  const finishLogin = async (telegramUser) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/telegram/exchange`, telegramUser);
      const token = response?.data?.token;
      if (!token) throw new Error('Telegram sign-in could not be completed.');
      storeAuthSession({ token, user: response?.data?.user, rememberMe });
      sessionStorage.setItem('showLoginIntro', 'true');
      if (response?.data?.missingEmailForWelcome) {
        sessionStorage.setItem('socialEmailSetupRequired', 'telegram');
        sessionStorage.removeItem('googlePasswordSetupRequired');
        window.location.href = '/profile';
        return;
      }
      if (response?.data?.passwordSetupRequired) {
        sessionStorage.setItem('googlePasswordSetupRequired', 'true');
        clearRedirectAfterLogin();
        window.location.href = '/profile?forcePasswordChange=1';
        return;
      }
      window.location.href = '/home';
    } catch (error) {
      setLoading(false);
      onError?.('Telegram sign-in could not be completed. Please try again.');
    }
  };

  const handleClick = () => {
    onError?.('');
    if (window.location.origin !== DEPLOYED_TELEGRAM_ORIGIN) {
      window.location.assign(`${DEPLOYED_TELEGRAM_ORIGIN}${window.location.pathname}`);
      return;
    }
    if (!botId || !window.Telegram?.Login?.auth) return;
    window.Telegram.Login.auth({ bot_id: Number(botId), request_access: true }, (user) => {
      if (user) finishLogin(user);
    });
  };

  const available = window.location.origin !== DEPLOYED_TELEGRAM_ORIGIN || Boolean(botId);
  if (!available) return null;
  const active = hovered && !loading;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Continue with Telegram"
      title="Continue with Telegram"
      style={{
        width: 46,
        height: 46,
        borderRadius: 11,
        border: `1px solid ${active ? C.brand : C.inputBorder}`,
        background: active ? C.brandDimBg : C.inputBg,
        color: active ? C.brand : C.muted,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.65 : 1,
        transition: 'all 0.22s',
        transform: active ? 'translateY(-2px)' : 'none',
        boxShadow: active ? `0 4px 12px ${C.brandGlow}` : 'none',
      }}
    >
      <FaTelegramPlane size={19} aria-hidden="true" />
    </button>
  );
};

export default TelegramLoginButton;
