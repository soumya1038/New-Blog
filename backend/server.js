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
const searchRoutes = require('./routes/searchRoutes');
const templatePresetRoutes = require('./routes/templatePresetRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const couponRoutes = require('./routes/couponRoutes');
const earningsRoutes = require('./routes/earningsRoutes');
const priceChangeRoutes = require('./routes/priceChangeRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { systemMonitor, getMetrics } = require('./middleware/monitoring');
const { startDatabaseMonitor } = require('./utils/dbMonitor');
const { initializeCacheStore } = require('./utils/cacheStore');
const { ensureSearchIndexes } = require('./utils/searchIndexBootstrap');
const { initSentry, attachSentryErrorHandler } = require('./utils/sentry');
const chatSocket = require('./socket/chatSocket');
const { cleanupOldNotifications } = require('./controllers/socialController');
const cleanupExpiredStatuses = require('./utils/statusCleanup');
const cleanupExpiredMessages = require('./jobs/cleanupExpiredMessages');
const publishScheduledContent = require('./jobs/publishScheduledContent');
const cleanupExpiredGuests = require('./jobs/cleanupExpiredGuests');
const { initializeBackgroundQueues } = require('./jobs/queueService');

const app = express();
const server = http.createServer(app);
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);
initSentry({ app });

initializeCacheStore().catch((error) => {
  console.warn('[cache] Initialization warning:', error?.message || error);
});
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.0.101:3000',
  'http://localhost:5000',
  'https://localhost',
  'capacitor://localhost',
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
app.use('/api/payments/webhook/razorpay', express.raw({ type: 'application/json' }));
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

const toNonNegativeInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const authRateLimitWindowMs = toPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const authRateLimitMax = toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 12);
const apiRateLimitWindowMs = toPositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);

const getRetryAfterSeconds = (req, fallbackMs) => {
  const resetTime = req.rateLimit?.resetTime;
  const resetMs = resetTime instanceof Date ? resetTime.getTime() : Number(resetTime);
  const resetSeconds = Number.isFinite(resetMs) ? Math.ceil((resetMs - Date.now()) / 1000) : 0;
  return Math.max(1, resetSeconds || Math.ceil(fallbackMs / 1000));
};

const createRateLimitHandler = (message, fallbackMs) => (req, res) => {
  const retryAfterSeconds = getRetryAfterSeconds(req, fallbackMs);
  res.set('Retry-After', String(retryAfterSeconds));
  return res.status(429).json({
    success: false,
    message,
    retryAfterSeconds
  });
};

const authLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many authentication attempts. Please try again later.', authRateLimitWindowMs)
});

const apiLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  max: toPositiveInt(process.env.API_RATE_LIMIT_MAX, 180),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests. Please wait a moment and try again.', apiRateLimitWindowMs)
});

const realtimeLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  max: toPositiveInt(process.env.REALTIME_API_RATE_LIMIT_MAX, 1200),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Chat is receiving too many requests. Please wait a moment and try again.', apiRateLimitWindowMs)
});

const voiceUploadLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  max: toPositiveInt(process.env.VOICE_UPLOAD_RATE_LIMIT_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many voice messages. Please wait a moment and try again.', apiRateLimitWindowMs)
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

// Public health endpoints for uptime probes and platform monitors
app.get('/health', (req, res) => {
  const metrics = getMetrics();
  res.status(200).json({
    status: 'ok',
    service: 'lekhon-backend',
    timestamp: new Date().toISOString(),
    ...metrics
  });
});

app.get('/ready', (req, res) => {
  const metrics = getMetrics();
  const isReady = metrics.database === 'connected';

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not-ready',
    service: 'lekhon-backend',
    timestamp: new Date().toISOString(),
    checks: {
      database: metrics.database
    }
  });
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
app.use('/api/messages', realtimeLimiter, messageRoutes);
app.use('/api/voice', voiceUploadLimiter, voiceRoutes);
app.use('/api/files', apiLimiter, fileRoutes);
app.use('/api/groups', realtimeLimiter, groupRoutes);
app.use('/api/calls', realtimeLimiter, callRoutes);
app.use('/api/livekit', realtimeLimiter, livekitRoutes);
app.use('/api/drafts', apiLimiter, draftRoutes);
app.use('/api/chatbot', apiLimiter, chatbotRoutes);
app.use('/api/search', apiLimiter, searchRoutes);
app.use('/api/template-presets', apiLimiter, templatePresetRoutes);
app.use('/api/system', apiLimiter, systemRoutes);
app.use('/api/seller', apiLimiter, sellerRoutes);
app.use('/api/seller', apiLimiter, earningsRoutes);
app.use('/api/marketplace', apiLimiter, productRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', apiLimiter, couponRoutes);
app.use('/api/price-changes', apiLimiter, priceChangeRoutes);

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
attachSentryErrorHandler(app);
app.use(errorHandler);

// Initialize Socket.io
const onlineUsers = new Map();
app.set('onlineUsers', onlineUsers);
chatSocket(io, onlineUsers);

// Make io accessible globally for notifications
app.set('io', io);

// MongoDB connection
const mongoConnectionOptions = {
  maxPoolSize: toPositiveInt(process.env.MONGODB_MAX_POOL_SIZE, 80),
  minPoolSize: toNonNegativeInt(process.env.MONGODB_MIN_POOL_SIZE, 0),
  maxIdleTimeMS: toPositiveInt(process.env.MONGODB_MAX_IDLE_TIME_MS, 60 * 1000),
  waitQueueTimeoutMS: toPositiveInt(process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS, 10 * 1000),
  serverSelectionTimeoutMS: toPositiveInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 10 * 1000),
  socketTimeoutMS: toPositiveInt(process.env.MONGODB_SOCKET_TIMEOUT_MS, 45 * 1000)
};

mongoose.connect(process.env.MONGODB_URI, mongoConnectionOptions)
  .then(async () => {
    console.log('✅ MongoDB connected');
    
    try {
      await ensureSearchIndexes();
    } catch (indexError) {
      console.warn('[search] Failed to ensure text indexes:', indexError?.message || indexError);
    }

    try {
      await initializeBackgroundQueues({ startWorkers: process.env.QUEUE_START_WORKERS_IN_API !== 'false' });
    } catch (queueError) {
      console.warn('[queue] Failed to initialize background queues:', queueError?.message || queueError);
    }

    const { scheduleJob } = require('./jobs/autoCompleteOrders');
    scheduleJob();

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



