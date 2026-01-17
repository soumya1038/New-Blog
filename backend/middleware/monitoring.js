const mongoose = require('mongoose');

const metrics = {
  requests: 0,
  activeUsers: new Set(),
  responseTimes: [],
  startTime: Date.now()
};

const systemMonitor = (req, res, next) => {
  const start = Date.now();
  metrics.requests++;
  
  if (req.user) metrics.activeUsers.add(req.user.id);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.responseTimes.push(duration);
    if (metrics.responseTimes.length > 100) metrics.responseTimes.shift();
  });
  
  next();
};

const getMetrics = () => {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  const avgResponse = metrics.responseTimes.length 
    ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length)
    : 0;
  
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[dbState];
  
  return {
    uptime,
    requests: metrics.requests,
    activeUsers: metrics.activeUsers.size,
    avgResponseTime: avgResponse,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    database: dbStatus
  };
};

module.exports = { systemMonitor, getMetrics };
