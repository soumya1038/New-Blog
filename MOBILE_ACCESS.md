# 📱 Mobile Access Setup

## Your Network Info
- **Laptop IP:** 192.168.0.103
- **Frontend:** http://192.168.0.103:3000
- **Backend:** http://192.168.0.103:5000

## 🚀 Quick Setup

### Step 1: Run Setup Script
```bash
setup-mobile.bat
```

### Step 2: Configure Windows Firewall

**Option A: Allow Node.js (Recommended)**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Find "Node.js" and check both Private and Public
5. If not listed, click "Allow another app" → Browse to Node.js

**Option B: Temporarily Disable Firewall (Testing Only)**
1. Windows Security → Firewall & network protection
2. Turn off for Private network
3. Remember to turn back on!

### Step 3: Access from Phone
1. Connect phone to same WiFi
2. Open browser on phone
3. Go to: **http://192.168.0.103:3000**

## ✅ Troubleshooting

### Can't access from phone?

**Check 1: Same WiFi**
```
Phone WiFi = Laptop WiFi ✓
```

**Check 2: Firewall**
```bash
# Test if port is accessible
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

**Check 3: Backend CORS**
Backend already configured to accept connections from your IP.

**Check 4: Clear browser cache on phone**
- Open in incognito/private mode
- Or clear browser data

### Still not working?

**Test backend directly:**
```
http://192.168.0.103:5000/api/test
```
Should show: `{"success": true, "message": "Backend is working!"}`

**Check laptop IP hasn't changed:**
```bash
ipconfig | findstr "IPv4"
```
If different, update both .env files with new IP.

## 🔄 Switch Back to Localhost

When done with mobile testing:

**backend/.env:**
```
FRONTEND_URL=http://localhost:3000
```

**frontend/.env:**
```
REACT_APP_API_URL=http://localhost:5000
```

Then restart both servers.

## 📝 Notes

- IP address may change if router restarts
- Both devices must be on same network
- Some routers block device-to-device communication (AP Isolation)
- If using VPN, disable it temporarily

---

**Ready? Run `setup-mobile.bat` now!**
