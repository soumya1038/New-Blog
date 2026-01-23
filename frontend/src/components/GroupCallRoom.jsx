import React, { useState, useEffect } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { FiX } from 'react-icons/fi';
import api from '../services/api';
import socketService from '../services/socket';

const GroupCallRoom = ({ roomName, participantName, onLeave, groupId }) => {
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
  }, [roomName, participantName, groupId]);

  const handleLeave = () => {
    socketService.socket?.emit('groupcall:leave', {
      groupId: groupId || roomName.replace('group-', ''),
      roomName
    });
    onLeave();
  };

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
    <div className="fixed inset-0 bg-black z-[60]">
      <button
        onClick={handleLeave}
        className="absolute top-4 right-4 z-[70] p-2 bg-red-500 hover:bg-red-600 rounded-full text-white"
      >
        <FiX className="w-6 h-6" />
      </button>
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={handleLeave}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
};

export default GroupCallRoom;
