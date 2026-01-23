# 🎬 LiveKit Group Calls - Quick Visual Guide

## Where to Find Group Call Button

```
┌─────────────────────────────────────────────┐
│  [←] 👥 Marketing Team          📹 [⋮]     │  ← Click this video icon
├─────────────────────────────────────────────┤
│                                             │
│  John: Hey everyone!                        │
│  Sarah: Ready for the meeting?              │
│                                             │
└─────────────────────────────────────────────┘
```

## Setup Flow

```
1. Get Credentials
   ↓
   https://cloud.livekit.io
   ↓
   Sign Up → Create Project → Copy Keys

2. Configure Backend
   ↓
   backend/.env
   ↓
   LIVEKIT_API_KEY=APIxxxxx
   LIVEKIT_API_SECRET=secret
   LIVEKIT_WS_URL=wss://...

3. Verify Setup
   ↓
   npm run check-livekit
   ↓
   ✅ All configured!

4. Restart Server
   ↓
   npm run dev

5. Test Call
   ↓
   Open group chat → Click 📹
```

## Call Interface

```
┌─────────────────────────────────────────────┐
│                                             │
│         [Video Feed - Participant 1]        │
│                                             │
├─────────────────────────────────────────────┤
│  [P2]  [P3]  [P4]  [P5]  [P6]  [P7]  [P8] │
├─────────────────────────────────────────────┤
│                                             │
│     🎤    📹    🖥️    📞                    │
│    Mute  Video Screen  End                  │
│                                             │
└─────────────────────────────────────────────┘
```

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| ❌ "Failed to join call" | Check credentials with `npm run check-livekit` |
| ❌ "Camera access denied" | Allow permissions in browser |
| ❌ "Cannot connect" | Use HTTPS or localhost |
| ❌ "No video from others" | Both users need to grant permissions |

## File Structure

```
backend/
├── .env                    ← Add LiveKit credentials here
├── check-livekit.js        ← Run to verify setup
├── routes/
│   └── livekit.js         ← Token generation endpoint
└── package.json           ← Contains check-livekit script

frontend/
└── src/
    ├── components/
    │   └── GroupCallRoom.jsx  ← Call interface
    └── pages/
        └── ChatNew.jsx        ← Group call button
```

## Testing Checklist

- [ ] LiveKit account created
- [ ] Credentials added to .env
- [ ] `npm run check-livekit` shows ✅
- [ ] Backend restarted
- [ ] Group chat opened
- [ ] Video button visible
- [ ] Call room loads
- [ ] Camera/mic permissions granted
- [ ] Second user can join
- [ ] Video/audio working

## Support

Need help? Check these files:
- `LIVEKIT_COMPLETE_GUIDE.md` - Full documentation
- `LIVEKIT_SETUP.md` - Quick setup guide
- Backend console - Error messages
- Browser console - Frontend errors
- LiveKit dashboard - Connection logs

---

**Ready to start?** Run `npm run check-livekit` in the backend directory!
