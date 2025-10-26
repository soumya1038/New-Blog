# Call System Issues - Analysis & Fixes

## Issue 1: Status Border Disappearing on Reload
**Problem**: Status border uses frontend state `viewedStatuses` which resets on page reload
**Location**: ChatNew.jsx lines 1046-1052
**Fix**: Store viewed statuses in localStorage to persist across reloads

## Issue 2: Calls Only Work in /chat Route  
**Problem**: Call listeners only active when user is on /chat route
**Solution**: Move call listeners to App.js level so they work globally when user is online

## Issue 3: Video Calls Not Receiving
**Problem**: WebRTC offer/answer not being exchanged properly
**Location**: webrtc.js - missing offer/answer emission to socket
**Fix**: Add socket emissions for offer and answer in WebRTC service

## Issue 4: Mobile "Fail to Start Call"
**Root Causes**:
1. **HTTPS Required**: WebRTC getUserMedia requires HTTPS on mobile (not localhost)
2. **Permissions**: Mobile browsers need explicit permission prompts
3. **Camera in Use**: Need better cleanup of existing streams

**Solutions**:
1. Use ngrok or similar to get HTTPS URL for mobile testing
2. Add better error messages for permission denials
3. Improve stream cleanup before starting new calls

## Detailed Fixes:

### Fix 1: Persist Viewed Statuses
```javascript
// In ChatNew.jsx, add useEffect to load/save viewedStatuses
useEffect(() => {
  const saved = localStorage.getItem('viewedStatuses');
  if (saved) {
    setViewedStatuses(new Set(JSON.parse(saved)));
  }
}, []);

useEffect(() => {
  localStorage.setItem('viewedStatuses', JSON.stringify([...viewedStatuses]));
}, [viewedStatuses]);
```

### Fix 2: Global Call Listeners
Move call socket listeners from ChatNew.jsx to App.js so they work everywhere

### Fix 3: WebRTC Offer/Answer Exchange
```javascript
// In webrtc.js, after createOffer():
async createOffer(receiverId) {
  const offer = await this.peerConnection.createOffer();
  await this.peerConnection.setLocalDescription(offer);
  this.socket.emit('call:offer', { receiverId, offer });
  return offer;
}

// After createAnswer():
async createAnswer(callerId) {
  const answer = await this.peerConnection.createAnswer();
  await this.peerConnection.setLocalDescription(answer);
  this.socket.emit('call:answer', { callerId, answer });
  return answer;
}
```

### Fix 4: Mobile HTTPS Setup
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Use the HTTPS URL provided by ngrok on mobile
```

## Testing Checklist:
- [ ] Status borders persist after page reload
- [ ] Incoming call popup appears when user is NOT on /chat route
- [ ] Video calls connect successfully
- [ ] Audio calls connect successfully  
- [ ] Mobile calls work over HTTPS
- [ ] Proper error messages for permission denials
- [ ] Camera/mic cleanup works correctly
