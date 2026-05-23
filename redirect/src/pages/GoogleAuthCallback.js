import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ScaleLoader } from 'react-spinners';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const apiBase = useMemo(
    () => (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, ''),
    []
  );

  useEffect(() => {
    const finalizeGoogleAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error');
        const oauthErrorDescription = params.get('error_description');
        const code = params.get('code');
        const state = params.get('state');

        if (oauthError) {
          throw new Error(oauthErrorDescription || oauthError);
        }

        if (!code) {
          throw new Error('Missing authorization code from Google redirect.');
        }

        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const response = await axios.post(`${apiBase}/api/auth/google/exchange`, {
          code,
          state,
          redirectUri,
        });

        const token = response?.data?.token;
        if (!token) {
          throw new Error('Google login did not return an application token.');
        }

        localStorage.setItem('token', token);
        localStorage.setItem('rememberMe', 'true');
        sessionStorage.setItem('showLoginIntro', 'true');

        const redirectPath = sessionStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          sessionStorage.removeItem('redirectAfterLogin');
          window.location.href = redirectPath;
          return;
        }

        window.location.href = '/';
      } catch (err) {
        const fallback = 'Google sign-in failed. Please try again.';
        const detail =
          err?.response?.data?.message ||
          err?.response?.data?.details?.error_description ||
          err?.message ||
          fallback;
        setError(detail);
      }
    };

    finalizeGoogleAuth();
  }, [apiBase, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background-primary)' }}>
        <div className="max-w-lg w-full rounded-xl p-6 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}>
          <h1 className="text-2xl font-bold mb-3 text-red-500">Google Sign-in Failed</h1>
          <p className="mb-5" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-5 py-2 rounded-lg text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background-primary)' }}>
      <div className="max-w-lg w-full rounded-xl p-8 border text-center" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}>
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Signing You In</h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Please wait while we complete Google authentication.</p>
        <div className="flex justify-center">
          <ScaleLoader color="#3b82f6" height={28} width={4} />
        </div>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;

