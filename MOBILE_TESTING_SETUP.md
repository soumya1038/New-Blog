# 📱 Mobile Testing Setup Guide

## 🎯 Testing WebRTC Calls Between Laptop and Mobile

This guide helps you test the call feature using your laptop and mobile phone on the same WiFi network.

## ✅ What Was Configured

### Backend (.env)
```
FRONTEND_URL=http://192.168.0.101:3000
```
- Backend allows connections from your local IP

### Frontend (.env)
```
REACT_APP_API_URL=http://192.168.0.101:5000
HOST=0.0.0.0
```
- Frontend connects to backend via local IP
- Frontend accessible from any device on network

### Server Configuration
- Backend listens on `0.0.0.0:5000` (all network interfaces)
- Socket.IO configured for cross-origin requests
- CORS enabled for local IP addresses

## 🚀 Setup Instructions

### Step 1: Find Your Local IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.0.101`)

**On Mac/Linux:**
```bash
ifconfig | grep "inet "
```
or
```bash
ip addr show
```

**Current IP in config:** `192.168.0.101`

### Step 2: Update Configuration (If IP Changed)

If your IP is different, update these files:

**backend/.env:**
```
FRONTEND_URL=http://YOUR_IP:3000
```

**frontend/.env:**
```
REACT_APP_API_URL=http://YOUR_IP:5000
HOST=0.0.0.0
```

### Step 3: Start Backend

```bash
cd backend
npm run dev
```

**Verify backend is running:**
- Open browser: `http://192.168.0.101:5000`
- Should see: "✅ Server is running!"
- Test API: `http://192.168.0.101:5000/api/test`

### Step 4: Start Frontend

```bash
cd frontend
npm start
```

**Frontend will be accessible at:**
- Laptop: `http://localhost:3000` or `http://192.168.0.101:3000`
- Mobile: `http://192.168.0.101:3000`

### Step 5: Connect Mobile Device

**Requirements:**
- Mobile phone on same WiFi network as laptop
- Modern browser (Chrome, Safari, Firefox)

**On your mobile phone:**
1. Open browser (Chrome recommended)
2. Navigate to: `http://192.168.0.101:3000`
3. You should see the blog application
4. Register/Login with a test account

## 🧪 Testing the Call Feature

### Scenario 1: Laptop Calls Mobile

**On Laptop:**
1. Login as User A
2. Navigate to `/chat`
3. Search for User B (mobile user)
4. Click phone or video icon

**On Mobile:**
1. Login as User B
2. Navigate to `/chat`
3. Incoming call modal appears
4. Accept the call
5. Grant camera/microphone permissions

### Scenario 2: Mobile Calls Laptop

**On Mobile:**
1. Login as User A
2. Navigate to `/chat`
3. Search for User B (laptop user)
4. Click phone or video icon
5. Grant permissions if prompted

**On Laptop:**
1. Login as User B
2. Navigate to `/chat`
3. Incoming call modal appears
4. Accept the call

## 🔧 Troubleshooting

### Problem: "Cannot connect to backend"

**Check:**
1. Both devices on same WiFi network
2. Backend is running: `http://192.168.0.101:5000`
3. Firewall not blocking port 5000
4. IP address is correct

**Solution:**
```bash
# Windows: Allow port 5000 in firewall
netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=5000

# Or temporarily disable firewall for testing
```

### Problem: "Frontend loads but can't login"

**Check:**
1. Browser console for errors (F12)
2. Network tab shows requests to correct IP
3. Backend logs show incoming requests

**Solution:**
- Clear browser cache
- Check REACT_APP_API_URL in frontend/.env
- Restart frontend server

### Problem: "Socket.IO not connecting"

**Check:**
1. Backend logs show "Socket.io initialized"
2. Browser console shows "Socket connected"
3. No CORS errors in console

**Solution:**
- Verify FRONTEND_URL in backend/.env
- Check allowedOrigins in server.js includes your IP
- Restart backend server

### Problem: "Call doesn't connect"

**Check:**
1. Both users are online (green dot)
2. Camera/microphone permissions granted
3. No other app using camera
4. Internet connection stable

**Solution:**
- Grant permissions in browser settings
- Close other apps using camera
- Try audio-only call first
- Check browser console for WebRTC errors

### Problem: "Mobile browser blocks camera/microphone"

**Solution:**
- Use HTTPS (or localhost/local IP is allowed)
- Grant permissions when prompted
- Check browser settings → Site permissions
- Try Chrome browser (best WebRTC support)

## 📱 Mobile Browser Recommendations

### Best Support
- ✅ **Chrome** (Android/iOS) - Full WebRTC support
- ✅ **Safari** (iOS) - Good WebRTC support
- ✅ **Firefox** (Android) - Good WebRTC support

### Limited Support
- ⚠️ **Samsung Internet** - May need additional permissions
- ⚠️ **Opera** - Generally works but test first

## 🔒 Security Notes

### Camera/Microphone Permissions
- Browsers require HTTPS for getUserMedia API
- Exception: localhost and local IP addresses (192.168.x.x)
- Always grant permissions when prompted

### Network Security
- Only devices on same WiFi can access
- Not accessible from internet (safe for testing)
- Use strong passwords for test accounts

## 📊 Expected Behavior

### Connection Times
- Backend startup: ~2 seconds
- Frontend startup: ~10 seconds
- Socket.IO connection: <1 second
- Call connection: 2-3 seconds

### Network Requirements
- WiFi speed: 5+ Mbps recommended
- Latency: <100ms for best quality
- Both devices on 2.4GHz or 5GHz WiFi

## ✅ Verification Checklist

Before testing calls:

- [ ] Backend running on `http://192.168.0.101:5000`
- [ ] Frontend running on `http://192.168.0.101:3000`
- [ ] Laptop can access frontend via browser
- [ ] Mobile can access frontend via browser
- [ ] Both devices on same WiFi network
- [ ] Firewall allows port 5000 and 3000
- [ ] Two test accounts created
- [ ] Camera/microphone permissions granted

## 🎉 Success Criteria

Your setup is working if:

1. ✅ Mobile browser loads the application
2. ✅ Can login from mobile device
3. ✅ Can navigate to chat page
4. ✅ Can see online status (green dot)
5. ✅ Can initiate call from either device
6. ✅ Incoming call modal appears
7. ✅ Can accept/reject calls
8. ✅ Audio/video streams work
9. ✅ Call controls work (mute, video toggle)
10. ✅ Can end call from either device

## 📞 Quick Test Commands

### Test Backend Accessibility
```bash
# From laptop
curl http://192.168.0.101:5000/api/test

# From mobile browser
http://192.168.0.101:5000/api/test
```

### Test Frontend Accessibility
```bash
# From mobile browser
http://192.168.0.101:3000
```

### Check Firewall (Windows)
```bash
netsh advfirewall show allprofiles state
```

### Check Open Ports (Windows)
```bash
netstat -an | findstr "5000"
netstat -an | findstr "3000"
```

## 🆘 Still Having Issues?

### Check Backend Logs
Look for:
- "✅ Server running on port 5000"
- "✅ Server accessible at http://0.0.0.0:5000"
- "✅ Socket.io initialized"
- "User connected: [socket-id]"

### Check Frontend Console (F12)
Look for:
- "Socket connected"
- No CORS errors
- API requests going to correct IP
- WebRTC connection logs

### Check Mobile Browser Console
**Android Chrome:**
1. Connect phone via USB
2. Open `chrome://inspect` on laptop
3. Click "Inspect" on your mobile page
4. Check console for errors

**iOS Safari:**
1. Enable Web Inspector on iPhone
2. Connect via USB
3. Open Safari → Develop → [Your iPhone]
4. Check console for errors

## 📚 Additional Resources

- [WebRTC on Mobile](https://webrtc.org/getting-started/mobile)
- [Socket.IO CORS](https://socket.io/docs/v4/handling-cors/)
- [React Native Network](https://reactnative.dev/docs/network)

## 🎊 Ready to Test!

Your configuration is complete. Follow the steps above to test the call feature between your laptop and mobile phone.

**Happy Testing! 📱💻**
