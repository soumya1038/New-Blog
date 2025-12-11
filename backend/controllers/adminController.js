const User = require('../models/User');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Comment = require('../models/Comment');
const GuestAnalytics = require('../models/GuestAnalytics');

// Get dashboard statistics
exports.getStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const numDays = parseInt(days);
    
    const totalUsers = await User.countDocuments();
    const totalBlogs = await Blog.countDocuments({ isDraft: false });
    const totalShorts = await Short.countDocuments({ isDraft: false });
    const totalComments = await Comment.countDocuments();
    
    // Active users today (based on lastActive field)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeUsersToday = await User.countDocuments({ lastActive: { $gte: today } });
    
    // Guest users today
    const guestToday = await GuestAnalytics.distinct('ipAddress', {
      createdAt: { $gte: today }
    });
    
    // Generate data for selected time range
    const blogsPerDay = [];
    const shortsPerDay = [];
    const commentsPerDay = [];
    const userRegistrations = [];
    const activeUsersPerDay = [];
    const guestAnalytics = [];
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Blogs count
      const blogCount = await Blog.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
        isDraft: false
      });
      
      // Shorts count
      const shortCount = await Short.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
        isDraft: false
      });
      
      // User registrations count
      const userCount = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      // Comments count
      const commentCount = await Comment.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      // Active users count (based on lastActive)
      const activeUsers = await User.countDocuments({
        lastActive: { $gte: date, $lt: nextDate }
      });
      
      // Guest analytics
      const uniqueGuests = await GuestAnalytics.distinct('ipAddress', {
        createdAt: { $gte: date, $lt: nextDate }
      });
      const totalPageViews = await GuestAnalytics.aggregate([
        { $match: { createdAt: { $gte: date, $lt: nextDate } } },
        { $group: { _id: null, total: { $sum: '$pageViews' } } }
      ]);
      
      const dateLabel = numDays <= 31 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      blogsPerDay.push({ date: dateLabel, count: blogCount });
      shortsPerDay.push({ date: dateLabel, count: shortCount });
      commentsPerDay.push({ date: dateLabel, count: commentCount });
      userRegistrations.push({ date: dateLabel, count: userCount });
      activeUsersPerDay.push({ date: dateLabel, count: activeUsers });
      guestAnalytics.push({ 
        date: dateLabel, 
        uniqueVisitors: uniqueGuests.length,
        pageViews: totalPageViews[0]?.total || 0
      });
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBlogs,
        totalShorts,
        totalComments,
        activeUsersToday,
        guestToday: guestToday.length,
        blogsPerDay,
        shortsPerDay,
        commentsPerDay,
        userRegistrations,
        activeUsersPerDay,
        guestAnalytics
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -apiKeys')
      .sort({ createdAt: -1 });
    
    const usersWithStats = await Promise.all(users.map(async (user) => {
      // Auto-reactivate if suspension expired
      if (user.suspendedUntil && new Date() >= user.suspendedUntil) {
        user.suspendedUntil = null;
        user.isActive = true;
        await user.save();
      }
      
      const blogCount = await Blog.countDocuments({ author: user._id, isDraft: false });
      const shortCount = await Short.countDocuments({ author: user._id, isDraft: false });
      return {
        ...user.toObject(),
        blogCount,
        shortCount
      };
    }));

    res.json({ success: true, users: usersWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all blogs (including drafts)
exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'username profileImage')
      .sort({ createdAt: -1 });

    const blogsWithComments = await Promise.all(blogs.map(async (blog) => {
      const commentCount = await Comment.countDocuments({ blog: blog._id });
      return {
        ...blog.toObject(),
        commentCount
      };
    }));

    res.json({ success: true, blogs: blogsWithComments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all shorts
exports.getAllShorts = async (req, res) => {
  try {
    const shorts = await Short.find()
      .populate('author', 'username profileImage')
      .sort({ createdAt: -1 });

    const shortsWithComments = await Promise.all(shorts.map(async (short) => {
      const commentCount = await Comment.countDocuments({ short: short._id });
      return {
        ...short.toObject(),
        commentCount
      };
    }));

    res.json({ success: true, shorts: shortsWithComments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete short
exports.deleteShort = async (req, res) => {
  try {
    const short = await Short.findById(req.params.id);
    
    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    await Comment.deleteMany({ short: short._id });
    await Short.findByIdAndDelete(short._id);

    res.json({ success: true, message: 'Short deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin user' });
    }

    // Delete user's blogs
    await Blog.deleteMany({ author: user._id });
    
    // Delete user's comments
    await Comment.deleteMany({ author: user._id });
    
    // Delete user
    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Suspend/Unsuspend user
exports.suspendUser = async (req, res) => {
  try {
    const { days } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot suspend admin user' });
    }

    if (days && days > 0) {
      // Suspend user
      const suspendUntil = new Date();
      // Use parseFloat to handle decimal days (e.g., 0.5 for 12 hours)
      const daysToAdd = parseFloat(days);
      suspendUntil.setTime(suspendUntil.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
      user.suspendedUntil = suspendUntil;
      user.isActive = false;
    } else {
      // Unsuspend user
      user.suspendedUntil = null;
      user.isActive = true;
    }

    await user.save();

    let message = 'User unsuspended';
    if (days > 0) {
      const daysNum = parseFloat(days);
      if (daysNum < 1) {
        const hours = Math.round(daysNum * 24);
        message = `User suspended for ${hours} hour${hours !== 1 ? 's' : ''}`;
      } else if (daysNum === 1) {
        message = 'User suspended for 1 day';
      } else if (daysNum >= 30 && daysNum % 30 === 0) {
        const months = daysNum / 30;
        message = `User suspended for ${months} month${months !== 1 ? 's' : ''}`;
      } else {
        message = `User suspended for ${daysNum} days`;
      }
    }

    res.json({ 
      success: true, 
      message,
      user: {
        id: user._id,
        isActive: user.isActive,
        suspendedUntil: user.suspendedUntil
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Make user admin
exports.makeAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'User is already an admin' });
    }

    user.role = 'admin';
    await user.save();

    res.json({ 
      success: true, 
      message: 'User promoted to admin successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Make user coAdmin
exports.makeCoAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot change admin to co-admin' });
    }

    if (user.role === 'coAdmin') {
      return res.status(400).json({ success: false, message: 'User is already a co-admin' });
    }

    user.role = 'coAdmin';
    await user.save();

    res.json({ 
      success: true, 
      message: 'User promoted to co-admin successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove coAdmin role
exports.removeCoAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'coAdmin') {
      return res.status(400).json({ success: false, message: 'User is not a co-admin' });
    }

    user.role = 'user';
    await user.save();

    res.json({ 
      success: true, 
      message: 'Co-admin role removed successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Delete associated comments
    await Comment.deleteMany({ blog: blog._id });
    
    // Delete blog
    await Blog.findByIdAndDelete(blog._id);

    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
