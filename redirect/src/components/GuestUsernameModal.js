import React, { useState, useEffect } from 'react';
import { TbBrandAmongUs } from 'react-icons/tb';
import { FaCheck, FaTimes, FaRedo } from 'react-icons/fa';
import api from '../services/api';
import { ClipLoader } from 'react-spinners';

const GuestUsernameModal = ({ onClose, onContinue }) => {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState('');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setCaptchaInput('');
    setError('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (!username) {
      setStatus(null);
      setMessage('');
      return;
    }

    if (username.length < 3) {
      setChecking(false);
      setStatus('invalid');
      setMessage('Username must be at least 3 characters');
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const { data } = await api.get(`/auth/check-guest-username/${encodeURIComponent(username)}`);
        if (data.available) {
          setStatus('available');
          setMessage('Username available');
        } else {
          setStatus('taken');
          setMessage(data.message);
        }
      } catch (error) {
        setStatus('invalid');
        setMessage('Error checking username');
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleContinue = () => {
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (captchaInput !== captcha) {
      setError('Incorrect captcha. Please try again.');
      generateCaptcha();
      return;
    }
    if (status === 'available' && username) {
      onContinue(username);
    }
  };

  return (
    <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <TbBrandAmongUs className="text-6xl" style={{ color: 'var(--brand-primary)' }} />
        </div>
        <h2 className="theme-modal-title text-2xl font-bold text-center mb-2">Continue as Guest</h2>
        <p className="theme-modal-text text-center mb-6">Choose a username to get started</p>

        {error && <div className="bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 text-sm border border-red-200 dark:border-red-700/60">{error}</div>}

        <div className="mb-4">
          <label className="theme-modal-text block text-sm font-semibold mb-2">Enter Username</label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                setError('');
              }}
              placeholder="username_123"
              className="theme-input w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              maxLength={20}
            />
            <div className="absolute right-3 top-3">
              {checking && <ClipLoader size={20} color="#9333ea" />}
              {!checking && status === 'available' && <FaCheck className="text-green-500 text-xl" />}
              {!checking && (status === 'taken' || status === 'invalid') && <FaTimes className="text-red-500 text-xl" />}
            </div>
          </div>
          {message && (
            <p className={`text-sm mt-2 ${status === 'available' ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
          <div className="theme-modal-muted text-xs mt-2 flex items-center justify-between gap-3">
            <span>Minimum 3 characters. Only letters, numbers, and underscores allowed</span>
            <span className={username.length >= 3 ? 'text-green-600' : ''}>{username.length}/20</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="theme-modal-text block text-sm font-semibold mb-2">Verify you're human</label>
          <div className="px-4 py-3 rounded-lg border-2 font-mono text-2xl font-bold text-center mb-2 select-none tracking-widest" style={{ background: 'var(--background-secondary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            {captcha}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Enter text above"
              className="theme-input flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              maxLength={6}
            />
            <button
              type="button"
              onClick={generateCaptcha}
              className="p-2 rounded-lg transition"
              style={{ color: 'var(--brand-primary)', background: 'var(--tag-bg)' }}
              title="Refresh captcha"
            >
              <FaRedo size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleContinue}
            disabled={status !== 'available' || username.length < 3 || !captchaInput}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              status === 'available' && username.length >= 3 && captchaInput
                ? 'text-white hover:opacity-90'
                : 'theme-soft-button cursor-not-allowed opacity-60'
            }`}
            style={status === 'available' && username.length >= 3 && captchaInput ? { background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' } : undefined}
          >
            Continue
          </button>
          <button
            onClick={onClose}
            className="flex-1 theme-soft-button py-3 rounded-lg font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestUsernameModal;
