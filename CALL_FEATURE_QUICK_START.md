# WebRTC Call Feature - Quick Start Guide

## 🚀 How to Test the Call Feature

### Step 1: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```
Backend should run on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm start
```
Frontend should run on `http://localhost:3000`

### Step 2: Create Test Users

1. Open `http://localhost:3000/register`
2. Create User A:
   - Email: `usera@test.com`
   - Password: `Test123!`
   - Full Name: `User A`
3. Logout and create User B:
   - Email: `userb@test.com`
   - Password: `Test123!`
   - Full Name: `User B`

### Step 3: Setup for Testing

**Option 1: Two Browser Windows (Recommended)**
1. Window 1: Login as User A
2. Window 2: Open incognito/private mode, login as User B

**Option 2: Two Different Browsers**
1. Chrome: Login as User A
2. Firefox: Login as User B

### Step 4: Make Your First Call

**In User A's window:**
1. Navigate to `/chat`
2. Search for "User B" in the search box
3. Click on User B to open conversation
4. Click the **phone icon** (📞) for audio call
   OR
   Click the **video icon** (📹) for video call

**In User B's window:**
1. You should see an incoming call modal
2. Click the **green phone button** to accept
3. OR click the **red X button** to reject

### Step 5: During the Call

**Controls Available:**
- 🎤 **Mute/Unmute**: Toggle your microphone
- 📹 **Video On/Off**: Toggle your camera (video calls only)
- 📞 **End Call**: Hang up the call
- ⬇️ **Minimize**: Minimize call to bottom-right corner

**What You Should See:**
- ✅ Call timer showing duration (MM:SS)
- ✅ Your video in small window (bottom-right)
- ✅ Remote user's video in main area
- ✅ Audio working bidirectionally

### Step 6: View Call History

1. In the chat with User B
2. Click the user's profile/name at the top
3. Click **"Call History"** button
4. See your recent calls with timestamps and durations
5. Click the call icon to call back

## 🎯 Quick Test Scenarios

### Scenario 1: Audio Call (30 seconds)
```
1. User A calls User B (audio)
2. User B accepts
3. Talk for 10 seconds
4. User A mutes mic
5. User B unmutes mic
6. User A ends call
✅ Check: Call log shows ~10 seconds duration
```

### Scenario 2: Video Call (1 minute)
```
1. User A calls User B (video)
2. User B accepts
3. Both users see each other's video
4. User A toggles video off
5. User A toggles video back on
6. User B ends call
✅ Check: Video quality is good, no lag
```

### Scenario 3: Call Rejection
```
1. User A calls User B
2. User B rejects immediately
3. User A sees "Call Rejected" message
✅ Check: Call log shows "rejected" status
```

### Scenario 4: Minimize Call
```
1. User A calls User B (video)
2. User B accepts
3. User B clicks minimize button
4. Call window shrinks to bottom-right
5. User B can still use chat
6. User B clicks maximize to restore
✅ Check: Call continues in background
```

## 🐛 Troubleshooting

### Problem: "Camera/microphone access denied"
**Solution:**
1. Click the camera icon in browser address bar
2. Allow camera and microphone permissions
3. Refresh the page
4. Try calling again

### Problem: "Camera already in use"
**Solution:**
1. Close other apps using camera (Zoom, Teams, etc.)
2. Close other browser tabs with camera access
3. Restart browser
4. Try again

### Problem: "No audio/video"
**Solution:**
1. Check browser console for errors (F12)
2. Verify both users granted permissions
3. Check if STUN server is reachable
4. Try refreshing both windows

### Problem: "Call doesn't connect"
**Solution:**
1. Verify both users are online (green dot)
2. Check backend console for errors
3. Verify Socket.IO connection is active
4. Check network tab for WebRTC traffic

### Problem: "Poor video quality"
**Solution:**
1. Check internet connection speed
2. Close bandwidth-heavy applications
3. Try audio-only call instead
4. Move closer to WiFi router

## 📊 Expected Behavior

### Call Initiation
- ⏱️ Call should ring within 1 second
- 🔊 Ring sound plays for caller
- 🔔 Incoming sound plays for receiver

### Call Connection
- ⏱️ Should connect within 2-3 seconds after accept
- 📹 Video appears within 1-2 seconds
- 🎤 Audio starts immediately

### Call Quality
- 🎥 Video: 15-30 FPS (depends on connection)
- 🎤 Audio: Clear, no echo
- ⏱️ Latency: <500ms

### Call Ending
- ⏱️ Streams stop immediately
- 💾 Call log saved to database
- 🔊 End call sound plays

## ✅ Success Criteria

Your implementation is working if:
- [x] Can make audio calls
- [x] Can make video calls
- [x] Can accept/reject calls
- [x] Audio is clear and bidirectional
- [x] Video displays for both users
- [x] Controls (mute, video toggle) work
- [x] Call timer shows correct duration
- [x] Call history displays correctly
- [x] Can minimize/maximize call window
- [x] Call logs are saved to database

## 🎉 Congratulations!

If all tests pass, your WebRTC call feature is fully functional!

## 📞 Need Help?

Check these files for more details:
- `WEBRTC_IMPLEMENTATION_STATUS.md` - Full implementation details
- `CALL_FEATURE_TEST_CHECKLIST.md` - Comprehensive test checklist
- Browser console (F12) - For debugging errors
- Backend logs - For server-side issues

## 🔗 Useful Commands

```bash
# Check if backend is running
curl http://localhost:5000/api/test

# Check MongoDB connection
# In backend console, look for: "✅ MongoDB connected"

# Check Socket.IO connection
# In browser console: socket.connected should be true

# View call logs in MongoDB
# Use MongoDB Compass or mongo shell to query CallLog collection
```

Happy Testing! 🚀
