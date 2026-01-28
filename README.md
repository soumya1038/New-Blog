# Modern Blog Application

A full-stack blog application built with React, Node.js, Express, and MongoDB.

## Features

### Authentication & Account Management
- ✅ User registration and login with JWT
- ✅ Password hashing with bcrypt
- ✅ Remember me functionality
- ✅ Password change and account deletion

### User Profile
- ✅ Personal information management
- ✅ Profile image upload (JPG/PNG, 5MB limit)
- ✅ Social media links integration
- ✅ User statistics (posts, followers, following)

### Blog Management
- ✅ Create, read, update, delete blogs
- ✅ Markdown editor with live preview
- ✅ Draft system with auto-save
- ✅ Tag system for categorization
- ✅ Word count and reading time calculation

### Social Features
- ✅ Like/unlike blog posts
- ✅ Comment system
- ✅ Follow/unfollow users
- ✅ Real-time notifications

### Messaging & Calls
- ✅ Real-time messaging with Socket.IO
- ✅ Audio/Video calls with WebRTC
- ✅ **Refined group video calls with LiveKit** 🆕
  - Global state management
  - Call switching with warnings
  - Real-time participant tracking
  - Mobile-friendly drag & drop
  - Comprehensive call history
- ✅ Voice messages
- ✅ File sharing
- ✅ Group chats

### External API
- ✅ RESTful API with authentication
- ✅ API key generation (OpenAI-style)
- ✅ CRUD operations for blogs

## Tech Stack

**Frontend:**
- React 18
- React Router v6
- Tailwind CSS
- Axios
- React Markdown
- SimpleMDE Editor
- Socket.IO Client
- WebRTC

**Backend:**
- Node.js
- Express
- MongoDB with Mongoose
- JWT Authentication
- Bcrypt
- Multer (file uploads)
- Socket.IO
- WebRTC

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- **LiveKit account** (free at https://cloud.livekit.io) - for group video calls

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/modern-blog
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
NODE_ENV=development

# LiveKit Configuration (for group video calls)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
```

**📚 For complete group call documentation, see [Documentation Index](GROUP_CALL_DOCUMENTATION_INDEX.md)**

**🚀 Quick links:**
- [Quick Start Guide](GROUP_CALL_QUICK_START.md) - Get started in 5 minutes
- [Complete Implementation](GROUP_CALL_REFINED_IMPLEMENTATION.md) - Full technical docs
- [Migration Guide](GROUP_CALL_MIGRATION_GUIDE.md) - Integration guide
- [Flow Diagrams](GROUP_CALL_FLOW_DIAGRAMS.md) - Visual architecture
- [Refinement Summary](GROUP_CALL_REFINEMENT_SUMMARY.md) - Overview of improvements

**Quick check**: Run `npm run check-livekit` to verify your LiveKit configuration

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Start backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start React development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## Usage

1. Register a new account or login
2. Create your first blog post with markdown
3. Like and comment on other users' posts
4. Follow users to see their content
5. Chat with other users in real-time
6. Make audio/video calls
7. **Start group video calls** (requires LiveKit setup)
8. Manage your profile and settings
9. Generate API keys for external access

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- API key authentication for external access
- Input validation and sanitization
- File upload validation
- Protected routes

## Contributing

Feel free to submit issues and pull requests!

## License

MIT License
