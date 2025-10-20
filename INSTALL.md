# Quick Installation Guide

## Prerequisites Check
- [ ] Node.js installed (v14+): Run `node --version`
- [ ] MongoDB installed or Atlas account ready
- [ ] Git installed (optional)

## Step-by-Step Installation

### 1. Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Configure environment (edit .env file)
# Change JWT_SECRET to a secure random string
# Update MONGODB_URI if using MongoDB Atlas

# Start MongoDB (if local)
# Windows: Run MongoDB as service or use `mongod`
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# Start backend server
npm run dev
```

**Expected Output:**
```
✅ MongoDB connected
✅ Server running on port 5000
```

### 2. Frontend Setup (5 minutes)

```bash
# Open new terminal
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start React app
npm start
```

**Expected Output:**
```
Compiled successfully!
Local: http://localhost:3000
```

### 3. Test the Application

1. Open browser: `http://localhost:3000`
2. Click "Sign Up" and create an account
3. Create your first blog post
4. Test like, comment, and follow features

## Quick Test Checklist

- [ ] Register new user
- [ ] Login with credentials
- [ ] Create a blog post with markdown
- [ ] View blog post
- [ ] Like a blog post
- [ ] Comment on a blog post
- [ ] Edit profile
- [ ] Upload profile image
- [ ] Generate API key
- [ ] View notifications

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Start MongoDB service or update MONGODB_URI in .env

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change PORT in backend/.env or kill process using port 5000

### React Build Errors
```
Module not found: Can't resolve 'react-router-dom'
```
**Solution:** Run `npm install` again in frontend directory

### CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Ensure backend is running on port 5000 and CORS is enabled

## Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/modern-blog
JWT_SECRET=change-this-to-a-secure-random-string-in-production
JWT_EXPIRE=7d
NODE_ENV=development
```

### Frontend (optional .env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Production Deployment

### Backend (Node.js hosting)
1. Set NODE_ENV=production
2. Use MongoDB Atlas for database
3. Configure secure JWT_SECRET
4. Enable HTTPS
5. Set up process manager (PM2)

### Frontend (Static hosting)
1. Run `npm run build` in frontend
2. Deploy build folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages

## API Testing

### Using cURL
```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Get blogs
curl http://localhost:5000/api/blogs
```

### Using Postman
1. Import collection from API documentation
2. Set base URL: `http://localhost:5000/api`
3. Add Authorization header: `Bearer <your-token>`

## Support

For issues or questions:
1. Check TESTING_SUMMARY.md for component details
2. Review README.md for API documentation
3. Check browser console for frontend errors
4. Check terminal for backend errors

## Success Indicators

✅ Backend running on port 5000
✅ Frontend running on port 3000
✅ MongoDB connected
✅ Can register and login
✅ Can create and view blogs
✅ Can like and comment
✅ Notifications working

Enjoy your Modern Blog Application! 🎉
