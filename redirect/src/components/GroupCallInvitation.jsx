import React, { useEffect, useRef } from 'react';
import { FiVideo, FiX, FiPhone } from 'react-icons/fi';
import soundManager from '../utils/soundManager';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const getUserAvatar = (user) => {
  const displayName = user?.fullName || user?.name || 'User';
  return getSafeImageUrl(user?.profileImage)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
};

const GroupCallInvitation = ({ groupName, initiatorName, initiatorImage, joinedUsers = [], callType = 'video', onJoin, onDecline }) => {
  const onDeclineRef = useRef(onDecline);
  const onJoinRef = useRef(onJoin);
  
  useEffect(() => {
    onDeclineRef.current = onDecline;
    onJoinRef.current = onJoin;
  }, [onDecline, onJoin]);

  useEffect(() => {
    soundManager.play('bubbleTyping');
    
    const interval1 = setTimeout(() => soundManager.play('bubbleTyping'), 10000);
    const interval2 = setTimeout(() => soundManager.play('bubbleTyping'), 20000);

    const timeout = setTimeout(() => {
      soundManager.stop('bubbleTyping');
      onDeclineRef.current();
    }, 30000);

    return () => {
      soundManager.stop('bubbleTyping');
      clearTimeout(interval1);
      clearTimeout(interval2);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-slideUp">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-center">
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
            {callType === 'audio' ? (
              <FiPhone className="w-10 h-10 text-blue-600" />
            ) : (
              <FiVideo className="w-10 h-10 text-blue-600" />
            )}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {callType === 'audio' ? '🎵 Audio Call' : '📹 Video Call'}
          </h3>
          <p className="text-blue-100 text-sm">{groupName}</p>
        </div>

        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-center mb-4">
            <span className="font-semibold">{initiatorName}</span> started a group {callType === 'audio' ? 'audio' : 'video'} call
          </p>

          {joinedUsers.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">Already in call</p>
              <div className="flex justify-center items-center">
                <div className="flex -space-x-2">
                  {joinedUsers.slice(0, 4).map((user, i) => (
                    <img
                      key={i}
                      src={getUserAvatar(user)}
                      alt={user.fullName || user.name || 'User'}
                      className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 object-cover"
                      referrerPolicy="no-referrer"
                      title={user.fullName}
                    />
                  ))}
                  {joinedUsers.length > 4 && (
                    <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-blue-500 flex items-center justify-center text-xs font-semibold text-white">
                      +{joinedUsers.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                soundManager.stop('bubbleTyping');
                onDecline();
              }}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <FiX className="w-5 h-5" />
              Decline
            </button>
            <button
              onClick={() => {
                soundManager.stop('bubbleTyping');
                soundManager.play('joinVideoCall');
                onJoin();
              }}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {callType === 'audio' ? <FiPhone className="w-5 h-5" /> : <FiVideo className="w-5 h-5" />}
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCallInvitation;
