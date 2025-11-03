# 🚀 Quick Start - Mobile Testing

## ⚡ 3-Step Setup

### Step 1: Start Backend
```bash
cd backend
npm run dev
```
**Wait for:** "✅ Server running on port 5000"

### Step 2: Start Frontend
```bash
cd frontend
npm start
```
**Wait for:** "Compiled successfully!"

### Step 3: Connect Devices

**On Laptop:**
- Open: `http://localhost:3000`
- Login as User A

**On Mobile:**
- Connect to same WiFi
- Open: `http://192.168.0.101:3000`
- Login as User B

## 📞 Make a Test Call

1. Both users navigate to `/chat`
2. Search for each other
3. Click phone icon (📞) or video icon (📹)
4. Accept the call
5. Grant camera/microphone permissions

## ✅ Quick Checks

### Backend Running?
Open: `http://192.168.0.101:5000`
Should see: "✅ Server is running!"

### Frontend Accessible?
Open on mobile: `http://192.168.0.101:3000`
Should see: Blog application

### Both Online?
Check for green dot next to username in chat

## 🐛 Quick Fixes

### Can't connect from mobile?
1. Check both devices on same WiFi
2. Verify IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Update IP in `backend/.env` and `frontend/.env`
4. Restart both servers

### Firewall blocking?
**Windows:**
```bash
netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="React Frontend" dir=in action=allow protocol=TCP localport=3000
```

### Call not connecting?
1. Grant camera/microphone permissions
2. Close other apps using camera
3. Try audio-only call first
4. Check browser console (F12) for errors

## 📱 Mobile Browser

**Recommended:** Chrome (best WebRTC support)

**Grant Permissions:**
- Camera: Required for video calls
- Microphone: Required for all calls
- Location: Not required

## 🎉 Success!

If you can:
- ✅ Access app from mobile
- ✅ Login from mobile
- ✅ See online status
- ✅ Make/receive calls
- ✅ Hear/see each other

**You're all set! 🎊**

---

**Need detailed help?** See `MOBILE_TESTING_SETUP.md`
