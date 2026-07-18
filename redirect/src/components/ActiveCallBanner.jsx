import React from 'react';
import { FiPhone, FiPhoneOff } from 'react-icons/fi';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const ActiveCallBanner = ({ remoteUser, callType, onJoin, onEnd }) => {
  const displayName = remoteUser?.fullName || 'User';
  const avatarSrc = getSafeImageUrl(remoteUser?.profileImage)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;

  return (
    <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
          <img
            src={avatarSrc}
            alt={displayName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <p className="font-semibold">{callType === 'video' ? 'Video' : 'Audio'} call in progress</p>
          <p className="text-sm text-green-100">{displayName}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onJoin}
          className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center gap-2"
        >
          <FiPhone className="w-4 h-4" />
          Join
        </button>
        <button
          onClick={onEnd}
          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <FiPhoneOff className="w-4 h-4" />
          End
        </button>
      </div>
    </div>
  );
};

export default ActiveCallBanner;
