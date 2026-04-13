const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const articleRoutes = require('./routes/articleRoutes');
const shortRoutes = require('./routes/shortRoutes');
const commentRoutes = require('./routes/commentRoutes');
const socialRoutes = require('./routes/socialRoutes');
const apiRoutes = require('./routes/apiRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const guestRoutes = require('./routes/guestRoutes');
const messageRoutes = require('./routes/messageRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const fileRoutes = require('./routes/fileRoutes');
const groupRoutes = require('./routes/groupRoutes');
const callRoutes = require('./routes/callRoutes');
const livekitRoutes = require('./routes/livekit');
const zohoAuthRoutes = require('./routes/zohoAuth');
const draftRoutes = require('./routes/draftRoutes');
const chatbotRoutes = require('./routes/chatbot');
const seoRoutes = require('./routes/seoRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { systemMonitor } = require('./middleware/monitoring');
const { startDatabaseMonitor } = require('./utils/dbMonitor');
const chatSocket = require('./socket/chatSocket');
const { cleanupOldNotifications } = require('./controllers/socialController');
const cleanupExpiredStatuses = require('./utils/statusCleanup');
const cleanupExpiredMessages = require('./jobs/cleanupExpiredMessages');
const publishScheduledContent = require('./jobs/publishScheduledContent');
const cleanupExpiredGuests = require('./jobs/cleanupExpiredGuests');

const app = express();
const server = http.createServer(app);
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.0.101:3000',
  'http://localhost:5000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use(cors({ 
  origin: allowedOrigins,
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: 60 * 60 * 24 * 180, includeSubDomains: true, preload: false }
        : false
  })
);
app.use(mongoSanitize());

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const authLimiter = rateLimit({
  windowMs: toPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 12),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: toPositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInt(process.env.API_RATE_LIMIT_MAX, 180),
  standardHeaders: true,
  legacyHeaders: false
});

app.use(systemMonitor);
app.use('/uploads', express.static('uploads'));

// Serve static frontend files (PRODUCTION)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'build');
  app.use(express.static(buildPath));
  console.log('✅ Serving static files from:', buildPath);
}

// Test routes
app.get('/api', (req, res) => {
  res.send('✅ API is running!');
});

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Backend is working!', timestamp: new Date() });
});

// SEO + crawler routes
app.use('/', seoRoutes);

// Routes
app.use('/api/auth/zoho', authLimiter, zohoAuthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/blogs', apiLimiter, blogRoutes);
app.use('/api/articles', apiLimiter, articleRoutes);
app.use('/api/shorts', apiLimiter, shortRoutes);
app.use('/api/comments', apiLimiter, commentRoutes);
app.use('/api/social', apiLimiter, socialRoutes);
app.use('/api/external', apiLimiter, apiRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/guest', apiLimiter, guestRoutes);
app.use('/api/messages', apiLimiter, messageRoutes);
app.use('/api/voice', apiLimiter, voiceRoutes);
app.use('/api/files', apiLimiter, fileRoutes);
app.use('/api/groups', apiLimiter, groupRoutes);
app.use('/api/calls', apiLimiter, callRoutes);
app.use('/api/livekit', apiLimiter, livekitRoutes);
app.use('/api/drafts', apiLimiter, draftRoutes);
app.use('/api/chatbot', apiLimiter, chatbotRoutes);

// SPA fallback - MUST be AFTER all API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'build', 'index.html');
    const fs = require('fs');
    
    if (fs.existsSync(indexPath)) {
      console.log('📄 Serving index.html for:', req.path);
      res.sendFile(indexPath);
    } else {
      console.error('❌ Build folder not found at:', indexPath);
      res.status(500).send('Frontend build not found. Please check build logs.');
    }
  });
} else {
  app.get('*', (req, res) => {
    res.send('✅ Server is running in development mode!');
  });
}

// Error handler
app.use(errorHandler);

// Initialize Socket.io
const onlineUsers = new Map();
app.set('onlineUsers', onlineUsers);
chatSocket(io, onlineUsers);

// Make io accessible globally for notifications
app.set('io', io);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(process.env.PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${process.env.PORT}`);
      console.log(`✅ Server accessible at http://0.0.0.0:${process.env.PORT}`);
      console.log('✅ Socket.io initialized');
      
      // Auto-cleanup old notifications every hour
      setInterval(cleanupOldNotifications, 60 * 60 * 1000);
      cleanupOldNotifications(); // Run immediately on startup
      console.log('✅ Notification auto-cleanup scheduled');
      
      // Auto-cleanup expired statuses every hour
      setInterval(cleanupExpiredStatuses, 60 * 60 * 1000);
      cleanupExpiredStatuses(); // Run immediately on startup
      console.log('✅ Status auto-cleanup scheduled');
      
      // Start Cloudinary cleanup cron job
      cleanupExpiredMessages();
      console.log('✅ Message Cloudinary cleanup scheduled');
      
      // Start scheduled content publish job
      publishScheduledContent(io);
      console.log('✅ Scheduled content publish job started');
      
      // Start guest user cleanup job
      cleanupExpiredGuests();
      console.log('✅ Guest user cleanup job started');
      
      // Start database size monitor
      startDatabaseMonitor();
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
