import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';
import { FiUsers, FiX, FiPhone, FiVideo } from 'react-icons/fi';
import soundManager from '../utils/soundManager';

const GlobalGroupCallListener = () => {
  const [invitation, setInvitation] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔍 GlobalGroupCallListener: Mounted, route:', location.pathname);
    console.log('🔍 Socket exists:', !!socketService.socket);
    console.log('🔍 Socket connected:', socketService.socket?.connected);
    
    // Only listen when NOT on /chat route
    if (location.pathname === '/chat') {
      console.log('🚫 GlobalGroupCallListener: On /chat, not listening');
      return;
    }

    const socket = socketService.socket;
    if (!socket) {
      console.log('⚠️ GlobalGroupCallListener: Socket not ready');
      return;
    }

    if (!socket.connected) {
      console.log('⚠️ GlobalGroupCallListener: Socket not connected');
      return;
    }

    const handleInvitation = (data) => {
      console.log('🔔 GlobalGroupCallListener received invitation:', data);
      soundManager.play('incomingCall');
      setInvitation(data);
      setTimeout(() => {
        setInvitation(null);
        soundManager.stop('incomingCall');
      }, 30000);
    };

    console.log('✅ GlobalGroupCallListener: Setting up listener');
    socket.on('groupcall:invitation', handleInvitation);

    return () => {
      console.log('🧹 GlobalGroupCallListener: Cleaning up listener');
      socket.off('groupcall:invitation', handleInvitation);
      soundManager.stop('incomingCall');
    };
  }, [location.pathname]);

  const handleJoin = () => {
    soundManager.stop('incomingCall');
    soundManager.play('joinVideoCall');
    navigate('/chat', { state: { joinGroupCall: { ...invitation, callType: invitation.callType || 'video' } } });
    setInvitation(null);
  };

  const handleDecline = () => {
    soundManager.stop('incomingCall');
    soundManager.play('endCall');
    setInvitation(null);
  };

  if (!invitation) return null;

  return (
    <div className="fixed top-4 right-4 z-[70] animate-slide-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 w-80 border-2 border-blue-500 animate-pulse-slow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
              {invitation?.callType === 'audio' ? (
                <FiPhone className="w-6 h-6 text-white" />
              ) : (
                <FiVideo className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {invitation?.callType === 'audio' ? '🎵 Audio Call' : '📹 Video Call'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{invitation?.groupName}</p>
            </div>
          </div>
          <button onClick={handleDecline} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          <span className="font-medium">{invitation?.callerName || invitation?.initiator?.fullName}</span> started a group {invitation?.callType === 'audio' ? 'audio' : 'video'} call
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleJoin}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
          >
            {invitation?.callType === 'audio' ? <FiPhone className="w-4 h-4" /> : <FiVideo className="w-4 h-4" />}
            Join
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition-all"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalGroupCallListener;
