# 🚀 LiveKit Quick Start - 3 Steps

## ✅ Step 1: Get Credentials (5 min)

1. Visit: **https://cloud.livekit.io**
2. Click "Sign Up" (free)
3. Create a new project
4. Go to Settings → Keys
5. Copy these 3 values:
   - API Key
   - API Secret  
   - WebSocket URL

## ✅ Step 2: Configure (1 min)

Open `backend/.env` and update:

```env
LIVEKIT_API_KEY=paste_your_api_key_here
LIVEKIT_API_SECRET=paste_your_secret_here
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
```

## ✅ Step 3: Verify & Start (1 min)

```bash
cd backend
npm run check-livekit
npm run dev
```

You should see:
```
✅ LIVEKIT_API_KEY: Configured
✅ LIVEKIT_API_SECRET: Configured
✅ LIVEKIT_WS_URL: Configured
```

## 🎉 Done! Test It

1. Open frontend: http://localhost:3000
2. Go to Chat
3. Open a group chat
4. Click the 📹 video icon
5. You're in a video call!

---

**Need help?** See `LIVEKIT_COMPLETE_GUIDE.md` for detailed instructions.
