const GuestAnalytics = require('../models/GuestAnalytics');

const trackGuestActivity = async (req, res, next) => {
  try {
    // Skip tracking for authenticated users
    if (req.user) {
      return next();
    }

    const { sessionId, pageStart } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const currentPath = req.body.path || req.path;

    if (sessionId) {
      // Use findOneAndUpdate with upsert to avoid version conflicts
      const updateData = {
        $push: { pages: { path: currentPath, timestamp: new Date() } },
        $inc: { pageViews: 1 },
        $set: { sessionEnd: new Date() }
      };

      if (pageStart) {
        const duration = Math.floor((Date.now() - new Date(pageStart).getTime()) / 1000);
        updateData.$inc.totalDuration = duration;
      }

      await GuestAnalytics.findOneAndUpdate(
        { sessionId, ipAddress },
        updateData,
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true,
          runValidators: false
        }
      );
    }
  } catch (error) {
    // Silently fail to not block requests
    console.error('Guest tracking error:', error.message);
  }
  
  next();
};

module.exports = { trackGuestActivity };