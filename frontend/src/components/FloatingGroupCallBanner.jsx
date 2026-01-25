import React, { useState, useEffect, useRef } from 'react';
import { FiUsers, FiMic, FiMicOff, FiVideo, FiVideoOff, FiRotateCw, FiMaximize2, FiX } from 'react-icons/fi';
import { LiveKitRoom, useLocalParticipant, useTracks, VideoTrack, RoomAudioRenderer } from '@livekit/components-react';
import { Track } from 'livekit-client';

const MinimizedControls = ({ onOpen, onEnd }) => {
  const { isMicrophoneEnabled, isCameraEnabled, localParticipant } = useLocalParticipant();
  const [showOptions, setShowOptions] = useState(false);
  const localVideoTrack = useTracks([Track.Source.Camera]).find(t => t.participant.isLocal);

  const toggleMic = async (e) => {
    e.stopPropagation();
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  const toggleCamera = async (e) => {
    e.stopPropagation();
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  };

  const rotateCamera = async (e) => {
    e.stopPropagation();
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(false);
      await localParticipant.setCameraEnabled(true);
    } catch (err) {
      console.error('Failed to rotate camera:', err);
    }
  };

  return (
    <>
      {isCameraEnabled && localVideoTrack && (
        <div className="relative w-full h-16 sm:h-20 bg-black">
          <VideoTrack trackRef={localVideoTrack} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2" onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}>
        <div className="relative">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-ping"></div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <FiUsers className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[10px] sm:text-xs truncate">Group Call</p>
            <p className="text-[8px] sm:text-[10px] text-white/90">Active</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button onClick={toggleMic} className="p-0.5 sm:p-1 hover:bg-white/20 rounded-full transition-colors" title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}>
            {isMicrophoneEnabled ? <FiMic className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <FiMicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>
          <button onClick={toggleCamera} className="p-0.5 sm:p-1 hover:bg-white/20 rounded-full transition-colors" title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
            {isCameraEnabled ? <FiVideo className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <FiVideoOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>
          {isCameraEnabled && (
            <button onClick={rotateCamera} className="p-0.5 sm:p-1 hover:bg-white/20 rounded-full transition-colors" title="Rotate camera">
              <FiRotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
          <div className="text-white/80">
            <svg className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${showOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      {showOptions && (
        <div className="border-t border-white/20 bg-black/10 backdrop-blur-sm">
          <button onClick={(e) => { e.stopPropagation(); onOpen(); setShowOptions(false); }} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium">
            <FiMaximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Open</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEnd(); }} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-red-500/20 transition-colors flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium text-red-100">
            <FiX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>End</span>
          </button>
        </div>
      )}
    </>
  );
};

const FloatingGroupCallBanner = ({ token, wsUrl, callType, onOpen, onEnd }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 200, y: window.innerHeight - 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const bannerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setPosition({ 
        x: Math.max(0, Math.min(newX, window.innerWidth - 200)),
        y: Math.max(0, Math.min(newY, window.innerHeight - 80))
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    const rect = bannerRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  return (
    <div 
      ref={bannerRef}
      className="fixed z-[9999] animate-slideUp"
      style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
    >
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all w-[180px] sm:w-[200px]">
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={true}
          video={callType === 'video'}
          options={{
            publishDefaults: {
              videoEnabled: callType === 'video'
            }
          }}
        >
          <RoomAudioRenderer />
          <MinimizedControls onOpen={onOpen} onEnd={onEnd} />
        </LiveKitRoom>
      </div>
    </div>
  );
};

export default FloatingGroupCallBanner;
