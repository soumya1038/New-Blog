const mongoose = require('mongoose');
const User = require('../models/User');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const Short = require('../models/Short');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const SellerEarning = require('../models/SellerEarning');
const Payout = require('../models/Payout');
const Cart = require('../models/Cart');
const CallLog = require('../models/CallLog');
const Group = require('../models/Group');
const GroupCall = require('../models/GroupCall');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const StoreSettings = require('../models/StoreSettings');
const SellerApplication = require('../models/SellerApplication');
const PriceChangeRequest = require('../models/PriceChangeRequest');
const TemplatePreset = require('../models/TemplatePreset');
const TwoFactorChallenge = require('../models/TwoFactorChallenge');
const SupportRequest = require('../models/SupportRequest');
const Review = require('../models/Review');
const StatusView = require('../models/StatusView');
const cloudinary = require('./cloudinary');
const {
  compactCloudinaryPublicIds,
  deleteCloudinaryPublicIds,
  runWithBoundedConcurrency
} = require('./cloudinaryCleanup');
const { invalidateCacheByPrefixes } = require('./cacheStore');
const { enqueueSearchIndexRefresh } = require('../jobs/queueService');
const { logError, logWarn } = require('./safeErrorLog');

const toIdString = (value) => value?.toString?.() || String(value || '');
const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getAccountCleanupMediaConcurrency = () =>
  toPositiveInt(process.env.ACCOUNT_CLEANUP_MEDIA_CONCURRENCY || process.env.CLOUDINARY_CLEANUP_CONCURRENCY, 4);
const getAccountCleanupChunkSize = () =>
  toPositiveInt(process.env.ACCOUNT_CLEANUP_CHUNK_SIZE, 500);
const getAccountCleanupDbConcurrency = () =>
  toPositiveInt(process.env.ACCOUNT_CLEANUP_DB_CONCURRENCY, 4);
const getAccountCleanupQueryMaxTimeMs = () =>
  toPositiveInt(process.env.ACCOUNT_CLEANUP_QUERY_MAX_TIME_MS, 10000);

const withAccountCleanupMaxTime = (query) =>
  query.maxTimeMS(getAccountCleanupQueryMaxTimeMs());

const withAccountCleanupAggregateMaxTime = (aggregate) =>
  aggregate.option({ maxTimeMS: getAccountCleanupQueryMaxTimeMs() });

const processQueryInChunks = async ({ Model, filter, select, handler }) => {
  let lastId = null;
  let processed = 0;
  const chunkSize = getAccountCleanupChunkSize();

  while (true) {
    const pageFilter = lastId
      ? { $and: [filter, { _id: { $gt: lastId } }] }
      : filter;
    const documents = await withAccountCleanupMaxTime(
      Model.find(pageFilter)
        .select(select)
        .sort({ _id: 1 })
        .limit(chunkSize)
        .lean()
    );

    if (!documents.length) break;
    await handler(documents);
    processed += documents.length;
    lastId = documents[documents.length - 1]._id;
    if (documents.length < chunkSize) break;
  }

  return processed;
};

const compactValues = (values = []) => {
  const seen = new Set();
  const items = [];

  values.forEach((value) => {
    const key = toIdString(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push(value);
  });

  return items;
};

const runChunked = async (values = [], handler) => {
  const ids = compactValues(values);
  if (!ids.length) return;

  const chunkSize = getAccountCleanupChunkSize();
  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    await handler(chunk);
  }
};

const runAccountCleanupOperations = (operations = []) =>
  runWithBoundedConcurrency(
    operations,
    getAccountCleanupDbConcurrency(),
    async (operation) => operation()
  );

const removeProductReferences = async (userId, productIds = []) => {
  await runAccountCleanupOperations([
    () => runChunked(productIds, (chunk) => withAccountCleanupMaxTime(Cart.updateMany({}, {
      $pull: { items: { productId: { $in: chunk } } }
    }))),
    () => runChunked(productIds, (chunk) => withAccountCleanupMaxTime(StoreSettings.updateMany({}, {
      $pull: { featuredProducts: { $in: chunk } }
    }))),
    () => runChunked(productIds, (chunk) => withAccountCleanupMaxTime(Review.updateMany(
      { productId: { $in: chunk } },
      { $set: { sellerReply: '', sellerRepliedAt: null } }
    ))),
    () => runChunked(productIds, (chunk) => withAccountCleanupMaxTime(User.updateMany(
      { _id: { $ne: userId } },
      {
        $pull: {
          wishlist: { $in: chunk },
          'marketplacePreferences.recentProducts': { productId: { $in: chunk } }
        }
      }
    )))
  ]);
};

const removeUserGraphReferences = async (userId) => {
  await withAccountCleanupMaxTime(User.updateMany(
    { _id: { $ne: userId } },
    {
      $pull: {
        followers: userId,
        following: userId,
        blockedUsers: userId,
        mutedUsers: userId,
        mutedStoryUsers: userId,
        hiddenStoryUsers: userId
      }
    }
  ));
};

const getProfileImagePublicId = (profileImage = '') => {
  const url = String(profileImage || '');
  if (!url.includes('cloudinary')) return '';

  const pathParts = url.split('/upload/')[1]?.split('/') || [];
  if (!pathParts.length) return '';
  const withoutVersion = /^v\d+$/.test(pathParts[0]) ? pathParts.slice(1) : pathParts;
  const publicPath = withoutVersion.join('/');
  return publicPath ? publicPath.replace(/\.[^/.]+$/, '') : '';
};

const deleteStatusMedia = async (statuses = []) => {
  const items = Array.isArray(statuses) ? statuses : [];

  await runWithBoundedConcurrency(items, getAccountCleanupMediaConcurrency(), async (status) => {
    const publicId = String(
      status?.mediaPublicId || getProfileImagePublicId(status?.video || status?.image)
    ).trim();
    if (!publicId) return;

    const isVideo = status.mediaType === 'video' || Boolean(status.video);
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: status.mediaResourceType || (isVideo ? 'video' : 'image'),
      ...(status.mediaDeliveryType ? { type: status.mediaDeliveryType } : {})
    });
  });
};

const deleteMessageMedia = async (messages = []) => {
  const publicIds = compactCloudinaryPublicIds(
    messages.map((message) => message.cloudinaryPublicId)
  );

  await runWithBoundedConcurrency(publicIds, getAccountCleanupMediaConcurrency(), async (publicId) => {
    const attempts = [
      cloudinary.uploader.destroy(publicId, { invalidate: true }),
      cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'video' }),
      cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'raw' }),
      cloudinary.uploader.destroy(publicId, { invalidate: true, type: 'authenticated' }),
      cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'video', type: 'authenticated' }),
      cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'raw', type: 'authenticated' })
    ];

    const results = await Promise.allSettled(attempts);
    const rejected = results.find((result) => result.status === 'rejected');
    if (rejected && results.every((result) => result.status === 'rejected')) {
      throw rejected.reason;
    }
  });
};

const invalidateDeletedContentCaches = async ({ blogs, articles, shorts }) => {
  const prefixes = [];
  if (blogs > 0) prefixes.push('blogs:list:', 'blog:detail:', 'seo:sitemap', 'seo:feed');
  if (articles > 0) prefixes.push('articles:list:', 'article:detail:', 'seo:sitemap', 'seo:feed');
  if (shorts > 0) prefixes.push('shorts:list:', 'short:detail:');
  if (!prefixes.length) return;

  await invalidateCacheByPrefixes(prefixes);
};

const triggerSearchRefreshes = ({ blogs, articles }) => {
  if (blogs > 0) {
    enqueueSearchIndexRefresh('account-cleanup:blogs').catch((error) => {
      logWarn('[search] Failed to enqueue blog cleanup refresh:', error);
    });
  }

  if (articles > 0) {
    enqueueSearchIndexRefresh('account-cleanup:articles').catch((error) => {
      logWarn('[search] Failed to enqueue article cleanup refresh:', error);
    });
  }
};

const recomputeProductReviewStats = async (productIds = []) => {
  const ids = [...new Set(productIds.map(toIdString).filter(Boolean))];

  await runWithBoundedConcurrency(ids, getAccountCleanupDbConcurrency(), async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) return;
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const stats = await withAccountCleanupAggregateMaxTime(Review.aggregate([
      { $match: { productId: productObjectId } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]));

    const next = stats[0] || { averageRating: 0, reviewCount: 0 };
    await withAccountCleanupMaxTime(Product.findByIdAndUpdate(productId, {
      averageRating: Math.round((next.averageRating || 0) * 10) / 10,
      reviewCount: next.reviewCount || 0
    }));
  });
};

const cleanupOwnedContent = ({ Model, userId, relationField }) =>
  processQueryInChunks({
    Model,
    filter: { author: userId },
    select: '_id cloudinaryPublicId galleryImagePublicIds',
    handler: async (documents) => {
      const ids = documents.map((document) => document._id);
      const publicIds = documents.flatMap((document) => [
        document.cloudinaryPublicId,
        ...(document.galleryImagePublicIds || []),
      ]);

      await deleteCloudinaryPublicIds(publicIds, { throwOnError: true });
      await Promise.all([
        withAccountCleanupMaxTime(Comment.deleteMany({ [relationField]: { $in: ids } })),
        withAccountCleanupMaxTime(Notification.deleteMany({ [relationField]: { $in: ids } })),
        withAccountCleanupMaxTime(Model.deleteMany({ _id: { $in: ids } })),
      ]);
    },
  });

const cleanupAccountMessages = (userId) =>
  processQueryInChunks({
    Model: Message,
    filter: { $or: [{ sender: userId }, { receiver: userId }] },
    select: '_id cloudinaryPublicId',
    handler: async (messages) => {
      await deleteMessageMedia(messages);
      await withAccountCleanupMaxTime(Message.deleteMany({
        _id: { $in: messages.map((message) => message._id) },
      }));
    },
  });

const cleanupSellerProducts = (userId) =>
  processQueryInChunks({
    Model: Product,
    filter: { sellerId: userId },
    select: '_id',
    handler: async (products) => {
      const ids = products.map((product) => product._id);
      await removeProductReferences(userId, ids);
      await withAccountCleanupMaxTime(Product.updateMany(
        { _id: { $in: ids }, sellerId: userId },
        { $set: { status: 'archived' } }
      ));
    },
  });

const cleanupBuyerReviews = (userId) =>
  processQueryInChunks({
    Model: Review,
    filter: { buyerId: userId },
    select: '_id productId',
    handler: async (reviews) => {
      const ids = reviews.map((review) => review._id);
      const productIds = reviews.map((review) => review.productId).filter(Boolean);
      await withAccountCleanupMaxTime(Review.deleteMany({ _id: { $in: ids } }));
      await recomputeProductReviewStats(productIds);
    },
  });

const redactCommerceLedgersForAccount = async (userId) => {
  await runAccountCleanupOperations([
    () => withAccountCleanupMaxTime(Order.updateMany(
      { buyerId: userId },
      [
        {
          $set: {
            shipping: {
              name: 'Deleted user',
              phone: '',
              addressLine1: '',
              addressLine2: '',
              city: '',
              state: '',
              pin: '',
              country: '',
              trackingNumber: '',
              courier: '',
              shippedAt: '$shipping.shippedAt',
              deliveredAt: '$shipping.deliveredAt'
            },
            serviceRequirements: {},
            notes: '',
            'payment.razorpaySignature': ''
          }
        }
      ]
    )),
    () => withAccountCleanupMaxTime(Shipment.updateMany(
      { buyerId: userId },
      {
        $set: {
          deliveryAddressSnapshot: { redacted: true, reason: 'buyer_account_deleted' },
          rawProviderResponse: {},
          lastError: ''
        }
      }
    )),
    () => withAccountCleanupMaxTime(Shipment.updateMany(
      { sellerId: userId },
      {
        $set: {
          pickupAddressSnapshot: { redacted: true, reason: 'seller_account_deleted' },
          rawProviderResponse: {},
          lastError: ''
        }
      }
    )),
    () => withAccountCleanupMaxTime(Payout.updateMany(
      { sellerId: userId },
      {
        $set: {
          payoutDetails: {
            upiId: '',
            bankAccount: '',
            ifsc: '',
            accountHolderName: 'Deleted seller'
          },
          failureReason: ''
        }
      }
    )),
    () => withAccountCleanupMaxTime(Payout.updateMany({ initiatedBy: userId }, { $unset: { initiatedBy: '' } })),
    () => withAccountCleanupMaxTime(SellerEarning.updateMany(
      { sellerId: userId, notes: '' },
      { $set: { notes: 'Seller account removed; retained for financial ledger.' } }
    ))
  ]);
};

const cleanupUserAccountData = async (userOrId, { deleteUser = false } = {}) => {
  const user = userOrId?._id ? userOrId : await withAccountCleanupMaxTime(User.findById(userOrId));
  if (!user) {
    return { deletedUser: false };
  }

  const userId = user._id;
  const storeSettings = await withAccountCleanupMaxTime(StoreSettings.findOne({ sellerId: userId }).select('bannerPublicId').lean());

  await deleteCloudinaryPublicIds([
    getProfileImagePublicId(user.profileImage),
    storeSettings?.bannerPublicId,
  ], { throwOnError: true });
  await deleteStatusMedia(user.statuses);

  const cleanupCounts = {};
  const cleanupTasks = [
    ['blogs', () => cleanupOwnedContent({ Model: Blog, userId, relationField: 'blog' })],
    ['articles', () => cleanupOwnedContent({ Model: Article, userId, relationField: 'article' })],
    ['shorts', () => cleanupOwnedContent({ Model: Short, userId, relationField: 'short' })],
    ['messages', () => cleanupAccountMessages(userId)],
    ['archivedProducts', () => cleanupSellerProducts(userId)],
    ['deletedReviews', () => cleanupBuyerReviews(userId)],
  ];
  await runWithBoundedConcurrency(
    cleanupTasks,
    getAccountCleanupDbConcurrency(),
    async ([key, task]) => {
      cleanupCounts[key] = await task();
    }
  );

  await runAccountCleanupOperations([
    () => withAccountCleanupMaxTime(Comment.deleteMany({ author: userId })),
    () => withAccountCleanupMaxTime(Comment.updateMany({}, { $pull: { likes: userId, dislikes: userId } })),
    () => withAccountCleanupMaxTime(Comment.updateMany({ replyTo: userId }, { $unset: { replyTo: '' } })),
    () => withAccountCleanupMaxTime(Notification.deleteMany({ recipient: userId })),
    () => withAccountCleanupMaxTime(Notification.deleteMany({ sender: userId })),
    () => withAccountCleanupMaxTime(Message.updateMany(
      {},
      {
        $pull: {
          reactions: { user: userId },
          deletedBy: userId,
          pinnedBy: { user: userId }
        }
      }
    )),
    () => withAccountCleanupMaxTime(Blog.updateMany({}, { $pull: { likes: userId, views: { user: userId } } })),
    () => withAccountCleanupMaxTime(Article.updateMany({}, { $pull: { likes: userId, views: { user: userId } } })),
    () => withAccountCleanupMaxTime(Short.updateMany({}, { $pull: { likes: userId, views: { user: userId } } })),
    () => withAccountCleanupMaxTime(Cart.deleteMany({ userId })),
    () => withAccountCleanupMaxTime(CallLog.deleteMany({ $or: [{ caller: userId }, { receiver: userId }] })),
    () => withAccountCleanupMaxTime(TwoFactorChallenge.deleteMany({ user: userId })),
    () => withAccountCleanupMaxTime(StatusView.deleteMany({ $or: [{ statusOwnerId: userId }, { viewerId: userId }] })),
    () => withAccountCleanupMaxTime(TemplatePreset.deleteMany({ owner: userId })),
    () => withAccountCleanupMaxTime(Coupon.deleteMany({ createdBy: userId })),
    () => withAccountCleanupMaxTime(Coupon.updateMany({}, { $pull: { usedBy: { userId } } })),
    () => withAccountCleanupMaxTime(StoreSettings.deleteMany({ sellerId: userId })),
    () => withAccountCleanupMaxTime(SellerApplication.deleteMany({ userId })),
    () => withAccountCleanupMaxTime(SellerApplication.updateMany({ reviewedBy: userId }, { $unset: { reviewedBy: '' } })),
    () => withAccountCleanupMaxTime(PriceChangeRequest.deleteMany({ sellerId: userId })),
    () => withAccountCleanupMaxTime(PriceChangeRequest.updateMany({ reviewedBy: userId }, { $unset: { reviewedBy: '' } })),
    () => withAccountCleanupMaxTime(SupportRequest.updateMany(
      { userId },
      {
        $set: {
          userId: null,
          username: 'Deleted user',
          email: `deleted-user-${toIdString(userId)}@example.invalid`
        }
      }
    )),
    () => withAccountCleanupMaxTime(SupportRequest.updateMany({ assignedTo: userId }, { $set: { assignedTo: null } })),
    () => withAccountCleanupMaxTime(Group.updateMany(
      {},
      {
        $pull: {
          members: userId,
          admins: userId,
          coAdmins: userId,
          unreadCount: { user: userId }
        }
      }
    )),
    () => withAccountCleanupMaxTime(GroupCall.updateMany({}, { $pull: { participants: { user: userId } } })),
    () => withAccountCleanupMaxTime(GroupCall.deleteMany({ initiator: userId })),
    () => withAccountCleanupMaxTime(User.updateMany({ verifiedBy: userId }, { $unset: { verifiedBy: '' } })),
    () => removeUserGraphReferences(userId)
  ]);
  await redactCommerceLedgersForAccount(userId);

  await invalidateDeletedContentCaches({
    blogs: cleanupCounts.blogs || 0,
    articles: cleanupCounts.articles || 0,
    shorts: cleanupCounts.shorts || 0
  });
  triggerSearchRefreshes({
    blogs: cleanupCounts.blogs || 0,
    articles: cleanupCounts.articles || 0,
  });

  if (deleteUser) {
    await withAccountCleanupMaxTime(User.findByIdAndDelete(userId));
  }

  return {
    deletedUser: Boolean(deleteUser),
    userId: toIdString(userId),
    blogs: cleanupCounts.blogs || 0,
    articles: cleanupCounts.articles || 0,
    shorts: cleanupCounts.shorts || 0,
    messages: cleanupCounts.messages || 0,
    archivedProducts: cleanupCounts.archivedProducts || 0,
    deletedReviews: cleanupCounts.deletedReviews || 0
  };
};

module.exports = {
  cleanupUserAccountData
};
