const path = require('path');

const PLACEHOLDER_PATTERNS = [
  /^your[_-]/i,
  /^change[_-]?me/i,
  /^changeme/i,
  /^example$/i,
  /^test[_-]/i,
  /^dev[_-]/i,
  /connection[_-]?string/i,
  /min[_-]?32[_-]?chars/i,
];

const MIN_SECRET_LENGTH = 32;
const BACKEND_ROOT = path.resolve(__dirname, '..');

const CORE_REQUIRED = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'ENCRYPTION_KEY',
];

const DEDICATED_SECRET_KEYS = [
  'API_KEY_HASH_SECRET',
  'VERIFICATION_CODE_PEPPER',
  'TWO_FACTOR_SECRET',
  'TEMPORARY_STATE_SECRET',
  'CONTENT_VIEW_HASH_SECRET',
];

const PRODUCTION_REQUIRED = [
  ...DEDICATED_SECRET_KEYS,
  'FRONTEND_URL',
  'PUBLIC_SITE_URL',
  'BACKEND_PUBLIC_URL',
  'BREVO_API_KEY',
  'BREVO_FROM_EMAIL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'LIVEKIT_WS_URL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
];

const SECRET_KEYS = [
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  ...DEDICATED_SECRET_KEYS,
  'TURN_STATIC_AUTH_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
];

const getValue = (env, key) => String(env[key] || '').trim();

const isPlaceholderValue = (value) =>
  PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(String(value || '').trim()));

const isPositivePort = (value) => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535;
};

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
};

const isLocalHost = (hostname = '') =>
  ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(String(hostname || '').toLowerCase());

const isWebSocketUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch (error) {
    return false;
  }
};

const isMongoUrl = (value) => {
  const parsed = parseUrl(value);
  return parsed && ['mongodb:', 'mongodb+srv:'].includes(parsed.protocol);
};

const isRedisUrl = (value) => {
  const parsed = parseUrl(value);
  return parsed && ['redis:', 'rediss:'].includes(parsed.protocol);
};

const BYTE_SIZE_UNITS = {
  b: 1,
  kb: 1024,
  k: 1024,
  mb: 1024 * 1024,
  m: 1024 * 1024,
};
const BACKGROUND_REMOVAL_PROVIDERS = new Set(['removebg', 'service']);

const parseInteger = (value) => {
  const raw = String(value || '').trim();
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const parseNumber = (value) => {
  const raw = String(value || '').trim();
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseByteSize = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(b|kb|k|mb|m)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  const multiplier = BYTE_SIZE_UNITS[match[2]];
  if (!Number.isFinite(amount) || amount <= 0 || !multiplier) return null;
  return Math.ceil(amount * multiplier);
};

const splitEnvList = (value = '') =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const resolveRuntimePath = (value = '') =>
  path.resolve(BACKEND_ROOT, String(value || '').trim());

const isSameOrChildPath = (candidatePath, parentPath) => {
  const relative = path.relative(parentPath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const isAllowedCorsProtocol = (protocol = '') =>
  ['http:', 'https:', 'capacitor:'].includes(protocol);

const CSP_EXTENSION_KEYS = [
  'CSP_CONNECT_SRC',
  'CSP_SCRIPT_SRC',
  'CSP_STYLE_SRC',
  'CSP_IMG_SRC',
  'CSP_MEDIA_SRC',
  'CSP_FRAME_SRC',
  'CSP_FONT_SRC',
];

const CSP_SAFE_KEYWORDS = new Set(["'self'", "'none'", "'strict-dynamic'", "'report-sample'"]);
const CSP_UNSAFE_KEYWORDS = new Set([
  '*',
  "'unsafe-inline'",
  "'unsafe-eval'",
  "'unsafe-hashes'",
  "'wasm-unsafe-eval'",
]);
const CSP_HASH_SOURCE_PATTERN = /^'(?:sha256|sha384|sha512)-[A-Za-z0-9+/]+={0,2}'$/;

const getProductionCspSourceError = (key, source) => {
  const normalized = String(source || '').trim();
  if (!normalized) return null;

  if (normalized.includes('*')) {
    return 'must not use wildcard sources in production';
  }
  if (CSP_UNSAFE_KEYWORDS.has(normalized)) {
    return `must not use ${normalized} in production`;
  }
  if (CSP_SAFE_KEYWORDS.has(normalized) || CSP_HASH_SOURCE_PATTERN.test(normalized)) {
    return null;
  }
  if (/^(?:http|ws|data|blob):$/i.test(normalized)) {
    return 'must not use broad or plaintext scheme sources in production';
  }

  const parsed = parseUrl(normalized);
  if (!parsed) {
    return 'must be a valid CSP source';
  }
  if (parsed.username || parsed.password) {
    return 'must not include credentials';
  }
  if (isLocalHost(parsed.hostname)) {
    return 'must not point to localhost in production';
  }
  if (parsed.protocol === 'https:') {
    return null;
  }
  if (key === 'CSP_CONNECT_SRC' && parsed.protocol === 'wss:') {
    return null;
  }

  return key === 'CSP_CONNECT_SRC'
    ? 'must use https:// or wss:// in production'
    : 'must use https:// in production';
};

const PRIVATE_UPLOAD_TEMP_DIR_RULES = [
  ['DIGITAL_UPLOAD_TEMP_DIR', 'tmp/digital-temp'],
  ['CHAT_FILE_UPLOAD_TEMP_DIR', 'tmp/chat-files'],
  ['VOICE_UPLOAD_TEMP_DIR', 'tmp/voice'],
  ['STATUS_MEDIA_UPLOAD_TEMP_DIR', 'tmp/status-media'],
];

const SIZE_RULES = [
  ['REQUEST_JSON_LIMIT', 1, 2 * 1024 * 1024],
  ['REQUEST_URLENCODED_LIMIT', 1, 1024 * 1024],
  ['WEBHOOK_RAW_BODY_LIMIT', 1, 1024 * 1024],
];

const INTEGER_RULES = [
  ['REQUEST_URLENCODED_PARAMETER_LIMIT', 1, 5000],
  ['DIGITAL_FILE_UPLOAD_MAX_MB', 1, 1024],
  ['DIGITAL_FILE_UPLOAD_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['DIGITAL_FILE_UPLOAD_RATE_LIMIT_MAX', 1, 1000],
  ['CHAT_FILE_UPLOAD_MAX_MB', 1, 100],
  ['CHAT_FILE_UPLOAD_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['CHAT_FILE_UPLOAD_RATE_LIMIT_MAX', 1, 1000],
  ['MEDIA_UPLOAD_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['MEDIA_UPLOAD_RATE_LIMIT_MAX', 1, 1000],
  ['VOICE_UPLOAD_MAX_MB', 1, 50],
  ['WHISPER_UPLOAD_MAX_MB', 1, 50],
  ['STATUS_MEDIA_UPLOAD_MAX_MB', 1, 50],
  ['STATUS_MEDIA_URL_TTL_SECONDS', 60, 60 * 60],
  ['STATUS_MEDIA_ACCESS_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['STATUS_MEDIA_ACCESS_RATE_LIMIT_MAX', 1, 5000],
  ['MAX_ORDER_ITEM_QTY', 1, 1000],
  ['ENCRYPTION_MIGRATION_BATCH_LIMIT', 1, 2000],
  ['MAX_PAYMENT_ITEMS', 1, 500],
  ['MAX_PENDING_PAYMENT_ORDERS_PER_USER', 1, 20],
  ['PAYMENT_RESERVATION_TTL_MINUTES', 5, 24 * 60],
  ['PAYMENT_EXPIRY_BATCH_LIMIT', 1, 500],
  ['PAYMENT_EXPIRY_INTERVAL_MS', 10000, 60 * 60 * 1000],
  ['PAYMENT_EXPIRY_LOCK_MS', 30000, 60 * 60 * 1000],
  ['AUTHORIZED_PAYMENT_GRACE_MINUTES', 5, 24 * 60],
  ['IDEMPOTENCY_EVENT_RETENTION_DAYS', 30, 3650],
  ['MAX_CART_ITEM_QTY', 1, 1000],
  ['MAX_ORDER_PAGE_LIMIT', 1, 500],
  ['ORDER_QUERY_MAX_TIME_MS', 100, 30000],
  ['ORDER_AUTO_COMPLETE_DAYS', 1, 365],
  ['ORDER_AUTO_COMPLETE_BATCH_LIMIT', 1, 1000],
  ['EARNING_RELEASE_BATCH_LIMIT', 1, 5000],
  ['MAX_EARNINGS_PAGE_LIMIT', 1, 500],
  ['MAX_ADMIN_PAYOUT_PAGE_LIMIT', 1, 500],
  ['MAX_PAYOUT_EARNING_BATCH', 1, 5000],
  ['EARNINGS_QUERY_MAX_TIME_MS', 100, 30000],
  ['MAX_RESTOCK_QTY', 1, 100000],
  ['COUPON_CODE_MAX_LENGTH', 3, 80],
  ['COUPON_VALIDATE_MAX_ITEMS', 1, 500],
  ['COUPON_QUERY_MAX_TIME_MS', 100, 30000],
  ['SELLER_PRODUCT_MAX_LIMIT', 1, 500],
  ['SELLER_PRODUCT_MAX_PAGE', 1, 10000],
  ['MARKETPLACE_PRODUCT_MAX_PAGE', 1, 10000],
  ['MARKETPLACE_SEARCH_MAX_PAGE', 1, 1000],
  ['MARKETPLACE_SEARCH_MAX_LENGTH', 1, 500],
  ['MARKETPLACE_FILTER_VALUE_MAX_LENGTH', 1, 200],
  ['MARKETPLACE_CATEGORY_FILTER_MAX', 1, 100],
  ['MARKETPLACE_SEARCH_FETCH_MAX', 1, 1000],
  ['MARKETPLACE_QUERY_MAX_TIME_MS', 100, 30000],
  ['MAX_WISHLIST_ITEMS', 1, 5000],
  ['REVIEW_TITLE_MAX_LENGTH', 1, 500],
  ['REVIEW_BODY_MAX_LENGTH', 1, 5000],
  ['REVIEW_REPLY_MAX_LENGTH', 1, 5000],
  ['MAX_STORE_FEATURED_PRODUCTS', 1, 100],
  ['MAX_SELLER_APP_PAGE_LIMIT', 1, 500],
  ['STORE_QUERY_MAX_TIME_MS', 100, 30000],
  ['SELLER_QUERY_MAX_TIME_MS', 100, 30000],
  ['DIGITAL_MAX_DOWNLOADS', 1, 10000],
  ['ADMIN_LIST_DEFAULT_LIMIT', 1, 500],
  ['ADMIN_LIST_MAX_LIMIT', 1, 500],
  ['ADMIN_LIST_MAX_PAGE', 1, 10000],
  ['ADMIN_STATS_MAX_DAYS', 1, 365],
  ['ADMIN_QUERY_MAX_TIME_MS', 100, 30000],
  ['ADMIN_SUSPENSION_MAX_DAYS', 1, 36500],
  ['ADMIN_NOTICE_REASON_MAX_LENGTH', 50, 5000],
  ['ADMIN_PRE_DELETION_NOTICE_MAX_DAYS', 1, 3650],
  ['DRAFT_LIST_MAX_LIMIT', 1, 500],
  ['DRAFT_QUERY_MAX_TIME_MS', 100, 30000],
  ['TEMPLATE_PRESET_QUERY_MAX_TIME_MS', 100, 30000],
  ['PRICE_CHANGE_QUERY_MAX_TIME_MS', 100, 30000],
  ['MESSAGE_LIST_MAX_LIMIT', 1, 500],
  ['CONVERSATION_LIST_MAX_LIMIT', 1, 500],
  ['MESSAGE_CLEAR_DELETE_BATCH_LIMIT', 1, 1000],
  ['MESSAGE_QUERY_MAX_TIME_MS', 100, 30000],
  ['MESSAGE_TEXT_MAX_LENGTH', 1, 20000],
  ['MESSAGE_FILE_CAPTION_MAX_LENGTH', 1, 10000],
  ['MESSAGE_FILE_NAME_MAX_LENGTH', 1, 512],
  ['MESSAGE_MEDIA_URL_TTL_SECONDS', 60, 60 * 60],
  ['MESSAGE_MEDIA_ACCESS_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['MESSAGE_MEDIA_ACCESS_RATE_LIMIT_MAX', 1, 5000],
  ['SOCKET_PENDING_DELIVERY_BATCH_LIMIT', 1, 1000],
  ['SOCKET_MARK_READ_BATCH_LIMIT', 1, 1000],
  ['SOCKET_QUERY_MAX_TIME_MS', 100, 30000],
  ['SOCKET_ROOM_NAME_MAX_LENGTH', 1, 512],
  ['SOCKET_ROUTE_MAX_LENGTH', 1, 512],
  ['SOCKET_CALL_SDP_MAX_LENGTH', 1, 262144],
  ['SOCKET_CALL_CANDIDATE_MAX_LENGTH', 1, 16384],
  ['SOCKET_CALL_MID_MAX_LENGTH', 1, 256],
  ['SOCKET_CALL_INITIATE_MAX_AGE_SECONDS', 1, 3600],
  ['SOCKET_DIRECT_CALL_SESSION_TTL_SECONDS', 60, 24 * 60 * 60],
  ['SOCKET_DIRECT_CALL_SESSION_MAX_ENTRIES', 100, 100000],
  ['CALL_QUERY_MAX_TIME_MS', 100, 30000],
  ['NOTIFICATION_LIST_DEFAULT_LIMIT', 1, 500],
  ['NOTIFICATION_LIST_MAX_LIMIT', 1, 500],
  ['NOTIFICATION_LIST_MAX_PAGE', 1, 10000],
  ['NOTIFICATION_RETENTION_HOURS', 1, 24 * 90],
  ['NOTIFICATION_CLEANUP_BATCH_LIMIT', 1, 5000],
  ['NOTIFICATION_QUERY_MAX_TIME_MS', 100, 30000],
  ['SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS', 100, 30000],
  ['TRACK_ACTIVITY_UPDATE_INTERVAL_SECONDS', 1, 60 * 60],
  ['TRACK_ACTIVITY_CACHE_MAX_USERS', 1, 250000],
  ['TRACK_ACTIVITY_QUERY_MAX_TIME_MS', 100, 30000],
  ['REMOVE_BG_TIMEOUT_MS', 1000, 60000],
  ['BG_REMOVER_TIMEOUT_MS', 1000, 60000],
  ['BG_REMOVER_WARMUP_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['BG_REMOVER_WARMUP_RATE_LIMIT_MAX', 1, 1000],
  ['GROUP_MAX_MEMBERS', 2, 1000],
  ['GROUP_MEMBER_ADD_MAX', 1, 500],
  ['GROUP_CALL_HISTORY_MAX_LIMIT', 1, 500],
  ['COMMENT_MAX_THREAD_DEPTH', 1, 100],
  ['COMMENT_DESCENDANT_DELETE_MAX', 1, 50000],
  ['COMMENT_QUERY_MAX_TIME_MS', 100, 30000],
  ['SCHEDULED_PUBLISH_BATCH_LIMIT', 1, 500],
  ['SCHEDULED_PUBLISH_QUERY_MAX_TIME_MS', 100, 30000],
  ['MESSAGE_MEDIA_CLEANUP_BATCH_LIMIT', 1, 1000],
  ['MESSAGE_MEDIA_MIGRATION_BATCH_LIMIT', 1, 1000],
  ['MESSAGE_RETENTION_DAYS', 1, 3650],
  ['MESSAGE_CLEANUP_MAX_BATCHES', 1, 100],
  ['MESSAGE_CLEANUP_LOCK_MS', 1000, 24 * 60 * 60 * 1000],
  ['MESSAGE_CLEANUP_QUERY_MAX_TIME_MS', 100, 30000],
  ['STATUS_CLEANUP_USER_BATCH_LIMIT', 1, 1000],
  ['STATUS_CLEANUP_LOCK_MS', 1000, 24 * 60 * 60 * 1000],
  ['STATUS_CLEANUP_QUERY_MAX_TIME_MS', 100, 30000],
  ['CLOUDINARY_CLEANUP_CONCURRENCY', 1, 50],
  ['ACCOUNT_CLEANUP_MEDIA_CONCURRENCY', 1, 50],
  ['ACCOUNT_CLEANUP_CHUNK_SIZE', 1, 5000],
  ['ACCOUNT_CLEANUP_DB_CONCURRENCY', 1, 50],
  ['ACCOUNT_CLEANUP_QUERY_MAX_TIME_MS', 100, 30000],
  ['DB_STORAGE_ALERT_LIMIT_MB', 1, 10 * 1024 * 1024],
  ['DB_MONITOR_MAX_COLLECTIONS', 1, 10000],
  ['DB_MONITOR_QUERY_MAX_TIME_MS', 100, 30000],
  ['CONTENT_VIEWED_BY_MAX_ENTRIES', 1, 100000],
  ['CONTENT_VIEW_QUERY_MAX_TIME_MS', 100, 30000],
  ['BLOG_QUERY_MAX_TIME_MS', 100, 30000],
  ['ARTICLE_QUERY_MAX_TIME_MS', 100, 30000],
  ['SHORT_QUERY_MAX_TIME_MS', 100, 30000],
  ['CONTENT_VIEW_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['CONTENT_VIEW_RATE_LIMIT_MAX', 1, 5000],
  ['AUTH_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['AUTH_RATE_LIMIT_MAX', 1, 1000],
  ['AUTH_USER_QUERY_MAX_TIME_MS', 100, 30000],
  ['AUTH_BEARER_TOKEN_MAX_LENGTH', 128, 8192],
  ['AUTH_REGISTRATION_CODE_SEND_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['AUTH_REGISTRATION_CODE_SEND_RATE_LIMIT_MAX', 1, 1000],
  ['AUTH_PASSWORD_RESET_SEND_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['AUTH_PASSWORD_RESET_SEND_RATE_LIMIT_MAX', 1, 1000],
  ['AUTH_CODE_VERIFY_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['AUTH_CODE_VERIFY_RATE_LIMIT_MAX', 1, 1000],
  ['AUTH_PROTECTED_PASSWORD_CHANGE_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['AUTH_PROTECTED_PASSWORD_CHANGE_RATE_LIMIT_MAX', 1, 1000],
  ['TWO_FACTOR_SETUP_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['TWO_FACTOR_SETUP_RATE_LIMIT_MAX', 1, 1000],
  ['TWO_FACTOR_CHALLENGE_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['TWO_FACTOR_CHALLENGE_RATE_LIMIT_MAX', 1, 1000],
  ['TWO_FACTOR_VERIFY_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['TWO_FACTOR_VERIFY_RATE_LIMIT_MAX', 1, 1000],
  ['API_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['API_RATE_LIMIT_MAX', 1, 10000],
  ['EXTERNAL_API_QUERY_MAX_TIME_MS', 100, 30000],
  ['EXTERNAL_API_WRITE_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['EXTERNAL_API_WRITE_RATE_LIMIT_MAX', 1, 1000],
  ['API_KEY_AUTH_QUERY_MAX_TIME_MS', 100, 30000],
  ['API_KEY_AUTH_MAX_LENGTH', 32, 512],
  ['AI_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['AI_RATE_LIMIT_MAX', 1, 1000],
  ['CHATBOT_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['CHATBOT_RATE_LIMIT_MAX', 1, 5000],
  ['ZOHO_OAUTH_SETUP_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['ZOHO_OAUTH_SETUP_RATE_LIMIT_MAX', 1, 1000],
  ['WIDGET_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['WIDGET_RATE_LIMIT_MAX', 1, 5000],
  ['MARKETPLACE_EXTERNAL_CLICK_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['MARKETPLACE_EXTERNAL_CLICK_RATE_LIMIT_MAX', 1, 5000],
  ['SUPPORT_SUBMIT_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['SUPPORT_SUBMIT_RATE_LIMIT_MAX', 1, 1000],
  ['SUPPORT_QUERY_MAX_TIME_MS', 100, 30000],
  ['MAX_SUPPORT_PAGE_LIMIT', 1, 500],
  ['MAX_SUPPORT_PAGE', 1, 10000],
  ['PAYMENT_ACTION_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['PAYMENT_ACTION_RATE_LIMIT_MAX', 1, 1000],
  ['PAYMENT_WEBHOOK_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['PAYMENT_WEBHOOK_RATE_LIMIT_MAX', 1, 5000],
  ['PAYOUT_REQUEST_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['PAYOUT_REQUEST_RATE_LIMIT_MAX', 1, 1000],
  ['COUPON_VALIDATE_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['COUPON_VALIDATE_RATE_LIMIT_MAX', 1, 5000],
  ['COMMENT_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['COMMENT_RATE_LIMIT_MAX', 1, 1000],
  ['COMMENT_DUPLICATE_CACHE_MAX_ENTRIES', 100, 100000],
  ['GUEST_SESSION_ID_MAX_LENGTH', 32, 512],
  ['GUEST_PATH_MAX_LENGTH', 20, 1000],
  ['GUEST_USER_AGENT_MAX_LENGTH', 50, 1000],
  ['GUEST_MAX_PAGES_PER_SESSION', 1, 1000],
  ['GUEST_MAX_PAGE_DURATION_SECONDS', 1, 24 * 60 * 60],
  ['GUEST_TRACKING_QUERY_MAX_TIME_MS', 100, 30000],
  ['GUEST_CLEANUP_BATCH_LIMIT', 1, 1000],
  ['GUEST_CLEANUP_CONCURRENCY', 1, 50],
  ['CACHE_TTL_SECONDS', 1, 24 * 60 * 60],
  ['CACHE_MEMORY_MAX_ENTRIES', 100, 100000],
  ['CACHE_TTL_LIST_SECONDS', 1, 24 * 60 * 60],
  ['CACHE_TTL_DETAIL_SECONDS', 1, 24 * 60 * 60],
  ['CACHE_TTL_SEO_SECONDS', 1, 24 * 60 * 60],
  ['SEO_MAX_FEED_ITEMS', 1, 500],
  ['SEO_MAX_SITEMAP_ITEMS', 1, 5000],
  ['SEO_QUERY_MAX_TIME_MS', 100, 30000],
  ['SEO_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['SEO_RATE_LIMIT_MAX', 1, 10000],
  ['SEARCH_MAX_QUERY_LENGTH', 1, 500],
  ['SEARCH_MAX_LIMIT', 1, 500],
  ['SEARCH_MAX_PAGE', 1, 1000],
  ['SEARCH_QUERY_MAX_TIME_MS', 100, 30000],
  ['SEARCH_RATE_LIMIT_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['SEARCH_RATE_LIMIT_MAX', 1, 5000],
  ['QUEUE_JOB_BACKOFF_MS', 100, 60 * 60 * 1000],
  ['QUEUE_EMAIL_FAILED_JOB_RETENTION_SECONDS', 60, 24 * 60 * 60],
  ['QUEUE_EMAIL_FAILED_JOB_RETENTION_COUNT', 1, 5000],
  ['QUEUE_FALLBACK_JOB_DEDUPE_TTL_MS', 1000, 60 * 60 * 1000],
  ['QUEUE_FALLBACK_JOB_DEDUPE_MAX_ENTRIES', 100, 100000],
  ['QUEUE_REDIS_READY_TIMEOUT_MS', 1000, 60000],
  ['QUEUE_SCHEDULER_COMMAND_TIMEOUT_MS', 1000, 60000],
  ['ALERT_MAX_MEMORY_MB', 1, 1048576],
  ['ALERT_MAX_AVG_RESPONSE_MS', 1, 300000],
  ['ALERT_MAX_P95_RESPONSE_MS', 1, 300000],
  ['ALERT_MAX_SLOW_REQUESTS', 1, 100000],
  ['ALERT_SLOW_REQUEST_MS', 1, 300000],
  ['ALERT_ACTIVE_USER_WINDOW_MS', 1000, 24 * 60 * 60 * 1000],
  ['ALERT_ROUTE_STATS_MAX_ENTRIES', 50, 10000],
  ['BREVO_EMAIL_TIMEOUT_MS', 1000, 60000],
  ['BREVO_SMS_TIMEOUT_MS', 1000, 60000],
  ['OAUTH_PROVIDER_TIMEOUT_MS', 1000, 60000],
  ['RAZORPAY_PROVIDER_TIMEOUT_MS', 1000, 60000],
  ['LIVEKIT_PROVIDER_TIMEOUT_MS', 1000, 60000],
  ['WIDGET_PROVIDER_TIMEOUT_MS', 100, 30000],
  ['NEWS_WIDGET_CACHE_TTL_SECONDS', 30, 3600],
  ['WEATHER_WIDGET_CACHE_TTL_SECONDS', 30, 3600],
  ['CRICKET_WIDGET_CACHE_TTL_SECONDS', 30, 3600],
  ['AI_PROVIDER_TIMEOUT_MS', 100, 120000],
  ['AI_PROVIDER_MAX_RETRIES', 0, 5],
  ['MONGODB_MAX_POOL_SIZE', 1, 500],
  ['MONGODB_MIN_POOL_SIZE', 0, 100],
  ['MONGODB_MAX_IDLE_TIME_MS', 1000, 10 * 60 * 1000],
  ['MONGODB_WAIT_QUEUE_TIMEOUT_MS', 100, 60 * 1000],
  ['MONGODB_SERVER_SELECTION_TIMEOUT_MS', 1000, 60 * 1000],
  ['MONGODB_SOCKET_TIMEOUT_MS', 1000, 5 * 60 * 1000],
];

const NUMBER_RULES = [
  ['ALERT_MAX_ERROR_RATE_PERCENT', 0.1, 100],
];

const validateEnvironment = ({ profile = 'server', env = process.env } = {}) => {
  const errors = [];
  const warnings = [];
  const isProduction = env.NODE_ENV === 'production';
  const required = new Set(profile === 'worker' ? ['MONGODB_URI', 'JWT_SECRET', 'ENCRYPTION_KEY'] : CORE_REQUIRED);

  if (isProduction) {
    PRODUCTION_REQUIRED.forEach((key) => required.add(key));
  }

  required.forEach((key) => {
    const value = getValue(env, key);
    if (!value) {
      errors.push(`${key} is required`);
      return;
    }
    if (isProduction && isPlaceholderValue(value)) {
      errors.push(`${key} appears to contain a placeholder value`);
    }
  });

  SECRET_KEYS.forEach((key) => {
    const value = getValue(env, key);
    if (!value) return;
    if (value.length < MIN_SECRET_LENGTH) {
      errors.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    if (isProduction && isPlaceholderValue(value)) {
      errors.push(`${key} appears to contain a placeholder value`);
    }
  });

  DEDICATED_SECRET_KEYS.forEach((key) => {
    if (!getValue(env, key)) {
      const message = `${key} is not set; ${key} should not fall back to JWT_SECRET in production`;
      if (isProduction) errors.push(message);
      else warnings.push(message);
    }
  });

  if (getValue(env, 'PORT') && !isPositivePort(getValue(env, 'PORT'))) {
    errors.push('PORT must be an integer from 1 to 65535');
  }

  const mongoUrl = getValue(env, 'MONGODB_URI');
  const parsedMongoUrl = mongoUrl ? parseUrl(mongoUrl) : null;
  if (mongoUrl && !isMongoUrl(mongoUrl)) {
    errors.push('MONGODB_URI must be a valid mongodb:// or mongodb+srv:// URL');
  }
  if (isProduction && parsedMongoUrl && isLocalHost(parsedMongoUrl.hostname)) {
    errors.push('MONGODB_URI must not point to localhost in production');
  }

  ['REDIS_URL', 'RATE_LIMIT_REDIS_URL'].forEach((key) => {
    const value = getValue(env, key);
    if (!value) return;
    const parsed = parseUrl(value);
    if (!isRedisUrl(value)) {
      errors.push(`${key} must be a valid redis:// or rediss:// URL`);
      return;
    }
    if (isProduction && parsed && isLocalHost(parsed.hostname)) {
      errors.push(`${key} must not point to localhost in production`);
    }
  });

  SIZE_RULES.forEach(([key, minBytes, maxBytes]) => {
    const value = getValue(env, key);
    if (!value) return;
    const bytes = parseByteSize(value);
    if (bytes === null || bytes < minBytes || bytes > maxBytes) {
      errors.push(`${key} must be a body-size value from ${minBytes} to ${maxBytes} bytes`);
    }
  });

  INTEGER_RULES.forEach(([key, min, max]) => {
    const value = getValue(env, key);
    if (!value) return;
    const parsed = parseInteger(value);
    if (parsed === null || parsed < min || parsed > max) {
      errors.push(`${key} must be an integer from ${min} to ${max}`);
    }
  });

  NUMBER_RULES.forEach(([key, min, max]) => {
    const value = getValue(env, key);
    if (!value) return;
    const parsed = parseNumber(value);
    if (parsed === null || parsed < min || parsed > max) {
      errors.push(`${key} must be a number from ${min} to ${max}`);
    }
  });

  ['FRONTEND_URL', 'FRONTEND_URL_PROD', 'PUBLIC_SITE_URL', 'BACKEND_PUBLIC_URL'].forEach((key) => {
    const value = getValue(env, key);
    if (value && !isHttpUrl(value)) {
      errors.push(`${key} must be a valid http(s) URL`);
      return;
    }
    const parsed = value ? parseUrl(value) : null;
    if (isProduction && parsed) {
      if (parsed.protocol !== 'https:') {
        errors.push(`${key} must use https in production`);
      }
      if (isLocalHost(parsed.hostname)) {
        errors.push(`${key} must not point to localhost in production`);
      }
    }
  });

  if (getValue(env, 'LIVEKIT_WS_URL') && !isWebSocketUrl(getValue(env, 'LIVEKIT_WS_URL'))) {
    errors.push('LIVEKIT_WS_URL must be a valid ws(s) URL');
  }

  ['REMOVE_BG_API_URL', 'REMOVE_BG_ACCOUNT_URL', 'BG_REMOVER_URL'].forEach((key) => {
    const value = getValue(env, key);
    if (!value) return;
    if (!isHttpUrl(value)) {
      errors.push(`${key} must be a valid http(s) URL`);
      return;
    }
    const parsed = parseUrl(value);
    if (isProduction && parsed && isLocalHost(parsed.hostname)) {
      errors.push(`${key} must not point to localhost in production`);
    }
  });

  const backgroundRemovalEnabled = getValue(env, 'BACKGROUND_REMOVAL_ENABLED').toLowerCase();
  if (backgroundRemovalEnabled && !['true', 'false'].includes(backgroundRemovalEnabled)) {
    errors.push('BACKGROUND_REMOVAL_ENABLED must be true or false');
  }

  const backgroundRemovalProvider = getValue(env, 'BACKGROUND_REMOVAL_PROVIDER').toLowerCase();
  if (backgroundRemovalProvider && !BACKGROUND_REMOVAL_PROVIDERS.has(backgroundRemovalProvider)) {
    errors.push('BACKGROUND_REMOVAL_PROVIDER must be one of: removebg, service');
  }

  if (backgroundRemovalEnabled === 'true') {
    const provider = backgroundRemovalProvider || 'removebg';
    if (provider === 'removebg' && !getValue(env, 'REMOVE_BG_API_KEY')) {
      errors.push('REMOVE_BG_API_KEY is required when BACKGROUND_REMOVAL_ENABLED=true and provider is removebg');
    }
    if (provider === 'service') {
      if (!getValue(env, 'BG_REMOVER_URL')) {
        errors.push('BG_REMOVER_URL is required when BACKGROUND_REMOVAL_ENABLED=true and provider is service');
      }
      if (!getValue(env, 'BG_REMOVER_API_KEY')) {
        errors.push('BG_REMOVER_API_KEY is required when BACKGROUND_REMOVAL_ENABLED=true and provider is service');
      }
    }
  }

  splitEnvList(getValue(env, 'CORS_ALLOWED_ORIGINS')).forEach((origin) => {
    const parsed = parseUrl(origin);
    if (!parsed || !isAllowedCorsProtocol(parsed.protocol) || !parsed.host) {
      errors.push(`CORS_ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
      return;
    }

    if (isProduction && parsed.protocol === 'http:') {
      errors.push(`CORS_ALLOWED_ORIGINS origin must use https in production: ${origin}`);
    }

    if (isProduction && parsed.protocol !== 'capacitor:' && isLocalHost(parsed.hostname)) {
      errors.push(`CORS_ALLOWED_ORIGINS must not include localhost web origins in production: ${origin}`);
    }
  });

  if (isProduction) {
    CSP_EXTENSION_KEYS.forEach((key) => {
      splitEnvList(getValue(env, key)).forEach((source) => {
        const sourceError = getProductionCspSourceError(key, source);
        if (sourceError) {
          errors.push(`${key} source "${source}" ${sourceError}`);
        }
      });
    });
  }

  const publicUploadPath = resolveRuntimePath(getValue(env, 'PUBLIC_UPLOAD_DIR') || 'uploads');
  PRIVATE_UPLOAD_TEMP_DIR_RULES.forEach(([key, fallback]) => {
    const tempPath = resolveRuntimePath(getValue(env, key) || fallback);
    if (isSameOrChildPath(tempPath, publicUploadPath)) {
      errors.push(`${key} must not resolve inside PUBLIC_UPLOAD_DIR; keep private upload temp files outside publicly served /uploads`);
    }
  });

  if (isProduction && getValue(env, 'EXPOSE_INTERNAL_ERRORS') === 'true') {
    errors.push('EXPOSE_INTERNAL_ERRORS must not be true in production');
  }

  if (isProduction && getValue(env, 'ZOHO_OAUTH_SETUP_ENABLED') === 'true') {
    errors.push('ZOHO_OAUTH_SETUP_ENABLED must not be true in production');
  }

  if (isProduction && getValue(env, 'RATE_LIMIT_FAIL_OPEN') === 'true') {
    errors.push('RATE_LIMIT_FAIL_OPEN must not be true in production');
  }

  if (isProduction && env.QUEUE_ENABLED === 'false') {
    errors.push('QUEUE_ENABLED must not be false in production');
  }

  if (isProduction && !getValue(env, 'REDIS_URL')) {
    errors.push('REDIS_URL is required in production');
  }

  if (isProduction && !getValue(env, 'RATE_LIMIT_REDIS_URL') && !getValue(env, 'REDIS_URL')) {
    errors.push('RATE_LIMIT_REDIS_URL or REDIS_URL is required for production rate limiting');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
};

const formatEnvironmentReport = (result) => {
  const lines = [];
  if (result.errors.length) {
    lines.push('Environment validation failed:');
    result.errors.forEach((error) => lines.push(`- ${error}`));
  }
  if (result.warnings.length) {
    lines.push('Environment validation warnings:');
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }
  return lines.join('\n');
};

const assertValidEnvironment = (options) => {
  const result = validateEnvironment(options);
  if (!result.ok) {
    throw new Error(formatEnvironmentReport(result));
  }
  if (result.warnings.length && process.env.NODE_ENV !== 'test') {
    console.warn(formatEnvironmentReport({ errors: [], warnings: result.warnings }));
  }
  return result;
};

module.exports = {
  assertValidEnvironment,
  formatEnvironmentReport,
  validateEnvironment,
};
