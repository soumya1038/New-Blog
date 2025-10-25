import React, { useEffect, useRef } from 'react';
import { FiPhone, FiPhoneOff, FiVideo } from 'react-icons/fi';

const IncomingCallModal = ({ caller, callType, onAccept, onReject }) => {
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);

  useEffect(() => {
    // Create ringtone using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Beep pattern
      let isPlaying = true;
      const beepInterval = setInterval(() => {
        gainNode.gain.value = isPlaying ? 0.3 : 0;
        isPlaying = !isPlaying;
      }, 500);
      
      audioContextRef.current = audioContext;
      oscillatorRef.current = { oscillator, gainNode, beepInterval };
    } catch (err) {
      console.error('Audio error:', err);
    }

    return () => {
      // Stop ringtone on unmount
      if (oscillatorRef.current) {
        clearInterval(oscillatorRef.current.beepInterval);
        oscillatorRef.current.oscillator.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getUserDisplayName = (user) => {
    return user?.fullName || user?.name || user?.username || 'Unknown User';
  };

  const getUserAvatar = (user) => {
    const displayName = getUserDisplayName(user);
    return user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[80] flex items-center justify-center">
      
      <div className="text-center">
        {/* Caller Avatar with pulse animation */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
          <img
            src={getUserAvatar(caller)}
            alt={getUserDisplayName(caller)}
            className="relative w-32 h-32 rounded-full object-cover border-4 border-white"
          />
        </div>

        {/* Caller Name */}
        <h2 className="text-2xl font-semibold text-white mb-2">
          {getUserDisplayName(caller)}
        </h2>

        {/* Call Type */}
        <p className="text-gray-300 mb-8">
          Incoming {callType === 'video' ? 'video' : 'audio'} call...
        </p>

        {/* Action Buttons */}
        <div className="flex gap-6 justify-center">
          {/* Reject Button */}
          <button
            onClick={onReject}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            <FiPhoneOff className="w-8 h-8 text-white" />
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
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
  );
};

export default IncomingCallModal;
