// GROUP CALL INTEGRATION FOR ChatNew.jsx
// Add these imports at the top with other imports:

import GroupCallInvitationModal from '../components/GroupCallInvitationModal';
import ActiveGroupCallBanner from '../components/ActiveGroupCallBanner';
import GroupCallRoom from '../components/GroupCallRoom';
import MinimizedGroupCall from '../components/MinimizedGroupCall';

// Add these state variables with other useState declarations:

const [groupCallInvitation, setGroupCallInvitation] = useState(null);
const [activeGroupCall, setActiveGroupCall] = useState(null);
const [showGroupCallRoom, setShowGroupCallRoom] = useState(false);
const [groupCallParticipants, setGroupCallParticipants] = useState([]);
const [isGroupCallMinimized, setIsGroupCallMinimized] = useState(false);

// Add these socket listeners in the main useEffect (around line 300-600):

socket.current.on('groupcall:invitation', ({ groupId, groupName, roomName, callType, initiator, joinedUsers }) => {
  console.log('📞 Group call invitation received:', { groupId, groupName, callType });
  if (window.location.pathname === '/chat') {
    setGroupCallInvitation({ groupId, groupName, roomName, callType, initiator, joinedUsers });
    soundManager.play('incomingCall');
  }
});

socket.current.on('groupcall:started', ({ groupId, roomName, callType, participantCount, participants }) => {
  console.log('📞 Group call started:', { groupId, participantCount });
  if (selectedChatRef.current?.isGroup && selectedChatRef.current._id === groupId) {
    setActiveGroupCall({ groupId, roomName, callType, participantCount, participants });
  }
});

socket.current.on('groupcall:ended', ({ groupId }) => {
  console.log('📞 Group call ended:', groupId);
  soundManager.stop('incomingCall');
  setGroupCallInvitation(null);
  setActiveGroupCall(null);
  setShowGroupCallRoom(false);
  setIsGroupCallMinimized(false);
  clearCallState('group');
});

socket.current.on('groupcall:user-joined', ({ groupId, user }) => {
  console.log('📞 User joined group call:', user.fullName);
  soundManager.play('joinCall');
  if (activeGroupCall && activeGroupCall.groupId === groupId) {
    setGroupCallParticipants(prev => [...prev, user]);
    setActiveGroupCall(prev => ({
      ...prev,
      participantCount: prev.participantCount + 1,
      participants: [...(prev.participants || []), user]
    }));
  }
});

socket.current.on('groupcall:user-left', ({ groupId, userId }) => {
  console.log('📞 User left group call:', userId);
  soundManager.play('leaveCall');
  if (activeGroupCall && activeGroupCall.groupId === groupId) {
    setGroupCallParticipants(prev => prev.filter(p => p._id !== userId));
    setActiveGroupCall(prev => ({
      ...prev,
      participantCount: Math.max(0, prev.participantCount - 1),
      participants: (prev.participants || []).filter(p => p._id !== userId)
    }));
  }
});

// Add these functions with other handler functions:

const initiateGroupCall = async (callType) => {
  if (!selectedChat || !selectedChat.isGroup) return;
  
  try {
    const roomName = `group-${selectedChat._id}-${Date.now()}`;
    
    // Create group call record
    const { data } = await api.post('/livekit/create-room', {
      roomName,
      groupId: selectedChat._id,
      callType
    });
    
    console.log('📞 Initiating group call:', { roomName, callType });
    
    // Emit to all group members
    socket.current.emit('groupcall:start', {
      groupId: selectedChat._id,
      roomName,
      callType
    });
    
    // Join the call immediately
    setShowGroupCallRoom(true);
    setActiveGroupCall({
      groupId: selectedChat._id,
      roomName,
      callType,
      participantCount: 1,
      participants: [user]
    });
    
  } catch (error) {
    console.error('Failed to initiate group call:', error);
    showAlertModal('Error', 'Failed to start call. Please try again.');
  }
};

const acceptGroupCall = () => {
  if (!groupCallInvitation) return;
  
  soundManager.stop('incomingCall');
  
  // Navigate to chat if not already there
  if (window.location.pathname !== '/chat') {
    navigate('/chat', {
      state: {
        selectedUser: { _id: groupCallInvitation.groupId, isGroup: true }
      }
    });
  }
  
  // Join the call
  setShowGroupCallRoom(true);
  setActiveGroupCall({
    groupId: groupCallInvitation.groupId,
    roomName: groupCallInvitation.roomName,
    callType: groupCallInvitation.callType,
    participantCount: (groupCallInvitation.joinedUsers || []).length + 1,
    participants: groupCallInvitation.joinedUsers || []
  });
  
  setGroupCallInvitation(null);
};

const rejectGroupCall = () => {
  soundManager.stop('incomingCall');
  setGroupCallInvitation(null);
  
  // Show active call banner if call is still ongoing
  if (groupCallInvitation && selectedChat?.isGroup && selectedChat._id === groupCallInvitation.groupId) {
    setActiveGroupCall({
      groupId: groupCallInvitation.groupId,
      roomName: groupCallInvitation.roomName,
      callType: groupCallInvitation.callType,
      participantCount: (groupCallInvitation.joinedUsers || []).length,
      participants: groupCallInvitation.joinedUsers || []
    });
  }
};

const leaveGroupCall = () => {
  setShowGroupCallRoom(false);
  setIsGroupCallMinimized(false);
  setActiveGroupCall(null);
  clearCallState('group');
};

const handleGroupCallMinimize = () => {
  setShowGroupCallRoom(false);
  setIsGroupCallMinimized(true);
};

const handleGroupCallOpen = () => {
  setShowGroupCallRoom(true);
  setIsGroupCallMinimized(false);
};

// REPLACE the existing group chat header buttons section (around line 2813-2822):
// OLD CODE:
//   {!selectedChat.isGroup && (
//     <div className="flex items-center gap-2">
//       <button onClick={() => initiateCall('audio')} ...>
//       <button onClick={() => initiateCall('video')} ...>
//     </div>
//   )}

// NEW CODE:
<div className="flex items-center gap-2">
  {!selectedChat.isGroup ? (
    <>
      <button onClick={() => initiateCall('audio')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Audio call">
        <FiPhone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button onClick={() => initiateCall('video')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Video call">
        <FiVideo className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    </>
  ) : (
    <>
      <button onClick={() => initiateGroupCall('audio')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Start audio call">
        <FiPhone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button onClick={() => initiateGroupCall('video')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Start video call">
        <FiVideo className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    </>
  )}
  <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
    <FiMoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
  </button>
</div>

// ADD this right after the chat header div (after line 2823):
{/* Active Group Call Banner */}
{selectedChat?.isGroup && activeGroupCall && activeGroupCall.groupId === selectedChat._id && !showGroupCallRoom && (
  <ActiveGroupCallBanner
    participantCount={activeGroupCall.participantCount}
    callType={activeGroupCall.callType}
    participants={activeGroupCall.participants || []}
    onJoin={() => {
      setShowGroupCallRoom(true);
      setActiveGroupCall(prev => ({
        ...prev,
        participantCount: prev.participantCount + 1
      }));
    }}
  />
)}

// ADD these components at the end of the return statement (before the closing </div>):

{/* Group Call Invitation Modal */}
{groupCallInvitation && (
  <GroupCallInvitationModal
    groupName={groupCallInvitation.groupName}
    initiator={groupCallInvitation.initiator}
    callType={groupCallInvitation.callType}
    onAccept={acceptGroupCall}
    onReject={rejectGroupCall}
  />
)}

{/* Group Call Room */}
{showGroupCallRoom && activeGroupCall && (
  <GroupCallRoom
    roomName={activeGroupCall.roomName}
    participantName={user.fullName}
    groupId={activeGroupCall.groupId}
    callType={activeGroupCall.callType}
    onLeave={leaveGroupCall}
    onMinimize={handleGroupCallMinimize}
  />
)}

{/* Minimized Group Call */}
{isGroupCallMinimized && activeGroupCall && (
  <MinimizedGroupCall
    token={getCallState('group')?.token}
    wsUrl={getCallState('group')?.wsUrl}
    callType={activeGroupCall.callType}
    onOpen={handleGroupCallOpen}
    onEnd={leaveGroupCall}
  />
)}

// CLEANUP: Add to the cleanup section in useEffect return (around line 550-580):
socket.current.off('groupcall:invitation');
socket.current.off('groupcall:started');
socket.current.off('groupcall:ended');
socket.current.off('groupcall:user-joined');
socket.current.off('groupcall:user-left');
