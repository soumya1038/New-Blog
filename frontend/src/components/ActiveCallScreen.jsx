import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor, FiPhoneOff, FiMinimize2, FiMaximize2 } from 'react-icons/fi';
import { BsRecordCircle, BsStopCircle } from 'react-icons/bs';

const ActiveCallScreen = ({ 
  localStream, 
  remoteStream, 
  callType,
  isMinimized,
  onToggleMinimize,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onStartRecording,
  onStopRecording,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isRecording,
  remoteUser,
  startTime,
  callAccepted
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    // Only start timer if call is accepted
    if (!callAccepted || !startTime) return;
    
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callAccepted, startTime]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Audio visualization
  useEffect(() => {
    if (!remoteStream) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(remoteStream);
      
      analyser.fftSize = 32;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevels = () => {
        if (!analyserRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Get 5 frequency bands for visualization
        const levels = [
          dataArray[1] / 255,
          dataArray[2] / 255,
          dataArray[3] / 255,
          dataArray[2] / 255,
          dataArray[1] / 255
        ];
        
        setAudioLevels(levels);
        requestAnimationFrame(updateLevels);
      };
      
      updateLevels();
    } catch (error) {
      console.error('Audio visualization error:', error);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [remoteStream]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getUserDisplayName = (user) => {
    return user?.fullName || user?.name || user?.username || 'Unknown User';
  };

  const getUserAvatar = (user) => {
    const displayName = getUserDisplayName(user);
    return user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[70] w-64 bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
        <div className="relative h-36">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${getUserAvatar(remoteUser)})`,
              filter: 'blur(10px) brightness(0.5)'
            }}
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-36 object-cover relative z-10"
            style={{ display: callAccepted && remoteStream ? 'block' : 'none' }}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-2 right-2 w-16 h-16 object-cover rounded-lg border-2 border-white"
          />
          
          {/* Controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-xs">{formatDuration(callDuration)}</span>
              <div className="flex gap-2">
                <button
                  onClick={onToggleMinimize}
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                >
                  <FiMaximize2 className="w-3 h-3 text-white" />
                </button>
                <button
                  onClick={onEndCall}
                  className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                >
                  <FiPhoneOff className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative">
        {/* User Avatar Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-sm"
          style={{ 
            backgroundImage: `url(${getUserAvatar(remoteUser)})`,
            filter: 'blur(20px) brightness(0.4)'
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
          <img
            src={getUserAvatar(remoteUser)}
            alt={getUserDisplayName(remoteUser)}
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl"
          />
          
          {/* Sound Wave Visualization */}
          <div className="flex items-end gap-2 h-16">
            {audioLevels.map((level, index) => (
              <div
                key={index}
                className="w-2 bg-gradient-to-t from-blue-500 to-blue-300 rounded-full transition-all duration-100"
                style={{
                  height: `${Math.max(level * 100, 8)}%`,
                  opacity: level > 0.1 ? 1 : 0.3
                }}
              />
            ))}
          </div>
        </div>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover relative z-10"
          style={{ display: callAccepted && remoteStream ? 'block' : 'none' }}
        />
        
        {/* Local Video (Picture-in-Picture) */}
        {callType === 'video' && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-4 right-4 w-32 h-32 md:w-48 md:h-48 object-cover rounded-lg border-2 border-white shadow-lg"
          />
        )}

        {/* Call Info Overlay */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          <p className="text-white font-medium">{getUserDisplayName(remoteUser)}</p>
          <p className="text-gray-300 text-sm">
            {callAccepted ? formatDuration(callDuration) : 'Calling...'}
          </p>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 px-4 py-2 rounded-full flex items-center gap-2">
            <BsRecordCircle className="w-4 h-4 text-white animate-pulse" />
            <span className="text-white text-sm font-medium">Recording</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6">
        <div className="flex items-center justify-center gap-4">
          {/* Audio Toggle */}
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

          {/* Video Toggle */}
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

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <FiMonitor className="w-6 h-6 text-white" />
          </button>

          {/* Recording */}
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isRecording ? (
              <BsStopCircle className="w-6 h-6 text-white" />
            ) : (
              <BsRecordCircle className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Minimize */}
          <button
            onClick={onToggleMinimize}
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
          >
            <FiMinimize2 className="w-6 h-6 text-white" />
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
          >
            <FiPhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveCallScreen;
