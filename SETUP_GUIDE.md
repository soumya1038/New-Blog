# Lekhon - Setup & Deployment Guide

## 🚀 Quick Start (Local Development)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Configure Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/lekhon
# OR MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lekhon

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=7d

# Email Service (Brevo - https://app.brevo.com)
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=your_verified_email@domain.com

# Image Storage (Cloudinary - https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
LOGO_URL=https://res.cloudinary.com/your-cloud/image/upload/lekhon.png

# Group Video Calls (LiveKit - https://cloud.livekit.io)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-project.livekit.cloud

# AI Chatbot (Groq - https://console.groq.com)
GROQ_API_KEY=your_groq_api_key

# Admin Email (for contact form)
My_email=your_admin_email@domain.com
```

### 3. Start Services

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

Access at: `http://localhost:3000`

---

## 🌐 Production Deployment

### Option 1: Render (Recommended)

#### Backend Deployment

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New +" → "Web Service"
4. Connect GitHub repository
5. Configure:
   - **Name:** lekhon-backend
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
6. Add environment variables (all from `.env`)
7. Deploy

#### Frontend Deployment

1. In Render, click "New +" → "Static Site"
2. Connect same repository
3. Configure:
   - **Name:** lekhon-frontend
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish Directory:** `frontend/build`
4. Add environment variable:
   - `REACT_APP_API_URL=https://your-backend.onrender.com`
5. Deploy

### Option 2: Vercel (Frontend) + Render (Backend)

#### Backend on Render
Same as above

#### Frontend on Vercel

```bash
cd frontend
vercel
```

Add environment variable in Vercel dashboard:
- `REACT_APP_API_URL=https://your-backend.onrender.com`

---

## 📧 Email Setup (Brevo)

1. Sign up at [Brevo](https://app.brevo.com)
2. Verify your sender email
3. Get API key from Settings → API Keys
4. Add to `.env`:
   ```env
   BREVO_API_KEY=your_key
   BREVO_FROM_EMAIL=verified@email.com
   ```

---

## 🖼️ Image Storage (Cloudinary)

1. Sign up at [Cloudinary](https://cloudinary.com)
2. Get credentials from Dashboard
3. Upload logo to Cloudinary
4. Copy logo URL and add to `.env`:
   ```env
   LOGO_URL=https://res.cloudinary.com/your-cloud/image/upload/lekhon.png
   ```

---

## 📹 Group Video Calls (LiveKit)

1. Sign up at [LiveKit Cloud](https://cloud.livekit.io)
2. Create new project
3. Get API credentials
4. Add to `.env`:
   ```env
   LIVEKIT_API_KEY=APIxxx
   LIVEKIT_API_SECRET=xxx
   LIVEKIT_WS_URL=wss://your-project.livekit.cloud
   ```

---

## 🤖 AI Chatbot (Groq)

1. Sign up at [Groq Console](https://console.groq.com)
2. Create API key
3. Add to `.env`:
   ```env
   GROQ_API_KEY=gsk_xxx
   ```

---

## 📱 Mobile Testing (Local Network)

### Windows
```bash
ipconfig
# Find IPv4 Address (e.g., 192.168.1.100)
```

### Mac/Linux
```bash
ifconfig
# Find inet address
```

Update `backend/.env`:
```env
FRONTEND_URL=http://YOUR_IP:3000
```

Access from mobile: `http://YOUR_IP:3000`

---

## 🔧 Troubleshooting

### MongoDB Connection Issues
- Check MongoDB is running: `mongod`
- Verify connection string in `.env`
- For Atlas: Whitelist IP address

### Email Not Sending
- Verify sender email at Brevo
- Check spam folder
- Verify API key is correct

### Images Not Uploading
- Check Cloudinary credentials
- Verify file size < 5MB
- Check file format (JPG/PNG)

### Group Calls Not Working
- Verify LiveKit credentials
- Check browser permissions (camera/mic)
- Test on HTTPS in production

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env`
- Check API URL in frontend

---

## 🎯 Admin Setup

First registered user becomes admin automatically.

To make additional admins:
1. Login as admin
2. Go to Admin Panel
3. Promote users to Admin or Co-Admin

---

## 📊 Environment Variables Summary

| Variable | Required | Service | Purpose |
|----------|----------|---------|---------|
| MONGODB_URI | ✅ | MongoDB | Database connection |
| JWT_SECRET | ✅ | - | Authentication |
| BREVO_API_KEY | ✅ | Brevo | Email service |
| CLOUDINARY_* | ✅ | Cloudinary | Image uploads |
| LOGO_URL | ⚠️ | Cloudinary | Email logo |
| LIVEKIT_* | ⚠️ | LiveKit | Group calls |
| GROQ_API_KEY | ⚠️ | Groq | AI chatbot |

✅ Required | ⚠️ Optional (feature-specific)

---

## 🔒 Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use strong MongoDB password
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS in production
- [ ] Verify sender email in Brevo
- [ ] Restrict Cloudinary upload presets
- [ ] Set proper CORS origins
- [ ] Keep dependencies updated

---

## 📝 Post-Deployment

1. Test all features
2. Create admin account
3. Upload logo to Cloudinary
4. Update LOGO_URL in environment
5. Test email delivery
6. Test group video calls
7. Monitor error logs

---

## 🆘 Support

For issues, check:
1. Environment variables are set correctly
2. All services are running
3. Network connectivity
4. Browser console for errors
5. Server logs for backend errors

---

## 📚 Additional Resources

- [MongoDB Atlas Setup](https://www.mongodb.com/cloud/atlas)
- [Brevo Documentation](https://developers.brevo.com)
- [Cloudinary Docs](https://cloudinary.com/documentation)
- [LiveKit Docs](https://docs.livekit.io)
- [Render Deployment](https://render.com/docs)
