import React, { useState, useEffect, useRef } from 'react';
import { FiPhone, FiVideo, FiX, FiMaximize2, FiMic, FiMicOff } from 'react-icons/fi';

const FloatingCallBanner = ({ 
  remoteUser, 
  callType, 
  startTime,
  remoteStream,
  isAudioEnabled,
  onOpen, 
  onEnd,
  onToggleAudio
}) => {
  const [duration, setDuration] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 200, y: window.innerHeight - 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (remoteStream) {
      if (callType === 'video' && videoRef.current) {
        videoRef.current.srcObject = remoteStream;
      }
      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && remoteStream) {
        try {
          if (callType === 'video' && videoRef.current && document.pictureInPictureEnabled) {
            if (!document.pictureInPictureElement) {
              await videoRef.current.requestPictureInPicture();
            }
          } else if (callType === 'audio' && audioRef.current) {
            // For audio, create a canvas with waveform visualization for PiP
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 150;
            const ctx = canvas.getContext('2d');
            
            // Draw audio visualization
            ctx.fillStyle = '#10b981';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Audio Call', canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillText(remoteUser.fullName, canvas.width / 2, canvas.height / 2 + 20);
            
            const stream = canvas.captureStream(1);
            const pipVideo = document.createElement('video');
            pipVideo.srcObject = stream;
            pipVideo.muted = true;
            await pipVideo.play();
            
            if (document.pictureInPictureEnabled) {
              await pipVideo.requestPictureInPicture();
            }
          }
        } catch (err) {
          console.log('PiP failed:', err);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [callType, remoteStream, remoteUser.fullName]);

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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={bannerRef}
      className="fixed z-[9999] animate-slideUp"
      style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
    >
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all w-[180px] sm:w-[200px]">
        {/* Video Preview */}
        {callType === 'video' && remoteStream && (
          <div className="relative w-full h-16 sm:h-20 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* Hidden audio element - always plays */}
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          style={{ display: 'none' }}
        />

        {/* Main Banner */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2" onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}>
          {/* Pulsing Indicator */}
          <div className="relative">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <img
              src={remoteUser.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteUser.fullName)}&background=0D8ABC&color=fff`}
              alt={remoteUser.fullName}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[10px] sm:text-xs truncate">{remoteUser.fullName}</p>
              <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-white/90">
                {callType === 'video' ? (
                  <FiVideo className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                ) : (
                  <FiPhone className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                )}
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAudio();
              }}
              className="p-0.5 sm:p-1 hover:bg-white/20 rounded-full transition-colors"
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? <FiMic className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <FiMicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            </button>
            <div className="text-white/80">
              <svg 
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${showOptions ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
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
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium"
            >
              <FiMaximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Open</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnd();
              }}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-red-500/20 transition-colors flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium text-red-100"
            >
              <FiX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>End</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingCallBanner;
