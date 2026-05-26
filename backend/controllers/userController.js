const User = require('../models/User');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const bcrypt = require('bcryptjs');
const generateApiKey = require('../utils/generateApiKey');
const cloudinary = require('../utils/cloudinary');
const { enqueueEmailJob } = require('../jobs/queueService');

const SOCIAL_PROVIDER_DOMAIN_MATCHERS = {
  google: ['google.com', 'accounts.google.com'],
  facebook: ['facebook.com', 'fb.com'],
  twitter: ['twitter.com', 'x.com'],
  linkedin: ['linkedin.com'],
  github: ['github.com'],
};

const SOCIAL_OAUTH_PROVIDERS = new Set(['google', 'facebook', 'twitter']);

const normalizeSocialValue = (value = '') => String(value || '').trim().toLowerCase();

const doesSocialEntryMatchProvider = (entry, provider) => {
  const key = normalizeSocialValue(provider);
  const domains = SOCIAL_PROVIDER_DOMAIN_MATCHERS[key] || [];
  const nameValue = normalizeSocialValue(entry?.name);
  const urlValue = normalizeSocialValue(entry?.url);
  return domains.some((domain) => nameValue.includes(domain) || urlValue.includes(domain));
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const targetUserId = req.params.id || req.user?._id;

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check if user exists first
    const user = await User.findById(targetUserId)
      .select('-password')
      .populate('followers', 'username profileImage')
      .populate('following', 'username profileImage');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User does not exist' });
    }

    // If viewing someone else's profile, require authentication
    if (req.params.id && !req.user) {
      return res.status(401).json({ success: false, message: 'Please login to view profiles' });
    }

    // Set default description if empty
    if (!user.description) {
      user.description = 'Passionate blogger on Modern Blog platform. Join me on my writing journey!';
      await user.save();
    }

    const blogCount = await Blog.countDocuments({ author: user._id, isDraft: false });
    const articleCount = await Article.countDocuments({ author: user._id, isDraft: false });

    // Filter active statuses
    const activeStatuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));
    const hasActiveStatus = activeStatuses.length > 0;

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        statuses: activeStatuses,
        hasActiveStatus,
        blogCount,
        articleCount,
        followerCount: user.followers.length,
        followingCount: user.following.length
      }
    });
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Disconnect social provider and remove linked social URL entries.
exports.disconnectSocialProvider = async (req, res) => {
  try {
    const provider = normalizeSocialValue(req.params.provider);
    const allowedProviders = Object.keys(SOCIAL_PROVIDER_DOMAIN_MATCHERS);

    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ success: false, message: 'Unsupported social provider' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const originalSocial = Array.isArray(user.socialMedia) ? user.socialMedia : [];
    const nextSocial = originalSocial.filter((entry) => !doesSocialEntryMatchProvider(entry, provider));
    let changed = nextSocial.length !== originalSocial.length;

    if (SOCIAL_OAUTH_PROVIDERS.has(provider)) {
      const currentProviderId = String(user?.oauthProviders?.[provider]?.id || '').trim();
      if (currentProviderId) {
        user.oauthProviders = {
          ...(user.oauthProviders || {}),
          google: { id: provider === 'google' ? '' : user?.oauthProviders?.google?.id || '' },
          facebook: { id: provider === 'facebook' ? '' : user?.oauthProviders?.facebook?.id || '' },
          twitter: { id: provider === 'twitter' ? '' : user?.oauthProviders?.twitter?.id || '' },
        };
        changed = true;
      }
    }

    if (!changed) {
      return res.status(404).json({ success: false, message: 'Provider is not connected' });
    }

    user.socialMedia = nextSocial;
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.json({
      success: true,
      message: `${provider} disconnected successfully`,
      user: safeUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      address,
      bio,
      description,
      signature,
      socialMedia,
      privacy,
      emailNotifications,
    } = req.body;

    const updates = {
      fullName,
      email,
      phone,
      dateOfBirth,
      address,
      bio,
      description,
      signature,
      socialMedia,
      privacy,
    };

    if (emailNotifications) {
      updates.emailNotifications = {
        ...emailNotifications,
        // Keep content-published email system controlled.
        contentPublished: true,
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);

    // Delete old image from Cloudinary if exists
    if (user.profileImage && user.profileImage.includes('cloudinary')) {
      const publicId = user.profileImage.split('/').pop().split('.')[0];
      try {
        await cloudinary.uploader.destroy(`blog-profiles/${publicId}`);
      } catch (err) {
        console.log('Old image not found on Cloudinary');
      }
    }

    // Upload to Cloudinary from memory buffer
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'blog-profiles',
          transformation: [
            { width: 400, height: 400, crop: 'fill' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    user.profileImage = result.secure_url;
    await user.save();

    res.json({ success: true, profileImage: user.profileImage });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove profile image
exports.removeProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Delete from Cloudinary if exists
    if (user.profileImage && user.profileImage.includes('cloudinary')) {
      const publicId = user.profileImage.split('/').pop().split('.')[0];
      try {
        await cloudinary.uploader.destroy(`blog-profiles/${publicId}`);
      } catch (err) {
        console.log('Image not found on Cloudinary');
      }
    }

    user.profileImage = '';
    await user.save();

    res.json({ success: true, message: 'Profile image removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Request password change
exports.requestPasswordChange = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both passwords' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Generate 6-digit code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    global.passwordChangeCodes = global.passwordChangeCodes || {};
    const passwordChangeExpiresAt = Date.now() + 2 * 60 * 1000;
    global.passwordChangeCodes[user._id.toString()] = {
      code: confirmationCode,
      newPassword,
      expiresAt: passwordChangeExpiresAt // 2 minutes
    };

    await enqueueEmailJob('password-change-confirmation', {
      email: user.email,
      username: user.username,
      code: confirmationCode,
      expiresAt: passwordChangeExpiresAt
    });

    res.json({ success: true, message: 'Confirmation code sent to your email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm password change
exports.confirmPasswordChange = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Confirmation code required' });
    }

    const storedData = global.passwordChangeCodes?.[req.user._id.toString()];

    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No password change request found' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.passwordChangeCodes[req.user._id.toString()];
      return res.status(400).json({ success: false, message: 'Confirmation code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code' });
    }

    const user = await User.findById(req.user._id);
    user.password = storedData.newPassword;
    if (user.mustChangePasswordAfterGoogle) {
      user.mustChangePasswordAfterGoogle = false;
    }
    await user.save();

    delete global.passwordChangeCodes[req.user._id.toString()];

    // Send success email
    try {
      await enqueueEmailJob('password-changed-success', {
        email: user.email,
        username: user.username,
        changedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to send success email:', error);
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Request account deletion
exports.requestAccountDeletion = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password required' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // Generate 6-digit code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    global.accountDeletionCodes = global.accountDeletionCodes || {};
    const accountDeletionExpiresAt = Date.now() + 2 * 60 * 1000;
    global.accountDeletionCodes[user._id.toString()] = {
      code: confirmationCode,
      expiresAt: accountDeletionExpiresAt // 2 minutes
    };

    await enqueueEmailJob('account-deletion-confirmation', {
      email: user.email,
      username: user.username,
      code: confirmationCode,
      expiresAt: accountDeletionExpiresAt
    });

    res.json({ success: true, message: 'Confirmation code sent to your email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm account deletion
exports.confirmAccountDeletion = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Confirmation code required' });
    }

    const storedData = global.accountDeletionCodes?.[req.user._id.toString()];

    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No deletion request found' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete global.accountDeletionCodes[req.user._id.toString()];
      return res.status(400).json({ success: false, message: 'Confirmation code expired' });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code' });
    }

    const user = await User.findById(req.user._id);

    // Delete user's blogs
    await Blog.deleteMany({ author: user._id });
    await Article.deleteMany({ author: user._id });

    // Delete user's notifications
    await Notification.deleteMany({ $or: [{ recipient: user._id }, { sender: user._id }] });

    // Remove profile image from Cloudinary
    if (user.profileImage && user.profileImage.includes('cloudinary')) {
      const publicId = user.profileImage.split('/').pop().split('.')[0];
      try {
        await cloudinary.uploader.destroy(`blog-profiles/${publicId}`);
      } catch (err) {
        console.log('Image not found on Cloudinary');
      }
    }

    // Send success email before deletion
    const userEmail = user.email;
    const userName = user.username;

    await User.findByIdAndDelete(user._id);

    delete global.accountDeletionCodes[user._id.toString()];

    // Send success email
    try {
      await enqueueEmailJob('account-deleted-success', {
        email: userEmail,
        username: userName
      });
    } catch (error) {
      console.error('Failed to send success email:', error);
    }

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate API key
exports.generateApiKey = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'API key name is required' });
    }

    const apiKey = generateApiKey();
    const user = await User.findById(req.user._id);

    user.apiKeys.push({ name: name.trim(), key: apiKey });
    await user.save();

    res.json({ success: true, apiKey: user.apiKeys[user.apiKeys.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get API keys
exports.getApiKeys = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('apiKeys');
    res.json({ success: true, apiKeys: user.apiKeys });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revoke API key
exports.revokeApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const user = await User.findById(req.user._id);

    user.apiKeys = user.apiKeys.filter(k => k._id.toString() !== keyId);
    await user.save();

    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update username
exports.updateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }

    const existingUser = await User.findOne({ username: username.trim(), _id: { $ne: req.user._id } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username: username.trim() },
      { new: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clampStatusDuration = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 7;
  return Math.max(3, Math.min(30, Math.floor(parsed)));
};

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

const destroyStatusMedia = async (status) => {
  const publicId = resolveStatusPublicId(status);
  if (!publicId) return;

  const isVideo = status?.mediaType === 'video' || Boolean(status?.video);
  try {
    await cloudinary.uploader.destroy(publicId, isVideo ? { resource_type: 'video' } : {});
  } catch (error) {
    console.log('Status media not found on Cloudinary');
  }
};

const uploadStatusMedia = async (file) => {
  const isVideo = String(file?.mimetype || '').startsWith('video/');
  const uploadOptions = isVideo
    ? {
        folder: 'blog-status/videos',
        resource_type: 'video',
      }
    : {
        folder: 'blog-status/images',
        resource_type: 'image',
        transformation: [
          { width: 1080, height: 1920, crop: 'limit' },
          { quality: 'auto' },
        ],
      };

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(uploadOptions, (error, uploaded) => {
      if (error) reject(error);
      else resolve(uploaded);
    }).end(file.buffer);
  });

  return {
    mediaType: isVideo ? 'video' : 'image',
    mediaUrl: result.secure_url,
    mediaPublicId: result.public_id,
  };
};

// Create status
exports.createStatus = async (req, res) => {
  try {
    const {
      text,
      backgroundColor,
      textColor,
      fontFamily,
      textAlign,
      durationSec,
    } = req.body;
    let imageUrl = '';
    let videoUrl = '';
    let mediaType = 'text';
    let mediaPublicId = '';

    if (!text && !req.file) {
      return res.status(400).json({ success: false, message: 'Please provide text, image, or video' });
    }

    const user = await User.findById(req.user._id);

    // Check if user already has 5 statuses
    const activeStatuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));
    if (activeStatuses.length >= 5) {
      return res.status(400).json({ success: false, message: 'Maximum 5 active statuses allowed' });
    }

    // Upload media if provided
    if (req.file) {
      const uploadResult = await uploadStatusMedia(req.file);
      mediaType = uploadResult.mediaType;
      mediaPublicId = uploadResult.mediaPublicId;
      if (mediaType === 'video') {
        videoUrl = uploadResult.mediaUrl;
      } else {
        imageUrl = uploadResult.mediaUrl;
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    user.statuses.push({
      text: text || '',
      image: imageUrl,
      video: videoUrl,
      mediaType,
      mediaPublicId,
      backgroundColor: String(backgroundColor || '#1f2937'),
      textColor: String(textColor || '#ffffff'),
      fontFamily: String(fontFamily || 'Inter'),
      textAlign: ['left', 'center', 'right'].includes(textAlign) ? textAlign : 'center',
      durationSec: clampStatusDuration(durationSec),
      createdAt: now,
      expiresAt
    });

    await user.save();

    const activeStatuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));
    res.json({ success: true, statuses: activeStatuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get statuses
exports.getStatuses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('statuses');

    // Filter out expired statuses
    const activeStatuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));

    // Clean up expired statuses
    const expiredStatuses = user.statuses.filter(s => new Date() >= new Date(s.expiresAt));
    for (const status of expiredStatuses) {
      await destroyStatusMedia(status);
    }

    user.statuses = activeStatuses;
    await user.save();

    res.json({ success: true, statuses: activeStatuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update status
exports.updateStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const {
      text,
      backgroundColor,
      textColor,
      fontFamily,
      textAlign,
      durationSec,
    } = req.body;

    const user = await User.findById(req.user._id);
    const status = user.statuses.id(statusId);

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Update text
    if (text !== undefined) {
      status.text = text;
    }
    if (backgroundColor !== undefined) {
      status.backgroundColor = String(backgroundColor || '#1f2937');
    }
    if (textColor !== undefined) {
      status.textColor = String(textColor || '#ffffff');
    }
    if (fontFamily !== undefined) {
      status.fontFamily = String(fontFamily || 'Inter');
    }
    if (textAlign !== undefined) {
      status.textAlign = ['left', 'center', 'right'].includes(textAlign) ? textAlign : 'center';
    }
    if (durationSec !== undefined) {
      status.durationSec = clampStatusDuration(durationSec);
    }

    // Update media if new one provided
    if (req.file) {
      await destroyStatusMedia(status);

      const uploadResult = await uploadStatusMedia(req.file);
      status.mediaType = uploadResult.mediaType;
      status.mediaPublicId = uploadResult.mediaPublicId;
      if (uploadResult.mediaType === 'video') {
        status.video = uploadResult.mediaUrl;
        status.image = '';
      } else {
        status.image = uploadResult.mediaUrl;
        status.video = '';
      }
    } else if (!status.image && !status.video) {
      status.mediaType = 'text';
      status.mediaPublicId = '';
    }

    await user.save();

    const activeStatuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));
    res.json({ success: true, statuses: activeStatuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete status
exports.deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;

    const user = await User.findById(req.user._id);
    const status = user.statuses.id(statusId);

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    await destroyStatusMedia(status);

    user.statuses.pull(statusId);
    await user.save();

    const activeStatuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));
    res.json({ success: true, statuses: activeStatuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Guest logout - delete all data
exports.guestLogout = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user || !user.isGuest) {
      return res.status(400).json({ success: false, message: 'Not a guest user' });
    }

    const Blog = require('../models/Blog');
    const Short = require('../models/Short');
    const Comment = require('../models/Comment');
    const Notification = require('../models/Notification');
    const Message = require('../models/Message');

    // Delete all guest data
    await Promise.all([
      Blog.deleteMany({ author: userId }),
      Short.deleteMany({ author: userId }),
      Comment.deleteMany({ author: userId }),
      Notification.deleteMany({ $or: [{ user: userId }, { sender: userId }] }),
      Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }),
      User.findByIdAndDelete(userId)
    ]);

    res.json({ success: true, message: 'Guest account and all data deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
