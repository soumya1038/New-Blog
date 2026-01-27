# Exact Code Changes for ChatNew.jsx

## 1. ADD IMPORTS (at the top, around line 1-40)

```javascript
import GroupCallInvitationModal from '../components/GroupCallInvitationModal';
import ActiveGroupCallBanner from '../components/ActiveGroupCallBanner';
import GroupCallRoom from '../components/GroupCallRoom';
import MinimizedGroupCall from '../components/MinimizedGroupCall';
```

## 2. ADD STATE VARIABLES (with other useState, around line 40-150)

```javascript
const [groupCallInvitation, setGroupCallInvitation] = useState(null);
const [activeGroupCall, setActiveGroupCall] = useState(null);
const [showGroupCallRoom, setShowGroupCallRoom] = useState(false);
const [isGroupCallMinimized, setIsGroupCallMinimized] = useState(false);
```

## 3. ADD SOCKET LISTENERS (in main useEffect, around line 300-600)

```javascript
socket.current.on('groupcall:invitation', ({ groupId, groupName, roomName, callType, initiator, joinedUsers }) => {
  console.log('📞 Group call invitation:', { groupId, groupName, callType });
  if (window.location.pathname === '/chat') {
    setGroupCallInvitation({ groupId, groupName, roomName, callType, initiator, joinedUsers });
    soundManager.play('incomingCall');
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
  console.log('📞 User joined:', user.fullName);
  soundManager.play('joinCall');
  if (activeGroupCall?.groupId === groupId) {
    setActiveGroupCall(prev => ({
      ...prev,
      participantCount: prev.participantCount + 1,
      participants: [...(prev.participants || []), user]
    }));
  }
});

socket.current.on('groupcall:user-left', ({ groupId, userId }) => {
  console.log('📞 User left:', userId);
  soundManager.play('leaveCall');
  if (activeGroupCall?.groupId === groupId) {
    setActiveGroupCall(prev => ({
      ...prev,
      participantCount: Math.max(0, prev.participantCount - 1),
      participants: (prev.participants || []).filter(p => p._id !== userId)
    }));
  }
});
```

## 4. ADD HANDLER FUNCTIONS (with other handlers, around line 1000-1700)

```javascript
const initiateGroupCall = async (callType) => {
  if (!selectedChat?.isGroup) return;
  
  try {
    const roomName = `group-${selectedChat._id}-${Date.now()}`;
    
    console.log('📞 Starting group call:', { roomName, callType });
    
    socket.current.emit('groupcall:start', {
      groupId: selectedChat._id,
      roomName,
      callType
    });
    
    setShowGroupCallRoom(true);
    setActiveGroupCall({
      groupId: selectedChat._id,
      roomName,
      callType,
      participantCount: 1,
      participants: [user]
    });
    
  } catch (error) {
    console.error('Failed to start group call:', error);
    showAlertModal('Error', 'Failed to start call');
  }
};

const acceptGroupCall = () => {
  if (!groupCallInvitation) return;
  
  soundManager.stop('incomingCall');
  
  if (window.location.pathname !== '/chat') {
    navigate('/chat', {
      state: { selectedUser: { _id: groupCallInvitation.groupId, isGroup: true } }
    });
  }
  
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
  const invitation = groupCallInvitation;
  setGroupCallInvitation(null);
  
  if (invitation && selectedChat?.isGroup && selectedChat._id === invitation.groupId) {
    setActiveGroupCall({
      groupId: invitation.groupId,
      roomName: invitation.roomName,
      callType: invitation.callType,
      participantCount: (invitation.joinedUsers || []).length,
      participants: invitation.joinedUsers || []
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
```

## 5. REPLACE CHAT HEADER BUTTONS (around line 2813-2822)

FIND THIS:
```javascript
{!selectedChat.isGroup && (
  <div className="flex items-center gap-2">
    <button onClick={() => initiateCall('audio')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
      <FiPhone className="w-5 h-5 text-gray-600" />
    </button>
    <button onClick={() => initiateCall('video')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
      <FiVideo className="w-5 h-5 text-gray-600" />
    </button>
  </div>
)}
```

REPLACE WITH:
```javascript
<div className="flex items-center gap-2">
  {!selectedChat.isGroup ? (
    <>
      <button onClick={() => initiateCall('audio')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
        <FiPhone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button onClick={() => initiateCall('video')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
        <FiVideo className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    </>
  ) : (
    <>
      <button onClick={() => initiateGroupCall('audio')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
        <FiPhone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button onClick={() => initiateGroupCall('video')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
        <FiVideo className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    </>
  )}
  <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
    <FiMoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
  </button>
</div>
```

## 6. ADD ACTIVE CALL BANNER (after chat header, around line 2823)

```javascript
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
```

## 7. ADD COMPONENTS AT END (before final </div>, around line 3950-3960)

```javascript
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
```

## 8. ADD CLEANUP (in useEffect return, around line 550-580)

```javascript
socket.current.off('groupcall:invitation');
socket.current.off('groupcall:ended');
socket.current.off('groupcall:user-joined');
socket.current.off('groupcall:user-left');
```

---

## That's it! 🎉

Just copy-paste these 8 sections into ChatNew.jsx and you're done!

All components are already created and ready to use.
