import React, { useEffect, useMemo, useState } from 'react';
import { FaFingerprint, FaKey, FaShieldAlt, FaTimes } from 'react-icons/fa';
import { SyncLoader } from 'react-spinners';
import api from '../services/api';

const createRandomBuffer = (length = 32) => {
  const buffer = new Uint8Array(length);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(buffer);
  }
  return buffer;
};

const isMobileLike = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(pointer: coarse)').matches;

const runBiometricHumanCheck = async () => {
  if (!window.PublicKeyCredential || !navigator.credentials?.create) {
    throw new Error('Biometric verification is not available on this device.');
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: createRandomBuffer(32),
      rp: { name: 'Lekhon' },
      user: {
        id: createRandomBuffer(16),
        name: 'lekhon-human-check',
        displayName: 'Lekhon human check',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      attestation: 'none',
    },
  });

  return Boolean(credential);
};

const SensitiveActionAuthModal = ({
  open,
  action,
  actionLabel,
  title,
  description,
  onClose,
  onVerified,
  onForgotPassword,
}) => {
  const [password, setPassword] = useState('');
  const [manualHumanVerified, setManualHumanVerified] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const humanVerified = manualHumanVerified || biometricVerified;
  const lockedLabel = useMemo(() => {
    if (!lockedUntil) return '';
    try {
      return new Date(lockedUntil).toLocaleString();
    } catch {
      return '';
    }
  }, [lockedUntil]);

  useEffect(() => {
    if (!open) return;

    setPassword('');
    setManualHumanVerified(false);
    setBiometricVerified(false);
    setBiometricError('');
    setError('');
    setAttemptsRemaining(null);
    setFailedAttempts(0);
    setLockedUntil(null);
    setShowForgotPassword(false);

    let active = true;
    const detectBiometric = async () => {
      try {
        const available = Boolean(
          isMobileLike() &&
          window.PublicKeyCredential &&
          PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        );
        if (active) setBiometricAvailable(available);
      } catch {
        if (active) setBiometricAvailable(false);
      }
    };

    detectBiometric();
    return () => {
      active = false;
    };
  }, [open]);

  const handleBiometricCheck = async () => {
    setBiometricLoading(true);
    setBiometricError('');
    try {
      await runBiometricHumanCheck();
      setBiometricVerified(true);
      setManualHumanVerified(false);
    } catch (checkError) {
      setBiometricError(checkError.message || 'Biometric check was cancelled or unavailable.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!humanVerified || !password) return;

    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/users/security/password-challenge', {
        action,
        password,
      });
      onVerified(data);
    } catch (submitError) {
      const data = submitError.response?.data || {};
      setError(data.message || 'Password verification failed');
      setAttemptsRemaining(
        Number.isFinite(Number(data.attemptsRemaining)) ? Number(data.attemptsRemaining) : null
      );
      setFailedAttempts(Number(data.failedAttempts || 0));
      setLockedUntil(data.lockedUntil || null);
      if (data.showForgotPassword || Number(data.failedAttempts || 0) >= 1) {
        setShowForgotPassword(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-[75] p-4">
      <div className="theme-modal-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-300">
              <FaShieldAlt />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">{title || 'Confirm sensitive action'}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {description || `Verify your account to ${actionLabel || 'continue'}.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--background-secondary)]"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Human verification</p>
          {biometricAvailable && (
            <button
              type="button"
              onClick={handleBiometricCheck}
              disabled={biometricLoading || biometricVerified}
              className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold ${
                biometricVerified
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {biometricLoading ? <SyncLoader color="#fff" size={7} /> : <FaFingerprint />}
              {biometricVerified ? 'Biometric check complete' : 'Use device fingerprint'}
            </button>
          )}
          {biometricError && <p className="mb-3 text-xs font-semibold text-red-600">{biometricError}</p>}
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={manualHumanVerified}
              onChange={(event) => {
                setManualHumanVerified(event.target.checked);
                if (event.target.checked) setBiometricVerified(false);
              }}
              className="h-4 w-4"
            />
            I am human
          </label>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <FaKey className="text-red-600" />
            Account password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
            placeholder="Enter your account password"
            className="mb-3 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-red-500"
            required
            autoComplete="current-password"
          />

          {attemptsRemaining !== null && (
            <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
              {attemptsRemaining > 0
                ? `${attemptsRemaining} password attempt${attemptsRemaining === 1 ? '' : 's'} remaining today.`
                : `Password attempts locked${lockedLabel ? ` until ${lockedLabel}` : ''}.`}
            </p>
          )}
          {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
          {showForgotPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="mb-4 text-sm font-semibold text-blue-600 underline underline-offset-2"
            >
              Forgot password?
            </button>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!humanVerified || !password || loading || attemptsRemaining === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <SyncLoader color="#fff" size={7} /> : 'Continue'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-3 font-semibold theme-soft-button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SensitiveActionAuthModal;
