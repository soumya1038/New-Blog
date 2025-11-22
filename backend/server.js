const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const commentRoutes = require('./routes/commentRoutes');
const socialRoutes = require('./routes/socialRoutes');
const apiRoutes = require('./routes/apiRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const messageRoutes = require('./routes/messageRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const fileRoutes = require('./routes/fileRoutes');
const groupRoutes = require('./routes/groupRoutes');
const callRoutes = require('./routes/callRoutes');
const zohoAuthRoutes = require('./routes/zohoAuth');
const { errorHandler } = require('./middleware/errorHandler');
const chatSocket = require('./socket/chatSocket');
const { cleanupOldNotifications } = require('./controllers/socialController');
const cleanupExpiredStatuses = require('./utils/statusCleanup');
const cleanupExpiredMessages = require('./jobs/cleanupExpiredMessages');

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.0.101:3000',
  'https://blog-frontend-cvda.onrender.com',
  process.env.FRONTEND_URL
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
app.use('/uploads', express.static('uploads'));

// Test routes
app.get('/', (req, res) => {
  res.send('✅ Server is running!');
});

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Backend is working!', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/external', apiRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/auth/zoho', zohoAuthRoutes);

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
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
