import React, { useState, useEffect, useRef } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useParticipants, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';
import { FiUsers, FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMessageSquare, FiMonitor, FiRotateCw, FiMinimize2 } from 'react-icons/fi';
import api from '../services/api';
import socketService from '../services/socket';
import soundManager from '../utils/soundManager';
import { saveCallState, clearCallState } from '../utils/callStateManager';

const CustomControls = ({ onLeave, callType, onMinimize }) => {
  const { isMicrophoneEnabled, isCameraEnabled, localParticipant } = useLocalParticipant();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showRotate, setShowRotate] = useState(false);

  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        setShowRotate(cameras.length > 1 && isCameraEnabled);
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };
    checkCameras();
  }, [isCameraEnabled]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  };

  const toggleScreenShare = async () => {
    if (!localParticipant) return;
    try {
      if (isScreenSharing) {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Screen share error:', error);
      alert('Failed to share screen. Please check permissions.');
    }
  };

  const rotateCamera = async () => {
    if (!localParticipant) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      if (cameras.length > 1) {
        await localParticipant.setCameraEnabled(false);
        setTimeout(async () => {
          await localParticipant.setCameraEnabled(true);
        }, 100);
      }
    } catch (error) {
      console.error('Camera rotation error:', error);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl px-3 py-2 border border-gray-700">
        <div className="flex items-center gap-2">
          <button onClick={toggleMic} className={`p-2 sm:p-3 rounded-xl transition-all duration-200 transform hover:scale-110 ${!isMicrophoneEnabled ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50' : 'bg-gray-700 hover:bg-gray-600 shadow-lg'}`} title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}>
            {!isMicrophoneEnabled ? <FiMicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <FiMic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
          </button>
          <button onClick={toggleCamera} className={`p-2 sm:p-3 rounded-xl transition-all duration-200 transform hover:scale-110 ${!isCameraEnabled ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50' : 'bg-gray-700 hover:bg-gray-600 shadow-lg'}`} title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
            {!isCameraEnabled ? <FiVideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <FiVideo className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
          </button>
          {showRotate && (
            <button onClick={rotateCamera} className="p-2 sm:p-3 rounded-xl bg-gray-700 hover:bg-gray-600 shadow-lg transition-all duration-200 transform hover:scale-110" title="Rotate camera">
              <FiRotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          )}
          <button onClick={toggleScreenShare} className={`p-2 sm:p-3 rounded-xl transition-all duration-200 transform hover:scale-110 ${isScreenSharing ? 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/50' : 'bg-gray-700 hover:bg-gray-600 shadow-lg'}`} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
            <FiMonitor className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          <button onClick={onLeave} className="p-2 sm:p-3 px-3 sm:px-4 rounded-xl bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-110 shadow-lg shadow-red-500/50" title="Leave call">
            <FiPhoneOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ParticipantCount = () => {
  const participants = useParticipants();
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
        <FiUsers className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-white text-lg font-semibold">Group Call</h3>
        <p className="text-gray-300 text-sm">{participants.length} participant{participants.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
};

const GroupCallRoom = ({ roomName, participantName, onLeave, groupId, callType = 'video', onMinimize }) => {
  const [token, setToken] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [error, setError] = useState('');
  const videoContainerRef = useRef(null);

  // Auto-trigger PiP on tab switch
  useEffect(() => {
    if (!token) return;

    const handleVisibilityChange = async () => {
      if (document.hidden && !document.pictureInPictureElement) {
        setTimeout(async () => {
          // Find participant tiles (remote participants)
          const participantTiles = document.querySelectorAll('.lk-participant-tile');
          console.log('Found participant tiles:', participantTiles.length);
          
          for (const tile of participantTiles) {
            const video = tile.querySelector('video');
            if (video && video.readyState >= 2) {
              console.log('Trying video:', { readyState: video.readyState, paused: video.paused });
              try {
                await video.requestPictureInPicture();
                console.log('PiP activated');
                break;
              } catch (err) {
                console.log('PiP failed:', err.message);
              }
            }
          }
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token]);

  useEffect(() => {
    const getToken = async () => {
      try {
        const { data } = await api.post('/livekit/token', {
          roomName,
          participantName,
          groupId: groupId || roomName.replace('group-', '')
        });
        setToken(data.token);
        setWsUrl(data.wsUrl);
        
        saveCallState({
          type: 'group',
          roomName,
          participantName,
          groupId: groupId || roomName.replace('group-', ''),
          token: data.token,
          wsUrl: data.wsUrl,
          callType
        });
        
        socketService.socket?.emit('groupcall:join', {
          groupId: groupId || roomName.replace('group-', ''),
          roomName
        });
        
        soundManager.play('joinCall');
      } catch (err) {
        console.error('Failed to get LiveKit token:', err);
        setError('Failed to join call. Please try again.');
      }
    };

    getToken();
    
    return () => {
      // Cleanup on unmount
    };
  }, [roomName, participantName, groupId, callType]);

  const handleLeave = () => {
    soundManager.play('leaveCall');
    clearCallState('group');
    socketService.socket?.emit('groupcall:leave', {
      groupId: groupId || roomName.replace('group-', ''),
      roomName
    });
    onLeave();
  };

  const handleMinimize = () => {
    saveCallState({
      type: 'group',
      roomName,
      participantName,
      groupId,
      callType,
      token,
      wsUrl
    });
    if (onMinimize) {
      onMinimize();
    } else {
      onLeave();
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={onLeave} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Connecting to call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-[60] flex flex-col">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        audio={true}
        video={callType === 'video'}
        onDisconnected={handleLeave}
        options={{
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720 },
            facingMode: 'user'
          },
          publishDefaults: {
            videoEnabled: callType === 'video',
            audioEnabled: true
          }
        }}
      >
        <div className="flex items-center justify-between p-3 md:p-4 bg-black/40 backdrop-blur-sm">
          <ParticipantCount />
          <button onClick={handleMinimize} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-white text-xs md:text-sm font-medium transition-all backdrop-blur-sm">
            <FiMinimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Minimize</span>
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-2 md:p-4" ref={videoContainerRef}>
          <div className="h-full">
            <VideoConference />
            <RoomAudioRenderer />
            <CustomControls onLeave={handleLeave} callType={callType} onMinimize={handleMinimize} />
          </div>
        </div>
      </LiveKitRoom>
      <style>{`
        .lk-participant-tile {
          border: 2px solid rgba(59, 130, 246, 0.5) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3) !important;
        }
        .lk-participant-tile.lk-speaking {
          border-color: rgba(34, 197, 94, 0.8) !important;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4) !important;
        }
        .lk-grid-layout {
          gap: 12px !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: grid !important;
        }
        .lk-grid-layout > * {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
        }
        @media (max-width: 768px) {
          .lk-grid-layout {
            gap: 8px !important;
            padding: 4px !important;
          }
          .lk-participant-tile {
            border-width: 1.5px !important;
          }
        }
        .lk-control-bar {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default GroupCallRoom;
