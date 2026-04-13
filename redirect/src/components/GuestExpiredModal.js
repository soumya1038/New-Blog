import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TbBrandAmongUs } from 'react-icons/tb';

const GuestExpiredModal = ({ onClose }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
      <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <TbBrandAmongUs className="text-7xl opacity-60" style={{ color: 'var(--brand-primary)' }} />
        </div>
        <h2 className="theme-modal-title text-2xl font-bold mb-4">Guest Session Expired</h2>

        <div className="border-l-4 border-red-500 p-4 mb-6 rounded text-left bg-red-50/70 dark:bg-red-900/30">
          <p className="theme-modal-text mb-2">
            Your 12-hour guest session has ended.
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            All your data has been permanently deleted as per guest policy.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
          >
            Login or Register
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/');
            }}
            className="w-full theme-soft-button py-2 rounded-lg font-semibold transition"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestExpiredModal;