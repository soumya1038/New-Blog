const cron = require('node-cron');
const User = require('../models/User');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const Message = require('../models/Message');

const cleanupExpiredGuests = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🧹 Running guest user cleanup...');
      
      const now = new Date();
      const expiredGuests = await User.find({
        isGuest: true,
        guestExpiresAt: { $lte: now }
      });

      if (expiredGuests.length === 0) {
        console.log('✅ No expired guest users found');
        return;
      }

      const guestIds = expiredGuests.map(g => g._id);

      // Delete guest data
      await Promise.all([
        Blog.deleteMany({ author: { $in: guestIds } }),
        Short.deleteMany({ author: { $in: guestIds } }),
        Comment.deleteMany({ author: { $in: guestIds } }),
        Notification.deleteMany({ $or: [{ user: { $in: guestIds } }, { sender: { $in: guestIds } }] }),
        Message.deleteMany({ $or: [{ sender: { $in: guestIds } }, { receiver: { $in: guestIds } }] }),
        User.deleteMany({ _id: { $in: guestIds } })
      ]);

      console.log(`✅ Cleaned up ${expiredGuests.length} expired guest users`);
    } catch (error) {
      console.error('❌ Guest cleanup error:', error);
    }
  });

  console.log('✅ Guest cleanup cron job scheduled (runs every hour)');
};

module.exports = cleanupExpiredGuests;
