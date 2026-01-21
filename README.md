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
```

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
7. Manage your profile and settings
8. Generate API keys for external access

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
