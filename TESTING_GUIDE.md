# 🔧 Core Issues Fixed - Testing Guide

## Issues Fixed

### 1. ✅ MongoDB Connection String
- **Fixed**: Removed URL encoding from password
- **Test**: Run `npm run check-startup` in backend folder

### 2. ✅ CORS Configuration
- **Fixed**: Added fallback origins and localhost
- **Test**: Check browser console for CORS errors

### 3. ✅ LiveKit Frontend Config
- **Fixed**: Added `REACT_APP_LIVEKIT_WS_URL` to frontend `.env`
- **Test**: Group video calls should work

### 4. ✅ Socket Authentication
- **Fixed**: Added validation for `socket.userId`
- **Test**: Messages and calls should work reliably

### 5. ✅ Verification Code Storage
- **Created**: Database model `VerificationCode.js`
- **Note**: Need to update authController to use this model

## 🧪 Testing Steps

### Step 1: Backend Diagnostics
```bash
cd backend
npm run check-startup
```

Expected output: All checks should pass ✅

### Step 2: Start Backend
```bash
cd backend
npm run dev
```

Expected output:
```
✅ MongoDB connected
✅ Server running on port 5000
✅ Socket.io initialized
```

### Step 3: Start Frontend
```bash
cd frontend
npm start
```

Expected output:
```
Compiled successfully!
Local: http://localhost:3000
```

### Step 4: Test Core Features

#### A. Registration & Login
1. Go to http://localhost:3000/register
2. Create a new account
3. Check if email verification works
4. Login with credentials
5. ✅ Should redirect to home page

#### B. Socket Connection
1. Open browser console (F12)
2. Look for: `✅ Socket connected: [socket-id]`
3. ✅ Should see connection message

#### C. Messaging
1. Login with two different accounts (use two browsers)
2. Go to Chat page on both
3. Send a message from one account
4. ✅ Should appear instantly on the other

#### D. Calls
1. With two accounts logged in
2. Initiate a call from one account
3. ✅ Should see incoming call popup on the other
4. Accept the call
5. ✅ Video/audio should work

#### E. Group Calls (LiveKit)
1. Create a group with multiple members
2. Start a group video call
3. ✅ Other members should see invitation
4. Join from multiple accounts
5. ✅ Should see all participants

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"
**Solution**: 
- Check if MongoDB URI is correct in `backend/.env`
- Ensure network allows MongoDB Atlas connections
- Run: `npm run check-startup`

### Issue: "Socket not connecting"
**Solution**:
- Check if backend is running on port 5000
- Check `REACT_APP_API_URL` in `frontend/.env`
- Check browser console for errors

### Issue: "CORS error"
**Solution**:
- Ensure backend `.env` has `FRONTEND_URL=http://localhost:3000`
- Restart backend server
- Clear browser cache

### Issue: "Messages not sending"
**Solution**:
- Check socket connection in browser console
- Ensure both users are online
- Check backend logs for errors

### Issue: "Calls not working"
**Solution**:
- Check if TURN server is configured
- Ensure both users have camera/mic permissions
- Check browser console for WebRTC errors

### Issue: "Group calls not working"
**Solution**:
- Verify LiveKit credentials in `backend/.env`
- Run: `npm run check-livekit`
- Check if `REACT_APP_LIVEKIT_WS_URL` is set in frontend

## 📊 Health Check Endpoints

Test these URLs when backend is running:

1. **API Health**: http://localhost:5000/api
   - Should return: "✅ API is running!"

2. **Test Endpoint**: http://localhost:5000/api/test
   - Should return JSON with success: true

3. **Socket.IO**: Check browser console
   - Should see: "✅ Socket connected"

## 🔍 Debug Mode

### Enable Verbose Logging

**Backend** (`server.js`):
```javascript
// Add after mongoose.connect
mongoose.set('debug', true);
```

**Frontend** (browser console):
```javascript
localStorage.setItem('debug', '*');
```

## 📝 Log Files to Check

1. **Backend Console**: Real-time server logs
2. **Browser Console**: Frontend errors and socket events
3. **Network Tab**: API requests and responses

## 🚀 Production Checklist

Before deploying:

- [ ] All environment variables set
- [ ] MongoDB connection works
- [ ] Socket.IO connects properly
- [ ] CORS configured for production domain
- [ ] LiveKit credentials valid
- [ ] Frontend build created (`npm run build`)
- [ ] Backend serves frontend build
- [ ] HTTPS enabled (required for WebRTC)
- [ ] TURN server configured

## 💡 Quick Fixes

### Reset Everything
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Clear Browser Data
1. Open DevTools (F12)
2. Application tab
3. Clear storage
4. Reload page

### Restart Services
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Restart backend
cd backend
npm run dev

# Restart frontend (new terminal)
cd frontend
npm start
```

## 📞 Still Having Issues?

Run the diagnostic script:
```bash
cd backend
npm run diagnose
```

This will check:
- ✅ Environment variables
- ✅ MongoDB connection
- ✅ Database collections
- ✅ Indexes
- ✅ LiveKit configuration

If all checks pass but issues persist, check:
1. Firewall settings
2. Antivirus blocking connections
3. Network proxy settings
4. Browser extensions interfering
