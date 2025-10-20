const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT authentication middleware
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// Optional JWT authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// API Key authentication middleware
exports.apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'API key required' });
    }

    const user = await User.findOne({ 'apiKeys.key': apiKey });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'API key authentication failed' });
  }
};

// Admin authentication middleware
exports.adminAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// Admin or CoAdmin authentication middleware (read-only for coAdmin)
exports.adminOrCoAdminAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'coAdmin') {
      return res.status(403).json({ success: false, message: 'Admin or Co-Admin access required' });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};
