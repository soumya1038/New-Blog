const mongoose = require('mongoose');

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ALERT_THRESHOLDS = {
  maxMemoryMB: parsePositiveNumber(process.env.ALERT_MAX_MEMORY_MB, 450),
  maxAvgResponseMs: parsePositiveNumber(process.env.ALERT_MAX_AVG_RESPONSE_MS, 500),
  maxP95ResponseMs: parsePositiveNumber(process.env.ALERT_MAX_P95_RESPONSE_MS, 1200),
  maxErrorRatePercent: parsePositiveNumber(process.env.ALERT_MAX_ERROR_RATE_PERCENT, 2.5),
  maxSlowRequests: parsePositiveNumber(process.env.ALERT_MAX_SLOW_REQUESTS, 25),
  slowRequestMs: parsePositiveNumber(process.env.ALERT_SLOW_REQUEST_MS, 1200),
  activeUserWindowMs: parsePositiveNumber(process.env.ALERT_ACTIVE_USER_WINDOW_MS, 30 * 60 * 1000),
  maxRouteStats: parsePositiveNumber(process.env.ALERT_ROUTE_STATS_MAX_ENTRIES, 500)
};

const metrics = {
  requests: 0,
  activeUsers: new Map(),
  responseTimes: [],
  statusBreakdown: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0
  },
  routeStats: new Map(),
  recentSlowRequests: [],
  recentServerErrors: [],
  startTime: Date.now()
};

const pushLimited = (bucket, value, maxItems) => {
  bucket.push(value);
  if (bucket.length > maxItems) bucket.shift();
};

const deriveRouteKey = (req) => {
  if (req.route?.path) {
    const base = req.baseUrl || '';
    return `${req.method} ${base}${req.route.path}`;
  }
  const fallbackPath = (req.originalUrl || req.path || '').split('?')[0] || '/';
  if (fallbackPath.startsWith('/api/')) return `${req.method} /api/*`;
  if (fallbackPath.startsWith('/uploads/')) return `${req.method} /uploads/*`;
  if (fallbackPath.includes('.')) return `${req.method} /asset-or-file`;
  return `${req.method} /unmatched`;
};

const rememberRouteStats = (routeKey, routeRecord) => {
  if (metrics.routeStats.has(routeKey)) {
    metrics.routeStats.set(routeKey, routeRecord);
    return;
  }

  if (metrics.routeStats.size >= ALERT_THRESHOLDS.maxRouteStats) {
    const oldestKey = metrics.routeStats.keys().next().value;
    if (oldestKey) metrics.routeStats.delete(oldestKey);
  }
  metrics.routeStats.set(routeKey, routeRecord);
};

const calculateP95 = (samples) => {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
};

const buildTopSlowRoutes = () => {
  return [...metrics.routeStats.entries()]
    .filter(([, item]) => item.count > 0)
    .map(([route, item]) => ({
      route,
      count: item.count,
      avgResponseTime: Math.round(item.totalDuration / item.count),
      maxResponseTime: item.maxDuration,
      slowCount: item.slowCount
    }))
    .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
    .slice(0, 5);
};

const evaluateAlerts = ({ database, memory, avgResponseTime, p95ResponseTime, errorRatePercent, slowRequestCount }) => {
  const items = [];

  if (database !== 'connected') {
    items.push({
      id: 'database',
      severity: 'critical',
      label: 'Database connectivity',
      message: `Database status is ${database}.`
    });
  }

  if (memory >= ALERT_THRESHOLDS.maxMemoryMB) {
    items.push({
      id: 'memory',
      severity: memory >= ALERT_THRESHOLDS.maxMemoryMB * 1.15 ? 'critical' : 'warning',
      label: 'Memory usage',
      message: `Memory is ${memory}MB (threshold ${ALERT_THRESHOLDS.maxMemoryMB}MB).`
    });
  }

  if (avgResponseTime >= ALERT_THRESHOLDS.maxAvgResponseMs) {
    items.push({
      id: 'avg-response',
      severity: avgResponseTime >= ALERT_THRESHOLDS.maxAvgResponseMs * 1.4 ? 'critical' : 'warning',
      label: 'Average response time',
      message: `Avg response is ${avgResponseTime}ms (threshold ${ALERT_THRESHOLDS.maxAvgResponseMs}ms).`
    });
  }

  if (p95ResponseTime >= ALERT_THRESHOLDS.maxP95ResponseMs) {
    items.push({
      id: 'p95-response',
      severity: p95ResponseTime >= ALERT_THRESHOLDS.maxP95ResponseMs * 1.4 ? 'critical' : 'warning',
      label: 'P95 response time',
      message: `P95 response is ${p95ResponseTime}ms (threshold ${ALERT_THRESHOLDS.maxP95ResponseMs}ms).`
    });
  }

  if (errorRatePercent >= ALERT_THRESHOLDS.maxErrorRatePercent) {
    items.push({
      id: 'error-rate',
      severity: errorRatePercent >= ALERT_THRESHOLDS.maxErrorRatePercent * 1.5 ? 'critical' : 'warning',
      label: '5xx error rate',
      message: `5xx rate is ${errorRatePercent.toFixed(2)}% (threshold ${ALERT_THRESHOLDS.maxErrorRatePercent}%).`
    });
  }

  if (slowRequestCount >= ALERT_THRESHOLDS.maxSlowRequests) {
    items.push({
      id: 'slow-requests',
      severity: slowRequestCount >= ALERT_THRESHOLDS.maxSlowRequests * 1.5 ? 'critical' : 'warning',
      label: 'Slow request count',
      message: `Slow requests in window: ${slowRequestCount} (threshold ${ALERT_THRESHOLDS.maxSlowRequests}).`
    });
  }

  const hasCritical = items.some((item) => item.severity === 'critical');
  const hasWarning = items.some((item) => item.severity === 'warning');

  return {
    status: hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy',
    items
  };
};

const systemMonitor = (req, res, next) => {
  const start = Date.now();
  metrics.requests++;
  
  if (req.user?.id || req.user?._id) {
    const userId = String(req.user.id || req.user._id);
    metrics.activeUsers.set(userId, Date.now());
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode || 0;
    const statusBucket = `${Math.floor(statusCode / 100)}xx`;
    const routeKey = deriveRouteKey(req);
    const routeRecord =
      metrics.routeStats.get(routeKey) ||
      { count: 0, totalDuration: 0, maxDuration: 0, slowCount: 0 };

    routeRecord.count += 1;
    routeRecord.totalDuration += duration;
    routeRecord.maxDuration = Math.max(routeRecord.maxDuration, duration);

    if (duration >= ALERT_THRESHOLDS.slowRequestMs) {
      routeRecord.slowCount += 1;
      pushLimited(
        metrics.recentSlowRequests,
        {
          route: routeKey,
          duration,
          statusCode,
          at: new Date().toISOString()
        },
        60
      );
    }

    if (statusCode >= 500) {
      pushLimited(
        metrics.recentServerErrors,
        {
          route: routeKey,
          duration,
          statusCode,
          at: new Date().toISOString()
        },
        60
      );
    }

    rememberRouteStats(routeKey, routeRecord);
    pushLimited(metrics.responseTimes, duration, 500);

    if (metrics.statusBreakdown[statusBucket] !== undefined) {
      metrics.statusBreakdown[statusBucket] += 1;
    }
  });
  
  next();
};

const getMetrics = () => {
  const now = Date.now();
  for (const [userId, lastSeen] of metrics.activeUsers.entries()) {
    if (now - lastSeen > ALERT_THRESHOLDS.activeUserWindowMs) {
      metrics.activeUsers.delete(userId);
    }
  }

  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  const avgResponse = metrics.responseTimes.length 
    ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length)
    : 0;
  const p95Response = Math.round(calculateP95(metrics.responseTimes));
  
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[dbState];
  const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const serverErrorCount = metrics.statusBreakdown['5xx'] || 0;
  const errorRatePercent = metrics.requests
    ? Number(((serverErrorCount / metrics.requests) * 100).toFixed(2))
    : 0;
  const slowRequestCount = metrics.recentSlowRequests.length;
  const alerts = evaluateAlerts({
    database: dbStatus,
    memory,
    avgResponseTime: avgResponse,
    p95ResponseTime: p95Response,
    errorRatePercent,
    slowRequestCount
  });
  
  return {
    uptime,
    requests: metrics.requests,
    activeUsers: metrics.activeUsers.size,
    avgResponseTime: avgResponse,
    p95ResponseTime: p95Response,
    errorRatePercent,
    memory,
    database: dbStatus,
    statusBreakdown: { ...metrics.statusBreakdown },
    slowRequestCount,
    topSlowRoutes: buildTopSlowRoutes(),
    recentServerErrors: [...metrics.recentServerErrors],
    alerts,
    thresholds: { ...ALERT_THRESHOLDS }
  };
};

const getAlertThresholds = () => ({ ...ALERT_THRESHOLDS });

module.exports = { systemMonitor, getMetrics, getAlertThresholds };
