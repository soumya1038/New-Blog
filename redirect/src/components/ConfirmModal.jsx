import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) => {
  return (
    <div className="fixed inset-0 theme-modal-overlay z-[60] flex items-center justify-center p-4">
      <div className="theme-modal-card rounded-lg shadow-xl max-w-sm w-full animate-fadeIn">
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className={`p-2 rounded-full ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
              <FiAlertCircle className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{message}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 theme-soft-button rounded-lg transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
