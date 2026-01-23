import React, { useState, useEffect } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, ControlBar, useTracks } from '@livekit/components-react';
import '@livekit/components-styles';
import { FiX, FiUsers } from 'react-icons/fi';
import { Room, RoomOptions, VideoPresets, Track } from 'livekit-client';
import api from '../services/api';
import socketService from '../services/socket';
import { saveCallState, clearCallState } from '../utils/callStateManager';

const GroupCallRoom = ({ roomName, participantName, onLeave, groupId }) => {
  const [token, setToken] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [error, setError] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

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
        
        // Save call state
        saveCallState({
          type: 'group',
          roomName,
          participantName,
          groupId: groupId || roomName.replace('group-', ''),
          token: data.token,
          wsUrl: data.wsUrl
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
      clearCallState();
    };
  }, [roomName, participantName, groupId]);

  const handleLeave = () => {
    clearCallState();
    socketService.socket?.emit('groupcall:leave', {
      groupId: groupId || roomName.replace('group-', ''),
      roomName
    });
    onLeave();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-900 rounded-lg shadow-2xl p-4 z-[60] w-72">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Group Call</p>
              <p className="text-gray-400 text-xs">{participantCount} participants</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMinimized(false)} 
            className="text-white hover:text-gray-300 text-sm px-3 py-1 bg-blue-600 rounded"
          >
            Open
          </button>
        </div>
        <button
          onClick={handleLeave}
          className="w-full py-2 rounded bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
        >
          Leave Call
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onLeave}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-[60]">
      {/* Header with gradient */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold">Group Video Call</h3>
              <p className="text-gray-300 text-sm">{participantCount} participants</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsMinimized(true)} 
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Minimize
            </button>
            <button
              onClick={handleLeave}
              className="p-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      
      {/* LiveKit Room with custom styling */}
      <div className="h-full pt-20">
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={true}
          video={true}
          onDisconnected={handleLeave}
          onParticipantConnected={() => setParticipantCount(prev => prev + 1)}
          onParticipantDisconnected={() => setParticipantCount(prev => Math.max(1, prev - 1))}
          options={{
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
              resolution: VideoPresets.h720.resolution,
              facingMode: 'user'
            },
            publishDefaults: {
              videoSimulcastLayers: [
                VideoPresets.h180,
                VideoPresets.h360,
                VideoPresets.h720
              ],
              videoEncoding: VideoPresets.h720,
              dtx: true,
              red: true
            }
          }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
};

export default GroupCallRoom;
