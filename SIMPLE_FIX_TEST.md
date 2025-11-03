# Simple Test - Check What's Working

## Test 1: Sound File Loading
Open browser console (F12) and type:
```javascript
const audio = new Audio('/sounds/receive-msg.mp3');
audio.play();
```
**Expected:** You hear the sound
**If fails:** Sound file path is wrong

## Test 2: Socket Connection
In console, check:
```javascript
// Should show socket object
window.socket
```

## Test 3: Route Tracking
1. Open `/chat`
2. Check backend console
3. Should see: "📍 User ... route changed to: /chat"

**If you don't see this:** Route tracking not working

## Test 4: Message Receive
1. User A: Open chat with User B
2. User B: Send message
3. User A console should show:
   - "📨 Message from: [userId]"
   - "Is chat open? true"
   - "ADDING MESSAGE TO CHAT"
   - "PLAYING SOUND: receive-msg.mp3"

**If "Is chat open?" is false:** The setState callback isn't working

## Quick Fix

The issue is the setState callback approach doesn't work reliably. We need to use a different method.

**Restart both servers first, then test.**
