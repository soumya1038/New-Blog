import React, { useEffect, useState } from 'react';
import { FiPhone, FiVideo, FiX, FiAlertCircle } from 'react-icons/fi';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const GroupCallInvitationModal = ({ groupName, initiator, callType, onAccept, onReject, hasActiveCall }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const initiatorName = initiator?.fullName || initiator?.name || 'User';
  const initiatorAvatar = getSafeImageUrl(initiator?.profileImage)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(initiatorName)}&background=0D8ABC&color=fff`;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onReject]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slideUp">
        <div className="text-center">
          <img
            src={initiatorAvatar}
            alt={initiatorName}
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-500 shadow-lg"
            referrerPolicy="no-referrer"
          />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {initiatorName}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-1">
            is calling in
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {groupName}
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
            {callType === 'video' ? (
              <><FiVideo className="w-5 h-5" /> <span>Video call</span></>
            ) : (
              <><FiPhone className="w-5 h-5" /> <span>Audio call</span></>
            )}
          </div>
          
          {hasActiveCall && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  You're already in a call. Accepting will end your current call.
                </p>
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {timeLeft}s remaining
            </p>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={onReject}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
            >
              <FiX className="w-8 h-8 text-white" />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
            >
              {callType === 'video' ? (
                <FiVideo className="w-8 h-8 text-white" />
              ) : (
                <FiPhone className="w-8 h-8 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCallInvitationModal;
