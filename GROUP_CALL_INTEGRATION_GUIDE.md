# Group Call Feature - Complete Integration Guide

## ✅ Components Created

All new components have been created in `frontend/src/components/`:

1. **GroupCallInvitationModal.jsx** - Call invitation popup
2. **ActiveGroupCallBanner.jsx** - Active call banner in chat
3. **MinimizedGroupCall.jsx** - Draggable minimized call window
4. **GroupCallRoom.jsx** - Enhanced full-screen call interface

## 📝 Integration Steps

### Step 1: Update ChatNew.jsx Imports

Add these imports at the top of `frontend/src/pages/ChatNew.jsx`:

```javascript
import GroupCallInvitationModal from '../components/GroupCallInvitationModal';
import ActiveGroupCallBanner from '../components/ActiveGroupCallBanner';
import GroupCallRoom from '../components/GroupCallRoom';
import MinimizedGroupCall from '../components/MinimizedGroupCall';
```

### Step 2: Add State Variables

Add these state declarations with other useState hooks (around line 40-150):

```javascript
const [groupCallInvitation, setGroupCallInvitation] = useState(null);
const [activeGroupCall, setActiveGroupCall] = useState(null);
const [showGroupCallRoom, setShowGroupCallRoom] = useState(false);
const [isGroupCallMinimized, setIsGroupCallMinimized] = useState(false);
```

### Step 3: Add Socket Event Listeners

In the main useEffect where socket listeners are set up (around line 300-600), add:

```javascript
// Group call invitation
socket.current.on('groupcall:invitation', ({ groupId, groupName, roomName, callType, initiator, joinedUsers }) => {
  console.log('📞 Group call invitation:', { groupId, groupName, callType });
  if (window.location.pathname === '/chat') {
    setGroupCallInvitation({ groupId, groupName, roomName, callType, initiator, joinedUsers });
    soundManager.play('incomingCall');
  }
});

// Call ended
socket.current.on('groupcall:ended', ({ groupId }) => {
  console.log('📞 Group call ended:', groupId);
  soundManager.stop('incomingCall');
  setGroupCallInvitation(null);
  setActiveGroupCall(null);
  setShowGroupCallRoom(false);
  setIsGroupCallMinimized(false);
  clearCallState('group');
});

// User joined
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

// User left
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

### Step 4: Add Handler Functions

Add these functions with other handlers (around line 1000-1700):

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

### Step 5: Update Chat Header

Find the chat header section (around line 2813-2822) and replace the call buttons:

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

### Step 6: Add Active Call Banner

Right after the chat header closing div (after line 2823), add:

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

### Step 7: Add Call Components

At the end of the return statement, before the final closing `</div>` (around line 3950-3960), add:

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

### Step 8: Add Cleanup

In the useEffect cleanup (return function around line 550-580), add:

```javascript
socket.current.off('groupcall:invitation');
socket.current.off('groupcall:ended');
socket.current.off('groupcall:user-joined');
socket.current.off('groupcall:user-left');
```

## ✅ Backend Already Configured

The backend socket events are already implemented in `backend/socket/chatSocket.js`:
- ✅ groupcall:start
- ✅ groupcall:join
- ✅ groupcall:leave
- ✅ Participant tracking
- ✅ Call history creation

## 🎵 Sound Effects

Already configured in `soundManager.js`:
- ✅ joinCall: `/sounds/start-record.mp3`
- ✅ leaveCall: `/sounds/success complite publish notification.mp3`
- ✅ incomingCall: `/sounds/NB-ring-notification.mp3`

## 🧪 Testing Checklist

1. [ ] Start audio call from group chat
2. [ ] Start video call from group chat
3. [ ] Receive call invitation (30s timer)
4. [ ] Accept call invitation
5. [ ] Reject call invitation (banner appears)
6. [ ] Join from banner
7. [ ] Toggle microphone
8. [ ] Toggle camera
9. [ ] Rotate camera (if multiple cameras)
10. [ ] Share screen
11. [ ] Minimize call
12. [ ] Drag minimized window
13. [ ] Open from minimized
14. [ ] End call from minimized
15. [ ] Navigate to other pages (minimized stays)
16. [ ] Multiple users join
17. [ ] Speaking indicator (glowing border)
18. [ ] Join/leave sounds
19. [ ] All users leave (call ends, history created)
20. [ ] Call history message appears

## 🎨 UI Features

✅ Audio/Video buttons in group header
✅ Call invitation modal with timer
✅ Active call banner with live count
✅ Full-screen call with participant cards
✅ Speaking indicator (glowing green border)
✅ Minimized draggable window
✅ Camera rotation button (multiple cameras)
✅ Screen share button
✅ Responsive design
✅ Dark mode support
✅ Smooth animations

## 📱 Mobile Responsive

All components are mobile-responsive:
- Smaller buttons on mobile
- Touch-friendly controls
- Adaptive grid layout
- Proper spacing

## 🚀 Ready to Use!

All components are created and ready. Just follow the integration steps above to add them to ChatNew.jsx.

The implementation is minimal, clean, and follows your exact specifications!
