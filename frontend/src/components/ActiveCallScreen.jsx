import React, { useEffect, useRef, useState } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMinimize2, FiMaximize2, FiRotateCw } from 'react-icons/fi';

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
  const remoteAudioRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const [facingMode, setFacingMode] = useState('user');
  const [isSwapped, setIsSwapped] = useState(false);

  const rotateCamera = async () => {
    if (!localStream) return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    
    try {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = window.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
      
      localStream.removeTrack(videoTrack);
      localStream.addTrack(newVideoTrack);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      
      setFacingMode(newFacingMode);
    } catch (error) {
      console.error('Failed to rotate camera:', error);
    }
  };

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('📹 Setting local stream to video element');
      console.log('Local stream tracks:', localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      // Only set if different
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error('Local video play error:', e);
          }
        });
      }
    }
  }, [localStream, isSwapped]);

  useEffect(() => {
    console.log('🔄 ActiveCallScreen remoteStream prop changed:', remoteStream ? 'HAS STREAM' : 'NO STREAM');
    if (remoteStream) {
      console.log('📹 Setting remote stream to media elements');
      console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      // Set to BOTH elements - browser will handle audio/video appropriately
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error('Remote audio play error:', e);
          }
        });
      }
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error('Remote video play error:', e);
          }
        });
      }
    }
  }, [remoteStream, isSwapped]);

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
        {/* Main Video (swappable) */}
        <video
          ref={isSwapped ? localVideoRef : remoteVideoRef}
          autoPlay
          playsInline
          muted={isSwapped}
          className="w-full h-full object-cover"
          style={{ display: callType === 'video' ? 'block' : 'none' }}
        />
        
        {/* Remote Audio - ALWAYS rendered, plays for both audio and video calls */}
        <audio
          ref={remoteAudioRef}
          autoPlay
        />
        
        {/* Small Video (swappable) - Show when call type is video */}
        {callType === 'video' && localStream && (
          <div 
            onClick={() => setIsSwapped(!isSwapped)}
            className="absolute top-16 sm:top-20 right-2 sm:right-4 w-24 h-32 sm:w-32 sm:h-40 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
            title="Click to swap videos"
          >
            <video
              ref={isSwapped ? remoteVideoRef : localVideoRef}
              autoPlay
              playsInline
              muted={!isSwapped}
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

      {/* Controls - Responsive */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex justify-center gap-3 sm:gap-4">
          <button
            onClick={onToggleAudio}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isAudioEnabled ? (
              <FiMic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <FiMicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            )}
          </button>
          
          {callType === 'video' && (
            <>
              <button
                onClick={onToggleVideo}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
                  isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isVideoEnabled ? (
                  <FiVideo className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                ) : (
                  <FiVideoOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
              </button>
              
              <button
                onClick={rotateCamera}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                title="Rotate Camera"
              >
                <FiRotateCw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </>
          )}
          
          <button
            onClick={onEndCall}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <FiPhoneOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveCallScreen;
