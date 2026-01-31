import React from 'react';
import { TbBrandAmongUs } from 'react-icons/tb';

const GuestInfoModal = ({ onContinue, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <TbBrandAmongUs className="text-7xl text-purple-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">Guest Session</h2>
        
        <div className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-600 p-4 mb-4 rounded">
          <p className="text-gray-800 dark:text-gray-200 text-sm mb-2">
            ✓ Explore all features for <span className="font-bold">12 hours</span>
          </p>
          <p className="text-gray-800 dark:text-gray-200 text-sm">
            ✓ Create article, blog, chat, and interact freely
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-sm text-red-800 dark:text-red-300 font-semibold mb-1">⚠️ Important:</p>
          <p className="text-sm text-red-800 dark:text-red-300">
            All data deleted after 12 hours or logout
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={onContinue}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold text-lg underline"
          >
            Click to Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestInfoModal;
