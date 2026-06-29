import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ScaleLoader } from 'react-spinners';
import api from '../services/api';
import { getOAuthRedirectUri } from '../utils/oauthRedirects';
import { redirectOAuthCallbackToNativeApp } from '../utils/nativeOAuthBridge';

const extractTwitterErrorDetail = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return '';
  const details = payload.details;
  if (typeof details === 'string') return details;
  if (details && typeof details === 'object') {
    const candidates = [
      details.error_description,
      details.error,
      details.detail,
      details.message,
    ].filter(Boolean);
    if (candidates.length > 0) return String(candidates[0]);
    if (Array.isArray(details.errors) && details.errors.length > 0) {
      const first = details.errors[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        return String(first.message || first.detail || first.title || '');
      }
    }
  }
  return '';
};

const TwitterAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const apiBase = useMemo(
    () => (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, ''),
    []
  );

  useEffect(() => {
    const finalizeTwitterAuth = async () => {
      let guardKey = '';
      try {
        const params = new URLSearchParams(window.location.search);
        if (redirectOAuthCallbackToNativeApp('twitter', params)) {
          return;
        }
        const oauthError = params.get('error');
        const oauthErrorDescription = params.get('error_description');
        const code = params.get('code');
        const state = params.get('state');
        const socialConnectIntent = sessionStorage.getItem('socialConnectIntent');
        const isConnectFlow = socialConnectIntent === 'twitter' && Boolean(localStorage.getItem('token'));

        guardKey = `twitter_oauth_exchange:${code || 'no_code'}:${state || 'no_state'}`;
        if (sessionStorage.getItem(guardKey) === '1') {
          return;
        }
        sessionStorage.setItem(guardKey, '1');

        if (oauthError) {
          throw new Error(oauthErrorDescription || oauthError);
        }

        if (!code) {
          throw new Error('Missing authorization code from Twitter redirect.');
        }

        const redirectUri = getOAuthRedirectUri('twitter');
        if (isConnectFlow) {
          const connectResponse = await api.post('/auth/twitter/connect/exchange', {
            code,
            state,
            redirectUri,
          });

          if (!connectResponse?.data?.success) {
            throw new Error('Twitter account connection failed.');
          }

          const missingEmailForWelcome = Boolean(connectResponse?.data?.missingEmailForWelcome);
          if (missingEmailForWelcome) {
            sessionStorage.setItem('socialEmailSetupRequired', 'twitter');
          }
          sessionStorage.removeItem('socialConnectIntent');
          sessionStorage.setItem('socialConnectSuccess', 'twitter');
          window.location.href = '/profile';
          return;
        }

        const response = await axios.post(`${apiBase}/api/auth/twitter/exchange`, {
          code,
          state,
          redirectUri,
        });

        const token = response?.data?.token;
        if (!token) {
          throw new Error('Twitter login did not return an application token.');
        }
        const passwordSetupRequired = Boolean(response?.data?.passwordSetupRequired);
        const missingEmailForWelcome = Boolean(response?.data?.missingEmailForWelcome);

        localStorage.setItem('token', token);
        localStorage.setItem('rememberMe', 'true');
        sessionStorage.setItem('showLoginIntro', 'true');
        if (missingEmailForWelcome) {
          sessionStorage.setItem('socialEmailSetupRequired', 'twitter');
        }
        if (passwordSetupRequired) {
          sessionStorage.setItem('googlePasswordSetupRequired', 'true');
          sessionStorage.removeItem('redirectAfterLogin');
          window.location.href = '/profile?forcePasswordChange=1';
          return;
        }
        if (missingEmailForWelcome) {
          sessionStorage.removeItem('redirectAfterLogin');
          window.location.href = '/profile';
          return;
        }
        sessionStorage.removeItem('googlePasswordSetupRequired');

        const redirectPath = sessionStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          sessionStorage.removeItem('redirectAfterLogin');
          window.location.href = redirectPath;
          return;
        }

        window.location.href = '/home';
      } catch (err) {
        if (guardKey) {
          sessionStorage.removeItem(guardKey);
        }
        sessionStorage.removeItem('socialConnectIntent');
        const fallback = 'Twitter sign-in failed. Please try again.';
        const payload = err?.response?.data;
        const extractedDetail = extractTwitterErrorDetail(payload);
        const detail =
          extractedDetail ||
          payload?.message ||
          err?.message ||
          fallback;
        if (payload) {
          console.error('Twitter auth exchange error:', payload);
        }
        setError(detail);
      }
    };

    finalizeTwitterAuth();
  }, [apiBase, navigate]);

  if (error) {
    return (
      <div className="min-h-screen px-4 py-10 sm:py-14 flex items-center justify-center" style={{ background: 'var(--background-primary)' }}>
        <div
          className="w-full max-w-2xl rounded-2xl border p-6 sm:p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(14, 33, 24, 0.94), rgba(18, 43, 31, 0.92))',
            borderColor: 'rgba(118, 160, 128, 0.25)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <img src="/image/lekhon_url.png" alt="Lekhon Logo" className="h-11 w-11 rounded-lg object-cover" />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Lekhon</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-red-500">Twitter Sign-in Failed</h1>
            </div>
          </div>
          <p className="mb-6 text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-lg text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
            >
              Back to Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 rounded-lg font-semibold border"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14 flex items-center justify-center" style={{ background: 'var(--background-primary)' }}>
      <div
        className="max-w-xl w-full rounded-2xl border p-8 text-center"
        style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <img src="/image/lekhon_url.png" alt="Lekhon Logo" className="h-14 w-14 rounded-xl object-cover mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Completing Secure Sign-In</h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Please wait while we finish your Twitter authentication.</p>
        <div className="flex justify-center">
          <ScaleLoader color="var(--brand-primary)" height={28} width={4} />
        </div>
      </div>
    </div>
  );
};

export default TwitterAuthCallback;
