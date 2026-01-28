# Group Call System - Bug Fixes

## Issues Fixed

### 1. Group Call Invitation Not Appearing ✅
**Problem**: Invitations were not showing up for group members.

**Root Cause**: The invitation state was being set with auto-decline timer that was immediately clearing it.

**Fix**: Removed auto-decline timer and simplified invitation handling in `GroupCallContext.js`:
```javascript
const handleInvitation = (data) => {
  setInvitation(prev => {
    if (prev) soundManager.stop('incomingCall');
    return { ...data, hasActiveCall: !!currentCall };
  });
  soundManager.play('incomingCall');
};
```

### 2. Users Joining Different Calls ✅
**Problem**: When clicking "Join" on active call banner, users were creating a new call instead of joining the existing one.

**Root Cause**: Banner was calling `startGroupCall()` instead of `joinActiveCall()`.

**Fix**: Updated `ChatNew.jsx` to use correct function:
```javascript
onJoin={() => joinActiveCall(selectedChat._id)}
```

### 3. Active Call Banner Showing Wrong Participants ✅
**Problem**: Banner displayed all online group members instead of actual call participants.

**Root Cause**: 
- Backend `/livekit/active/:groupId` was returning DB participants instead of LiveKit room participants
- Socket events weren't properly tracking real-time joins/leaves

**Fix**: 
- Backend now queries LiveKit room for actual participants
- Socket `groupcall:join` now updates DB participants
- Context properly handles user-joined/user-left events with duplicate prevention

### 4. Call History Showing "Video Call" for Audio Calls ✅
**Problem**: All call history messages displayed as "Video call" regardless of actual call type.

**Root Cause**: Backend was using hardcoded callType in history message instead of actual call.callType.

**Fix**: Updated `chatSocket.js` to use actual callType:
```javascript
content: `${call.callType === 'audio' ? 'Audio' : 'Video'} call ended`,
callData: {
  callType: call.callType,
  // ...
}
```

## Files Modified

1. **frontend/src/context/GroupCallContext.js**
   - Fixed invitation handling
   - Improved user-joined/user-left event handlers with duplicate prevention

2. **frontend/src/pages/ChatNew.jsx**
   - Changed active call banner to use `joinActiveCall()` instead of `startGroupCall()`

3. **backend/socket/chatSocket.js**
   - Added participant tracking in `groupcall:join` event
   - Fixed call history to use actual callType

4. **backend/routes/livekit.js** (already correct)
   - Returns actual LiveKit room participants for active calls

## Testing Checklist

- [ ] Start a group call - all members receive invitation
- [ ] Accept invitation - user joins the call
- [ ] Click "Join" on active call banner - joins existing call (not new one)
- [ ] Banner shows correct participant count and avatars
- [ ] Start audio call - history shows "Audio call ended"
- [ ] Start video call - history shows "Video call ended"
- [ ] Multiple users join - all see correct participant list
- [ ] User leaves - participant count updates for everyone
- [ ] Last user leaves - call ends and history is saved

## Notes

- LiveKit room is the source of truth for active participants
- DB participants are for history tracking only
- Socket events provide real-time updates between LiveKit sync intervals
