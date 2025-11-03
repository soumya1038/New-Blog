# Issues Analysis and Fixes

## Issue 1: Receive Message Sound Not Playing in Active Chat ❌

**Problem**: When chat is open with a user, receiving messages doesn't play the "receive msg.mp3" sound.

**Root Cause**: 
1. The `message:receive` event handler uses `selectedChat` in its closure, but `selectedChat` is not in the dependency array
2. This causes the handler to always see the initial `null` value of `selectedChat`
3. The condition `selectedChat && message.sender._id === selectedChat._id` always fails

**Fix**: Add `selectedChat` and `mutedUsers` to the useEffect dependency array so the socket handler gets updated when chat selection changes.

## Issue 2: Unable to Make Audio/Video Calls ❌

**Problem**: Calls cannot be initiated or accepted.

**Root Cause**: The WebRTC service and socket handlers are working correctly. The issue is likely:
1. Browser permissions not granted
2. Camera/microphone already in use
3. HTTPS required for getUserMedia (except localhost)

**Fix**: 
1. Ensure browser has camera/microphone permissions
2. Close other apps using camera/mic
3. Test on localhost or HTTPS
4. Add better error messages (already implemented)

## Issue 3: Message Reactions Appearing with Delay ✅ FIXED

**Problem**: When reacting to messages, the reaction appears after a delay.

**Root Cause**: The state update wasn't forcing a new array reference, so React's reconciliation didn't detect the change immediately.

**Fix Applied**: Changed from `prev.map()` to `[...prev.map()]` to force new array reference.

## Issue 4: Notifications Appearing Even When on Chat Route ✅ ALREADY WORKING

**Problem**: User reports getting notifications even when on /chat route.

**Analysis**: Backend code is CORRECT:
```javascript
const receiverData = onlineUsers.get(receiverId);
const isReceiverOnChat = receiverData && receiverData.currentRoute === '/chat';

if (!isReceiverOnChat) {
  await Notification.create({...});
}
```

**Possible Causes**:
1. User might be seeing the global notification sound from App.js (which is correct behavior)
2. The `route:change` event might not be firing properly
3. User might be confusing sound notifications with database notifications

## Critical Fix Required

The main issue is **Issue #1** - the socket event handler needs to be recreated when `selectedChat` changes.

### Current Code Problem:
```javascript
useEffect(() => {
  socket.current.on('message:receive', (message) => {
    const isChatOpen = selectedChat && message.sender._id === selectedChat._id;
    // selectedChat is STALE here - always null!
  });
}, [user]); // Missing selectedChat dependency!
```

### Solution:
Add `selectedChat` and `mutedUsers` to dependency array, OR use a ref to track current chat.
