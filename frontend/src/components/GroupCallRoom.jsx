import React, { useState, useEffect } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useParticipants, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';
import { FiUsers, FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMessageSquare, FiMonitor, FiMoreVertical } from 'react-icons/fi';
import api from '../services/api';
import socketService from '../services/socket';
import { saveCallState, clearCallState } from '../utils/callStateManager';

const CustomControls = ({ onLeave, callType }) => {
  const { isMicrophoneEnabled, isCameraEnabled, localParticipant } = useLocalParticipant();
  const [showMore, setShowMore] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

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
      setShowMore(false);
    } catch (error) {
      console.error('Screen share error:', error);
      alert('Failed to share screen. Please check permissions.');
    }
  };

  return (
    <>
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl px-3 py-2 border border-gray-700">
          <div className="flex items-center gap-2">
            <button onClick={toggleMic} className={`p-2 rounded-xl transition-all duration-200 transform hover:scale-110 ${!isMicrophoneEnabled ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50' : 'bg-gray-700 hover:bg-gray-600 shadow-lg'}`} title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}>
              {!isMicrophoneEnabled ? <FiMicOff className="w-5 h-5 text-white" /> : <FiMic className="w-5 h-5 text-white" />}
            </button>
            <button onClick={toggleCamera} className={`p-2 rounded-xl transition-all duration-200 transform hover:scale-110 ${!isCameraEnabled ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50' : 'bg-gray-700 hover:bg-gray-600 shadow-lg'}`} title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
              {!isCameraEnabled ? <FiVideoOff className="w-5 h-5 text-white" /> : <FiVideo className="w-5 h-5 text-white" />}
            </button>
            <button onClick={() => setShowMore(!showMore)} className="p-2 rounded-xl bg-gray-700 hover:bg-gray-600 shadow-lg transition-all duration-200 transform hover:scale-110" title="Chat">
              <FiMessageSquare className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => setShowMore(!showMore)} className="p-2 rounded-xl bg-gray-700 hover:bg-gray-600 shadow-lg transition-all duration-200 transform hover:scale-110" title="More options">
              <FiMoreVertical className="w-5 h-5 text-white" />
            </button>
            <button onClick={onLeave} className="p-2 px-4 rounded-xl bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-110 shadow-lg shadow-red-500/50" title="Leave call">
              <FiPhoneOff className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
      {showMore && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl p-2 border border-gray-700 min-w-[200px]">
            <button onClick={toggleScreenShare} className="w-full flex items-center gap-3 px-4 py-2 text-white hover:bg-gray-700 rounded-lg transition-colors">
              <FiMonitor className="w-5 h-5" />
              <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
            </button>
          </div>
        </div>
      )}
    </>
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
            videoEnabled: callType === 'video'
          }
        }}
      >
        <div className="flex items-center justify-between p-3 md:p-4 bg-black/40 backdrop-blur-sm">
          <ParticipantCount />
          <button onClick={handleMinimize} className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-white text-xs md:text-sm font-medium transition-all backdrop-blur-sm">
            Minimize
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-2 md:p-4">
          <div className="h-full">
            <VideoConference />
            <RoomAudioRenderer />
            <CustomControls onLeave={handleLeave} callType={callType} />
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
