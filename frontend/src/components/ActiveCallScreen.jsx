import React, { useEffect, useRef, useState } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMinimize2, FiMaximize2 } from 'react-icons/fi';

const ActiveCallScreen = ({
  remoteUser,
  callType,
  isMinimized,
  isAudioEnabled,
  isVideoEnabled,
  startTime,
  callAccepted,
  onToggleMinimize,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  localStream,
  remoteStream
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!callAccepted || !startTime) return;
    
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [callAccepted, startTime]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-900 rounded-lg shadow-2xl p-3 z-[60] w-64">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img
              src={remoteUser.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteUser.fullName)}&background=0D8ABC&color=fff`}
              alt={remoteUser.fullName}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <p className="text-white text-sm font-medium">{remoteUser.fullName}</p>
              <p className="text-gray-400 text-xs">
                {callAccepted ? formatDuration(callDuration) : 'Calling...'}
              </p>
            </div>
          </div>
          <button onClick={onToggleMinimize} className="text-white hover:text-gray-300">
            <FiMaximize2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onToggleAudio}
            className={`flex-1 py-2 rounded ${isAudioEnabled ? 'bg-gray-700' : 'bg-red-500'} text-white`}
          >
            {isAudioEnabled ? <FiMic className="w-4 h-4 mx-auto" /> : <FiMicOff className="w-4 h-4 mx-auto" />}
          </button>
          <button
            onClick={onEndCall}
            className="flex-1 py-2 rounded bg-red-500 text-white"
          >
            <FiPhoneOff className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white text-lg font-semibold">{remoteUser.fullName}</h3>
            <p className="text-gray-300 text-sm">
              {callAccepted ? formatDuration(callDuration) : 'Calling...'}
            </p>
          </div>
          <button onClick={onToggleMinimize} className="text-white hover:text-gray-300">
            <FiMinimize2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Local Video */}
        {callType === 'video' && (
          <div className="absolute top-20 right-4 w-32 h-40 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* No Video Placeholder */}
        {(!remoteStream || callType === 'audio') && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <img
                src={remoteUser.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteUser.fullName)}&background=0D8ABC&color=fff`}
                alt={remoteUser.fullName}
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              <p className="text-white text-xl">{remoteUser.fullName}</p>
              <p className="text-gray-400">{callAccepted ? 'Connected' : 'Connecting...'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex justify-center gap-4">
          <button
            onClick={onToggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isAudioEnabled ? (
              <FiMic className="w-6 h-6 text-white" />
            ) : (
              <FiMicOff className="w-6 h-6 text-white" />
            )}
          </button>
          
          {callType === 'video' && (
            <button
              onClick={onToggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isVideoEnabled ? (
                <FiVideo className="w-6 h-6 text-white" />
              ) : (
                <FiVideoOff className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          <button
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <FiPhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveCallScreen;
