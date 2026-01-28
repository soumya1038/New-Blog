# 🔄 Migration Guide: Integrating Refined Group Call System

## Quick Integration Steps

### Step 1: Update ChatNew.jsx (or your main chat component)

Replace old group call logic with the new context-based approach:

```javascript
import { useGroupCall } from '../context/GroupCallContext';
import ActiveGroupCallBanner from '../components/ActiveGroupCallBanner';
import GroupCallRoom from '../components/GroupCallRoom';

function ChatNew() {
  const { 
    currentCall, 
    isMinimized, 
    activeCallsByGroup, 
    startCall, 
    joinActiveCall, 
    endCall, 
    toggleMinimize,
    fetchActiveCall 
  } = useGroupCall();
  
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Fetch active call when group is selected
  useEffect(() => {
    if (selectedGroup?._id) {
      fetchActiveCall(selectedGroup._id);
    }
  }, [selectedGroup, fetchActiveCall]);
  
  // Get active call for current group
  const activeCall = selectedGroup ? activeCallsByGroup[selectedGroup._id] : null;
  
  // Show call room if in call and not minimized
  if (currentCall && !isMinimized && currentCall.groupId === selectedGroup?._id) {
    return (
      <GroupCallRoom
        roomName={currentCall.roomName}
        groupId={currentCall.groupId}
        callType={currentCall.callType}
        onLeave={endCall}
        onMinimize={toggleMinimize}
      />
    );
  }
  
  return (
    <div className="chat-container">
      {/* Group Chat Header */}
      <div className="chat-header">
        <h2>{selectedGroup?.name}</h2>
        <button onClick={() => startCall(selectedGroup._id, selectedGroup.name, 'video')}>
          Start Video Call
        </button>
        <button onClick={() => startCall(selectedGroup._id, selectedGroup.name, 'audio')}>
          Start Audio Call
        </button>
      </div>
      
      {/* Active Call Banner */}
      {activeCall && (
        <ActiveGroupCallBanner
          participantCount={activeCall.participants?.length || 0}
          callType={activeCall.callType}
          participants={activeCall.participants}
          onJoin={() => joinActiveCall(selectedGroup._id)}
        />
      )}
      
      {/* Chat Messages */}
      <div className="messages">
        {/* Your existing message rendering */}
      </div>
    </div>
  );
}
```

### Step 2: Remove Old Components (Optional)

You can safely remove these if not used elsewhere:
- `FloatingGroupCallBanner.jsx` (replaced by MinimizedGroupCall)
- Old group call state management code
- `GroupCallInvitation.jsx` (if exists, replaced by modal)

### Step 3: Update Message Rendering for Call History

```javascript
function MessageItem({ message }) {
  if (message.type === 'groupcall') {
    const { callData } = message;
    return (
      <div className="call-history-message">
        <div className="call-icon">
          {callData.callType === 'video' ? '📹' : '🎵'}
        </div>
        <div className="call-info">
          <p className="call-title">{message.content}</p>
          <p className="call-duration">Duration: {callData.durationText}</p>
          <div className="call-participants">
            {callData.joinedUsers.map(user => (
              <img 
                key={user._id}
                src={user.profileImage || `https://ui-avatars.com/api/?name=${user.fullName}`}
                alt={user.fullName}
                title={user.fullName}
                className="participant-avatar"
              />
            ))}
            <span>{callData.joinedCount} {callData.joinedCount === 1 ? 'person' : 'people'}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Regular message rendering
  return <div>{message.content}</div>;
}
```

### Step 4: Add Styles for Call History

```css
.call-history-message {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin: 8px 0;
  color: white;
}

.call-icon {
  font-size: 32px;
  display: flex;
  align-items: center;
}

.call-info {
  flex: 1;
}

.call-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.call-duration {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.call-participants {
  display: flex;
  align-items: center;
  gap: 8px;
}

.participant-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid white;
  margin-left: -8px;
}

.participant-avatar:first-child {
  margin-left: 0;
}
```

---

## Testing Your Integration

### 1. Start a Call
- Open group chat
- Click "Start Video Call"
- Verify invitation appears for other users

### 2. Join a Call
- Accept invitation
- Verify you enter the call room
- Check video/audio working

### 3. Minimize Call
- Click minimize button
- Navigate to different page
- Verify minimized window appears
- Verify you can still hear audio

### 4. Maximize Call
- Click on minimized window
- Navigate back to chat
- Verify call room appears

### 5. Leave Call
- Click leave button
- Verify call history message appears in chat
- Check duration and participants are correct

### 6. Call Switching
- Join a call in Group A
- Receive invitation from Group B
- Accept invitation
- Verify warning appears
- Verify you leave Group A and join Group B

---

## Common Issues & Solutions

### Issue: Invitation not appearing
**Solution:** Check socket connection
```javascript
console.log('Socket connected:', socketService.socket?.connected);
```

### Issue: Can't join call
**Solution:** Verify LiveKit credentials in backend `.env`

### Issue: No audio/video
**Solution:** Check browser permissions
```javascript
navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  .then(() => console.log('Permissions granted'))
  .catch(err => console.error('Permission denied:', err));
```

### Issue: Minimized call not draggable on mobile
**Solution:** Ensure touch events are enabled (already implemented)

### Issue: Call history not showing
**Solution:** Check message type rendering in your chat component

---

## Performance Tips

1. **Lazy load call components:**
```javascript
const GroupCallRoom = lazy(() => import('./components/GroupCallRoom'));
```

2. **Memoize expensive computations:**
```javascript
const activeCall = useMemo(
  () => activeCallsByGroup[selectedGroup?._id],
  [activeCallsByGroup, selectedGroup]
);
```

3. **Debounce participant updates:**
```javascript
const debouncedFetchActiveCall = useMemo(
  () => debounce(fetchActiveCall, 500),
  [fetchActiveCall]
);
```

---

## Next Steps

1. ✅ Test all features thoroughly
2. ✅ Add analytics tracking for calls
3. ✅ Implement call recording (optional)
4. ✅ Add call quality indicators
5. ✅ Implement background blur for video
6. ✅ Add virtual backgrounds (optional)

---

## Support

If you encounter any issues:
1. Check browser console for errors
2. Verify backend logs for socket events
3. Test LiveKit connection with `npm run check-livekit`
4. Review the main documentation: `GROUP_CALL_REFINED_IMPLEMENTATION.md`

**Happy calling! 🎉**
