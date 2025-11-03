# 📋 Quick Reference Card

## 🚀 Start Servers

```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm start
```

## 🌐 Access URLs

| Device | URL | Purpose |
|--------|-----|---------|
| Laptop | `http://localhost:3000` | Frontend |
| Laptop | `http://192.168.0.101:3000` | Frontend (via IP) |
| Mobile | `http://192.168.0.101:3000` | Frontend |
| Any | `http://192.168.0.101:5000` | Backend API |

## 📞 Test Call Feature

1. **Laptop:** Login as User A → `/chat`
2. **Mobile:** Login as User B → `/chat`
3. **Laptop:** Click phone/video icon
4. **Mobile:** Accept call
5. **Both:** Grant permissions

## 🔧 Configuration Files

| File | Key Setting |
|------|-------------|
| `backend/.env` | `FRONTEND_URL=http://192.168.0.101:3000` |
| `frontend/.env` | `REACT_APP_API_URL=http://192.168.0.101:5000` |
| `backend/server.js` | Added `http://192.168.0.101:3000` to CORS |

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Mobile can't connect | Check same WiFi, verify IP address |
| Firewall blocking | Run firewall commands (see below) |
| Call not working | Grant camera/mic permissions |
| Socket not connecting | Restart backend server |

## 🔥 Firewall Commands (Windows)

```bash
netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="React Frontend" dir=in action=allow protocol=TCP localport=3000
```

## ✅ Verification

```bash
# Check backend
curl http://192.168.0.101:5000

# Check API
curl http://192.168.0.101:5000/api/test

# Check frontend (open in browser)
http://192.168.0.101:3000
```

## 📱 Mobile Browser Console

**Android Chrome:**
1. Connect phone via USB
2. Laptop: Open `chrome://inspect`
3. Click "Inspect" on mobile page

**iOS Safari:**
1. iPhone: Settings → Safari → Advanced → Web Inspector
2. Mac: Safari → Develop → [Your iPhone]

## 🎯 Success Checklist

- [ ] Backend running
- [ ] Frontend running
- [ ] Mobile can access app
- [ ] Can login from mobile
- [ ] Socket.IO connected
- [ ] Both users online
- [ ] Can make calls
- [ ] Audio/video works

## 📚 Documentation

| File | Purpose |
|------|---------|
| `START_MOBILE_TESTING.md` | Quick 3-step guide |
| `MOBILE_TESTING_SETUP.md` | Detailed setup |
| `CONFIGURATION_CHANGES.md` | What was changed |
| `CALL_FEATURE_README.md` | Call feature docs |

## 🆘 Need Help?

1. Check backend logs
2. Check browser console (F12)
3. Verify IP address: `ipconfig`
4. Restart servers
5. Check firewall settings

---

**Your IP:** `192.168.0.101`
**Backend Port:** `5000`
**Frontend Port:** `3000`
