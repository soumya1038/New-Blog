import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiMaximize2, FiX, FiUsers, FiRotateCw, FiChevronDown } from 'react-icons/fi';
import { LiveKitRoom, useParticipants, useLocalParticipant, useTracks, RoomAudioRenderer } from '@livekit/components-react';
import { Track } from 'livekit-client';

const MinimizedContent = ({ onOpen, onEnd, isMicEnabled, isCameraEnabled, showRotate, onToggleAudio, onToggleVideo, onRotateCamera }) => {
  const [showOptions, setShowOptions] = useState(false);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const videoRef = useRef(null);
  
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });

  useEffect(() => {
    if (videoRef.current && tracks.length > 0) {
      const track = tracks[0]?.publication?.track;
      if (track) {
        track.attach(videoRef.current);
        return () => track.detach();
      }
    }
  }, [tracks]);

  return (
    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-2xl overflow-hidden w-[200px]">
      <RoomAudioRenderer />
      {/* Video Preview */}
      <div className="relative w-full h-[140px] bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Controls */}
      <div 
        className="px-3 py-2 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-ping" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-white truncate">Group Call</p>
            <div className="flex items-center gap-1 text-[10px] text-white/90">
              <FiUsers className="w-2.5 h-2.5" />
              <span>{participants.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAudio();
              }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title={isMicEnabled ? 'Mute' : 'Unmute'}
            >
              {isMicEnabled ? <FiMic className="w-3 h-3 text-white" /> : <FiMicOff className="w-3 h-3 text-white" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVideo();
              }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isCameraEnabled ? <FiVideo className="w-3 h-3 text-white" /> : <FiVideoOff className="w-3 h-3 text-white" />}
            </button>
            {showRotate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRotateCamera();
                }}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title="Rotate camera"
              >
                <FiRotateCw className="w-3 h-3 text-white" />
              </button>
            )}
            <FiChevronDown className={`w-3 h-3 text-white/80 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Options Menu */}
      {showOptions && (
        <div className="border-t border-white/20 bg-black/10 backdrop-blur-sm">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
              setShowOptions(false);
            }}
            className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-2 text-xs font-medium text-white"
          >
            <FiMaximize2 className="w-3 h-3" />
            <span>Open</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnd();
            }}
            className="w-full px-3 py-2 text-left hover:bg-red-500/20 transition-colors flex items-center gap-2 text-xs font-medium text-red-100"
          >
            <FiX className="w-3 h-3" />
            <span>End</span>
          </button>
        </div>
      )}
    </div>
  );
};

const MinimizedGroupCall = ({ token, wsUrl, callType, onOpen, onEnd }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 220, y: window.innerHeight - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showRotate, setShowRotate] = useState(false);
  const bannerRef = useRef(null);

  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        setShowRotate(cameras.length > 1);
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };
    checkCameras();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - 200)),
        y: Math.max(0, Math.min(newY, window.innerHeight - 200))
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
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        audio={true}
        video={callType === 'video'}
      >
        <MinimizedContentWrapper
          onOpen={onOpen}
          onEnd={onEnd}
          showRotate={showRotate}
        />
      </LiveKitRoom>
    </div>
  );
};

const MinimizedContentWrapper = ({ onOpen, onEnd, showRotate }) => {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const toggleMic = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    }
  };

  const rotateCamera = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(false);
      setTimeout(() => localParticipant.setCameraEnabled(true), 100);
    }
  };

  return (
    <MinimizedContent
      onOpen={onOpen}
      onEnd={onEnd}
      isMicEnabled={isMicrophoneEnabled}
      isCameraEnabled={isCameraEnabled}
      showRotate={showRotate}
      onToggleAudio={toggleMic}
      onToggleVideo={toggleCamera}
      onRotateCamera={rotateCamera}
    />
  );
};

export default MinimizedGroupCall;
