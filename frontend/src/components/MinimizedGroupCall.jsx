import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiMaximize2, FiX, FiUsers, FiRotateCw, FiMove, FiMonitor } from 'react-icons/fi';
import { LiveKitRoom, useParticipants, useLocalParticipant, useTracks, RoomAudioRenderer, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

const MinimizedContent = ({ onOpen, onEnd, isMicEnabled, isCameraEnabled, showRotate, onToggleAudio, onToggleVideo, onRotateCamera }) => {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const allTracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  
  // Track speaking state
  useEffect(() => {
    participants.forEach(p => {
      if (p.identity !== localParticipant?.identity) {
        p.on('isSpeakingChanged', (speaking) => {
          if (speaking) setActiveSpeaker(p);
        });
      }
    });
  }, [participants, localParticipant]);

  // Get remote participant to display (active speaker or first remote)
  const displayParticipant = activeSpeaker || participants.find(p => p.identity !== localParticipant?.identity);
  const localCameraTrack = allTracks.find(t => t.participant.identity === localParticipant?.identity);
  const remoteCameraTrack = displayParticipant ? allTracks.find(t => t.participant.identity === displayParticipant.identity) : null;
  
  const remoteMetadata = displayParticipant?.metadata ? JSON.parse(displayParticipant.metadata) : {};
  const localMetadata = localParticipant?.metadata ? JSON.parse(localParticipant.metadata) : {};

  return (
    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-2xl overflow-hidden w-[220px] md:w-[240px]">
      <RoomAudioRenderer />
      
      {/* Drag Handle */}
      <div className="bg-black/20 px-3 py-1 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-1.5 text-white/80">
          <FiMove className="w-3 h-3" />
          <span className="text-xs font-medium">Drag to move</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnd();
          }}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          title="End call"
        >
          <FiX className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Video Preview - Active Speaker or Remote Participant */}
      <div className="relative w-full h-[160px] bg-black">
        {remoteCameraTrack?.publication?.track && !remoteCameraTrack.publication.isMuted ? (
          <VideoTrack
            trackRef={remoteCameraTrack}
            className="w-full h-full object-cover"
          />
        ) : displayParticipant ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <img
              src={remoteMetadata.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayParticipant.name || 'User')}&background=random&color=fff`}
              alt={displayParticipant.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-lg"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <FiUsers className="w-12 h-12 text-gray-600" />
          </div>
        )}
        
        {/* Self View - Picture in Picture */}
        {localCameraTrack?.publication?.track && !localCameraTrack.publication.isMuted ? (
          <div className="absolute bottom-2 right-2 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/50 shadow-lg">
            <VideoTrack
              trackRef={localCameraTrack}
              className="w-full h-full object-cover"
            />
          </div>
        ) : localParticipant ? (
          <div className="absolute bottom-2 right-2 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/50 shadow-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <img
              src={localMetadata.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(localParticipant.name || 'User')}&background=random&color=fff`}
              alt={localParticipant.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>
        ) : null}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        
        {/* Participant Count Overlay */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
          <FiUsers className="w-3 h-3 text-white" />
          <span className="text-xs text-white font-medium">{participants.length}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <p className="font-semibold text-sm text-white">Group Call</p>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Maximize"
          >
            <FiMaximize2 className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAudio();
            }}
            className={`flex-1 p-2 rounded-lg transition-all ${
              isMicEnabled 
                ? 'bg-white/20 hover:bg-white/30' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
            title={isMicEnabled ? 'Mute' : 'Unmute'}
          >
            {isMicEnabled ? <FiMic className="w-4 h-4 text-white mx-auto" /> : <FiMicOff className="w-4 h-4 text-white mx-auto" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVideo();
            }}
            className={`flex-1 p-2 rounded-lg transition-all ${
              isCameraEnabled 
                ? 'bg-white/20 hover:bg-white/30' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
            title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraEnabled ? <FiVideo className="w-4 h-4 text-white mx-auto" /> : <FiVideoOff className="w-4 h-4 text-white mx-auto" />}
          </button>

          {showRotate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRotateCamera();
              }}
              className="flex-1 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
              title="Rotate camera"
            >
              <FiRotateCw className="w-4 h-4 text-white mx-auto" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MinimizedGroupCall = ({ token, wsUrl, callType, onOpen, onEnd }) => {
  const [position, setPosition] = useState(() => {
    const isMobile = window.innerWidth < 768;
    return {
      x: isMobile ? 10 : window.innerWidth - 260,
      y: isMobile ? 10 : window.innerHeight - 280
    };
  });
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
    const handleMove = (e) => {
      if (!isDragging) return;
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      
      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;
      
      const maxX = window.innerWidth - (bannerRef.current?.offsetWidth || 240);
      const maxY = window.innerHeight - (bannerRef.current?.offsetHeight || 280);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset]);

  const handleStart = (e) => {
    if (e.target.closest('button') && !e.target.closest('.cursor-move')) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    const rect = bannerRef.current.getBoundingClientRect();
    setDragOffset({ x: clientX - rect.left, y: clientY - rect.top });
    setIsDragging(true);
  };

  return (
    <div
      ref={bannerRef}
      className="fixed z-[9999] animate-slideUp"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
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
