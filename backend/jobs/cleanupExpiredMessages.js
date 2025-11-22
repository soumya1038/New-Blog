const cron = require('node-cron');
const Message = require('../models/Message');
const cloudinary = require('../utils/cloudinary');

// Run daily at 2 AM to cleanup Cloudinary files for messages expiring soon
const cleanupExpiredMessages = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🧹 Running expired messages cleanup...');
      
      // Find messages older than 29 days with Cloudinary files
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
      
      const expiredMessages = await Message.find({
        createdAt: { $lt: twentyNineDaysAgo },
        cloudinaryPublicId: { $exists: true, $ne: null }
      });
      
      console.log(`Found ${expiredMessages.length} messages with Cloudinary files to cleanup`);
      
      for (const message of expiredMessages) {
        try {
          await cloudinary.uploader.destroy(message.cloudinaryPublicId);
          console.log(`✅ Deleted Cloudinary file: ${message.cloudinaryPublicId}`);
        } catch (error) {
          console.error(`❌ Failed to delete ${message.cloudinaryPublicId}:`, error);
        }
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup job failed:', error);
    }
  });
};

module.exports = cleanupExpiredMessages;
