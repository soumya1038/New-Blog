# 🎥 LiveKit Group Video Calls - Complete Setup

## What is LiveKit?

LiveKit is a real-time video/audio infrastructure that enables group video calls in your blog application. It's free for up to 10,000 participant minutes per month.

## ✨ Features

- 📹 **Group Video Calls** - Multiple users can join the same call
- 🎤 **Audio Calls** - Voice-only option available
- 🖥️ **Screen Sharing** - Share your screen with participants
- 💬 **Chat Integration** - Seamlessly integrated with your existing chat
- 🔒 **Secure** - Token-based authentication
- 🌐 **WebRTC** - Low latency, high quality

## 🚀 Quick Setup (5 minutes)

### Step 1: Get LiveKit Credentials

1. Visit **https://cloud.livekit.io**
2. Click "Sign Up" (free account)
3. Create a new project (e.g., "My Blog Calls")
4. Go to "Settings" → "Keys"
5. Copy these three values:
   - **API Key** (starts with `API`)
   - **API Secret** (long string)
   - **WebSocket URL** (starts with `wss://`)

### Step 2: Configure Backend

1. Open `backend/.env`
2. Replace the placeholder values:

```env
# Before (placeholders)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-project.livekit.cloud

# After (your actual credentials)
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_actual_secret_here
LIVEKIT_WS_URL=wss://your-project-name.livekit.cloud
```

3. Save the file

### Step 3: Verify Configuration

Run this command in the backend directory:

```bash
cd backend
npm run check-livekit
```

You should see:
```
✅ LIVEKIT_API_KEY: Configured
✅ LIVEKIT_API_SECRET: Configured
✅ LIVEKIT_WS_URL: Configured
```

### Step 4: Restart Backend

```bash
npm run dev
```

### Step 5: Test Group Calls

1. Open your frontend (http://localhost:3000)
2. Navigate to Chat
3. Create or open a group chat
4. Click the **video camera icon** in the group header
5. You'll join the call room
6. Open another browser/device and join the same group
7. Click "Join Call" to test multi-user calling

## 📱 How to Use

### Starting a Group Call

1. Open any group chat
2. Click the video icon (📹) in the header
3. You'll enter the call room
4. Other group members will see a notification
5. They can click "Join Call" to participate

### During a Call

- **Mute/Unmute**: Click microphone icon
- **Video On/Off**: Click camera icon
- **Screen Share**: Click screen icon
- **Leave Call**: Click red phone icon

### Call Controls

| Button | Action |
|--------|--------|
| 🎤 | Toggle microphone |
| 📹 | Toggle camera |
| 🖥️ | Share screen |
| 📞 | End call |

## 🔧 Technical Details

### Backend API

**Endpoint**: `POST /api/livekit/token`

**Request**:
```json
{
  "roomName": "group-123abc",
  "participantName": "John Doe"
}
```

**Response**:
```json
{
  "token": "eyJhbGc...",
  "wsUrl": "wss://your-project.livekit.cloud"
}
```

### Frontend Component

**Component**: `GroupCallRoom.jsx`

**Props**:
- `roomName`: Unique room identifier (format: `group-{groupId}`)
- `participantName`: Display name of the user
- `onLeave`: Callback when user leaves the call

### Room Naming Convention

- Group calls: `group-{groupId}`
- Example: `group-507f1f77bcf86cd799439011`

## 🐛 Troubleshooting

### "Failed to join call"

**Cause**: Invalid or missing LiveKit credentials

**Solution**:
1. Run `npm run check-livekit` in backend
2. Verify all three credentials are set correctly
3. Restart backend server

### "Camera/Microphone access denied"

**Cause**: Browser permissions not granted

**Solution**:
1. Click the camera icon in browser address bar
2. Allow camera and microphone access
3. Refresh the page

### "Cannot connect to call"

**Cause**: Network/firewall issues

**Solution**:
1. Ensure you're using HTTPS (or localhost)
2. Check if ports 443 and 80 are open
3. Try disabling VPN/firewall temporarily

### "No video/audio from other participants"

**Cause**: WebRTC connection issues

**Solution**:
1. Check browser console for errors
2. Ensure both users have granted permissions
3. Try refreshing both browsers
4. Check LiveKit dashboard for connection logs

## 📊 LiveKit Free Tier

| Feature | Limit |
|---------|-------|
| Participant Minutes | 10,000/month |
| Concurrent Participants | Up to 100 |
| Rooms | Unlimited |
| Recording | Not included |
| Support | Community |

**Example Usage**:
- 10 users × 10 minutes = 100 participant minutes
- 5 users × 30 minutes = 150 participant minutes
- 2 users × 60 minutes = 120 participant minutes

## 🔐 Security

- ✅ Token-based authentication
- ✅ Tokens expire after use
- ✅ Only group members can join
- ✅ Backend validates all requests
- ✅ No credentials exposed to frontend

## 📚 Additional Resources

- **LiveKit Docs**: https://docs.livekit.io
- **LiveKit Dashboard**: https://cloud.livekit.io
- **Support**: https://livekit.io/support
- **GitHub**: https://github.com/livekit

## 🎯 Next Steps

After setup, you can:

1. **Customize UI**: Edit `GroupCallRoom.jsx` for custom styling
2. **Add Features**: Implement recording, chat during calls
3. **Analytics**: Track call duration and usage
4. **Notifications**: Send push notifications for incoming calls
5. **Mobile**: Test on mobile browsers

## 💡 Tips

- Test with 2-3 users first
- Use headphones to avoid echo
- Good internet connection recommended (1+ Mbps)
- Chrome/Firefox work best
- Mobile Safari requires HTTPS

## ❓ FAQ

**Q: Is LiveKit free?**
A: Yes, up to 10,000 participant minutes/month.

**Q: Can I record calls?**
A: Recording requires a paid plan or custom implementation.

**Q: How many users can join?**
A: Up to 100 concurrent participants on free tier.

**Q: Does it work on mobile?**
A: Yes, on modern mobile browsers (requires HTTPS).

**Q: Can I self-host LiveKit?**
A: Yes, LiveKit is open source and can be self-hosted.

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Run `npm run check-livekit` to verify setup
3. Check browser console for errors
4. Review LiveKit dashboard logs
5. Open an issue on GitHub

---

**Setup Complete!** 🎉

You now have fully functional group video calls in your blog application.
