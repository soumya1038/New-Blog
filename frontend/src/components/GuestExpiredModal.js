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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <TbBrandAmongUs className="text-7xl text-purple-600 opacity-50" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Guest Session Expired</h2>
        
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded text-left">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Your 12-hour guest session has ended.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            All your data has been permanently deleted as per guest policy.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Login or Register
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/');
            }}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestExpiredModal;
