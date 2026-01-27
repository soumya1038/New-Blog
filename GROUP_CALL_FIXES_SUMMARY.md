# Group Call Functionality - Complete Fix Summary

## Issues Fixed

### 1. **Active Call Banner Behavior** ✅
**Problem**: Banner was auto-hiding after 30 seconds even when call was still active.
**Solution**: Removed the 30-second timeout useEffect that was clearing `activeGroupCall` state.

**File**: `frontend/src/pages/ChatNew.jsx`
- Deleted lines 208-216 (useEffect with setTimeout)

### 2. **Active Call Banner Display Condition** ✅
**Problem**: Banner only showed when `selectedChat._id === activeGroupCall.groupId`.
**Solution**: Added `!isGroupCallMinimized` condition to hide banner when call is minimized.

**File**: `frontend/src/pages/ChatNew.jsx` (line ~3151)
```jsx
{selectedChat?.isGroup && activeGroupCall && activeGroupCall.groupId === selectedChat._id && !showGroupCallRoom && !isGroupCallMinimized && (
  <ActiveGroupCallBanner ... />
)}
```

### 3. **Reject Group Call Behavior** ✅
**Problem**: `rejectGroupCall()` only set `activeGroupCall` if user was on the same chat.
**Solution**: Removed the `selectedChat` check - now sets `activeGroupCall` regardless of current route.

**File**: `frontend/src/pages/ChatNew.jsx` (line ~2086)
```jsx
const rejectGroupCall = () => {
  soundManager.stop('incomingCall');
  const invitation = groupCallInvitation;
  setGroupCallInvitation(null);
  
  if (invitation) {  // Removed selectedChat check
    setActiveGroupCall({
      groupId: invitation.groupId,
      roomName: invitation.roomName,
      callType: invitation.callType,
      participantCount: (invitation.joinedUsers || []).length,
      participants: invitation.joinedUsers || []
    });
  }
};
```

### 4. **Global Group Call Invitations** ✅
**Problem**: Duplicate socket listeners - both ChatNew.jsx and GlobalGroupCallListener were listening to `groupcall:invitation`.
**Solution**: 
- Removed socket listener from ChatNew.jsx
- GlobalGroupCallListener now handles all invitations globally
- Added location.state handler in ChatNew.jsx to accept joins from GlobalGroupCallListener

**Files Modified**:
- `frontend/src/pages/ChatNew.jsx` (line ~537): Removed `socket.current.on('groupcall:invitation', ...)`
- `frontend/src/pages/ChatNew.jsx` (line ~700): Added location.state.joinGroupCall handler

### 5. **Global State Synchronization** ✅
**Problem**: Group call state wasn't syncing between ChatNew and App.js for global minimize bubble.
**Solution**: Added useEffects to dispatch custom events for global state management.

**File**: `frontend/src/pages/ChatNew.jsx` (after line 2113)
```jsx
useEffect(() => {
  if (showGroupCallRoom && activeGroupCall) {
    const callState = getCallState('group');
    if (callState) {
      window.dispatchEvent(new CustomEvent('groupCallStateUpdate', { detail: callState }));
    }
  }
}, [showGroupCallRoom, activeGroupCall]);

useEffect(() => {
  const handleOpenFromGlobal = () => {
    if (activeGroupCall) {
      setShowGroupCallRoom(true);
      setIsGroupCallMinimized(false);
    }
  };
  window.addEventListener('openGroupCallFromGlobal', handleOpenFromGlobal);
  return () => window.removeEventListener('openGroupCallFromGlobal', handleOpenFromGlobal);
}, [activeGroupCall]);

useEffect(() => {
  const handleGroupCallEnded = () => {
    setActiveGroupCall(null);
    setShowGroupCallRoom(false);
    setIsGroupCallMinimized(false);
  };
  window.addEventListener('groupCallEnded', handleGroupCallEnded);
  return () => window.removeEventListener('groupCallEnded', handleGroupCallEnded);
}, []);
```

## How It Works Now

### Flow 1: User Receives Group Call Invitation
1. **GlobalGroupCallListener** (in App.js) receives `groupcall:invitation` socket event
2. Shows invitation popup on ANY route (not just /chat)
3. User clicks "Join" → navigates to `/chat` with `location.state.joinGroupCall`
4. ChatNew.jsx detects `location.state.joinGroupCall` and opens GroupCallRoom
5. User clicks "Decline" → sets `activeGroupCall` state (for banner)

### Flow 2: Active Call Banner
1. When invitation is declined OR user joins then leaves, `activeGroupCall` is set
2. Banner displays when:
   - User is on the group chat (`selectedChat._id === activeGroupCall.groupId`)
   - Call room is not open (`!showGroupCallRoom`)
   - Call is not minimized (`!isGroupCallMinimized`)
3. Banner stays visible until call actually ends (no 30-second timeout)
4. Banner updates participant count in real-time via socket events

### Flow 3: Minimize Bubble
1. User clicks "Minimize" button in GroupCallRoom
2. `handleGroupCallMinimize()` sets `isGroupCallMinimized = true`
3. MinimizedGroupCall component renders as draggable bubble
4. User navigates away → bubble persists via global state in App.js
5. User clicks "Open" → returns to GroupCallRoom

### Flow 4: Navigation Away During Call
1. User is in active group call
2. User navigates to another route (e.g., /profile)
3. Call state is saved via `saveCallState('group', ...)`
4. FloatingGroupCallBanner (in App.js) shows the minimize bubble globally
5. User clicks bubble → navigates back to /chat and reopens call

## Files Modified

1. **frontend/src/pages/ChatNew.jsx**
   - Removed 30-second timeout useEffect
   - Fixed `rejectGroupCall()` to always set activeGroupCall
   - Removed duplicate `groupcall:invitation` socket listener
   - Added location.state.joinGroupCall handler
   - Added banner condition `!isGroupCallMinimized`
   - Added global state sync useEffects

2. **frontend/src/components/GlobalGroupCallListener.jsx**
   - Already working correctly (no changes needed)

3. **frontend/src/App.js**
   - Already has GlobalGroupCallListener and FloatingGroupCallBanner (no changes needed)

## Testing Checklist

- [ ] Receive group call invitation on /chat route
- [ ] Receive group call invitation on /profile route
- [ ] Receive group call invitation on /home route
- [ ] Click "Join" from invitation → opens call room
- [ ] Click "Decline" from invitation → shows active call banner
- [ ] Active call banner displays correct participant count
- [ ] Active call banner updates when users join/leave
- [ ] Active call banner "Join" button works
- [ ] Click "Minimize" in call room → shows minimize bubble
- [ ] Navigate away during call → minimize bubble persists
- [ ] Click minimize bubble → returns to call
- [ ] Leave call → banner and bubble disappear
- [ ] Call ends → all UI elements clean up properly

## Known Limitations

1. **One call per group**: Only one active call allowed per group at a time (enforced by backend)
2. **Camera off = Avatar**: When camera is disabled, user avatar displays on video tile (handled by LiveKit)
3. **Call history**: Group call history shows correct call type (audio/video) with icons

## Additional Notes

- All socket events are properly cleaned up on component unmount
- Call state persists across page refreshes via localStorage
- Audio/video calls differ only in initial camera state (ON for video, OFF for audio)
- Camera toggle button is always visible in both audio and video calls
