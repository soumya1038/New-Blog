# One-to-One Audio/Video Calls - Complete Analysis

## Overview
The application implements WebRTC-based peer-to-peer audio and video calling between users with Socket.IO for signaling.

---

## Architecture Components

### 1. Frontend Services

#### **WebRTC Service** (`frontend/src/services/webrtc.js`)
Singleton service managing WebRTC peer connections.

**Key Properties:**
- `peerConnection`: RTCPeerConnection instance
- `localStream`: User's camera/microphone stream
- `remoteStream`: Remote user's stream
- `configuration`: ICE servers (STUN/TURN)
- `_remoteCandidateQueue`: Queue for ICE candidates received before peer connection exists

**ICE Servers:**
```javascript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
// Optional TURN server from env vars
```

**Core Methods:**

1. **startCall(withVideo)**
   - Requests user media (audio + optional video)
   - Constraints: echo cancellation, noise suppression, auto gain control
   - Video: 1280x720, front camera
   - Returns local stream

2. **createOffer(receiverId)**
   - Creates RTCPeerConnection
   - Sets up ontrack handler (receives remote stream)
   - Sets up onicecandidate handler
   - Adds local tracks to peer connection
   - Creates SDP offer
   - Emits `call:offer` via socket
   - Processes queued ICE candidates

3. **handleOffer(offer, callerId)**
   - Creates RTCPeerConnection
   - Sets up ontrack handler
   - Adds local tracks
   - Sets remote description from offer
   - Processes queued ICE candidates

4. **createAnswer(callerId)**
   - Creates SDP answer
   - Sets local description
   - Emits `call:answer` via socket

5. **handleAnswer(answer)**
   - Sets remote description from answer

6. **handleIceCandidate(candidate)**
   - Adds ICE candidate to peer connection
   - Queues if peer connection not ready

7. **toggleAudio()** / **toggleVideo()**
   - Enables/disables tracks

8. **endCall()**
   - Stops all local tracks
   - Closes peer connection
   - Clears streams and candidate queue

#### **Socket Service** (`frontend/src/services/socket.js`)
Manages Socket.IO connection.

**Features:**
- Auto-reconnection
- User online status
- Route tracking
- Transports: websocket, polling

#### **Call State Manager** (`frontend/src/utils/callStateManager.js`)
Persists call state across page reloads.

**Functions:**
- `saveCallState(callState)`: Saves to localStorage with timestamp
- `getCallState(type)`: Retrieves state (expires after 2 hours)
- `clearCallState(type)`: Removes from localStorage
- `updateCallState(updates, type)`: Updates existing state
- `hasActiveCall()`: Checks for active calls

---

### 2. Backend Components

#### **Socket Handler** (`backend/socket/chatSocket.js`)
Manages WebRTC signaling and call events.

**Call Events:**

1. **call:initiate**
   ```javascript
   { receiverId, type, callLogId }
   ```
   - Validates caller authentication
   - Checks if receiver is online
   - Fetches caller details
   - Emits `call:incoming` to receiver

2. **call:accept**
   ```javascript
   { callerId }
   ```
   - Emits `call:accepted` to caller

3. **call:reject**
   ```javascript
   { callerId }
   ```
   - Emits `call:rejected` to caller

4. **call:end**
   ```javascript
   { userId }
   ```
   - Emits `call:ended` to other user

5. **call:offer**
   ```javascript
   { receiverId, offer }
   ```
   - Forwards SDP offer to receiver

6. **call:answer**
   ```javascript
   { callerId, answer }
   ```
   - Forwards SDP answer to caller

7. **call:ice-candidate**
   ```javascript
   { receiverId, candidate }
   ```
   - Forwards ICE candidate to peer

#### **Call Controller** (`backend/controllers/callController.js`)

**Endpoints:**

1. **GET /calls/history/:userId**
   - Returns last 3 calls between users
   - Sorted by date (newest first)
   - Populates caller/receiver details

2. **POST /calls/log**
   - Creates new call log
   - Body: `{ receiverId, type }`
   - Returns call log with ID

3. **PUT /calls/log/:callLogId**
   - Updates call log (status, duration, endedAt)
   - Body: `{ status, duration, endedAt }`

4. **DELETE /calls/log/:callLogId**
   - Deletes individual call log
   - Validates user is participant

#### **Call Log Model** (`backend/models/CallLog.js`)

**Schema:**
```javascript
{
  caller: ObjectId (ref: User),
  receiver: ObjectId (ref: User),
  type: 'audio' | 'video',
  status: 'completed' | 'missed' | 'rejected' | 'failed',
  duration: Number (seconds),
  startedAt: Date,
  endedAt: Date,
  timestamps: true
}
```

**Indexes:**
- Compound: `{ caller, receiver, createdAt }`
- TTL: Auto-delete after 24 hours

---

### 3. UI Components

#### **IncomingCallModal** (`frontend/src/components/IncomingCallModal.jsx`)
Modal displayed when receiving a call.

**Props:**
- `caller`: Caller user object
- `callType`: 'audio' | 'video'
- `onAccept`: Accept callback
- `onReject`: Reject callback

**Features:**
- Profile image
- Call type indicator
- Accept/Reject buttons
- Pulsing animation

#### **ActiveCallScreen** (`frontend/src/components/ActiveCallScreen.jsx`)
Full-screen call interface.

**Props:**
- `remoteUser`: Remote user details
- `callType`: 'audio' | 'video'
- `isMinimized`: Minimized state
- `isAudioEnabled`: Mic state
- `isVideoEnabled`: Camera state
- `startTime`: Call start timestamp
- `callAccepted`: Connection status
- `localStream`: Local media stream
- `remoteStream`: Remote media stream
- Callbacks: onToggleMinimize, onToggleAudio, onToggleVideo, onEndCall

**Features:**
- Video preview (swappable main/small)
- Audio-only mode with avatar
- Call duration timer
- Camera rotation (front/back)
- Minimized mode
- Responsive controls

**Video Elements:**
- Main video (remote or local when swapped)
- Small video (local or remote when swapped)
- Hidden audio element (always plays remote audio)

#### **FloatingCallBanner** (`frontend/src/components/FloatingCallBanner.jsx`)
Draggable banner shown when navigating away from chat during call.

**Props:**
- `remoteUser`: Remote user details
- `callType`: 'audio' | 'video'
- `startTime`: Call start time
- `remoteStream`: Remote stream
- `isAudioEnabled`: Mic state
- Callbacks: onOpen, onEnd, onToggleAudio, onRotateCamera

**Features:**
- Draggable positioning
- Video preview (for video calls)
- Duration display
- Quick controls (mute, rotate, expand, end)
- Picture-in-Picture support
- Pulsing indicator

#### **CallHistoryModal** (`frontend/src/components/CallHistoryModal.jsx`)
Displays recent call history with user.

**Features:**
- Last 3 calls
- Call type icons
- Duration display
- Call back button
- Delete individual logs

---

## Call Flow

### Initiating a Call (Caller Side)

**Step 1: User clicks call button**
```javascript
initiateCall('audio' | 'video')
```

**Step 2: Create call log**
```javascript
POST /calls/log { receiverId, type }
```

**Step 3: Get local media**
```javascript
webrtcService.startCall(callType === 'video')
// Requests camera/mic permissions
```

**Step 4: Emit call initiation**
```javascript
socket.emit('call:initiate', { receiverId, type, callLogId })
```

**Step 5: Create and send offer**
```javascript
webrtcService.createOffer(receiverId)
// Creates peer connection
// Generates SDP offer
// Emits call:offer
```

**Step 6: Play ring sound**
```javascript
soundManager.play('callRing')
```

**Step 7: Set active call state**
```javascript
setActiveCall({
  userId, userName, userAvatar, callType,
  stream: localStream,
  callAccepted: false,
  startTime: null
})
```

### Receiving a Call (Receiver Side)

**Step 1: Receive call:incoming event**
```javascript
socket.on('call:incoming', { callerId, caller, callType, callLogId })
```

**Step 2: Show incoming call modal**
```javascript
setIncomingCall({ callerId, caller, callType, callLogId })
soundManager.play('incomingCall')
```

**Step 3: User accepts call**
```javascript
handleAcceptCall()
```

**Step 4: Get local media**
```javascript
webrtcService.startCall(callType === 'video')
```

**Step 5: Process pending offer**
```javascript
webrtcService.handleOffer(offer, callerId)
```

**Step 6: Create and send answer**
```javascript
webrtcService.createAnswer(callerId)
// Emits call:answer
```

**Step 7: Emit acceptance**
```javascript
socket.emit('call:accept', { callerId })
```

**Step 8: Set active call with timer**
```javascript
setActiveCall({
  userId: callerId,
  userName, userAvatar, callType,
  stream: localStream,
  remoteStream: null,
  callAccepted: true,
  startTime: Date.now()
})
```

### Establishing Connection

**Step 1: Caller receives call:accepted**
```javascript
socket.on('call:accepted', { receiverId })
// Starts call timer
setActiveCall(prev => ({ ...prev, startTime: Date.now(), callAccepted: true }))
```

**Step 2: Caller receives call:answer**
```javascript
socket.on('call:answer', { answer })
webrtcService.handleAnswer(answer)
// Sets remote description
```

**Step 3: ICE candidate exchange**
```javascript
// Both peers exchange ICE candidates
socket.on('call:ice-candidate', { candidate })
webrtcService.handleIceCandidate(candidate)
```

**Step 4: Remote stream received**
```javascript
peerConnection.ontrack = (event) => {
  remoteStream = event.streams[0]
  onRemoteStreamCallback(remoteStream)
}
// Updates activeCall with remoteStream
```

**Step 5: Connection established**
- ICE connection state: 'connected'
- Audio/video flowing between peers

### Ending a Call

**Step 1: User clicks end button**
```javascript
handleEndCall()
```

**Step 2: Emit call:end**
```javascript
socket.emit('call:end', { userId: remoteUserId })
```

**Step 3: Update call log**
```javascript
PUT /calls/log/:callLogId
{ status: 'completed', duration, endedAt }
```

**Step 4: Clean up WebRTC**
```javascript
webrtcService.endCall()
// Stops tracks
// Closes peer connection
```

**Step 5: Play end sound**
```javascript
soundManager.play('endCall')
```

**Step 6: Clear state**
```javascript
setActiveCall(null)
clearCallState('one-to-one')
```

**Step 7: Remote user receives call:ended**
```javascript
socket.on('call:ended')
// Performs same cleanup
```

---

## State Management

### Call States in ChatNew.jsx

```javascript
const [incomingCall, setIncomingCall] = useState(null)
// { callerId, caller, callType, callLogId }

const [activeCall, setActiveCall] = useState(null)
// {
//   userId, userName, userAvatar, callType,
//   stream, remoteStream,
//   callAccepted, startTime
// }

const [isCallMinimized, setIsCallMinimized] = useState(false)
const [isAudioEnabled, setIsAudioEnabled] = useState(true)
const [isVideoEnabled, setIsVideoEnabled] = useState(true)
```

### Global State in App.js

```javascript
const [globalIncomingCall, setGlobalIncomingCall] = useState(null)
// Shows modal when user is outside /chat

const [globalCallState, setGlobalCallState] = useState(null)
// Shows floating banner when navigating away during call
```

### Persistence

**localStorage keys:**
- `active_call_state`: One-to-one call state
- Expires after 2 hours
- Restored on page reload

**Saved data:**
```javascript
{
  type: 'one-to-one',
  remoteUser: { id, fullName, profileImage },
  callType: 'audio' | 'video',
  startTime: timestamp,
  callAccepted: boolean,
  isAudioEnabled: boolean,
  timestamp: Date.now()
}
```

---

## Sound Effects

**Sounds used:**
- `incomingCall`: Plays when receiving call
- `callRing`: Plays when initiating call (waiting for answer)
- `endCall`: Plays when call ends
- `sendMsg`: Message sent confirmation
- `receiveMsg`: Message received notification

**Sound Manager:**
- Manages audio playback
- Prevents overlapping sounds
- Stops sounds on call events

---

## Key Features

### 1. Call Persistence
- Calls survive page reloads
- State saved to localStorage
- Streams maintained in WebRTC service
- Floating banner shows on other pages

### 2. Global Call Handling
- Incoming calls shown anywhere in app
- Accept redirects to /chat
- Active calls accessible from any page
- Floating banner with quick controls

### 3. Media Controls
- Toggle audio (mute/unmute)
- Toggle video (camera on/off)
- Rotate camera (front/back)
- Minimize/maximize call screen
- Swap video positions

### 4. Call History
- Last 3 calls with each user
- Stored for 24 hours (TTL index)
- Call back functionality
- Delete individual logs

### 5. Connection Quality
- ICE candidate exchange
- STUN servers for NAT traversal
- Optional TURN server support
- Connection state monitoring

### 6. User Experience
- Real-time duration display
- Connection status indicators
- Smooth animations
- Responsive design
- Picture-in-Picture support

---

## Error Handling

### Permission Errors
```javascript
try {
  stream = await navigator.mediaDevices.getUserMedia(constraints)
} catch (error) {
  // Shows error modal
  // Cleans up call state
}
```

### Connection Errors
```javascript
socket.on('call:error', ({ error }) => {
  soundManager.stop('callRing')
  showAlertModal('Call Error', error)
  setActiveCall(null)
})
```

### Offline Users
```javascript
// Backend checks if receiver is online
if (!receiverData) {
  socket.emit('call:error', { error: 'User is offline' })
}
```

### Call Rejection
```javascript
socket.on('call:rejected', () => {
  soundManager.play('endCall')
  webrtcService.endCall()
  showAlertModal('Call Rejected', 'The user rejected your call')
})
```

---

## Security Considerations

1. **Authentication**: All socket events validate `socket.userId`
2. **Authorization**: Call logs verify user is participant
3. **Encryption**: WebRTC uses DTLS-SRTP for media encryption
4. **Privacy**: Call logs auto-delete after 24 hours
5. **Validation**: Backend validates all call events

---

## Performance Optimizations

1. **ICE Candidate Queueing**: Candidates queued if peer connection not ready
2. **Stream Reuse**: Streams maintained across navigation
3. **Lazy Loading**: Components loaded on demand
4. **Debouncing**: Typing indicators debounced
5. **Efficient Re-renders**: React refs for frequently accessed values

---

## Browser Compatibility

**Required APIs:**
- WebRTC (RTCPeerConnection)
- getUserMedia
- Socket.IO
- localStorage
- Picture-in-Picture (optional)

**Supported Browsers:**
- Chrome 74+
- Firefox 66+
- Safari 12.1+
- Edge 79+

---

## Environment Variables

**Frontend (.env):**
```
REACT_APP_TURN_URL=turn.example.com
REACT_APP_TURN_USERNAME=username
REACT_APP_TURN_PASSWORD=password
```

**Backend (.env):**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/modern-blog
JWT_SECRET=your-secret-key
```

---

## Testing Checklist

- [ ] Audio call initiation
- [ ] Video call initiation
- [ ] Call acceptance
- [ ] Call rejection
- [ ] Call ending (both sides)
- [ ] Mute/unmute audio
- [ ] Enable/disable video
- [ ] Camera rotation
- [ ] Minimize/maximize
- [ ] Page reload during call
- [ ] Navigation during call
- [ ] Floating banner controls
- [ ] Call history display
- [ ] Call back functionality
- [ ] Offline user handling
- [ ] Permission denied handling
- [ ] Network disconnection
- [ ] Multiple browser tabs

---

## Future Enhancements

1. **Screen Sharing**: Share screen during calls
2. **Call Recording**: Record audio/video calls
3. **Call Transfer**: Transfer calls to another user
4. **Conference Calls**: Multi-party calls (already implemented with LiveKit)
5. **Call Quality Indicators**: Show connection quality
6. **Bandwidth Adaptation**: Adjust quality based on network
7. **Call Waiting**: Handle multiple incoming calls
8. **Voicemail**: Leave voice messages when user unavailable
