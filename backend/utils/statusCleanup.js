const User = require('../models/User');
const cloudinary = require('./cloudinary');

const cleanupExpiredStatuses = async () => {
  try {
    const users = await User.find({
      'statuses.expiresAt': { $lt: new Date() }
    });

    let totalCleaned = 0;

    for (const user of users) {
      const expiredStatuses = user.statuses.filter(s => new Date() >= new Date(s.expiresAt));
      
      for (const status of expiredStatuses) {
        if (status.image && status.image.includes('cloudinary')) {
          const publicId = status.image.split('/').pop().split('.')[0];
          try {
            await cloudinary.uploader.destroy(`blog-status/${publicId}`);
          } catch (err) {
            console.log('Status image not found on Cloudinary');
          }
        }
        totalCleaned++;
      }

      user.statuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));
      await user.save();
    }

    if (totalCleaned > 0) {
      console.log(`Cleaned up ${totalCleaned} expired statuses`);
    }
  } catch (error) {
    console.error('Status cleanup error:', error);
  }
};

module.exports = cleanupExpiredStatuses;
