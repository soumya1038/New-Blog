const User = require('../models/User');

const trackActivity = async (req, res, next) => {
  if (req.user && req.user._id) {
    try {
      await User.findByIdAndUpdate(req.user._id, { lastActive: new Date() });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }
  next();
};

module.exports = trackActivity;
