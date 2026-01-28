# 🚀 Group Call System - Quick Start Guide

Get your group call system up and running in **5 minutes**!

---

## ⚡ Prerequisites

- Node.js 14+
- MongoDB running
- LiveKit Cloud account (free at https://cloud.livekit.io)

---

## 📦 Installation

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install livekit-server-sdk

# Frontend
cd frontend
npm install @livekit/components-react livekit-client
```

### 2. Configure LiveKit

**Get your credentials:**
1. Go to https://cloud.livekit.io
2. Create a new project
3. Copy API Key, API Secret, and WebSocket URL

**Add to backend `.env`:**
```env
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
```

### 3. Verify Setup

```bash
cd backend
npm run check-livekit
```

You should see: ✅ LiveKit configuration is valid

---

## 🎯 Basic Usage

### Start a Call

```javascript
import { useGroupCall } from '../context/GroupCallContext';

function GroupHeader({ group }) {
  const { startCall } = useGroupCall();
  
  return (
    <button onClick={() => startCall(group._id, group.name, 'video')}>
      📹 Start Video Call
    </button>
  );
}
```

### Show Active Call Banner

```javascript
import { useGroupCall } from '../context/GroupCallContext';
import ActiveGroupCallBanner from '../components/ActiveGroupCallBanner';

function GroupChat({ group }) {
  const { activeCallsByGroup, joinActiveCall } = useGroupCall();
  const activeCall = activeCallsByGroup[group._id];
  
  return (
    <>
      {activeCall && (
        <ActiveGroupCallBanner
          participantCount={activeCall.participants?.length || 0}
          callType={activeCall.callType}
          participants={activeCall.participants}
          onJoin={() => joinActiveCall(group._id)}
        />
      )}
      {/* Your chat UI */}
    </>
  );
}
```

### Display Call Room

```javascript
import { useGroupCall } from '../context/GroupCallContext';
import GroupCallRoom from '../components/GroupCallRoom';

function CallView() {
  const { currentCall, isMinimized, endCall, toggleMinimize } = useGroupCall();
  
  if (!currentCall || isMinimized) return null;
  
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
```

---

## 🎨 Styling (Optional)

Add these animations to your CSS:

```css
@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-slideDown {
  animation: slideDown 0.3s ease-out;
}

.animate-slideUp {
  animation: slideUp 0.3s ease-out;
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
```

---

## 🧪 Test It!

### Test Flow:

1. **Open two browser windows** (or use incognito)
2. **Login as different users** in each window
3. **Join the same group** in both windows
4. **Window 1:** Click "Start Video Call"
5. **Window 2:** Accept the invitation
6. **Both:** You should now be in a call together!

### Test Features:

- ✅ Toggle mic/camera
- ✅ Share screen
- ✅ Minimize call
- ✅ Navigate to different pages (call persists)
- ✅ Maximize call
- ✅ Leave call
- ✅ Check call history in chat

---

## 🐛 Troubleshooting

### Issue: "LiveKit not configured"
**Solution:** Check your `.env` file has all three variables

### Issue: "Failed to join call"
**Solution:** 
```bash
# Test your LiveKit connection
curl -X POST https://your-project.livekit.cloud \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Issue: "No audio/video"
**Solution:** Check browser permissions
```javascript
// In browser console
navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  .then(() => console.log('✅ Permissions OK'))
  .catch(err => console.error('❌ Permission denied:', err));
```

### Issue: "Invitation not appearing"
**Solution:** Check socket connection
```javascript
// In browser console
socketService.socket.connected  // Should be true
```

---

## 📱 Mobile Testing

### Test on Real Device:

1. **Find your local IP:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. **Update frontend to use IP:**
   ```javascript
   // In .env or config
   REACT_APP_API_URL=http://YOUR_IP:5000
   ```

3. **Access from mobile:**
   ```
   http://YOUR_IP:3000
   ```

4. **Test drag on mobile:**
   - Minimize call
   - Touch and drag the window
   - Should move smoothly

---

## 🎯 Next Steps

1. ✅ **Read full documentation:** `GROUP_CALL_REFINED_IMPLEMENTATION.md`
2. ✅ **Follow migration guide:** `GROUP_CALL_MIGRATION_GUIDE.md`
3. ✅ **Review summary:** `GROUP_CALL_REFINEMENT_SUMMARY.md`
4. ✅ **Customize UI** to match your design
5. ✅ **Add analytics** tracking
6. ✅ **Deploy to production**

---

## 🔗 Useful Links

- **LiveKit Docs:** https://docs.livekit.io
- **React Components:** https://docs.livekit.io/client-sdk-js/react/
- **Server SDK:** https://docs.livekit.io/server-sdk-js/
- **WebRTC Guide:** https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API

---

## 💡 Pro Tips

### Tip 1: Use Environment-Specific URLs
```javascript
const wsUrl = process.env.NODE_ENV === 'production'
  ? 'wss://your-production.livekit.cloud'
  : 'wss://your-dev.livekit.cloud';
```

### Tip 2: Add Loading States
```javascript
const { currentCall, isLoading } = useGroupCall();

if (isLoading) {
  return <LoadingSpinner />;
}
```

### Tip 3: Handle Errors Gracefully
```javascript
try {
  await startCall(groupId, groupName, 'video');
} catch (error) {
  toast.error('Failed to start call. Please try again.');
}
```

### Tip 4: Add Keyboard Shortcuts
```javascript
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === 'm' && currentCall) {
      toggleMic();
    }
    if (e.key === 'v' && currentCall) {
      toggleVideo();
    }
  };
  
  window.addEventListener('keypress', handleKeyPress);
  return () => window.removeEventListener('keypress', handleKeyPress);
}, [currentCall]);
```

---

## 🎉 You're Ready!

Your group call system is now fully functional. Start building amazing real-time experiences!

**Need help?** Check the comprehensive documentation or review the code examples.

**Happy coding! 🚀**

---

## 📊 Quick Reference

| Action | Hook | Method |
|--------|------|--------|
| Start call | `useGroupCall()` | `startCall(groupId, name, type)` |
| Join call | `useGroupCall()` | `joinActiveCall(groupId)` |
| Leave call | `useGroupCall()` | `endCall()` |
| Minimize | `useGroupCall()` | `toggleMinimize()` |
| Accept invitation | `useGroupCall()` | `acceptInvitation()` |
| Decline invitation | `useGroupCall()` | `declineInvitation()` |
| Get active call | `useGroupCall()` | `activeCallsByGroup[groupId]` |
| Check if in call | `useGroupCall()` | `currentCall !== null` |

---

**Built with ❤️ for developers**
