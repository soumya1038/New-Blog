# 🐛 Call Feature Debugging Guide

## 🔧 Issues Fixed

### 1. ICE Candidate Parameter Mismatch
**Problem:** Backend was sending wrong parameter name
**Fixed:** Changed `userId` to `receiverId` in socket handler

### 2. Sound Manager Issues
**Problem:** Sounds not preloaded, causing delays
**Fixed:** Added preloading and better error handling

## 🧪 Step-by-Step Testing

### Test 1: Check Sound Files
```bash
# Verify sound files exist
ls frontend/public/sounds/

# Should see:
# - call-ring-sound.mp3
# - end call.mp3
# - NB-ring-notification.mp3
# - receive msg.mp3
# - Receive notification.mp3
# - Send msg.mp3
```

### Test 2: Test Sounds in Browser Console
```javascript
// Open browser console (F12)
// Test each sound
const audio = new Audio('/sounds/call-ring-sound.mp3');
audio.play();

// Test incoming call sound
const incoming = new Audio('/sounds/NB-ring-notification.mp3');
incoming.play();

// Test end call sound
const endCall = new Audio('/sounds/end call.mp3');
endCall.play();
```

### Test 3: Check WebRTC Permissions
```javascript
// In browser console
navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  .then(stream => {
    console.log('✅ Permissions granted');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Permission denied:', err));
```

### Test 4: Check Socket Connection
```javascript
// In browser console after login
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);
```

### Test 5: Monitor WebRTC Connection
```javascript
// Enable WebRTC logging in Chrome
// chrome://webrtc-internals/

// Or in console:
RTCPeerConnection.prototype.addIceCandidate = new Proxy(
  RTCPeerConnection.prototype.addIceCandidate,
  {
    apply(target, thisArg, args) {
      console.log('📡 ICE Candidate:', args[0]);
      return Reflect.apply(target, thisArg, args);
    }
  }
);
```

## 🔍 Common Issues & Solutions

### Issue 1: No Sound Playing

**Symptoms:**
- Call initiates but no ring sound
- No incoming call sound
- No end call sound

**Diagnosis:**
```javascript
// Check if sounds are loaded
console.log('Sounds:', soundManager.sounds);

// Try playing manually
soundManager.play('callRing');
soundManager.play('incomingCall');
```

**Solutions:**
1. **Browser autoplay policy:**
   ```javascript
   // User must interact with page first
   // Click anywhere on page, then try call
   ```

2. **Check sound files:**
   ```bash
   # Verify files exist
   curl http://localhost:3000/sounds/call-ring-sound.mp3
   ```

3. **Check browser console for errors:**
   - Look for "Failed to load resource"
   - Look for "NotAllowedError: play() failed"

### Issue 2: No Audio in Call

**Symptoms:**
- Call connects but can't hear other person
- Video works but no audio

**Diagnosis:**
```javascript
// Check audio tracks
console.log('Local audio tracks:', 
  localStream.getAudioTracks().map(t => ({
    enabled: t.enabled,
    muted: t.muted,
    readyState: t.readyState
  }))
);

console.log('Remote audio tracks:', 
  remoteStream.getAudioTracks().map(t => ({
    enabled: t.enabled,
    muted: t.muted,
    readyState: t.readyState
  }))
);
```

**Solutions:**
1. **Check microphone permissions:**
   - Browser settings → Site permissions → Microphone
   - Allow microphone access

2. **Check if muted:**
   ```javascript
   // Unmute audio track
   localStream.getAudioTracks()[0].enabled = true;
   ```

3. **Check system volume:**
   - Ensure system volume is not muted
   - Check browser tab is not muted

4. **Check audio output device:**
   ```javascript
   // List audio output devices
   navigator.mediaDevices.enumerateDevices()
     .then(devices => {
       devices.filter(d => d.kind === 'audiooutput')
         .forEach(d => console.log(d.label));
     });
   ```

### Issue 3: No Video in Call

**Symptoms:**
- Call connects but no video
- Black screen or placeholder image

**Diagnosis:**
```javascript
// Check video tracks
console.log('Local video tracks:', 
  localStream.getVideoTracks().map(t => ({
    enabled: t.enabled,
    muted: t.muted,
    readyState: t.readyState,
    settings: t.getSettings()
  }))
);

console.log('Remote video tracks:', 
  remoteStream.getVideoTracks().map(t => ({
    enabled: t.enabled,
    muted: t.muted,
    readyState: t.readyState
  }))
);
```

**Solutions:**
1. **Check camera permissions:**
   - Browser settings → Site permissions → Camera
   - Allow camera access

2. **Check if camera is in use:**
   - Close other apps using camera (Zoom, Teams, etc.)
   - Close other browser tabs with camera access

3. **Check video element:**
   ```javascript
   // Verify video element has stream
   const videoEl = document.querySelector('video');
   console.log('Video srcObject:', videoEl.srcObject);
   console.log('Video readyState:', videoEl.readyState);
   ```

4. **Try different camera:**
   ```javascript
   // List video input devices
   navigator.mediaDevices.enumerateDevices()
     .then(devices => {
       devices.filter(d => d.kind === 'videoinput')
         .forEach(d => console.log(d.label));
     });
   ```

### Issue 4: Call Doesn't Connect

**Symptoms:**
- Incoming call modal appears
- Accept call but nothing happens
- Call stays in "Connecting..." state

**Diagnosis:**
```javascript
// Check peer connection state
console.log('Connection state:', peerConnection.connectionState);
console.log('ICE connection state:', peerConnection.iceConnectionState);
console.log('Signaling state:', peerConnection.signalingState);

// Monitor state changes
peerConnection.onconnectionstatechange = () => {
  console.log('Connection state changed:', peerConnection.connectionState);
};

peerConnection.oniceconnectionstatechange = () => {
  console.log('ICE state changed:', peerConnection.iceConnectionState);
};
```

**Solutions:**
1. **Check ICE candidates:**
   ```javascript
   // Monitor ICE candidates
   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       console.log('📡 ICE Candidate:', event.candidate);
     } else {
       console.log('✅ All ICE candidates sent');
     }
   };
   ```

2. **Check STUN server:**
   ```javascript
   // Test STUN server connectivity
   const pc = new RTCPeerConnection({
     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
   });
   
   pc.createDataChannel('test');
   pc.createOffer().then(offer => pc.setLocalDescription(offer));
   
   pc.onicecandidate = (e) => {
     if (e.candidate) {
       console.log('✅ STUN server working:', e.candidate);
     }
   };
   ```

3. **Check firewall:**
   - Ensure ports are not blocked
   - Try disabling firewall temporarily

4. **Check network:**
   - Both devices on same WiFi
   - Stable internet connection
   - No VPN interfering

### Issue 5: ICE Candidate Errors

**Symptoms:**
- Console shows "Failed to add ICE candidate"
- Connection state stuck in "checking"

**Diagnosis:**
```javascript
// Check ICE gathering state
console.log('ICE gathering state:', peerConnection.iceGatheringState);

// Monitor ICE gathering
peerConnection.onicegatheringstatechange = () => {
  console.log('ICE gathering state:', peerConnection.iceGatheringState);
};
```

**Solutions:**
1. **Ensure offer/answer exchange completed:**
   ```javascript
   // Check remote description is set
   console.log('Remote description:', peerConnection.remoteDescription);
   ```

2. **Add ICE candidate only after remote description:**
   ```javascript
   // Store candidates if remote description not set
   const pendingCandidates = [];
   
   socket.on('call:ice-candidate', async ({ candidate }) => {
     if (peerConnection.remoteDescription) {
       await peerConnection.addIceCandidate(candidate);
     } else {
       pendingCandidates.push(candidate);
     }
   });
   ```

## 📊 WebRTC States Explained

### Connection States
- `new` - Initial state
- `connecting` - Attempting to connect
- `connected` - ✅ Connection established
- `disconnected` - Temporarily disconnected
- `failed` - ❌ Connection failed
- `closed` - Connection closed

### ICE Connection States
- `new` - ICE agent gathering addresses
- `checking` - ICE agent checking candidates
- `connected` - ✅ ICE agent found connection
- `completed` - ICE agent finished checking
- `failed` - ❌ ICE agent failed to find connection
- `disconnected` - ICE agent disconnected
- `closed` - ICE agent closed

### Signaling States
- `stable` - No offer/answer exchange in progress
- `have-local-offer` - Local offer set
- `have-remote-offer` - Remote offer set
- `have-local-pranswer` - Local provisional answer set
- `have-remote-pranswer` - Remote provisional answer set
- `closed` - Connection closed

## 🔬 Advanced Debugging

### Enable Verbose Logging
```javascript
// Add to ChatNew.jsx useEffect
console.log('🔧 WebRTC Debug Mode Enabled');

// Log all socket events
const originalEmit = socket.emit;
socket.emit = function(...args) {
  console.log('📤 Socket emit:', args[0], args[1]);
  return originalEmit.apply(this, args);
};

const originalOn = socket.on;
socket.on = function(event, handler) {
  return originalOn.call(this, event, (...args) => {
    console.log('📥 Socket receive:', event, args);
    return handler(...args);
  });
};
```

### Monitor Network Traffic
```javascript
// Open Chrome DevTools → Network tab
// Filter by "WS" (WebSocket) to see Socket.IO traffic
// Filter by "Media" to see WebRTC traffic
```

### Check WebRTC Stats
```javascript
// Get WebRTC statistics
setInterval(async () => {
  const stats = await peerConnection.getStats();
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      console.log('📊 Audio stats:', {
        packetsReceived: report.packetsReceived,
        packetsLost: report.packetsLost,
        jitter: report.jitter
      });
    }
  });
}, 5000);
```

## ✅ Verification Checklist

Before reporting issues:

- [ ] Sound files exist in `public/sounds/`
- [ ] Browser permissions granted (camera/microphone)
- [ ] No other apps using camera/microphone
- [ ] Both users online (green dot visible)
- [ ] Socket.IO connected (check console)
- [ ] No console errors
- [ ] Firewall allows connections
- [ ] Both devices on same WiFi (for local testing)
- [ ] Tried in different browser
- [ ] Cleared browser cache

## 🆘 Still Not Working?

### Collect Debug Information

1. **Browser Console Logs:**
   - Open DevTools (F12)
   - Copy all console logs
   - Look for errors (red text)

2. **Network Tab:**
   - Check WebSocket connection
   - Check API requests
   - Look for failed requests

3. **WebRTC Internals:**
   - Chrome: `chrome://webrtc-internals/`
   - Firefox: `about:webrtc`
   - Check ICE candidates
   - Check connection state

4. **Backend Logs:**
   - Check terminal running backend
   - Look for socket connection logs
   - Look for call signaling logs

### Report Issue With:
- Browser name and version
- Operating system
- Console error messages
- Network tab screenshots
- WebRTC internals data
- Steps to reproduce

## 📚 Resources

- [WebRTC Troubleshooting](https://webrtc.org/getting-started/troubleshooting)
- [Chrome WebRTC Internals](https://testrtc.com/webrtc-internals-parameters/)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO Debugging](https://socket.io/docs/v4/troubleshooting-connection-issues/)

---

**Remember:** Most issues are related to permissions, firewall, or network connectivity!
