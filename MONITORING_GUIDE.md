# 📊 Monitoring System - Quick Guide

## ✅ What Was Added

### 1. System Health Dashboard (Admin Panel)
**Location**: Admin Dashboard → Overview Tab → Bottom Section
**Access**: Admin/CoAdmin only
**Auto-refresh**: Every time you visit the dashboard

**Displays**:
- ⏱️ **Uptime**: How long server has been running
- 📊 **Total Requests**: All requests since startup
- 👥 **Active Users**: Currently authenticated users
- ⚡ **Avg Response**: Average response time (color-coded)
  - 🟢 < 200ms: Excellent
  - 🟡 200-500ms: Good
  - 🔴 > 500ms: Slow
- 💾 **Memory Usage**: Server memory consumption
  - 🟢 < 300MB: Good
  - 🟡 300-400MB: Warning
  - 🔴 > 400MB: Critical
- 🗄️ **Database**: Connection status
  - 🟢 Connected
  - 🔴 Disconnected

### 2. Health Check Endpoint
**URL**: `GET /api/admin/health`
**Access**: Public (no auth required)
**Use**: For uptime monitoring services (UptimeRobot, Pingdom, etc.)

**Response**:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "requests": 1234,
  "activeUsers": 45,
  "avgResponseTime": 120,
  "memory": 256,
  "database": "connected"
}
```

### 3. Database Size Monitor
**Schedule**: Daily at midnight
**Console Output**: Shows DB usage with color-coded warnings
- 🟢 < 60%: Good
- 🟡 60-80%: Warning
- 🔴 > 80%: Critical

## 🚀 Testing

### View in Admin Dashboard
1. Login as admin/co-admin
2. Go to Admin Dashboard
3. Stay on Overview tab
4. Scroll to bottom - see "System Health" section
5. Metrics update every time you refresh

### Test Health Endpoint (for external monitoring)
```bash
# Windows CMD
curl http://localhost:5000/api/admin/health

# Or visit in browser
http://localhost:5000/api/admin/health
```

### Test Metrics (requires admin token)
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:5000/api/admin/metrics
```

### Check Console Logs
Look for:
- ✅ Database size monitor scheduled (daily)
- 📊 Database Usage: XMB / 512MB (X%)

## 🔧 Setup UptimeRobot (Free)

1. Go to https://uptimerobot.com
2. Add New Monitor
3. Monitor Type: HTTP(s)
4. URL: `https://your-domain.com/api/admin/health`
5. Monitoring Interval: 5 minutes
6. Get alerts via email/SMS when down

## 📈 What's Being Tracked

- **Uptime**: Server uptime in seconds
- **Requests**: Total requests since startup
- **Active Users**: Unique authenticated users
- **Response Time**: Average response time (last 100 requests)
- **Memory**: Heap memory usage in MB
- **Database**: MongoDB connection status
- **DB Size**: Daily check of database size per collection

## 🎯 When to Act

- **Memory > 400MB**: Consider restarting server
- **DB > 60%**: Start planning data cleanup
- **DB > 80%**: Urgent - delete old data or upgrade
- **Avg Response > 1000ms**: Performance issue
- **Database disconnected**: Critical - check MongoDB

## 💡 Tips

- Health endpoint is cached-friendly (no auth overhead)
- Metrics reset on server restart
- DB monitor runs at midnight - check logs next morning
- Use health endpoint for automated monitoring
- Use metrics endpoint for admin dashboard integration
