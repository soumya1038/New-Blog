import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const UnauthorizedModal = ({ isOpen, onClose, message = 'You need to be logged in to access this feature' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login', { state: { from: window.location.pathname } });
  };

  const handleRegister = () => {
    onClose();
    navigate('/register', { state: { from: window.location.pathname } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 theme-modal-overlay" onClick={onClose}></div>

      <div
        className="relative rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slideUp border"
        style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <FaTimes size={20} />
        </button>

        <div className="p-8 text-center">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
          >
            <FaLock className="text-white text-2xl" />
          </div>

          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {t('Authentication Required')}
          </h2>

          <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {t(message)}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogin}
              className="w-full text-white py-3 rounded-lg font-semibold transition-all duration-300 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
            >
              {t('Login')}
            </button>

            <button
              onClick={handleRegister}
              className="w-full py-3 rounded-lg font-semibold transition-all duration-300 border"
              style={{
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-default)'
              }}
            >
              {t('Create Account')}
            </button>

            <button
              onClick={onClose}
              className="py-2 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('Maybe Later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedModal;
