# Access Localhost on Mobile Phone

## 🎯 Quick Steps:

### Step 1: Find Your Laptop's IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.1.5`)

**On Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```
Look for `inet` address (e.g., `192.168.1.5`)

### Step 2: Update Backend Server

**File:** `backend/server.js`

Change:
```javascript
server.listen(process.env.PORT, () => {
```

To:
```javascript
server.listen(process.env.PORT, '0.0.0.0', () => {
```

### Step 3: Update Frontend API URL

**File:** `frontend/src/services/api.js`

Change:
```javascript
const API_URL = 'http://localhost:5000/api';
```

To:
```javascript
const API_URL = 'http://YOUR_LAPTOP_IP:5000/api';
// Example: const API_URL = 'http://192.168.1.5:5000/api';
```

### Step 4: Update Socket.io URL

**File:** `frontend/src/services/socket.js`

Change:
```javascript
const SOCKET_URL = 'http://localhost:5000';
```

To:
```javascript
const SOCKET_URL = 'http://YOUR_LAPTOP_IP:5000';
// Example: const SOCKET_URL = 'http://192.168.1.5:5000';
```

### Step 5: Update Backend CORS

**File:** `backend/server.js`

Change:
```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});
```

To:
```javascript
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for testing
    methods: ['GET', 'POST']
  }
});
```

And update CORS middleware:
```javascript
app.use(cors()); // Change to
app.use(cors({ origin: '*' })); // Allow all origins
```

### Step 6: Update Frontend Package.json (Optional)

**File:** `frontend/package.json`

Add:
```json
"scripts": {
  "start": "HOST=0.0.0.0 react-scripts start",
  // ... other scripts
}
```

### Step 7: Restart Servers

```bash
# Backend
cd backend
npm run dev

# Frontend (new terminal)
cd frontend
npm start
```

### Step 8: Access from Mobile

Open browser on your phone and go to:
```
http://YOUR_LAPTOP_IP:3000
```
Example: `http://192.168.1.5:3000`

## 🔥 Quick Setup Script:

Save this as `setup-mobile.md`:

```bash
# 1. Find IP
ipconfig

# 2. Note your IP (e.g., 192.168.1.5)

# 3. Update files with your IP:
# - frontend/src/services/api.js
# - frontend/src/services/socket.js
# - backend/server.js

# 4. Restart servers
# Backend: npm run dev
# Frontend: npm start

# 5. Access on phone: http://YOUR_IP:3000
```

## ⚠️ Troubleshooting:

### Can't connect from phone?

**Check Firewall:**
```bash
# Windows: Allow ports 3000 and 5000
# Go to Windows Firewall → Advanced Settings → Inbound Rules
# Add rules for ports 3000 and 5000
```

**Check both devices on same network:**
- Laptop and phone connected to same WiFi/router
- Check router settings if needed

**Test connection:**
```bash
# On phone browser, try:
http://YOUR_LAPTOP_IP:5000/api/auth/me
# Should show API response or error
```

### Still not working?

1. **Disable firewall temporarily** (for testing)
2. **Check antivirus** - might block connections
3. **Try different port** - Some routers block certain ports
4. **Check router settings** - AP isolation might be enabled

## 📱 Final URLs:

- **Frontend:** `http://YOUR_LAPTOP_IP:3000`
- **Backend API:** `http://YOUR_LAPTOP_IP:5000/api`
- **Socket.io:** `http://YOUR_LAPTOP_IP:5000`

Replace `YOUR_LAPTOP_IP` with actual IP (e.g., `192.168.1.5`)

## ✅ Success Indicators:

- [ ] Can access frontend on phone
- [ ] Can login/register
- [ ] Can see blogs
- [ ] Chat works
- [ ] Real-time updates work

## 🔒 Security Note:

For production, don't use `origin: '*'`. Use specific domains:
```javascript
cors({
  origin: ['http://192.168.1.5:3000', 'http://localhost:3000']
})
```
