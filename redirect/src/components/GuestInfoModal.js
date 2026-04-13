import React from 'react';
import { TbBrandAmongUs } from 'react-icons/tb';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const GuestInfoModal = ({ onContinue, onClose }) => {
  return (
    <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <TbBrandAmongUs className="text-7xl animate-pulse" style={{ color: 'var(--brand-primary)' }} />
        </div>
        <h2 className="theme-modal-title text-2xl font-bold text-center mb-4">Guest Session</h2>

        <div className="border-l-4 p-4 mb-4 rounded" style={{ background: 'var(--tag-bg)', borderColor: 'var(--brand-primary)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-2"><FaCheckCircle className="text-green-600" /> Explore all features for <span className="font-bold">12 hours</span></span>
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-2"><FaCheckCircle className="text-green-600" /> Create article, blog, chat, and interact freely</span>
          </p>
        </div>

        <div className="border-l-4 p-4 mb-6 rounded bg-red-50/70 dark:bg-red-900/30 border-red-500">
          <p className="text-sm font-semibold mb-1 flex items-center gap-1 text-red-700 dark:text-red-300"><FaExclamationTriangle className="text-red-600" /> Important:</p>
          <p className="text-sm text-red-700 dark:text-red-300">
            All data deleted after 12 hours or logout
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={onContinue}
            className="text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
          >
            Click to Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestInfoModal;