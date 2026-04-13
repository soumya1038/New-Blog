import React from 'react';
import { FiPhone, FiVideo, FiX } from 'react-icons/fi';

const IncomingCallModal = ({ caller, callType, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-pulse-slow">
        <div className="text-center">
          <img
            src={caller.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(caller.fullName || caller.username)}&background=0D8ABC&color=fff`}
            alt={caller.fullName || caller.username}
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-500"
          />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {caller.fullName || caller.username}
          </h3>
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
            {callType === 'video' ? (
              <><FiVideo className="w-5 h-5" /> <span>Incoming video call...</span></>
            ) : (
              <><FiPhone className="w-5 h-5" /> <span>Incoming call...</span></>
            )}
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={onReject}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
            >
              <FiX className="w-8 h-8 text-white" />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
            >
              <FiPhone className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
