import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socketService from '../services/socket';
import api from '../services/api';
import soundManager from '../utils/soundManager';

const GroupCallContext = createContext();

export const useGroupCall = () => {
  const context = useContext(GroupCallContext);
  if (!context) throw new Error('useGroupCall must be used within GroupCallProvider');
  return context;
};

export const GroupCallProvider = ({ children }) => {
  const [currentCall, setCurrentCall] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeCallsByGroup, setActiveCallsByGroup] = useState({});

  // Handle incoming invitation
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const handleInvitation = (data) => {
      console.log('📞 Received group call invitation:', data);
      
      // Replace any existing invitation with new one
      setInvitation(prev => {
        if (prev) {
          soundManager.stop('incomingCall');
        }
        return { ...data, hasActiveCall: !!currentCall };
      });
      
      soundManager.play('incomingCall');
    };

    const handleUserJoined = ({ groupId, user }) => {
      setActiveCallsByGroup(prev => {
        const existing = prev[groupId];
        if (!existing) return prev;
        
        const alreadyExists = existing.participants?.some(p => p._id === user._id);
        if (alreadyExists) return prev;
        
        return {
          ...prev,
          [groupId]: {
            ...existing,
            participants: [...(existing.participants || []), user]
          }
        };
      });
    };

    const handleUserLeft = ({ groupId, userId }) => {
      setActiveCallsByGroup(prev => {
        const existing = prev[groupId];
        if (!existing) return prev;
        
        return {
          ...prev,
          [groupId]: {
            ...existing,
            participants: existing.participants?.filter(p => p._id !== userId) || []
          }
        };
      });
    };

    const handleCallEnded = ({ groupId }) => {
      if (currentCall?.groupId === groupId) {
        endCall();
      }
      setActiveCallsByGroup(prev => {
        const updated = { ...prev };
        delete updated[groupId];
        return updated;
      });
    };

    socket.on('groupcall:invitation', handleInvitation);
    socket.on('groupcall:user-joined', handleUserJoined);
    socket.on('groupcall:user-left', handleUserLeft);
    socket.on('groupcall:ended', handleCallEnded);

    return () => {
      socket.off('groupcall:invitation', handleInvitation);
      socket.off('groupcall:user-joined', handleUserJoined);
      socket.off('groupcall:user-left', handleUserLeft);
      socket.off('groupcall:ended', handleCallEnded);
    };
  }, [currentCall]);

  const acceptInvitation = useCallback(async () => {
    if (!invitation) return;

    soundManager.stop('incomingCall');
    soundManager.play('joinCall');

    // Leave current call if any
    if (currentCall) {
      await leaveCurrentCall();
    }

    const { groupId, roomName, callType } = invitation;
    
    try {
      const { data } = await api.post('/livekit/token', {
        roomName,
        groupId,
        callType
      });

      setCurrentCall({
        groupId,
        roomName,
        callType: callType || 'video',
        token: data.token,
        wsUrl: data.wsUrl,
        startTime: Date.now()
      });

      setInvitation(null);
      setIsMinimized(false);

      // Notify backend
      socketService.socket?.emit('groupcall:join', { groupId, roomName });
    } catch (error) {
      console.error('Failed to join call:', error);
      soundManager.play('error');
    }
  }, [invitation, currentCall]);

  const declineInvitation = useCallback(() => {
    soundManager.stop('incomingCall');
    soundManager.play('endCall');
    setInvitation(null);
  }, []);

  const leaveCurrentCall = useCallback(async () => {
    if (!currentCall) return;

    const { groupId, roomName } = currentCall;
    
    socketService.socket?.emit('groupcall:leave', { groupId, roomName });
    
    setCurrentCall(null);
    setIsMinimized(false);
    soundManager.play('leaveCall');
  }, [currentCall]);

  const endCall = useCallback(() => {
    leaveCurrentCall();
  }, [leaveCurrentCall]);

  const startCall = useCallback(async (groupId, groupName, callType = 'video') => {
    const roomName = `group-${groupId}-${Date.now()}`;
    
    try {
      const { data } = await api.post('/livekit/token', {
        roomName,
        groupId,
        callType
      });

      setCurrentCall({
        groupId,
        roomName,
        callType,
        token: data.token,
        wsUrl: data.wsUrl,
        startTime: Date.now(),
        isInitiator: true
      });

      setIsMinimized(false);

      // Notify all group members
      socketService.socket?.emit('groupcall:start', {
        groupId,
        roomName,
        callType
      });

      soundManager.play('joinCall');
    } catch (error) {
      console.error('Failed to start call:', error);
      soundManager.play('error');
    }
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const fetchActiveCall = useCallback(async (groupId) => {
    try {
      const { data } = await api.get(`/livekit/active/${groupId}`);
      if (data.call) {
        setActiveCallsByGroup(prev => ({
          ...prev,
          [groupId]: data.call
        }));
      }
      return data.call;
    } catch (error) {
      console.error('Failed to fetch active call:', error);
      return null;
    }
  }, []);

  const joinActiveCall = useCallback(async (groupId) => {
    const activeCall = activeCallsByGroup[groupId];
    if (!activeCall) return;

    // Leave current call if any
    if (currentCall) {
      await leaveCurrentCall();
    }

    try {
      const { data } = await api.post('/livekit/token', {
        roomName: activeCall.roomName,
        groupId,
        callType: activeCall.callType
      });

      setCurrentCall({
        groupId,
        roomName: activeCall.roomName,
        callType: activeCall.callType || 'video',
        token: data.token,
        wsUrl: data.wsUrl,
        startTime: Date.now()
      });

      setIsMinimized(false);

      socketService.socket?.emit('groupcall:join', { groupId, roomName: activeCall.roomName });
      soundManager.play('joinCall');
    } catch (error) {
      console.error('Failed to join active call:', error);
      soundManager.play('error');
    }
  }, [activeCallsByGroup, currentCall, leaveCurrentCall]);

  const value = {
    currentCall,
    invitation,
    isMinimized,
    activeCallsByGroup,
    acceptInvitation,
    declineInvitation,
    startCall,
    endCall,
    toggleMinimize,
    fetchActiveCall,
    joinActiveCall
  };

  return <GroupCallContext.Provider value={value}>{children}</GroupCallContext.Provider>;
};
