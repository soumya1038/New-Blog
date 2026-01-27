# Group Call Bug Fixes - Complete

## Issues Fixed

### 1. ✅ Minimize Screen Appears on Decline
**Problem**: MinimizedGroupCall was showing even when user rejected the call.
**Solution**: Removed the 30-second timeout in `rejectGroupCall()` that was keeping activeGroupCall state alive.

### 2. ✅ Invitation Doesn't Pop Up Globally  
**Problem**: GlobalGroupCallListener only listened when NOT on /chat route, so users on /chat never saw invitations.
**Solution**: 
- Removed `location.pathname !== '/chat'` check in GlobalGroupCallListener
- Removed `window.location.pathname === '/chat'` check in ChatNew socket listener
- Now invitations appear everywhere

### 3. ✅ Active Call Banner Not Showing on /chat
**Problem**: Banner auto-hide logic was broken.
**Solution**: Removed the 30-second auto-hide timeout when user declines. Banner now only shows when there's an active call.

### 4. ✅ No Camera Button in Audio Calls
**Problem**: Camera toggle was hidden for audio calls with `{callType === 'video' && ...}` condition.
**Solution**: Removed the condition - camera button now always visible. Audio calls start with camera OFF, video calls start with camera ON (controlled by LiveKit publishDefaults).

### 5. ✅ Call Type Not Saved in History
**Problem**: Backend wasn't tracking if call was audio or video.
**Solution**: Already implemented! Backend saves `callType` in GroupCall model and includes it in history messages.

## Key Changes

### Frontend Files Modified:
1. **GlobalGroupCallListener.jsx** - Always listen for invitations
2. **ChatNew.jsx** - Always show invitations, fixed decline logic
3. **GroupCallRoom.jsx** - Camera button always visible, proper audio/video defaults
4. **MinimizedGroupCall.jsx** - No changes needed (already working)

### Backend Files:
- **livekit.js** - Already saves callType ✅
- **chatSocket.js** - Already broadcasts callType ✅

## How It Works Now

### Audio Call Flow:
1. User clicks audio call button
2. `initiateGroupCall('audio')` called
3. LiveKit room created with `video: false` in publishDefaults
4. All participants join with camera OFF initially
5. Camera button visible - users can turn ON if needed
6. History saved as "Audio call"

### Video Call Flow:
1. User clicks video call button
2. `initiateGroupCall('video')` called
3. LiveKit room created with `video: true` in publishDefaults
4. All participants join with camera ON initially
5. Camera button visible - users can turn OFF if needed
6. History saved as "Video call"

## Testing Checklist

- [ ] Audio call starts with camera OFF
- [ ] Video call starts with camera ON
- [ ] Camera button visible in both call types
- [ ] Can toggle camera during audio call
- [ ] Can toggle camera during video call
- [ ] Invitation appears on /chat route
- [ ] Invitation appears on other routes
- [ ] Decline doesn't show minimize screen
- [ ] Active call banner shows correctly
- [ ] Call history shows "Audio call" or "Video call"
- [ ] Minimize screen only shows when in call
- [ ] Leave call properly cleans up state

## Notes

- Audio and video calls are identical except for initial camera state
- LiveKit handles the camera state via `publishDefaults.videoEnabled`
- Backend already tracks callType in database
- No need for separate audio/video call components
