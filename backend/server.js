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
const { assertValidEnvironment } = require('./utils/envValidation');

assertValidEnvironment({ profile: 'server' });

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
const draftRoutes = require('./routes/draftRoutes');
const chatbotRoutes = require('./routes/chatbot');
const seoRoutes = require('./routes/seoRoutes');
const searchRoutes = require('./routes/searchRoutes');
const templatePresetRoutes = require('./routes/templatePresetRoutes');
const widgetRoutes = require('./routes/widgetRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const couponRoutes = require('./routes/couponRoutes');
const earningsRoutes = require('./routes/earningsRoutes');
const priceChangeRoutes = require('./routes/priceChangeRoutes');
const systemRoutes = require('./routes/systemRoutes');
const supportRoutes = require('./routes/supportRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { systemMonitor, getMetrics } = require('./middleware/monitoring');
const { startDatabaseMonitor } = require('./utils/dbMonitor');
const { initializeCacheStore } = require('./utils/cacheStore');
const { ensureSearchIndexes } = require('./utils/searchIndexBootstrap');
const { initSentry, attachSentryErrorHandler } = require('./utils/sentry');
const { createRedisRateLimitStore } = require('./utils/redisRateLimitStore');
const chatSocket = require('./socket/chatSocket');
const { cleanupOldNotifications } = require('./controllers/socialController');
const cleanupExpiredStatuses = require('./utils/statusCleanup');
const cleanupExpiredMessages = require('./jobs/cleanupExpiredMessages');
const publishScheduledContent = require('./jobs/publishScheduledContent');
const cleanupExpiredGuests = require('./jobs/cleanupExpiredGuests');
const { startPendingPaymentExpiryJob } = require('./jobs/expirePendingPayments');
const { getBackgroundQueueStatus, initializeBackgroundQueues } = require('./jobs/queueService');
const { logWarn } = require('./utils/safeErrorLog');

const app = express();
const server = http.createServer(app);
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);
const zohoOAuthSetupEnabled = process.env.ZOHO_OAUTH_SETUP_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
initSentry({ app });

initializeCacheStore().catch((error) => {
  console.warn('[cache] Initialization warning:', error?.message || error);
});
const splitEnvList = (value = '') =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeCorsOrigin = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:', 'capacitor:'].includes(parsed.protocol)) return '';
    if (!parsed.host) return '';
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    return '';
  }
};

const compactUnique = (values = []) => [...new Set(values.filter(Boolean))];

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD,
  process.env.PUBLIC_SITE_URL,
  process.env.BACKEND_PUBLIC_URL,
  ...splitEnvList(process.env.CORS_ALLOWED_ORIGINS),
];

const developmentOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.0.101:3000',
  'http://localhost:5000',
  'https://localhost',
  'capacitor://localhost',
];

const allowedOrigins = compactUnique([
  ...configuredOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : developmentOrigins),
].map(normalizeCorsOrigin));

const allowedOriginSet = new Set(allowedOrigins);

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);

  const normalized = normalizeCorsOrigin(origin);
  if (normalized && allowedOriginSet.has(normalized)) {
    return callback(null, true);
  }

  return callback(null, false);
};

const toWebSocketOrigin = (origin = '') => {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === 'https:') return `wss://${parsed.host}`;
    if (parsed.protocol === 'http:') return `ws://${parsed.host}`;
  } catch (error) {
    return '';
  }
  return '';
};

const livekitHttpOrigin = (() => {
  const wsUrl = String(process.env.LIVEKIT_WS_URL || '').trim();
  if (!wsUrl) return '';
  return wsUrl.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
})();

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
  scriptSrc: ["'self'", ...allowedOrigins, 'https://checkout.razorpay.com'],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
  frameSrc: [
    "'self'",
    'https://checkout.razorpay.com',
    'https://api.razorpay.com',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://player.vimeo.com',
  ],
  connectSrc: [
    "'self'",
    ...allowedOrigins,
    ...allowedOrigins.map(toWebSocketOrigin).filter(Boolean),
    livekitHttpOrigin,
    process.env.LIVEKIT_WS_URL,
    'https://checkout.razorpay.com',
    'https://api.razorpay.com',
    ...splitEnvList(process.env.CSP_CONNECT_SRC),
  ].filter(Boolean),
  manifestSrc: ["'self'"],
  workerSrc: ["'self'", 'blob:'],
  upgradeInsecureRequests: null,
};

['SCRIPT', 'STYLE', 'IMG', 'MEDIA', 'FRAME', 'FONT'].forEach((type) => {
  const key = `${type.toLowerCase()}Src`;
  const envKey = `CSP_${type}_SRC`;
  cspDirectives[key] = [...cspDirectives[key], ...splitEnvList(process.env[envKey])];
});

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

const jsonBodyLimit = process.env.REQUEST_JSON_LIMIT || '1mb';
const urlencodedBodyLimit = process.env.REQUEST_URLENCODED_LIMIT || '256kb';
const webhookRawBodyLimit = process.env.WEBHOOK_RAW_BODY_LIMIT || '128kb';
const urlencodedParameterLimit = toPositiveInt(process.env.REQUEST_URLENCODED_PARAMETER_LIMIT, 1000);
const publicUploadsPath = path.resolve(process.env.PUBLIC_UPLOAD_DIR || path.join(__dirname, 'uploads'));

// Middleware
app.use(cors({ 
  origin: corsOrigin,
  credentials: true 
}));
app.use('/api/payments/webhook/razorpay', express.raw({ type: 'application/json', limit: webhookRawBodyLimit }));
app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({
  extended: true,
  limit: urlencodedBodyLimit,
  parameterLimit: urlencodedParameterLimit
}));
app.use(compression());

const exposeInternalErrors = process.env.EXPOSE_INTERNAL_ERRORS === 'true';
const genericServerErrorMessage = 'Internal server error';

const sanitizeServerErrorBody = (body) => {
  if (exposeInternalErrors || body === undefined || body === null) return body;

  if (Buffer.isBuffer(body)) return Buffer.from(genericServerErrorMessage);
  if (typeof body === 'string') return genericServerErrorMessage;

  if (typeof body === 'object') {
    const sanitized = Array.isArray(body) ? [...body] : { ...body };
    if ('message' in sanitized) sanitized.message = genericServerErrorMessage;
    if ('error' in sanitized) {
      if (typeof sanitized.error === 'string') sanitized.error = genericServerErrorMessage;
      else delete sanitized.error;
    }
    delete sanitized.stack;
    delete sanitized.details;
    if (!('message' in sanitized) && !('error' in sanitized)) {
      sanitized.message = genericServerErrorMessage;
    }
    return sanitized;
  }

  return genericServerErrorMessage;
};

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let sendingJson = false;

  res.json = (body) => {
    sendingJson = true;
    try {
      return originalJson(res.statusCode >= 500 ? sanitizeServerErrorBody(body) : body);
    } finally {
      sendingJson = false;
    }
  };
  res.send = (body) => {
    if (sendingJson) return originalSend(body);
    return originalSend(res.statusCode >= 500 ? sanitizeServerErrorBody(body) : body);
  };

  next();
});

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: cspDirectives,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: 60 * 60 * 24 * 180, includeSubDomains: true, preload: false }
        : false
  })
);
app.use(mongoSanitize());

const toNonNegativeInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const authRateLimitWindowMs = toPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const authRateLimitMax = toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 12);
const apiRateLimitWindowMs = toPositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const rateLimitFailOpen =
  process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_FAIL_OPEN === 'true';

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

const createLimiterOptions = ({ windowMs, max, message, prefix }) => {
  const store = createRedisRateLimitStore({ prefix, windowMs });
  return {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: Boolean(store) && rateLimitFailOpen,
    handler: createRateLimitHandler(message, windowMs),
    ...(store ? { store } : {})
  };
};

const authLimiter = rateLimit({
  ...createLimiterOptions({
    windowMs: authRateLimitWindowMs,
    max: authRateLimitMax,
    message: 'Too many authentication attempts. Please try again later.',
    prefix: 'auth'
  })
});

const authLimiterExceptSessionHydration = (req, res, next) => {
  if (req.method === 'GET' && req.path === '/me') {
    return next();
  }

  return authLimiter(req, res, next);
};

const apiLimiter = rateLimit({
  ...createLimiterOptions({
    windowMs: apiRateLimitWindowMs,
    max: toPositiveInt(process.env.API_RATE_LIMIT_MAX, 180),
    message: 'Too many requests. Please wait a moment and try again.',
    prefix: 'api'
  })
});

const realtimeLimiter = rateLimit({
  ...createLimiterOptions({
    windowMs: apiRateLimitWindowMs,
    max: toPositiveInt(process.env.REALTIME_API_RATE_LIMIT_MAX, 1200),
    message: 'Chat is receiving too many requests. Please wait a moment and try again.',
    prefix: 'realtime'
  })
});

const voiceUploadLimiter = rateLimit({
  ...createLimiterOptions({
    windowMs: apiRateLimitWindowMs,
    max: toPositiveInt(process.env.VOICE_UPLOAD_RATE_LIMIT_MAX, 60),
    message: 'Too many voice messages. Please wait a moment and try again.',
    prefix: 'voice'
  })
});

app.use(systemMonitor);
app.use('/uploads', express.static(publicUploadsPath, {
  dotfiles: 'deny',
  fallthrough: false,
  immutable: false,
  maxAge: '1h',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Security-Policy',
      "sandbox; default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; object-src 'none'; script-src 'none'; style-src 'none'; base-uri 'none'; form-action 'none'"
    );
  }
}));

// Serve static frontend files (PRODUCTION)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'build');
  app.use((req, res, next) => {
    if (req.path.toLowerCase().endsWith('.map')) {
      return res.status(404).send('Not found');
    }
    return next();
  });
  app.use(express.static(buildPath, {
    dotfiles: 'deny',
    index: false,
    fallthrough: true,
    immutable: false,
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const fileName = path.basename(filePath).toLowerCase();
      if (['asset-manifest.json', 'manifest.json', 'service-worker.js'].includes(fileName)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  console.log('✅ Serving static files from:', buildPath);
}

// Test routes
app.get('/api', (req, res) => {
  res.send('✅ API is running!');
});

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Backend is working!', timestamp: new Date() });
  });
}

// Public health endpoints for uptime probes and platform monitors
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'lekhon-backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  const metrics = getMetrics();
  const queue = getBackgroundQueueStatus();
  const isReady = metrics.database === 'connected' && queue.ready;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not-ready',
    service: 'lekhon-backend',
    timestamp: new Date().toISOString(),
    checks: {
      database: metrics.database,
      queue: queue.ready ? 'ready' : queue.redisStatus
    }
  });
});

// SEO + crawler routes
app.use('/', seoRoutes);

// Routes
if (zohoOAuthSetupEnabled) {
  app.use('/api/auth/zoho', authLimiter, require('./routes/zohoAuth'));
}
app.use('/api/auth', authLimiterExceptSessionHydration, authRoutes);
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
app.use('/api/widgets', apiLimiter, widgetRoutes);
app.use('/api/system', apiLimiter, systemRoutes);
app.use('/api/support', apiLimiter, supportRoutes);
app.use('/api/seller', apiLimiter, sellerRoutes);
app.use('/api/seller', apiLimiter, earningsRoutes);
app.use('/api/marketplace', apiLimiter, productRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', apiLimiter, couponRoutes);
app.use('/api/price-changes', apiLimiter, priceChangeRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

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
      if (process.env.NODE_ENV === 'production') throw queueError;
      console.warn('[queue] Failed to initialize background queues:', queueError?.message || queueError);
    }

    try {
      const { scheduleJob } = require('./jobs/autoCompleteOrders');
      await scheduleJob();
    } catch (scheduleError) {
      logWarn('[autoCompleteOrders] Failed to initialize scheduler:', scheduleError);
      if (process.env.NODE_ENV === 'production') throw scheduleError;
    }

    startPendingPaymentExpiryJob();

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



