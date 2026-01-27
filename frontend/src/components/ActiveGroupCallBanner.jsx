import React from 'react';
import { FiPhone, FiVideo, FiUsers } from 'react-icons/fi';

const ActiveGroupCallBanner = ({ participantCount, callType, onJoin, participants = [] }) => {
  const displayParticipants = participants.slice(0, 3);
  const remainingCount = participantCount - 3;

  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 flex items-center justify-between shadow-lg animate-slideDown">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            {callType === 'video' ? (
              <FiVideo className="w-5 h-5 text-white" />
            ) : (
              <FiPhone className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-ping" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            {callType === 'video' ? 'Video' : 'Audio'} call in progress
          </p>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {displayParticipants.map((participant, idx) => (
                <img
                  key={idx}
                  src={participant.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.fullName)}&background=random&color=fff`}
                  alt={participant.fullName}
                  className="w-6 h-6 rounded-full border-2 border-white"
                  title={participant.fullName}
                />
              ))}
              {remainingCount > 0 && (
                <div className="w-6 h-6 rounded-full bg-white/30 border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">+{remainingCount}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-white/90 text-xs">
              <FiUsers className="w-3 h-3" />
              <span>{participantCount}</span>
            </div>
          </div>
        </div>
      </div>
      
      <button
        onClick={onJoin}
        className="px-4 py-2 bg-white text-green-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors shadow-md flex-shrink-0"
      >
        Join
      </button>
    </div>
  );
};

export default ActiveGroupCallBanner;
