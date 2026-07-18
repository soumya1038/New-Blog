import React from 'react';
import { FiPhone, FiVideo, FiUsers } from 'react-icons/fi';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const getParticipantAvatar = (participant) => {
  const displayName = participant?.fullName || participant?.name || 'User';
  return getSafeImageUrl(participant?.profileImage)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
};

const ActiveGroupCallBanner = ({ participantCount, callType, onJoin, participants = [] }) => {
  const displayParticipants = participants.slice(0, 5);
  const remainingCount = Math.max(0, participantCount - 5);

  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 flex items-center justify-between shadow-lg animate-slideDown sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            {callType === 'video' ? (
              <FiVideo className="w-5 h-5 text-white" />
            ) : (
              <FiPhone className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            {callType === 'video' ? 'Video' : 'Audio'} call in progress
          </p>
          <div className="flex items-center gap-2 mt-1">
            {participants.length > 0 ? (
              <div className="flex -space-x-2">
                {displayParticipants.map((participant, idx) => (
                  <img
                    key={participant._id || idx}
                    src={getParticipantAvatar(participant)}
                    alt={participant.fullName || participant.name || 'User'}
                    className="w-6 h-6 rounded-full border-2 border-white"
                    referrerPolicy="no-referrer"
                    title={participant.fullName}
                  />
                ))}
                {remainingCount > 0 && (
                  <div className="w-6 h-6 rounded-full bg-white/30 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">+{remainingCount}</span>
                  </div>
                )}
              </div>
            ) : null}
            <div className="flex items-center gap-1 text-white/90 text-xs">
              <FiUsers className="w-3 h-3" />
              <span>{participantCount} {participantCount === 1 ? 'person' : 'people'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <button
        onClick={onJoin}
        className="px-4 py-2 bg-white text-green-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-all transform hover:scale-105 shadow-md flex-shrink-0"
      >
        Join
      </button>
    </div>
  );
};

export default ActiveGroupCallBanner;
