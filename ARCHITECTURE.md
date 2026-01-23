# 🏗️ Blog Application Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  Socket.IO   │  │   WebRTC     │          │
│  │ (Port 3000)  │  │   Client     │  │   Client     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ HTTP/REST        │ WebSocket        │ P2P
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                    BACKEND SERVER (Port 5000)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Express.js Server                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │   Routes   │  │Middleware  │  │Controllers │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Socket.IO Server                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │  Messages  │  │   Calls    │  │   Status   │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────┬───────────────────────┬───────────────────────────┘
               │                       │
               │                       │
       ┌───────▼────────┐     ┌───────▼────────┐
       │   MongoDB      │     │   LiveKit      │
       │   Database     │     │   (Video)      │
       └────────────────┘     └────────────────┘
```

## Data Flow

### 1. User Registration/Login
```
Browser → API Request → Auth Controller → MongoDB
                                        ↓
Browser ← JWT Token ← Auth Controller ← User Created
```

### 2. Real-time Messaging
```
User A Browser → Socket.IO → Backend → Socket.IO → User B Browser
                                ↓
                            MongoDB (Save)
```

### 3. Video Calls (1-on-1)
```
User A → WebRTC Offer → Socket.IO → User B
User B → WebRTC Answer → Socket.IO → User A
         ↓
    Direct P2P Connection (Audio/Video)
```

### 4. Group Video Calls
```
User A → Start Call → Backend → LiveKit Room Created
                                      ↓
Backend → Notify Members → Socket.IO → All Group Members
                                      ↓
Members → Join LiveKit Room → Video Conference
```

## Component Breakdown

### Frontend (React)
```
src/
├── components/        # Reusable UI components
├── pages/            # Route pages
├── context/          # React Context (Auth, etc.)
├── services/         # API & Socket services
│   ├── api.js       # Axios HTTP client
│   ├── socket.js    # Socket.IO client
│   └── webrtc.js    # WebRTC service
└── utils/           # Helper functions
```

### Backend (Node.js)
```
backend/
├── controllers/      # Business logic
├── models/          # MongoDB schemas
├── routes/          # API endpoints
├── middleware/      # Auth, validation
├── socket/          # Socket.IO handlers
└── utils/           # Helper functions
```

## Key Technologies

### Frontend Stack
- **React 18**: UI framework
- **React Router**: Navigation
- **Socket.IO Client**: Real-time communication
- **Axios**: HTTP requests
- **WebRTC**: Peer-to-peer calls
- **LiveKit Client**: Group video calls
- **Tailwind CSS**: Styling

### Backend Stack
- **Node.js**: Runtime
- **Express**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM
- **Socket.IO**: WebSocket server
- **JWT**: Authentication
- **LiveKit SDK**: Video infrastructure
- **Cloudinary**: File storage

## Critical Connections

### 1. Authentication Flow
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │────▶│ Backend │────▶│ MongoDB │
│         │     │  Auth   │     │  Users  │
│         │◀────│         │◀────│         │
└─────────┘     └─────────┘     └─────────┘
    JWT Token
```

### 2. Socket Connection
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │◀───▶│ Socket  │◀───▶│ Online  │
│         │     │  Server │     │  Users  │
└─────────┘     └─────────┘     └─────────┘
   WebSocket      Real-time       Map
```

### 3. Message Delivery
```
Sender → Socket → Backend → Encrypt → MongoDB
                    ↓
                 Receiver Online?
                    ↓
              Yes → Socket → Receiver
              No  → Store for later
```

## Environment Variables Flow

### Frontend (.env)
```
REACT_APP_API_URL → api.js → Backend API
REACT_APP_LIVEKIT_WS_URL → LiveKit → Video Calls
```

### Backend (.env)
```
MONGODB_URI → Mongoose → Database
JWT_SECRET → Auth → Token Generation
LIVEKIT_API_KEY → LiveKit SDK → Video Rooms
CLOUDINARY_* → File Upload → Cloud Storage
```

## Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Frontend Dev | 3000 | React development server |
| Backend API | 5000 | Express + Socket.IO |
| MongoDB | 27017 | Database (if local) |
| LiveKit | 443 | Video infrastructure (cloud) |

## Security Layers

```
┌─────────────────────────────────────┐
│         Browser (HTTPS)             │
└─────────────┬───────────────────────┘
              │ JWT Token
┌─────────────▼───────────────────────┐
│      Auth Middleware (JWT)          │
└─────────────┬───────────────────────┘
              │ Validated User
┌─────────────▼───────────────────────┐
│      Protected Routes/Sockets       │
└─────────────┬───────────────────────┘
              │ Encrypted Data
┌─────────────▼───────────────────────┐
│         MongoDB (Secure)            │
└─────────────────────────────────────┘
```

## Issues Fixed (Visual)

### Before Fix
```
Browser ──X──▶ Backend (CORS Error)
Browser ──X──▶ MongoDB (Connection Failed)
Socket  ──X──▶ Message (No userId)
```

### After Fix
```
Browser ──✓──▶ Backend (CORS OK)
Browser ──✓──▶ MongoDB (Connected)
Socket  ──✓──▶ Message (Validated)
```

## Monitoring Points

```
┌─────────────────────────────────────┐
│  1. MongoDB Connection              │ ← check-startup.js
├─────────────────────────────────────┤
│  2. Socket.IO Status                │ ← Browser console
├─────────────────────────────────────┤
│  3. API Response Times              │ ← Network tab
├─────────────────────────────────────┤
│  4. WebRTC Connection               │ ← chrome://webrtc-internals
├─────────────────────────────────────┤
│  5. LiveKit Room Status             │ ← LiveKit dashboard
└─────────────────────────────────────┘
```

## Deployment Architecture

### Development
```
localhost:3000 (Frontend) ──▶ localhost:5000 (Backend)
                                      ↓
                              MongoDB Atlas (Cloud)
                              LiveKit Cloud
```

### Production
```
domain.com (Frontend + Backend) ──▶ MongoDB Atlas
                                ──▶ LiveKit Cloud
                                ──▶ Cloudinary
```

---

This architecture ensures:
- ✅ Scalable real-time communication
- ✅ Secure authentication
- ✅ Reliable message delivery
- ✅ High-quality video calls
- ✅ Persistent data storage
