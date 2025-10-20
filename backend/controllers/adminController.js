const User = require('../models/User');
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');

// Get dashboard statistics
exports.getStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const numDays = parseInt(days);
    
    const totalUsers = await User.countDocuments();
    const totalBlogs = await Blog.countDocuments();
    const totalComments = await Comment.countDocuments();
    
    // Active users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeUsersToday = await Blog.distinct('author', { createdAt: { $gte: today } });
    
    // Generate data for selected time range
    const blogsPerDay = [];
    const userRegistrations = [];
    const activeUsersPerDay = [];
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Blogs count
      const blogCount = await Blog.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      // User registrations count
      const userCount = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      // Active users count (users who posted on this day)
      const activeUsers = await Blog.distinct('author', {
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      const dateLabel = numDays <= 31 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      blogsPerDay.push({ date: dateLabel, count: blogCount });
      userRegistrations.push({ date: dateLabel, count: userCount });
      activeUsersPerDay.push({ date: dateLabel, count: activeUsers.length });
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBlogs,
        totalComments,
        activeUsersToday: activeUsersToday.length,
        blogsPerDay,
        userRegistrations,
        activeUsersPerDay
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
      const blogCount = await Blog.countDocuments({ author: user._id });
      return {
        ...user.toObject(),
        blogCount
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

    res.json({ success: true, blogs });
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
      suspendUntil.setDate(suspendUntil.getDate() + parseInt(days));
      user.suspendedUntil = suspendUntil;
      user.isActive = false;
    } else {
      // Unsuspend user
      user.suspendedUntil = null;
      user.isActive = true;
    }

    await user.save();

    res.json({ 
      success: true, 
      message: days > 0 ? `User suspended for ${days} days` : 'User unsuspended',
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
