# Lekhon - Modern Blogging Platform

A full-stack blog application built with React, Node.js, Express, and MongoDB.

## 🚀 Features

### 📝 Blog Management
- Create, edit, delete blogs with Markdown editor
- Draft system with auto-save
- Tag system for categorization
- Word count and reading time
- Schedule publication
- Short blogs (Twitter-like posts)

### 👤 User Management
- JWT authentication with bcrypt
- Profile customization with image upload
- Social media links integration
- Follow/unfollow system
- User statistics

### 💬 Real-time Chat & Calls
- Real-time messaging with Socket.IO
- 1-on-1 audio/video calls (WebRTC)
- Group video calls (LiveKit)
- Voice messages & file sharing
- Message reactions & pinning
- Read receipts & typing indicators

### 🔔 Notifications
- Real-time notifications
- Smart notification grouping
- Auto-cleanup system
- Sound alerts

### 🌐 Additional Features
- Multi-language support (i18n)
- Dark/Light mode
- News integration
- AI chatbot assistant
- Product tour for new users
- Admin & Co-Admin panels
- RESTful API with API keys

## 🛠️ Tech Stack

**Frontend:** React 18, Tailwind CSS, Socket.IO Client, WebRTC, LiveKit  
**Backend:** Node.js, Express, MongoDB, Socket.IO, JWT, Multer  
**Services:** Cloudinary (images), Brevo (emails), LiveKit (group calls), NewsAPI

## 📦 Installation

### Prerequisites
- Node.js v14+
- MongoDB (local or Atlas)
- Cloudinary account
- Brevo account (email service)
- LiveKit account (group calls)

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
NODE_ENV=development

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=your_email

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Logo URL (after uploading to Cloudinary)
LOGO_URL=https://res.cloudinary.com/your-cloud/image/upload/lekhon.png

# LiveKit (Group Calls)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-project.livekit.cloud

# AI Chatbot
GROQ_API_KEY=your_groq_api_key

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

Start backend:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

## 📖 Usage Guide

1. **Register/Login** - Create account or login
2. **Create Blog** - Write with Markdown editor
3. **Social Features** - Like, comment, follow users
4. **Chat** - Real-time messaging with users
5. **Calls** - Audio/video calls (1-on-1 or group)
6. **Notifications** - Stay updated with real-time alerts
7. **Profile** - Customize your profile and settings
8. **API Access** - Generate API keys for external access

## 🔐 Security

- Password hashing with bcrypt
- JWT token authentication
- API key authentication
- Input validation & sanitization
- File upload validation
- Protected routes

## 📱 Mobile Access

Access from mobile devices on same network:
```bash
# Find your IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Access at: http://YOUR_IP:3000
```

## 🎨 Branding

Logo location: `frontend/public/image/lekhon.png`  
Upload to Cloudinary and set `LOGO_URL` in `.env` for emails

## 📄 License

MIT License

## 🤝 Contributing

Pull requests are welcome!
