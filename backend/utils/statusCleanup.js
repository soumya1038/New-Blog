const User = require('../models/User');
const cloudinary = require('./cloudinary');

const extractCloudinaryPublicId = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = pathParts.findIndex((part) => part === 'upload');
    if (uploadIndex < 0) return '';

    let publicIdParts = pathParts.slice(uploadIndex + 1);
    if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
      publicIdParts = publicIdParts.slice(1);
    }

    const fullPath = publicIdParts.join('/');
    return fullPath.replace(/\.[^/.]+$/, '');
  } catch (error) {
    return '';
  }
};

const resolveStatusPublicId = (status) => {
  if (status?.mediaPublicId) return status.mediaPublicId;
  return extractCloudinaryPublicId(status?.video || status?.image || '');
};

const destroyExpiredStatusMedia = async (status) => {
  const publicId = resolveStatusPublicId(status);
  if (!publicId) return;

  const isVideo = status?.mediaType === 'video' || Boolean(status?.video);
  try {
    await cloudinary.uploader.destroy(publicId, isVideo ? { resource_type: 'video' } : {});
  } catch (error) {
    console.log('Expired status media not found on Cloudinary');
  }
};

const cleanupExpiredStatuses = async () => {
  try {
    const users = await User.find({
      'statuses.expiresAt': { $lt: new Date() }
    });

    let totalCleaned = 0;

    for (const user of users) {
      const expiredStatuses = user.statuses.filter(s => new Date() >= new Date(s.expiresAt));
      
      for (const status of expiredStatuses) {
        await destroyExpiredStatusMedia(status);
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
