import React, { useEffect, useMemo, useState } from 'react';
import { FaKey, FaMobileAlt, FaShieldAlt, FaTimes } from 'react-icons/fa';
import { SyncLoader } from 'react-spinners';

const METHOD_COPY = {
  authenticator: {
    label: 'Authenticator app',
    icon: FaKey,
    prompt: 'Enter the 6-digit code from your authenticator app.',
  },
  sms: {
    label: 'SMS code',
    icon: FaMobileAlt,
    prompt: 'Enter the 6-digit code sent to your mobile number.',
  },
};

const normalizeMethods = (twoFactor = {}) => {
  const methods = Array.isArray(twoFactor.methods) ? twoFactor.methods : [];
  return methods.filter((method) => METHOD_COPY[method]);
};

const TwoFactorVerificationModal = ({
  open,
  action,
  actionLabel,
  twoFactor,
  requestChallenge,
  verifyChallenge,
  onVerified,
  onClose,
}) => {
  const methods = useMemo(() => normalizeMethods(twoFactor), [twoFactor]);
  const preferred = methods.includes(twoFactor?.preferredMethod) ? twoFactor.preferredMethod : methods[0];
  const [method, setMethod] = useState(preferred || '');
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMethod(preferred || '');
    setChallenge(null);
    setCode('');
    setError('');
  }, [open, preferred]);

  useEffect(() => {
    if (!open || !method || !action) return;
    let active = true;

    const startChallenge = async () => {
      setLoadingChallenge(true);
      setChallenge(null);
      setCode('');
      setError('');
      try {
        const data = await requestChallenge({ action, method });
        if (!active) return;
        setChallenge(data);
      } catch (challengeError) {
        if (active) {
          setError(challengeError.response?.data?.message || 'Could not start verification');
        }
      } finally {
        if (active) setLoadingChallenge(false);
      }
    };

    startChallenge();
    return () => {
      active = false;
    };
  }, [open, action, method, requestChallenge]);

  const selectedCopy = METHOD_COPY[method] || METHOD_COPY.authenticator;
  const SelectedIcon = selectedCopy.icon;
  const maskedSmsPhone = twoFactor?.smsPhoneMasked || twoFactor?.sms?.phoneMasked;

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!challenge?.challengeId || !code) return;
    setVerifying(true);
    setError('');
    try {
      const data = await verifyChallenge({
        action,
        challengeId: challenge.challengeId,
        code,
        method,
      });
      onVerified(data.twoFactorToken);
    } catch (verifyError) {
      setError(verifyError.response?.data?.message || 'Invalid verification code');
    } finally {
      setVerifying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-[80] p-4">
      <div className="theme-modal-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              <FaShieldAlt />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Two-factor verification</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Verify to {actionLabel || 'continue'}.
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

        {methods.length > 1 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {methods.map((item) => {
              const copy = METHOD_COPY[item];
              const Icon = copy.icon;
              const active = method === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMethod(item)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--background-secondary)]'
                  }`}
                >
                  <Icon /> {copy.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
            <SelectedIcon className="text-blue-600" />
            {selectedCopy.label}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {method === 'sms' && maskedSmsPhone
              ? `Code sent to ${maskedSmsPhone}.`
              : selectedCopy.prompt}
          </p>
        </div>

        <form onSubmit={handleVerify} className="mt-5">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="mb-3 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-3 text-center text-2xl tracking-[0.3em] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500"
            maxLength={6}
            required
            disabled={loadingChallenge}
          />

          {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loadingChallenge || verifying || code.length < 6}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingChallenge || verifying ? <SyncLoader color="#fff" size={7} /> : 'Verify'}
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

export default TwoFactorVerificationModal;
