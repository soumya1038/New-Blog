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
    const socket = socketService.socket;
    console.log('🔔 GlobalGroupCallListener: Socket status:', socket ? 'Connected' : 'Not connected');
    if (!socket) return;

    const handleInvitation = (data) => {
      console.log('🔔 GlobalGroupCallListener: Received invitation:', data);
      soundManager.play('incomingCall');
      setInvitation(data);
      console.log('🔔 GlobalGroupCallListener: Invitation state set, will auto-hide in 30s');
      setTimeout(() => {
        console.log('🔔 GlobalGroupCallListener: Auto-hiding invitation after 30s');
        setInvitation(null);
        soundManager.stop('incomingCall');
      }, 30000);
    };

    socket.on('groupcall:invitation', handleInvitation);
    console.log('🔔 GlobalGroupCallListener: Listening for groupcall:invitation');

    return () => {
      console.log('🔔 GlobalGroupCallListener: Cleanup - removing listener');
      socket.off('groupcall:invitation', handleInvitation);
      soundManager.stop('incomingCall');
    };
  }, []);

  const handleJoin = () => {
    console.log('🔔 GlobalGroupCallListener: User clicked JOIN');
    console.log('🔔 GlobalGroupCallListener: Invitation data:', invitation);
    soundManager.stop('incomingCall');
    soundManager.play('joinVideoCall');
    const joinData = { ...invitation, callType: invitation.callType || 'video' };
    console.log('🔔 GlobalGroupCallListener: Navigating to /chat with joinGroupCall:', joinData);
    navigate('/chat', { state: { joinGroupCall: joinData } });
    setInvitation(null);
  };

  const handleDecline = () => {
    console.log('🔔 GlobalGroupCallListener: User clicked DECLINE');
    console.log('🔔 GlobalGroupCallListener: Invitation data:', invitation);
    soundManager.stop('incomingCall');
    soundManager.play('endCall');
    const declineData = { ...invitation };
    console.log('🔔 GlobalGroupCallListener: Navigating to /chat with declinedGroupCall:', declineData);
    navigate('/chat', { state: { declinedGroupCall: declineData } });
    setInvitation(null);
  };

  if (!invitation) {
    console.log('🔔 GlobalGroupCallListener: No invitation, rendering null');
    return null;
  }

  console.log('🔔 GlobalGroupCallListener: Rendering invitation popup for:', invitation.groupName);

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
