const User = require('../models/User');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const StatusView = require('../models/StatusView');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const generateRawApiKey = require('../utils/generateApiKey');
const cloudinary = require('../utils/cloudinary');
const { enqueueEmailJob } = require('../jobs/queueService');
const { validateEmail } = require('../utils/emailValidator');
const { createApiKeyRecord, maskApiKey } = require('../utils/apiKeys');
const { sanitizeOwnerProfile } = require('../utils/userSanitizer');
const { cleanupUserAccountData } = require('../utils/accountCleanup');
const { normalizeHttpUrl } = require('../utils/safeUrls');
const {
  canViewerSeeStatus,
  filterVisibleStatusesForViewer,
  getUserId,
  getViewerRelationshipToTarget,
  normalizeStatusAudience,
  sanitizeStatusesForViewer,
} = require('../utils/userVisibility');
const {
  getImageFileSignatureValidationError,
  getImageSignatureValidationError,
} = require('../utils/imageSignatures');
const { getMediaFileSignatureValidationError } = require('../utils/mediaSignatures');
const {
  createVerificationCode,
  deleteVerificationCodes,
  verifyVerificationCode,
} = require('../utils/verificationCodes');
const { logError } = require('../utils/safeErrorLog');
const { sendAccountMessage } = require('../services/accountMessagingService');
const {
  getPasswordValidationError,
  isPasswordComparable,
  normalizePasswordInput,
} = require('../utils/passwordPolicy');
const {
  ACTION_LABELS,
  buildTwoFactorStatus,
  createVerifiedActionToken,
  getPasswordAttemptState,
  getChallengeMethodsPayload,
  PASSWORD_ATTEMPT_LIMIT,
  recordPasswordAttemptFailure,
  resetPasswordAttemptState,
  verifySensitiveActionToken,
  verifyTwoFactorActionToken,
} = require('../utils/twoFactor');

const SOCIAL_PROVIDER_DOMAIN_MATCHERS = {
  google: ['google.com', 'accounts.google.com'],
  facebook: ['facebook.com', 'fb.com'],
  twitter: ['twitter.com', 'x.com'],
  linkedin: ['linkedin.com'],
  github: ['github.com'],
  telegram: ['telegram', 't.me'],
};

const SOCIAL_OAUTH_PROVIDERS = new Set(['google', 'facebook', 'twitter', 'linkedin', 'telegram']);
const PROFILE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const STATUS_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const USER_SERVER_ERROR_MESSAGE = 'Unable to process user request';
const SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS = Math.max(
  100,
  Number(process.env.SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS) || 5000
);
const STATUS_MEDIA_URL_TTL_SECONDS = Math.max(
  60,
  Math.min(60 * 60, Number(process.env.STATUS_MEDIA_URL_TTL_SECONDS) || 300)
);
const isValidObjectId = (value) => mongoose.isValidObjectId(String(value || ''));

const getSafeUserErrorStatus = (error) => {
  const status = Number(error?.statusCode || error?.status);
  return Number.isInteger(status) && status >= 400 && status < 500 ? status : 500;
};

const sendUserError = (res, error, fallbackMessage = USER_SERVER_ERROR_MESSAGE) => {
  const status = getSafeUserErrorStatus(error);
  if (status >= 500) {
    logError('User request failed:', error);
  }

  return res.status(status).json({
    success: false,
    message: status < 500 && error?.message ? error.message : fallbackMessage,
  });
};

const buildUploadValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeSocialValue = (value = '') => String(value || '').trim().toLowerCase();
const normalizeEmailValue = (value = '') => String(value || '').trim().toLowerCase();
const isDuplicateKeyError = (error) => error?.code === 11000;

const doesSocialEntryMatchProvider = (entry, provider) => {
  const key = normalizeSocialValue(provider);
  const domains = SOCIAL_PROVIDER_DOMAIN_MATCHERS[key] || [];
  const nameValue = normalizeSocialValue(entry?.name);
  const urlValue = normalizeSocialValue(entry?.url);
  return domains.some((domain) => nameValue.includes(domain) || urlValue.includes(domain));
};

const filterSocialLinksForPrivacy = (socialMedia = [], privacy = {}) => {
  if (!privacy.showSocialLinks) return [];

  const providerVisibility = {
    facebook: privacy.showFacebookLinks,
    twitter: privacy.showTwitterLinks,
    linkedin: privacy.showLinkedInLinks,
    github: privacy.showGitHubLinks,
  };

  return (Array.isArray(socialMedia) ? socialMedia : [])
    .map((entry) => ({
      ...entry,
      url: normalizeHttpUrl(entry?.url, { maxLength: 300 }),
    }))
    .filter((entry) => {
      if (!entry.url) return false;
      const value = normalizeSocialValue(`${entry?.name || ''} ${entry?.url || ''}`);
      const provider = Object.keys(providerVisibility).find((key) => value.includes(key));
      return provider ? providerVisibility[provider] !== false : true;
    });
};

const normalizeSocialMediaLinks = (socialMedia = []) =>
  (Array.isArray(socialMedia) ? socialMedia : [])
    .filter(entry => entry && typeof entry === 'object')
    .map((entry) => ({
      name: String(entry.name || '').trim().slice(0, 80),
      url: normalizeHttpUrl(entry.url, { maxLength: 300 }),
    }))
    .filter(entry => entry.url)
    .slice(0, 20);

const buildPublicProfile = (user, { relationship, visibleStatuses, counts }) => {
  const privacy = user.privacy || {};
  const profileVisibility = privacy.profileVisibility || 'public';
  const canViewProfile = !relationship?.isBlocked &&
    (profileVisibility === 'public' || (profileVisibility === 'friends' && relationship?.isFollower));

  const profile = {
    _id: user._id,
    username: user.username,
    name: user.name,
    fullName: user.fullName,
    profileImage: user.profileImage,
    description: canViewProfile ? user.description : '',
    bio: canViewProfile ? user.bio : '',
    signature: canViewProfile ? user.signature : '',
    isVerified: user.isVerified,
    isSeller: user.isSeller,
    role: user.role,
    lastSeen: user.lastSeen,
    statuses: canViewProfile ? sanitizeStatusesForViewer(visibleStatuses, relationship) : [],
    hasActiveStatus: canViewProfile && visibleStatuses.length > 0,
    blogCount: counts.blogCount,
    articleCount: counts.articleCount,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    followers: canViewProfile ? user.followers : [],
    following: canViewProfile ? user.following : [],
    profileVisibility,
  };

  if (canViewProfile && privacy.showEmail) profile.email = user.email;
  if (canViewProfile && privacy.showPhone) profile.phone = user.phone;
  if (canViewProfile) profile.socialMedia = filterSocialLinksForPrivacy(user.socialMedia, privacy);

  return profile;
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const targetUserId = req.params.id || req.user?._id;

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!req.params.id && (req.user?.isGuest || req.user?.role === 'guest')) {
      return res.status(403).json({
        success: false,
        message: 'Profile settings are available to registered users only'
      });
    }

    if (!isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    // Check if user exists first
    const user = await User.findById(targetUserId)
      .select('-password -twoFactor.sms.phone')
      .populate('followers', 'username profileImage')
      .populate('following', 'username profileImage');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User does not exist' });
    }

    // If viewing someone else's profile, require authentication
    if (req.params.id && !req.user) {
      return res.status(401).json({ success: false, message: 'Please login to view profiles' });
    }

    const relationship = getViewerRelationshipToTarget(req.user, user);
    if (!relationship.isOwner && relationship.isBlocked) {
      return res.status(403).json({ success: false, message: 'Profile unavailable' });
    }

    // Set default description if empty
    if (!user.description) {
      user.description = 'Passionate blogger on Modern Blog platform. Join me on my writing journey!';
      await user.save();
    }

    const blogCount = await Blog.countDocuments({ author: user._id, isDraft: false });
    const articleCount = await Article.countDocuments({ author: user._id, isDraft: false });
    const isOwner = relationship.isOwner;
    const visibleStatuses = filterVisibleStatusesForViewer(user.statuses, relationship);
    const hasActiveStatus = visibleStatuses.length > 0;

    const counts = {
      blogCount,
      articleCount,
      followerCount: user.followers.length,
      followingCount: user.following.length
    };
    const userPayload = isOwner
      ? {
          ...sanitizeOwnerProfile(user.toObject()),
          statuses: sanitizeStatusesForViewer(visibleStatuses, relationship),
          hasActiveStatus,
          ...counts,
        }
      : buildPublicProfile(user, { relationship, visibleStatuses, counts });

    res.json({
      success: true,
      user: userPayload
    });
  } catch (error) {
    return sendUserError(res, error);
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
          linkedin: { id: provider === 'linkedin' ? '' : user?.oauthProviders?.linkedin?.id || '' },
          telegram: { id: provider === 'telegram' ? '' : user?.oauthProviders?.telegram?.id || '' },
        };
        changed = true;
      }
    }

    if (!changed) {
      return res.status(404).json({ success: false, message: 'Provider is not connected' });
    }

    user.socialMedia = nextSocial;
    await user.save();

    return res.json({
      success: true,
      message: `${provider} disconnected successfully`,
      user: sanitizeOwnerProfile(user.toObject()),
    });
  } catch (error) {
    return sendUserError(res, error);
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

    const existingUser = await User.findById(req.user._id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const emailProvided = Object.prototype.hasOwnProperty.call(req.body, 'email');
    const requestedEmail = emailProvided ? normalizeEmailValue(email) : existingUser.email;
    const emailChanged = emailProvided &&
      normalizeEmailValue(existingUser.email) !== requestedEmail;

    if (emailChanged) {
      const sensitiveActionToken = req.headers['x-sensitive-action-token'] || req.body?.sensitiveActionToken;
      const passwordVerified = await verifySensitiveActionToken({
        userId: existingUser._id,
        action: 'change_email',
        token: sensitiveActionToken,
      });

      if (!passwordVerified) {
        return res.status(403).json({
          success: false,
          requiresPassword: true,
          action: 'change_email',
          actionLabel: 'change your email',
          message: 'Account password verification required',
        });
      }

      const twoFactorStatus = buildTwoFactorStatus(existingUser);
      if (twoFactorStatus.enabled) {
        const token = req.headers['x-two-factor-token'] || req.body?.twoFactorToken;
        const verified = await verifyTwoFactorActionToken({
          userId: existingUser._id,
          action: 'change_email',
          token,
        });

        if (!verified) {
          return res.status(403).json({
            success: false,
            requiresTwoFactor: true,
            action: 'change_email',
            actionLabel: 'change your email',
            message: 'Two-factor verification required',
            twoFactor: getChallengeMethodsPayload(existingUser),
          });
        }
      }
    }

    if (emailChanged && requestedEmail) {
      const emailValidation = validateEmail(requestedEmail);
      if (!emailValidation.valid) {
        return res.status(400).json({ success: false, message: emailValidation.message });
      }

      const emailOwner = await User.findOne({
        _id: { $ne: existingUser._id },
        email: requestedEmail,
      }).select('_id');
      if (emailOwner) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    const updates = {
      fullName,
      email: requestedEmail,
      phone,
      dateOfBirth,
      address,
      bio,
      description,
      signature,
      privacy,
    };

    if (emailChanged) {
      updates.isVerified = false;
      updates.verifiedBy = null;
      updates.verifiedAt = null;
    }

    if (socialMedia !== undefined) {
      updates.socialMedia = normalizeSocialMediaLinks(socialMedia);
    }

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
    ).select('-password -twoFactor.sms.phone');

    res.json({ success: true, user: sanitizeOwnerProfile(user.toObject()) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ success: false, message: 'Email or username already registered' });
    }
    return sendUserError(res, error);
  }
};

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  let uploadedProfilePublicId = '';
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const signatureError = getImageSignatureValidationError(req.file, PROFILE_IMAGE_MIME_TYPES);
    if (signatureError) {
      return res.status(400).json({ success: false, message: signatureError });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let previousProfilePublicId = '';
    if (user.profileImage && user.profileImage.includes('cloudinary')) {
      const publicId = user.profileImage.split('/').pop().split('.')[0];
      previousProfilePublicId = `blog-profiles/${publicId}`;
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

    uploadedProfilePublicId = result.public_id;
    user.profileImage = result.secure_url;
    await user.save();
    uploadedProfilePublicId = '';

    if (previousProfilePublicId) {
      await cloudinary.uploader.destroy(previousProfilePublicId).catch(() => {});
    }

    res.json({ success: true, profileImage: user.profileImage });
  } catch (error) {
    if (uploadedProfilePublicId) {
      await cloudinary.uploader.destroy(uploadedProfilePublicId).catch(() => {});
    }
    return sendUserError(res, error);
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
    return sendUserError(res, error);
  }
};

// Request password change
exports.requestPasswordChange = async (req, res) => {
  try {
    const currentPassword = normalizePasswordInput(req.body?.currentPassword);
    const newPassword = normalizePasswordInput(req.body?.newPassword);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both passwords' });
    }

    const passwordError = getPasswordValidationError(newPassword, 'New password');
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const attemptState = getPasswordAttemptState(user);
    if (attemptState.isLocked) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed password attempts. Try again after the lock expires.',
        attemptsRemaining: 0,
        lockedUntil: attemptState.lockedUntil,
        showForgotPassword: true,
      });
    }

    const isMatch = isPasswordComparable(currentPassword) && await user.comparePassword(currentPassword);

    if (!isMatch) {
      const failureState = recordPasswordAttemptFailure(user);
      await user.save();

      return res.status(failureState.isLocked ? 429 : 401).json({
        success: false,
        message: failureState.isLocked
          ? 'Too many failed password attempts. Try again tomorrow or reset your password.'
          : 'Current password is incorrect',
        attemptsRemaining: failureState.attemptsRemaining,
        failedAttempts: failureState.failedAttempts,
        lockedUntil: failureState.lockedUntil,
        showForgotPassword: true,
      });
    }

    resetPasswordAttemptState(user);
    await user.save();

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { code: confirmationCode, expiresAt: passwordChangeExpiresAt } = await createVerificationCode({
      email: user.email,
      type: 'passwordChange',
      username: user.username,
      metadata: {
        userId: user._id.toString(),
        passwordHash,
      },
    });

    const delivery = await sendAccountMessage({
      user,
      emailJobType: 'password-change-confirmation',
      emailPayload: {
        username: user.username,
        code: confirmationCode,
        expiresAt: passwordChangeExpiresAt,
      },
      telegramText: `Lekhon password change confirmation code: ${confirmationCode}\n\nThis code expires soon. Never share it with anyone.`,
      telegramErrorContext: 'Telegram password change code',
    });
    if (!delivery.anyDelivered) {
      return res.status(503).json({ success: false, message: 'We could not send the confirmation code through any linked contact channel.' });
    }

    res.json({
      success: true,
      deliveryChannel: delivery.channels.length > 1 ? 'both' : delivery.channels[0],
      deliveryChannels: delivery.channels,
      message: `Confirmation code sent through ${delivery.channels.join(' and ')}`,
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Confirm password change
exports.confirmPasswordChange = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Confirmation code required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verification = await verifyVerificationCode({
      email: user.email,
      type: 'passwordChange',
      username: user.username,
      code,
      consume: true,
    });

    if (!verification.ok && verification.reason === 'not_found') {
      return res.status(400).json({ success: false, message: 'No password change request found' });
    }
    if (!verification.ok || verification.record?.metadata?.userId !== req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code' });
    }

    const passwordHash = verification.record?.metadata?.passwordHash;
    if (!passwordHash) {
      return res.status(400).json({ success: false, message: 'Invalid password change request' });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: passwordHash, mustChangePasswordAfterGoogle: false },
        $inc: { authVersion: 1 },
      }
    );

    await sendAccountMessage({
      user,
      emailJobType: 'password-changed-success',
      emailPayload: { username: user.username, changedAt: Date.now() },
      telegramText: 'Your Lekhon password was changed successfully. If this was not you, contact Lekhon support immediately.',
      telegramErrorContext: 'Telegram password change notification',
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Request account deletion
exports.requestAccountDeletion = async (req, res) => {
  try {
    const password = normalizePasswordInput(req.body?.password);

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password required' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const attemptState = getPasswordAttemptState(user);
    if (attemptState.isLocked) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed password attempts. Try again after the lock expires.',
        attemptsRemaining: 0,
        lockedUntil: attemptState.lockedUntil,
        showForgotPassword: true,
      });
    }

    const isMatch = isPasswordComparable(password) && await user.comparePassword(password);

    if (!isMatch) {
      const failureState = recordPasswordAttemptFailure(user);
      await user.save();

      return res.status(failureState.isLocked ? 429 : 401).json({
        success: false,
        message: failureState.isLocked
          ? 'Too many failed password attempts. Try again tomorrow or reset your password.'
          : 'Incorrect password',
        attemptsRemaining: failureState.attemptsRemaining,
        failedAttempts: failureState.failedAttempts,
        lockedUntil: failureState.lockedUntil,
        showForgotPassword: true,
      });
    }

    resetPasswordAttemptState(user);
    await user.save();

    const { code: confirmationCode, expiresAt: accountDeletionExpiresAt } = await createVerificationCode({
      email: user.email,
      type: 'accountDeletion',
      username: user.username,
      metadata: { userId: user._id.toString() },
    });

    const delivery = await sendAccountMessage({
      user,
      emailJobType: 'account-deletion-confirmation',
      emailPayload: {
        username: user.username,
        code: confirmationCode,
        expiresAt: accountDeletionExpiresAt,
      },
      telegramText: `Lekhon account deletion confirmation code: ${confirmationCode}\n\nThis action permanently deletes your account. Never share this code.`,
      telegramErrorContext: 'Telegram account deletion code',
    });
    if (!delivery.anyDelivered) {
      return res.status(503).json({ success: false, message: 'We could not send the deletion code through any linked contact channel.' });
    }

    res.json({
      success: true,
      deliveryChannel: delivery.channels.length > 1 ? 'both' : delivery.channels[0],
      deliveryChannels: delivery.channels,
      message: `Confirmation code sent through ${delivery.channels.join(' and ')}`,
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Confirm account deletion
exports.confirmAccountDeletion = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Confirmation code required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verification = await verifyVerificationCode({
      email: user.email,
      type: 'accountDeletion',
      username: user.username,
      code,
      consume: true,
    });

    if (!verification.ok && verification.reason === 'not_found') {
      return res.status(400).json({ success: false, message: 'No deletion request found' });
    }
    if (!verification.ok || verification.record?.metadata?.userId !== req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code' });
    }

    // Send success email before deletion
    const userEmail = user.email;
    const userName = user.username;

    await cleanupUserAccountData(user, { deleteUser: true });

    await deleteVerificationCodes({ email: userEmail, types: ['accountDeletion'] });

    await sendAccountMessage({
      user: { email: userEmail, oauthProviders: user.oauthProviders },
      emailJobType: 'account-deleted-success',
      emailPayload: { username: userName },
      telegramText: 'Your Lekhon account and its associated data were deleted successfully.',
      telegramErrorContext: 'Telegram account deletion notification',
    });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Generate API key
exports.generateApiKey = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'API key name is required' });
    }

    const apiKey = generateRawApiKey();
    const user = await User.findById(req.user._id).select('+apiKeys.keyHash');

    user.apiKeys.push(createApiKeyRecord(name.trim(), apiKey));
    await user.save();

    const createdKey = user.apiKeys[user.apiKeys.length - 1];
    res.json({
      success: true,
      apiKey: {
        ...maskApiKey(createdKey),
        key: apiKey,
      },
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Get API keys
exports.getApiKeys = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('apiKeys');
    res.json({ success: true, apiKeys: (user.apiKeys || []).map(maskApiKey) });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Revoke API key
exports.revokeApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    if (!mongoose.isValidObjectId(keyId)) {
      return res.status(400).json({ success: false, message: 'Invalid API key id' });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $pull: { apiKeys: { _id: keyId } } }
    );

    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    return sendUserError(res, error);
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

    res.json({ success: true, user: sanitizeOwnerProfile(user.toObject()) });
  } catch (error) {
    return sendUserError(res, error);
  }
};

exports.verifySensitiveActionPassword = async (req, res) => {
  try {
    const action = String(req.body.action || '').trim();
    const password = normalizePasswordInput(req.body?.password);

    if (!ACTION_LABELS[action]) {
      return res.status(400).json({ success: false, message: 'Unsupported sensitive action' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Account password is required' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const attemptState = getPasswordAttemptState(user);
    if (attemptState.isLocked) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed password attempts. Try again after the lock expires.',
        attemptsRemaining: 0,
        lockedUntil: attemptState.lockedUntil,
        showForgotPassword: true,
      });
    }

    const isMatch = isPasswordComparable(password) && await user.comparePassword(password);
    if (!isMatch) {
      const failureState = recordPasswordAttemptFailure(user);
      await user.save();

      return res.status(failureState.isLocked ? 429 : 401).json({
        success: false,
        message: failureState.isLocked
          ? 'Too many failed password attempts. Try again tomorrow or reset your password.'
          : 'Account password is incorrect',
        attemptsRemaining: failureState.attemptsRemaining,
        failedAttempts: failureState.failedAttempts,
        lockedUntil: failureState.lockedUntil,
        showForgotPassword: true,
      });
    }

    resetPasswordAttemptState(user);
    await user.save();

    const { token } = await createVerifiedActionToken({
      userId: user._id,
      action,
      method: 'password',
    });
    const twoFactorStatus = buildTwoFactorStatus(user);

    return res.json({
      success: true,
      sensitiveActionToken: token,
      requiresTwoFactor: twoFactorStatus.enabled,
      twoFactor: twoFactorStatus.enabled ? getChallengeMethodsPayload(user) : null,
      action,
      actionLabel: ACTION_LABELS[action],
      attemptsRemaining: PASSWORD_ATTEMPT_LIMIT,
      message: twoFactorStatus.enabled
        ? 'Password verified. Complete two-factor verification to continue.'
        : 'Password verified',
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

exports.getSensitiveActionPasswordStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const state = getPasswordAttemptState(user);
    return res.json({
      success: true,
      attemptsRemaining: state.attemptsRemaining,
      failedAttempts: state.failedAttempts,
      lockedUntil: state.lockedUntil,
      isLocked: state.isLocked,
      limit: PASSWORD_ATTEMPT_LIMIT,
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

const clampStatusDuration = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 7;
  return Math.max(3, Math.min(30, Math.floor(parsed)));
};

const clampStatusPosition = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, parsed));
};

const clampStatusTrimSec = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(300, Number(parsed.toFixed(2))));
};

const normalizeStatusContentType = (value) => {
  const nextType = String(value || 'story').trim().toLowerCase();
  return nextType === 'post' ? 'post' : 'story';
};

const normalizeStatusTrimRange = (startValue, endValue) => {
  const maxClipDurationSec = 10;
  const nextStart = clampStatusTrimSec(startValue);
  const nextEnd = clampStatusTrimSec(endValue);
  const trimStartSec = nextStart === null ? 0 : nextStart;
  const maxAllowedEnd = Number((trimStartSec + maxClipDurationSec).toFixed(2));
  const trimEndSec = Number(
    (
      nextEnd !== null && nextEnd > trimStartSec
        ? Math.min(nextEnd, maxAllowedEnd)
        : maxAllowedEnd
    ).toFixed(2)
  );

  return { trimStartSec, trimEndSec };
};

const clampStatusStickerSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 48;
  return Math.max(24, Math.min(96, Math.round(parsed)));
};

const clampStatusStickerRotate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(-60, Math.min(60, Math.round(parsed)));
};

const normalizeStatusMusicLabel = (value) => String(value || '').trim().slice(0, 80);
const normalizeStatusMusicSourceType = (value) => {
  const sourceType = String(value || 'none').trim().toLowerCase();
  if (['none', 'spotify', 'youtube', 'apple', 'soundcloud', 'custom'].includes(sourceType)) {
    return sourceType;
  }
  return 'none';
};
const normalizeStatusMusicSourceUrl = (value) => String(value || '').trim().slice(0, 240);

const normalizeStatusStickers = (value) => {
  if (value === undefined || value === null || value === '') return [];

  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .slice(0, 8)
    .map((sticker, index) => ({
      id: String(sticker?.id || `sticker-${Date.now()}-${index}`),
      emoji: String(sticker?.emoji || '').trim().slice(0, 8),
      x: clampStatusPosition(sticker?.x),
      y: clampStatusPosition(sticker?.y),
      size: clampStatusStickerSize(sticker?.size),
      rotate: clampStatusStickerRotate(sticker?.rotate),
    }))
    .filter((sticker) => sticker.emoji.length > 0);
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

const STATUS_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const isStatusVideoUpload = (file) =>
  STATUS_VIDEO_MIME_TYPES.has(String(file?.mimetype || '').toLowerCase());

const cleanupTempUpload = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logError('Status temp cleanup error:', error);
    }
  }
};

const snapshotStatusMedia = (status) => ({
  mediaPublicId: status?.mediaPublicId || '',
  mediaType: status?.mediaType || 'text',
  mediaFormat: status?.mediaFormat || '',
  mediaResourceType: status?.mediaResourceType || '',
  mediaDeliveryType: status?.mediaDeliveryType || '',
  image: status?.image || '',
  video: status?.video || '',
});

const destroyStatusMedia = async (status) => {
  const publicId = resolveStatusPublicId(status);
  if (!publicId) return;

  const isVideo = status?.mediaType === 'video' || Boolean(status?.video);
  await cloudinary.uploader.destroy(publicId, {
    ...(isVideo ? { resource_type: 'video' } : { resource_type: 'image' }),
    ...(status?.mediaDeliveryType ? { type: status.mediaDeliveryType } : {}),
    invalidate: true,
  });
};

const recordStatusView = async ({ ownerId, status, viewerId }) => {
  try {
    const result = await StatusView.updateOne(
      { statusOwnerId: ownerId, statusId: status._id, viewerId },
      {
        $setOnInsert: {
          statusOwnerId: ownerId,
          statusId: status._id,
          viewerId,
          seenAt: new Date(),
          expiresAt: status.expiresAt,
        },
      },
      { upsert: true }
    ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);

    if (result.upsertedCount === 1) {
      await User.updateOne(
        { _id: ownerId, 'statuses._id': status._id },
        { $inc: { 'statuses.$.seenByCount': 1 } }
      ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
    }
  } catch (error) {
    if (error?.code !== 11000 && error?.code !== 11001) throw error;
  }
};

const uploadStatusMedia = async (file, trimRange = null) => {
  const isVideo = isStatusVideoUpload(file);
  if (isVideo) {
    const signatureError = await getMediaFileSignatureValidationError(file, STATUS_VIDEO_MIME_TYPES);
    if (signatureError) {
      throw buildUploadValidationError(signatureError);
    }
  } else {
    const signatureError = await getImageFileSignatureValidationError(file, STATUS_IMAGE_MIME_TYPES);
    if (signatureError) {
      throw buildUploadValidationError(signatureError);
    }
  }
  const uploadOptions = isVideo
    ? {
        folder: 'blog-status/videos',
        resource_type: 'video',
        type: 'authenticated',
        public_id: `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`,
      }
    : {
        folder: 'blog-status/images',
        resource_type: 'image',
        type: 'authenticated',
        public_id: `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`,
        transformation: [
          { width: 1080, height: 1920, crop: 'limit' },
          { quality: 'auto' },
        ],
      };

  if (isVideo && trimRange) {
    const trimStart = clampStatusTrimSec(trimRange.trimStartSec);
    const trimEnd = clampStatusTrimSec(trimRange.trimEndSec);

    if (trimStart !== null && trimStart > 0) {
      uploadOptions.start_offset = trimStart;
    }
    if (trimEnd !== null && (trimStart === null || trimEnd > trimStart)) {
      uploadOptions.end_offset = trimEnd;
    }
  }

  if (!file.path) {
    throw new Error('Status media temp file missing');
  }
  const result = await cloudinary.uploader.upload(file.path, uploadOptions);

  return {
    mediaType: isVideo ? 'video' : 'image',
    mediaUrl: '',
    mediaPublicId: result.public_id,
    mediaFormat: result.format || (isVideo ? 'mp4' : 'jpg'),
    mediaResourceType: result.resource_type || (isVideo ? 'video' : 'image'),
    mediaDeliveryType: 'authenticated',
  };
};

const getStatusMediaUrl = (status) => {
  if (!status) return '';
  if (status.mediaPublicId && status.mediaDeliveryType === 'authenticated') {
    const format = String(status.mediaFormat || (status.mediaType === 'video' ? 'mp4' : 'jpg'))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'bin';
    return cloudinary.utils.private_download_url(status.mediaPublicId, format, {
      expires_at: Math.floor(Date.now() / 1000) + STATUS_MEDIA_URL_TTL_SECONDS,
      resource_type: status.mediaResourceType || (status.mediaType === 'video' ? 'video' : 'image'),
      type: 'authenticated',
      attachment: false,
    });
  }
  return String(status.video || status.image || '').trim();
};

const serializeStatusesWithMedia = (statuses, relationship) =>
  (Array.isArray(statuses) ? statuses : []).map((status) => {
    const safeStatus = sanitizeStatusesForViewer([status], relationship)[0];
    const url = getStatusMediaUrl(status);
    if (/^https:\/\//i.test(url) && url.length <= 8192) {
      if (status.mediaType === 'video') safeStatus.video = url;
      else if (status.mediaType === 'image') safeStatus.image = url;
    }
    return safeStatus;
  });

// Create status
exports.createStatus = async (req, res) => {
  let uploadedStatusMedia = null;
  try {
    const {
      contentType,
      text,
      musicLabel,
      musicSourceType,
      musicSourceUrl,
      stickers,
      backgroundColor,
      textColor,
      fontFamily,
      textAlign,
      textPosX,
      textPosY,
      trimStartSec,
      trimEndSec,
      audience,
      durationSec,
    } = req.body;
    let imageUrl = '';
    let videoUrl = '';
    let mediaType = 'text';
    let mediaPublicId = '';
    let mediaFormat = '';
    let mediaResourceType = '';
    let mediaDeliveryType = '';
    const normalizedContentType = normalizeStatusContentType(contentType);
    const normalizedStickers = normalizeStatusStickers(stickers);
    const normalizedMusicLabel = normalizeStatusMusicLabel(musicLabel);
    const normalizedMusicSourceType = normalizeStatusMusicSourceType(musicSourceType);
    const normalizedMusicSourceUrl =
      normalizedMusicSourceType === 'none' ? '' : normalizeStatusMusicSourceUrl(musicSourceUrl);
    const normalizedTrimRange = normalizeStatusTrimRange(trimStartSec, trimEndSec);
    const isVideoUpload = Boolean(req.file && isStatusVideoUpload(req.file));

    if (normalizedContentType === 'post' && isVideoUpload) {
      return res.status(400).json({ success: false, message: 'Post mode does not support video uploads' });
    }

    if (!text && !req.file && normalizedStickers.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide text, image, video, or stickers' });
    }

    const now = new Date();
    const user = await User.findById(req.user._id)
      .select('statuses.expiresAt')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS)
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user already has 5 statuses
    const existingActiveStatuses = (user.statuses || []).filter(s => now < new Date(s.expiresAt));
    if (existingActiveStatuses.length >= 5) {
      return res.status(400).json({ success: false, message: 'Maximum 5 active statuses allowed' });
    }

    // Upload media if provided
    if (req.file) {
      const uploadResult = await uploadStatusMedia(req.file, normalizedTrimRange);
      uploadedStatusMedia = uploadResult;
      mediaType = uploadResult.mediaType;
      mediaPublicId = uploadResult.mediaPublicId;
      mediaFormat = uploadResult.mediaFormat;
      mediaResourceType = uploadResult.mediaResourceType;
      mediaDeliveryType = uploadResult.mediaDeliveryType;
      if (mediaType === 'video') {
        videoUrl = uploadResult.mediaUrl;
      } else {
        imageUrl = uploadResult.mediaUrl;
      }
    }

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newStatus = {
      contentType: normalizedContentType,
      text: text || '',
      image: imageUrl,
      video: videoUrl,
      mediaType,
      mediaPublicId,
      mediaFormat,
      mediaResourceType,
      mediaDeliveryType,
      backgroundColor: String(backgroundColor || '#1f2937'),
      textColor: String(textColor || '#ffffff'),
      fontFamily: String(fontFamily || 'Inter'),
      textAlign: ['left', 'center', 'right'].includes(textAlign) ? textAlign : 'center',
      musicLabel: normalizedMusicLabel,
      musicSourceType: normalizedMusicSourceType,
      musicSourceUrl: normalizedMusicSourceUrl,
      trimStartSec: mediaType === 'video' ? normalizedTrimRange.trimStartSec : 0,
      trimEndSec: mediaType === 'video' ? normalizedTrimRange.trimEndSec : null,
      stickers: normalizedStickers,
      textPosX: clampStatusPosition(textPosX),
      textPosY: clampStatusPosition(textPosY),
      audience: normalizeStatusAudience(audience),
      seenBy: [],
      seenByCount: 0,
      durationSec: clampStatusDuration(durationSec),
      createdAt: now,
      expiresAt
    };

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        $expr: {
          $lt: [
            {
              $size: {
                $filter: {
                  input: '$statuses',
                  as: 'status',
                  cond: { $gt: ['$$status.expiresAt', now] }
                }
              }
            },
            5
          ]
        }
      },
      { $push: { statuses: newStatus } },
      { new: true }
    )
      .select('statuses')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
    if (!updatedUser) {
      if (uploadedStatusMedia?.mediaPublicId) {
        await destroyStatusMedia(uploadedStatusMedia);
        uploadedStatusMedia = null;
      }
      return res.status(400).json({ success: false, message: 'Maximum 5 active statuses allowed' });
    }
    uploadedStatusMedia = null;

    const responseActiveStatuses = updatedUser.statuses.filter(s => new Date() < new Date(s.expiresAt));
    res.json({
      success: true,
      statuses: serializeStatusesWithMedia(responseActiveStatuses, { isOwner: true }),
    });
  } catch (error) {
    if (uploadedStatusMedia?.mediaPublicId) {
      await destroyStatusMedia(uploadedStatusMedia);
    }
    return sendUserError(res, error);
  } finally {
    await cleanupTempUpload(req.file?.path);
  }
};

// Get statuses
exports.getStatuses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('statuses')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS)
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const now = new Date();
    const statuses = Array.isArray(user.statuses) ? user.statuses : [];
    // Filter out expired statuses
    const activeStatuses = statuses.filter(s => now < new Date(s.expiresAt));

    res.json({
      success: true,
      statuses: serializeStatusesWithMedia(activeStatuses, { isOwner: true }),
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Get visible statuses for a specific user and track story views
exports.getUserStatuses = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = getUserId(req.user);

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const targetUser = await User.findById(userId)
      .select('username followers blockedUsers statuses')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const relationship = getViewerRelationshipToTarget(req.user, targetUser);
    if (!relationship.isOwner && relationship.isBlocked) {
      return res.status(403).json({ success: false, message: 'Statuses unavailable' });
    }

    const { isOwner, isFollower } = relationship;
    const visibleStatuses = filterVisibleStatusesForViewer(targetUser.statuses, relationship);

    // Track viewers for stories they can see (except owner viewing own statuses)
    if (!isOwner && viewerId && visibleStatuses.length > 0) {
      for (const status of visibleStatuses) {
        await recordStatusView({ ownerId: targetUser._id, status, viewerId: req.user._id });
      }
    }

    const statusesWithMeta = serializeStatusesWithMedia(visibleStatuses, relationship);

    res.json({
      success: true,
      userId: String(targetUser._id),
      username: targetUser.username || 'User',
      statuses: statusesWithMeta,
      hasActiveStatus: statusesWithMeta.length > 0,
      relationship: {
        isOwner,
        isFollower,
      },
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

exports.getStatusMediaAccess = async (req, res) => {
  try {
    const { statusId } = req.params;
    if (!isValidObjectId(statusId)) {
      return res.status(400).json({ success: false, message: 'Invalid media request' });
    }

    const owner = await User.findOne({ 'statuses._id': statusId })
      .select('followers blockedUsers statuses')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
    const status = owner?.statuses?.id(statusId);
    const relationship = owner ? getViewerRelationshipToTarget(req.user, owner) : null;
    if (!owner || !status || !canViewerSeeStatus(status, relationship)) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    const url = getStatusMediaUrl(status);
    if (!/^https:\/\//i.test(url) || url.length > 8192) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    res.set('Cache-Control', 'private, no-store');
    return res.json({ success: true, url, expiresIn: STATUS_MEDIA_URL_TTL_SECONDS });
  } catch (error) {
    logError('Status media access error:', error);
    return res.status(500).json({ success: false, message: 'Unable to access media' });
  }
};

// Read story mute/hide preferences
exports.getStoryPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('mutedStoryUsers hiddenStoryUsers')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS)
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      mutedStoryUsers: (user.mutedStoryUsers || []).map((id) => String(id)),
      hiddenStoryUsers: (user.hiddenStoryUsers || []).map((id) => String(id)),
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Update story mute/hide preferences for a target user
exports.updateStoryPreference = async (req, res) => {
  try {
    const { targetUserId, action } = req.body;
    const nextAction = String(action || '').toLowerCase();
    const validActions = new Set(['mute', 'unmute', 'hide', 'unhide']);
    if (!targetUserId || !validActions.has(nextAction)) {
      return res.status(400).json({ success: false, message: 'Invalid story preference request' });
    }
    if (!isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid target user id' });
    }

    if (String(targetUserId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Cannot apply this action to your own stories' });
    }

    const targetUserExists = await User.exists({ _id: targetUserId })
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
    if (!targetUserExists) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    const update = {};
    if (nextAction === 'mute') update.$addToSet = { mutedStoryUsers: targetUserId };
    if (nextAction === 'unmute') update.$pull = { mutedStoryUsers: targetUserId };
    if (nextAction === 'hide') update.$addToSet = { hiddenStoryUsers: targetUserId };
    if (nextAction === 'unhide') update.$pull = { hiddenStoryUsers: targetUserId };
    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      update,
      { new: true, runValidators: true }
    )
      .select('mutedStoryUsers hiddenStoryUsers')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS)
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const muted = (user.mutedStoryUsers || []).map((id) => String(id));
    const hidden = (user.hiddenStoryUsers || []).map((id) => String(id));

    res.json({
      success: true,
      mutedStoryUsers: muted,
      hiddenStoryUsers: hidden,
    });
  } catch (error) {
    return sendUserError(res, error);
  }
};

// Update status
exports.updateStatus = async (req, res) => {
  let uploadedStatusMedia = null;
  let staleStatusMedia = null;
  try {
    const { statusId } = req.params;
    const {
      contentType,
      text,
      musicLabel,
      musicSourceType,
      musicSourceUrl,
      stickers,
      backgroundColor,
      textColor,
      fontFamily,
      textAlign,
      textPosX,
      textPosY,
      trimStartSec,
      trimEndSec,
      audience,
      durationSec,
      removeMedia,
    } = req.body;
    const shouldRemoveMedia = ['1', 'true', 'yes'].includes(String(removeMedia || '').toLowerCase());

    if (!isValidObjectId(statusId)) {
      return res.status(400).json({ success: false, message: 'Invalid status id' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const status = user.statuses.id(statusId);

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const normalizedTrimRange = normalizeStatusTrimRange(trimStartSec, trimEndSec);
    const requestedContentType =
      contentType !== undefined
        ? normalizeStatusContentType(contentType)
        : normalizeStatusContentType(status.contentType);
    const incomingVideoUpload = Boolean(req.file && isStatusVideoUpload(req.file));

    if (requestedContentType === 'post' && incomingVideoUpload) {
      return res.status(400).json({ success: false, message: 'Post mode does not support video uploads' });
    }
    if (
      requestedContentType === 'post'
      && !req.file
      && !shouldRemoveMedia
      && (status.mediaType === 'video' || Boolean(status.video))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Post mode cannot keep an existing video. Remove or replace video first.',
      });
    }

    status.contentType = requestedContentType;

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
    if (musicLabel !== undefined) {
      status.musicLabel = normalizeStatusMusicLabel(musicLabel);
    }
    if (musicSourceType !== undefined) {
      status.musicSourceType = normalizeStatusMusicSourceType(musicSourceType);
      if (status.musicSourceType === 'none') {
        status.musicSourceUrl = '';
      }
    }
    if (musicSourceUrl !== undefined && status.musicSourceType !== 'none') {
      status.musicSourceUrl = normalizeStatusMusicSourceUrl(musicSourceUrl);
    }
    if (stickers !== undefined) {
      status.stickers = normalizeStatusStickers(stickers);
    }
    if (textPosX !== undefined) {
      status.textPosX = clampStatusPosition(textPosX);
    }
    if (textPosY !== undefined) {
      status.textPosY = clampStatusPosition(textPosY);
    }
    if (audience !== undefined) {
      status.audience = normalizeStatusAudience(audience);
    }
    if (durationSec !== undefined) {
      status.durationSec = clampStatusDuration(durationSec);
    }

    // Update media if new one provided
    if (req.file) {
      staleStatusMedia = snapshotStatusMedia(status);
      const uploadResult = await uploadStatusMedia(req.file, normalizedTrimRange);
      uploadedStatusMedia = uploadResult;
      status.mediaType = uploadResult.mediaType;
      status.mediaPublicId = uploadResult.mediaPublicId;
      status.mediaFormat = uploadResult.mediaFormat;
      status.mediaResourceType = uploadResult.mediaResourceType;
      status.mediaDeliveryType = uploadResult.mediaDeliveryType;
      if (uploadResult.mediaType === 'video') {
        status.video = uploadResult.mediaUrl;
        status.image = '';
        status.trimStartSec = normalizedTrimRange.trimStartSec;
        status.trimEndSec = normalizedTrimRange.trimEndSec;
      } else {
        status.image = uploadResult.mediaUrl;
        status.video = '';
        status.trimStartSec = 0;
        status.trimEndSec = null;
      }
    } else if (shouldRemoveMedia && (status.mediaPublicId || status.image || status.video)) {
      staleStatusMedia = snapshotStatusMedia(status);
      status.image = '';
      status.video = '';
      status.mediaType = 'text';
      status.mediaPublicId = '';
      status.mediaFormat = '';
      status.mediaResourceType = '';
      status.mediaDeliveryType = '';
      status.trimStartSec = 0;
      status.trimEndSec = null;
    } else if (!status.mediaPublicId && !status.image && !status.video) {
      status.mediaType = 'text';
      status.mediaPublicId = '';
      status.mediaFormat = '';
      status.mediaResourceType = '';
      status.mediaDeliveryType = '';
      status.trimStartSec = 0;
      status.trimEndSec = null;
    }

    await user.save();
    uploadedStatusMedia = null;
    if (staleStatusMedia?.mediaPublicId) {
      await destroyStatusMedia(staleStatusMedia);
    }

    const activeStatuses = user.statuses.filter(s => new Date() < new Date(s.expiresAt));
    res.json({
      success: true,
      statuses: serializeStatusesWithMedia(activeStatuses, { isOwner: true }),
    });
  } catch (error) {
    if (uploadedStatusMedia?.mediaPublicId) {
      await destroyStatusMedia(uploadedStatusMedia);
    }
    return sendUserError(res, error);
  } finally {
    await cleanupTempUpload(req.file?.path);
  }
};

// Delete status
exports.deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;

    if (!isValidObjectId(statusId)) {
      return res.status(400).json({ success: false, message: 'Invalid status id' });
    }

    const user = await User.findOne({ _id: req.user._id, 'statuses._id': statusId })
      .select('statuses')
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }
    const status = user.statuses.id(statusId);

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const staleStatusMedia = snapshotStatusMedia(status);
    await destroyStatusMedia(staleStatusMedia);
    const updateResult = await User.updateOne(
      { _id: req.user._id, 'statuses._id': statusId },
      { $pull: { statuses: { _id: statusId } } }
    ).maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);

    if (updateResult.modifiedCount !== 1) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    await StatusView.deleteMany({ statusOwnerId: req.user._id, statusId })
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);

    const updatedUser = await User.findById(req.user._id)
      .select('statuses')
      .lean()
      .maxTimeMS(SOCIAL_RELATIONSHIP_QUERY_MAX_TIME_MS);
    const activeStatuses = (updatedUser?.statuses || []).filter(s => new Date() < new Date(s.expiresAt));
    res.json({
      success: true,
      statuses: serializeStatusesWithMedia(activeStatuses, { isOwner: true }),
    });
  } catch (error) {
    return sendUserError(res, error);
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

    await cleanupUserAccountData(user, { deleteUser: true });

    res.json({ success: true, message: 'Guest account and all data deleted' });
  } catch (error) {
    return sendUserError(res, error);
  }
};
