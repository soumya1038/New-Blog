# 🚀 Start Application Locally

## Step 1: Start Backend

Open **Terminal 1**:
```bash
cd "d:\Projects\VS code\New Blog\backend"
npm run dev
```

**Wait for these messages**:
```
✅ MongoDB connected
✅ Server running on port 5000
✅ Socket.io initialized
```

---

## Step 2: Start Frontend

Open **Terminal 2** (new terminal):
```bash
cd "d:\Projects\VS code\New Blog\frontend"
npm start
```

**Wait for**:
```
Compiled successfully!
Local: http://localhost:3000
```

---

## Step 3: Test

1. Browser opens automatically at `http://localhost:3000`
2. Try to register a new account
3. Check email for verification code
4. Login and test features

---

## ⚠️ If Frontend Shows "Network Error"

**Problem**: Frontend can't reach backend

**Solution**:
1. Make sure backend is running (check Terminal 1)
2. Make sure you see "✅ Server running on port 5000"
3. Stop frontend (Ctrl+C in Terminal 2)
4. Delete `.env` cache:
   ```bash
   cd "d:\Projects\VS code\New Blog\frontend"
   rm -rf node_modules/.cache
   npm start
   ```

---

## ⚠️ If Backend Won't Start

**Problem**: Port 5000 already in use

**Solution**:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Then restart backend
npm run dev
```

---

## ✅ Everything Working?

You should see:
- ✅ Backend logs in Terminal 1
- ✅ Frontend running at localhost:3000
- ✅ No CORS errors in browser console
- ✅ Can register/login
- ✅ Can upload images
- ✅ Can create blogs

---

## 🔄 To Stop

**Terminal 1** (Backend): Press `Ctrl+C`
**Terminal 2** (Frontend): Press `Ctrl+C`
