const mongoose = require('mongoose');
const User = require('../models/User');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const Short = require('../models/Short');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const GuestAnalytics = require('../models/GuestAnalytics');
const { enqueueEmailJob, enqueueSearchIndexRefresh } = require('../jobs/queueService');
const { invalidateCacheByPrefixes } = require('../utils/cacheStore');
const { deleteCloudinaryPublicIds } = require('../utils/cloudinaryCleanup');
const { cleanupUserAccountData } = require('../utils/accountCleanup');
const { logError, logWarn, sendSafeServerError } = require('../utils/safeErrorLog');

const sendAdminServerError = (res, error) =>
  sendSafeServerError(res, '[adminController] request failed:', error, 'Unable to process admin request');

const ADMIN_LIST_DEFAULT_LIMIT = Math.max(1, Number(process.env.ADMIN_LIST_DEFAULT_LIMIT) || 50);
const ADMIN_LIST_MAX_LIMIT = Math.max(1, Number(process.env.ADMIN_LIST_MAX_LIMIT) || 100);
const ADMIN_LIST_MAX_PAGE = Math.max(1, Number(process.env.ADMIN_LIST_MAX_PAGE) || 1000);
const ADMIN_STATS_MAX_DAYS = Math.max(1, Number(process.env.ADMIN_STATS_MAX_DAYS) || 90);
const ADMIN_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.ADMIN_QUERY_MAX_TIME_MS) || 5000);
const ADMIN_SUSPENSION_MAX_DAYS = Math.max(1, Number(process.env.ADMIN_SUSPENSION_MAX_DAYS) || 3650);
const ADMIN_SUSPENSION_MIN_DAYS = 1 / 1440;
const ADMIN_NOTICE_REASON_MAX_LENGTH = Math.max(50, Number(process.env.ADMIN_NOTICE_REASON_MAX_LENGTH) || 500);
const ADMIN_PRE_DELETION_NOTICE_MAX_DAYS = Math.max(1, Number(process.env.ADMIN_PRE_DELETION_NOTICE_MAX_DAYS) || 365);
const ADMIN_USER_LIST_SELECT = [
  '_id',
  'username',
  'name',
  'fullName',
  'email',
  'profileImage',
  'role',
  'isGuest',
  'guestExpiresAt',
  'isActive',
  'suspendedUntil',
  'isVerified',
  'createdAt',
  'updatedAt',
].join(' ');

const getPrivilegePromotionIneligibility = (user) => {
  if (!user) return 'User not found';
  if (user.isGuest || user.role === 'guest' || user.guestExpiresAt) {
    return 'Guest accounts cannot receive admin privileges';
  }
  if (!user.isVerified) {
    return 'Only verified registered users can receive admin privileges';
  }
  if (user.isActive === false || (user.suspendedUntil && new Date() < new Date(user.suspendedUntil))) {
    return 'Suspended or inactive users cannot receive admin privileges';
  }
  return '';
};

const parseBoundedInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(safeValue, max);
};

const adminCountDocuments = (Model, filter = {}) =>
  Model.countDocuments(filter).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);

const adminDistinct = (Model, field, filter = {}) =>
  Model.distinct(field, filter).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);

const adminAggregate = (Model, pipeline = []) =>
  Model.aggregate(pipeline).option({ maxTimeMS: ADMIN_QUERY_MAX_TIME_MS });

const countUniqueGuestVisitors = async (filter = {}) => {
  const [hashedVisitors, legacyIpVisitors] = await Promise.all([
    adminDistinct(GuestAnalytics, 'ipHash', { ...filter, ipHash: { $type: 'string', $ne: '' } }),
    adminDistinct(GuestAnalytics, 'ipAddress', {
      ...filter,
      $or: [
        { ipHash: { $exists: false } },
        { ipHash: '' },
        { ipHash: null },
      ],
    }),
  ]);

  return new Set([
    ...hashedVisitors.filter(Boolean).map(String),
    ...legacyIpVisitors.filter(Boolean).map((ip) => `legacy:${ip}`),
  ]).size;
};

const parseSuspensionDays = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed === 0) {
    return 0;
  }

  if (parsed < ADMIN_SUSPENSION_MIN_DAYS || parsed > ADMIN_SUSPENSION_MAX_DAYS) {
    return null;
  }

  return parsed;
};

const parsePreDeletionNoticeDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const days = Math.floor(parsed);
  if (days < 1 || days > ADMIN_PRE_DELETION_NOTICE_MAX_DAYS) {
    return null;
  }

  return days;
};

const formatSuspensionDuration = (days) => {
  const totalMinutes = Math.max(1, Math.round(days * 24 * 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  }

  if (totalMinutes < 24 * 60) {
    const hours = Math.max(1, Math.round(totalMinutes / 60));
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  if (days >= 30 && Number.isInteger(days / 30)) {
    const months = days / 30;
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  const displayDays = Number.isInteger(days) ? days : Number(days.toFixed(2));
  return `${displayDays} day${displayDays === 1 ? '' : 's'}`;
};

const normalizeBoundedText = (value, fallback, maxLength) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, maxLength);
};

const rejectInvalidObjectId = (res, value, label = 'id') => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return false;
  }

  res.status(400).json({ success: false, message: `Invalid ${label}` });
  return true;
};

const collectDocumentIds = (docs = []) => docs
  .map((doc) => doc?._id)
  .filter(Boolean);

const getGroupedCountMap = async (Model, field, values = [], extraMatch = {}) => {
  const ids = values
    .map((value) => value?._id || value)
    .filter(Boolean);
  if (!ids.length) return new Map();

  const counts = await adminAggregate(Model, [
    { $match: { ...extraMatch, [field]: { $in: ids } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } }
  ]);

  return new Map(counts.map((entry) => [String(entry._id), entry.count]));
};

const deleteContentCloudinaryAssets = async (doc) => {
  await deleteCloudinaryPublicIds([
    doc?.cloudinaryPublicId,
    ...(Array.isArray(doc?.galleryImagePublicIds) ? doc.galleryImagePublicIds : [])
  ]);
};

const invalidateAdminContentCaches = async (type) => {
  const prefixMap = {
    blog: ['blogs:list:', 'blog:detail:', 'seo:sitemap', 'seo:feed'],
    article: ['articles:list:', 'article:detail:', 'seo:sitemap', 'seo:feed'],
    short: ['shorts:list:', 'short:detail:']
  };

  await invalidateCacheByPrefixes(prefixMap[type] || []);
};

const triggerSearchIndexRefresh = (reason) => {
  enqueueSearchIndexRefresh(reason).catch((error) => {
    logWarn('[search] Failed to enqueue search index refresh:', error);
  });
};

const getAdminPagination = (query = {}) => {
  const limit = parseBoundedInt(query.limit, ADMIN_LIST_DEFAULT_LIMIT, ADMIN_LIST_MAX_LIMIT);
  const page = parseBoundedInt(query.page, 1, ADMIN_LIST_MAX_PAGE);
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

const buildPaginationPayload = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasMore: page * limit < total
});

// Get dashboard statistics
exports.getStats = async (req, res) => {
  try {
    const numDays = parseBoundedInt(req.query.days, 7, ADMIN_STATS_MAX_DAYS);
    
    const totalUsers = await adminCountDocuments(User);
    const totalBlogs = await adminCountDocuments(Blog, { isDraft: false });
    const totalArticles = await adminCountDocuments(Article, { isDraft: false });
    const totalShorts = await adminCountDocuments(Short, { isDraft: false });
    const totalComments = await adminCountDocuments(Comment);
    
    // Active users today (based on lastActive field)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeUsersToday = await adminCountDocuments(User, { lastActive: { $gte: today } });
    
    // Guest users today (both visitors and logged-in guests)
    const guestVisitorsToday = await countUniqueGuestVisitors({
      createdAt: { $gte: today }
    });
    const guestUsersToday = await adminCountDocuments(User, {
      isGuest: true,
      createdAt: { $gte: today }
    });
    const guestToday = guestVisitorsToday + guestUsersToday;
    
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
      const blogCount = await adminCountDocuments(Blog, {
        createdAt: { $gte: date, $lt: nextDate },
        isDraft: false
      });
      
      // Articles count
      const articleCount = await adminCountDocuments(Article, {
        createdAt: { $gte: date, $lt: nextDate },
        isDraft: false
      });
      
      // Shorts count
      const shortCount = await adminCountDocuments(Short, {
        createdAt: { $gte: date, $lt: nextDate },
        isDraft: false
      });
      
      // User registrations count
      const userCount = await adminCountDocuments(User, {
        createdAt: { $gte: date, $lt: nextDate },
        isGuest: { $ne: true }
      });
      
      // Guest registrations count
      const guestCount = await adminCountDocuments(User, {
        createdAt: { $gte: date, $lt: nextDate },
        isGuest: true
      });
      
      // Comments count
      const commentCount = await adminCountDocuments(Comment, {
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      // Active users count (users who created blogs, shorts, comments, or had any activity)
      const blogAuthors = await adminDistinct(Blog, 'author', {
        createdAt: { $gte: date, $lt: nextDate }
      });
      const shortAuthors = await adminDistinct(Short, 'author', {
        createdAt: { $gte: date, $lt: nextDate }
      });
      const commentAuthors = await adminDistinct(Comment, 'author', {
        createdAt: { $gte: date, $lt: nextDate }
      });
      const activeByTracking = await adminDistinct(User, '_id', {
        lastActive: { $gte: date, $lt: nextDate }
      });
      const activeUserIds = new Set([...blogAuthors, ...shortAuthors, ...commentAuthors, ...activeByTracking]);
      const activeUsers = activeUserIds.size;
      
      // Guest analytics (both visitors and logged-in guests)
      const uniqueGuestVisitors = await countUniqueGuestVisitors({
        createdAt: { $gte: date, $lt: nextDate }
      });
      const guestUsersCount = await adminCountDocuments(User, {
        isGuest: true,
        createdAt: { $gte: date, $lt: nextDate }
      });
      const totalGuestsForDay = uniqueGuestVisitors + guestUsersCount;
      
      // Count page views from pages array timestamps
      const pageViewsData = await adminAggregate(GuestAnalytics, [
        { $unwind: '$pages' },
        { $match: { 'pages.timestamp': { $gte: date, $lt: nextDate } } },
        { $count: 'total' }
      ]);
      const totalPageViews = pageViewsData[0]?.total || 0;
      
      const dateLabel = numDays <= 31 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      blogsPerDay.push({ date: dateLabel, blogs: blogCount, articles: articleCount });
      shortsPerDay.push({ date: dateLabel, count: shortCount });
      commentsPerDay.push({ date: dateLabel, count: commentCount });
      userRegistrations.push({ date: dateLabel, User: userCount, Guest: totalGuestsForDay });
      activeUsersPerDay.push({ date: dateLabel, count: activeUsers });
      guestAnalytics.push({ 
        date: dateLabel, 
        uniqueVisitors: uniqueGuestVisitors + guestUsersCount,
        pageViews: totalPageViews
      });
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBlogs,
        totalArticles,
        totalShorts,
        totalComments,
        activeUsersToday,
        guestToday,
        blogsPerDay,
        shortsPerDay,
        commentsPerDay,
        userRegistrations,
        activeUsersPerDay,
        guestAnalytics
      }
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Get all users (excluding guests)
exports.getUsers = async (req, res) => {
  try {
    const pagination = getAdminPagination(req.query);
    const filter = { isGuest: { $ne: true } };
    await User.updateMany(
      { ...filter, suspendedUntil: { $ne: null, $lte: new Date() } },
      { $set: { isActive: true }, $unset: { suspendedUntil: '' } }
    ).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(ADMIN_USER_LIST_SELECT)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS),
      adminCountDocuments(User, filter)
    ]);
    
    const userIds = collectDocumentIds(users);
    const [blogCounts, articleCounts, shortCounts] = await Promise.all([
      getGroupedCountMap(Blog, 'author', userIds, { isDraft: false }),
      getGroupedCountMap(Article, 'author', userIds, { isDraft: false }),
      getGroupedCountMap(Short, 'author', userIds, { isDraft: false })
    ]);

    const usersWithStats = users.map((user) => {
      const userId = String(user._id);
      return {
        ...user.toObject(),
        blogCount: blogCounts.get(userId) || 0,
        articleCount: articleCounts.get(userId) || 0,
        shortCount: shortCounts.get(userId) || 0
      };
    });

    res.json({
      success: true,
      users: usersWithStats,
      pagination: buildPaginationPayload(pagination, total)
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Get all blogs (including drafts)
exports.getAllBlogs = async (req, res) => {
  try {
    const pagination = getAdminPagination(req.query);
    const [blogs, total] = await Promise.all([
      Blog.find()
        .populate('author', 'username profileImage')
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS),
      adminCountDocuments(Blog)
    ]);

    const commentCounts = await getGroupedCountMap(Comment, 'blog', collectDocumentIds(blogs));
    const blogsWithComments = blogs.map((blog) => {
      return {
        ...blog.toObject(),
        commentCount: commentCounts.get(String(blog._id)) || 0
      };
    });

    res.json({
      success: true,
      blogs: blogsWithComments,
      pagination: buildPaginationPayload(pagination, total)
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Get all articles (including drafts)
exports.getAllArticles = async (req, res) => {
  try {
    const pagination = getAdminPagination(req.query);
    const [articles, total] = await Promise.all([
      Article.find()
        .populate('author', 'username profileImage')
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS),
      adminCountDocuments(Article)
    ]);

    const commentCounts = await getGroupedCountMap(Comment, 'article', collectDocumentIds(articles));
    const articlesWithComments = articles.map((article) => {
      return {
        ...article.toObject(),
        commentCount: commentCounts.get(String(article._id)) || 0
      };
    });

    res.json({
      success: true,
      articles: articlesWithComments,
      pagination: buildPaginationPayload(pagination, total)
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Get all shorts
exports.getAllShorts = async (req, res) => {
  try {
    const pagination = getAdminPagination(req.query);
    const [shorts, total] = await Promise.all([
      Short.find()
        .populate('author', 'username profileImage')
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS),
      adminCountDocuments(Short)
    ]);

    const commentCounts = await getGroupedCountMap(Comment, 'short', collectDocumentIds(shorts));
    const shortsWithComments = shorts.map((short) => {
      return {
        ...short.toObject(),
        commentCount: commentCounts.get(String(short._id)) || 0
      };
    });

    res.json({
      success: true,
      shorts: shortsWithComments,
      pagination: buildPaginationPayload(pagination, total)
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Delete short
exports.deleteShort = async (req, res) => {
  try {
    if (rejectInvalidObjectId(res, req.params.id, 'short id')) return;

    const short = await Short.findById(req.params.id)
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!short) {
      return res.status(404).json({ success: false, message: 'Short not found' });
    }

    await deleteContentCloudinaryAssets(short);
    await Comment.deleteMany({ short: short._id }).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await Notification.deleteMany({ short: short._id }).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await Short.findByIdAndDelete(short._id).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await invalidateAdminContentCaches('short');

    res.json({ success: true, message: 'Short deleted successfully' });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    if (rejectInvalidObjectId(res, req.params.id, 'user id')) return;

    const user = await User.findById(req.params.id)
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin user' });
    }

    await cleanupUserAccountData(user, { deleteUser: true });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Suspend/Unsuspend user
exports.suspendUser = async (req, res) => {
  try {
    const suspensionDays = parseSuspensionDays(req.body?.days);
    if (suspensionDays === null) {
      return res.status(400).json({
        success: false,
        message: `Suspension duration must be 0 to unsuspend or between 1 minute and ${ADMIN_SUSPENSION_MAX_DAYS} days`
      });
    }
    if (rejectInvalidObjectId(res, req.params.id, 'user id')) return;

    const user = await User.findById(req.params.id)
      .select('_id username email role isActive suspendedUntil')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot suspend admin user' });
    }

    let suspensionDurationLabel = '';
    const update = {};
    if (suspensionDays > 0) {
      // Suspend user
      const suspendUntil = new Date();
      suspendUntil.setTime(suspendUntil.getTime() + (suspensionDays * 24 * 60 * 60 * 1000));
      update.$set = { suspendedUntil: suspendUntil, isActive: false };
      suspensionDurationLabel = formatSuspensionDuration(suspensionDays);
    } else {
      // Unsuspend user
      update.$set = { isActive: true };
      update.$unset = { suspendedUntil: '' };
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, role: { $ne: 'admin' } },
      update,
      { new: true, runValidators: true }
    )
      .select('_id username email isActive suspendedUntil')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    if (!updatedUser) {
      return res.status(409).json({ success: false, message: 'User state changed. Refresh and try again.' });
    }

    let message = 'User unsuspended';
    if (suspensionDays > 0) {
      message = `User suspended for ${suspensionDurationLabel}`;
    }

    if (suspensionDays > 0 && updatedUser.email) {
      enqueueEmailJob(
        'account-suspension',
        {
          email: updatedUser.email,
          username: updatedUser.username,
          suspensionReason: 'Community guideline or policy violation',
          suspensionDuration: suspensionDurationLabel,
          reviewDate: updatedUser.suspendedUntil
        },
        { jobId: `account-suspension:${updatedUser._id}:${updatedUser.suspendedUntil?.getTime?.() || Date.now()}` }
      ).catch((error) => {
        logError('Failed to queue account suspension email:', error);
      });
    }

    res.json({ 
      success: true, 
      message,
      user: {
        id: updatedUser._id,
        isActive: updatedUser.isActive,
        suspendedUntil: updatedUser.suspendedUntil
      }
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Make user admin
exports.makeAdmin = async (req, res) => {
  try {
    if (rejectInvalidObjectId(res, req.params.id, 'user id')) return;

    const user = await User.findById(req.params.id)
      .select('_id username role isGuest guestExpiresAt isVerified isActive suspendedUntil')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'User is already an admin' });
    }

    const ineligibleReason = getPrivilegePromotionIneligibility(user);
    if (ineligibleReason) {
      return res.status(400).json({ success: false, message: ineligibleReason });
    }

    const now = new Date();
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        role: { $nin: ['admin', 'guest'] },
        isGuest: { $ne: true },
        isVerified: true,
        isActive: { $ne: false },
        $and: [
          { $or: [{ guestExpiresAt: null }, { guestExpiresAt: { $exists: false } }] },
          { $or: [{ suspendedUntil: null }, { suspendedUntil: { $exists: false } }, { suspendedUntil: { $lte: now } }] },
        ],
      },
      { $set: { role: 'admin' } },
      { new: true, runValidators: true }
    )
      .select('_id username role')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    if (!updatedUser) {
      return res.status(409).json({ success: false, message: 'User eligibility changed. Refresh and try again.' });
    }

    res.json({ 
      success: true, 
      message: 'User promoted to admin successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role
      }
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Make user coAdmin
exports.makeCoAdmin = async (req, res) => {
  try {
    if (rejectInvalidObjectId(res, req.params.id, 'user id')) return;

    const user = await User.findById(req.params.id)
      .select('_id username role isGuest guestExpiresAt isVerified isActive suspendedUntil')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot change admin to co-admin' });
    }

    if (user.role === 'coAdmin') {
      return res.status(400).json({ success: false, message: 'User is already a co-admin' });
    }

    const ineligibleReason = getPrivilegePromotionIneligibility(user);
    if (ineligibleReason) {
      return res.status(400).json({ success: false, message: ineligibleReason });
    }

    const now = new Date();
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        role: { $nin: ['admin', 'coAdmin', 'guest'] },
        isGuest: { $ne: true },
        isVerified: true,
        isActive: { $ne: false },
        $and: [
          { $or: [{ guestExpiresAt: null }, { guestExpiresAt: { $exists: false } }] },
          { $or: [{ suspendedUntil: null }, { suspendedUntil: { $exists: false } }, { suspendedUntil: { $lte: now } }] },
        ],
      },
      { $set: { role: 'coAdmin' } },
      { new: true, runValidators: true }
    )
      .select('_id username role')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    if (!updatedUser) {
      return res.status(409).json({ success: false, message: 'User eligibility changed. Refresh and try again.' });
    }

    res.json({ 
      success: true, 
      message: 'User promoted to co-admin successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role
      }
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Remove coAdmin role
exports.removeCoAdmin = async (req, res) => {
  try {
    if (rejectInvalidObjectId(res, req.params.id, 'user id')) return;

    const user = await User.findById(req.params.id)
      .select('_id username role')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'coAdmin') {
      return res.status(400).json({ success: false, message: 'User is not a co-admin' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, role: 'coAdmin' },
      { $set: { role: 'user' } },
      { new: true, runValidators: true }
    )
      .select('_id username role')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    if (!updatedUser) {
      return res.status(409).json({ success: false, message: 'User state changed. Refresh and try again.' });
    }

    res.json({ 
      success: true, 
      message: 'Co-admin role removed successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role
      }
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    if (rejectInvalidObjectId(res, req.params.id, 'blog id')) return;

    const blog = await Blog.findById(req.params.id)
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    await deleteContentCloudinaryAssets(blog);
    await Comment.deleteMany({ blog: blog._id }).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await Notification.deleteMany({ blog: blog._id }).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await Blog.findByIdAndDelete(blog._id).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await invalidateAdminContentCaches('blog');
    triggerSearchIndexRefresh('admin:blog:delete');

    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Delete article
exports.deleteArticle = async (req, res) => {
  try {
    if (rejectInvalidObjectId(res, req.params.id, 'article id')) return;

    const article = await Article.findById(req.params.id)
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    await deleteContentCloudinaryAssets(article);
    await Comment.deleteMany({ article: article._id }).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await Notification.deleteMany({ article: article._id }).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await Article.findByIdAndDelete(article._id).maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    await invalidateAdminContentCaches('article');
    triggerSearchIndexRefresh('admin:article:delete');

    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Toggle user verification
exports.toggleVerification = async (req, res) => {
  try {
    if (rejectInvalidObjectId(res, req.params.id, 'user id')) return;

    const user = await User.findById(req.params.id)
      .select('_id role isGuest guestExpiresAt isVerified')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isGuest || user.role === 'guest' || user.guestExpiresAt) {
      return res.status(400).json({ success: false, message: 'Guest accounts cannot be verified' });
    }

    const nextVerified = !user.isVerified;
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        isVerified: user.isVerified,
        isGuest: { $ne: true },
        role: { $ne: 'guest' },
        $or: [{ guestExpiresAt: null }, { guestExpiresAt: { $exists: false } }],
      },
      {
        $set: {
          isVerified: nextVerified,
          verifiedBy: nextVerified ? req.user._id : null,
          verifiedAt: nextVerified ? new Date() : null,
        },
      },
      { new: true, runValidators: true }
    )
      .select('_id isVerified')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);
    if (!updatedUser) {
      return res.status(409).json({ success: false, message: 'User verification state changed. Refresh and try again.' });
    }

    res.json({ 
      success: true, 
      message: updatedUser.isVerified ? 'User verified successfully' : 'User unverified successfully',
      user: {
        id: updatedUser._id,
        isVerified: updatedUser.isVerified
      }
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Get guest users
exports.getGuestUsers = async (req, res) => {
  try {
    const pagination = getAdminPagination(req.query);
    const filter = { isGuest: true };
    const [guests, total] = await Promise.all([
      User.find(filter)
        .select(ADMIN_USER_LIST_SELECT)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS),
      adminCountDocuments(User, filter)
    ]);
    
    const guestIds = collectDocumentIds(guests);
    const [blogCounts, shortCounts] = await Promise.all([
      getGroupedCountMap(Blog, 'author', guestIds, { isDraft: false }),
      getGroupedCountMap(Short, 'author', guestIds, { isDraft: false })
    ]);

    const guestsWithStats = guests.map((guest) => {
      const guestId = String(guest._id);
      return {
        ...guest.toObject(),
        blogCount: blogCounts.get(guestId) || 0,
        shortCount: shortCounts.get(guestId) || 0
      };
    });

    res.json({
      success: true,
      guests: guestsWithStats,
      pagination: buildPaginationPayload(pagination, total)
    });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Send account warning email (admin initiated)
exports.sendAccountWarningEmailNotice = async (req, res) => {
  try {
    const reason = normalizeBoundedText(
      req.body?.reason,
      'Policy warning issued by moderation team',
      ADMIN_NOTICE_REASON_MAX_LENGTH
    );
    if (rejectInvalidObjectId(res, req.params.id, 'user id')) return;

    const user = await User.findById(req.params.id)
      .select('_id username email')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.email) {
      return res.status(400).json({ success: false, message: 'User does not have an email address' });
    }

    await enqueueEmailJob(
      'account-warning',
      {
        email: user.email,
        username: user.username,
        violationReason: reason,
        warningDate: Date.now()
      },
      { jobId: `account-warning:${user._id}:${Date.now()}` }
    );

    res.json({ success: true, message: 'Account warning email queued successfully' });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};

// Send pre-deletion warning email (admin initiated)
exports.sendPreDeletionWarningEmailNotice = async (req, res) => {
  try {
    const numericDays = parsePreDeletionNoticeDays(req.body?.daysRemaining);
    if (numericDays === null) {
      return res.status(400).json({
        success: false,
        message: `Days remaining must be between 1 and ${ADMIN_PRE_DELETION_NOTICE_MAX_DAYS}`
      });
    }
    if (rejectInvalidObjectId(res, req.params.id, 'user id')) return;

    const user = await User.findById(req.params.id)
      .select('_id username email')
      .maxTimeMS(ADMIN_QUERY_MAX_TIME_MS);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.email) {
      return res.status(400).json({ success: false, message: 'User does not have an email address' });
    }

    const targetDeletionDate = new Date(Date.now() + numericDays * 24 * 60 * 60 * 1000);

    await enqueueEmailJob(
      'pre-deletion-warning',
      {
        email: user.email,
        username: user.username,
        daysRemaining: numericDays,
        deletionDate: targetDeletionDate
      },
      { jobId: `pre-deletion-warning:${user._id}:${numericDays}:${new Date(targetDeletionDate).getTime()}` }
    );

    res.json({ success: true, message: 'Pre-deletion warning email queued successfully' });
  } catch (error) {
    return sendAdminServerError(res, error);
  }
};
