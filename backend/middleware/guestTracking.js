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
      let session = await GuestAnalytics.findOne({ sessionId, ipAddress });
      
      if (!session) {
        // Create new session
        session = new GuestAnalytics({
          sessionId,
          ipAddress,
          userAgent,
          pages: [{ path: currentPath, timestamp: new Date() }],
          pageViews: 1
        });
      } else {
        // Update existing session
        const lastPage = session.pages[session.pages.length - 1];
        
        // Calculate duration for previous page if pageStart provided
        if (pageStart && lastPage) {
          const duration = Math.floor((Date.now() - new Date(pageStart).getTime()) / 1000);
          lastPage.duration = duration;
          session.totalDuration += duration;
        }
        
        // Add new page
        session.pages.push({ path: currentPath, timestamp: new Date() });
        session.pageViews += 1;
        session.sessionEnd = new Date();
      }
      
      await session.save();
    }
  } catch (error) {
    console.error('Guest tracking error:', error);
  }
  
  next();
};

module.exports = { trackGuestActivity };