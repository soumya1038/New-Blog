import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FaTelegramPlane } from 'react-icons/fa';
import { API_BASE_URL } from '../utils/apiBaseUrl';
import { storeAuthSession } from '../utils/authSession';
import { clearRedirectAfterLogin } from '../utils/authRedirects';
import { authorizeWithTelegram, isTelegramAuthOrigin, prepareTelegramAuth, TELEGRAM_AUTH_ORIGIN } from '../utils/telegramAuth';

const TelegramLoginButton = ({ rememberMe = false, onError, C }) => {
  const [available, setAvailable] = useState(!isTelegramAuthOrigin());
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!isTelegramAuthOrigin()) return () => { mountedRef.current = false; };
    prepareTelegramAuth()
      .then(() => { if (mountedRef.current) setAvailable(true); })
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
      }
      if (response?.data?.passwordSetupRequired) {
        if (response?.data?.telegramPasswordDelivered) {
          sessionStorage.setItem('googlePasswordSetupRequired', 'true');
          sessionStorage.setItem('passwordDeliveryChannel', 'telegram');
        } else {
          sessionStorage.setItem('telegramPasswordDeliveryFailed', 'true');
        }
        clearRedirectAfterLogin();
        window.location.href = response?.data?.telegramPasswordDelivered
          ? '/profile?forcePasswordChange=1'
          : '/profile';
        return;
      }
      if (response?.data?.missingEmailForWelcome) {
        window.location.href = '/profile';
        return;
      }
      window.location.href = '/home';
    } catch (error) {
      setLoading(false);
      onError?.('Telegram sign-in could not be completed. Please try again.');
    }
  };

  const handleClick = async () => {
    onError?.('');
    if (!isTelegramAuthOrigin()) {
      window.location.assign(`${TELEGRAM_AUTH_ORIGIN}${window.location.pathname}`);
      return;
    }
    try {
      const telegramUser = await authorizeWithTelegram();
      await finishLogin(telegramUser);
    } catch (error) {
      onError?.('Telegram sign-in could not be completed. Please try again.');
    }
  };

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
