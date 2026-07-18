const mongoose = require('mongoose');
require('dotenv').config();

const ensureWeightedTextIndex = async (collection, { name, keys, options }) => {
  const indexes = await collection.indexes();
  const textIndexes = indexes.filter((idx) =>
    Object.values(idx.key || {}).some((value) => value === 'text')
  );

  for (const idx of textIndexes) {
    if (idx.name !== name) {
      await collection.dropIndex(idx.name);
    }
  }

  await collection.createIndex(keys, { name, ...options });
};

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Blog indexes
    await db.collection('blogs').createIndex({ author: 1, createdAt: -1 });
    await db.collection('blogs').createIndex({ tags: 1 });
    await db.collection('blogs').createIndex({ isDraft: 1, createdAt: -1 });
    await db.collection('blogs').createIndex({ createdAt: -1, _id: -1 });
    await db.collection('blogs').createIndex({ slug: 1 });
    await ensureWeightedTextIndex(db.collection('blogs'), {
      name: 'blog_weighted_text_search',
      keys: { title: 'text', content: 'text', tags: 'text', category: 'text', metaDescription: 'text' },
      options: {
        weights: { title: 12, tags: 7, metaDescription: 6, category: 4, content: 2 },
        default_language: 'english'
      }
    });
    console.log('Blog indexes created');

    // Article indexes
    await db.collection('articles').createIndex({ author: 1, createdAt: -1 });
    await db.collection('articles').createIndex({ tags: 1 });
    await db.collection('articles').createIndex({ isDraft: 1, createdAt: -1 });
    await db.collection('articles').createIndex({ createdAt: -1, _id: -1 });
    await db.collection('articles').createIndex({ slug: 1 });
    await ensureWeightedTextIndex(db.collection('articles'), {
      name: 'article_weighted_text_search',
      keys: { title: 'text', content: 'text', tags: 'text', category: 'text', metaDescription: 'text' },
      options: {
        weights: { title: 14, tags: 8, metaDescription: 7, category: 4, content: 2 },
        default_language: 'english'
      }
    });
    console.log('Article indexes created');

    // User indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { sparse: true });
    await db.collection('users').createIndex({ lastActive: -1 });
    await db.collection('users').createIndex({ isGuest: 1, createdAt: -1, _id: -1 });
    await db.collection('users').createIndex({ isGuest: 1, suspendedUntil: 1 });
    await db.collection('users').createIndex(
      { 'statuses.expiresAt': 1, statusCleanupStartedAt: 1, _id: 1 },
      { name: 'status_cleanup_due_idx' }
    );
    await db.collection('users').createIndex(
      { 'statuses._id': 1 },
      { name: 'status_media_lookup_idx' }
    );
    console.log('User indexes created');

    // Status view receipts live outside User documents to avoid unbounded arrays.
    await db.collection('statusviews').createIndex(
      { statusOwnerId: 1, statusId: 1, viewerId: 1 },
      { unique: true, name: 'status_view_unique' }
    );
    await db.collection('statusviews').createIndex({ statusOwnerId: 1, statusId: 1, seenAt: -1 });
    await db.collection('statusviews').createIndex({ viewerId: 1, seenAt: -1 });
    await db.collection('statusviews').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('Status view indexes created');

    // Comment indexes
    await db.collection('comments').createIndex({ blog: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ article: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ short: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ blog: 1, parentComment: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ article: 1, parentComment: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ short: 1, parentComment: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ parentComment: 1, createdAt: 1, _id: 1 });
    await db.collection('comments').createIndex({ createdAt: -1 });
    await db.collection('comments').createIndex({ author: 1 });
    console.log('Comment indexes created');

    // Short indexes
    await db.collection('shorts').createIndex({ author: 1, createdAt: -1 });
    await db.collection('shorts').createIndex({ tags: 1 });
    await db.collection('shorts').createIndex({ isDraft: 1, createdAt: -1 });
    await db.collection('shorts').createIndex({ createdAt: -1, _id: -1 });
    console.log('Short indexes created');

    // Guest analytics indexes
    await db.collection('guestanalytics').createIndex({ createdAt: -1, ipHash: 1 });
    await db.collection('guestanalytics').createIndex({ 'pages.timestamp': 1 });
    await db.collection('guestanalytics').createIndex({ sessionId: 1, ipHash: 1 });
    console.log('Guest analytics indexes created');

    // Notification indexes
    await db.collection('notifications').createIndex({ recipient: 1, createdAt: -1, _id: -1 });
    await db.collection('notifications').createIndex({ recipient: 1, isRead: 1, createdAt: -1 });
    await db.collection('notifications').createIndex({ recipient: 1, sender: 1, type: 1 });
    await db.collection('notifications').createIndex({ createdAt: 1, _id: 1 });
    await db.collection('notifications').createIndex({ blog: 1, createdAt: -1 }, { sparse: true });
    await db.collection('notifications').createIndex({ article: 1, createdAt: -1 }, { sparse: true });
    await db.collection('notifications').createIndex({ short: 1, createdAt: -1 }, { sparse: true });
    console.log('Notification indexes created');

    // Marketplace indexes
    await db.collection('products').createIndex({ sellerId: 1 });
    await db.collection('products').createIndex({ sellerId: 1, status: 1, 'stats.sales': -1, createdAt: -1 });
    await db.collection('products').createIndex({ status: 1, type: 1 });
    console.log('Product indexes created');

    // Payment order and idempotency indexes
    await db.collection('orders').createIndex({ buyerId: 1, status: 1, createdAt: -1 });
    await db.collection('orders').createIndex({ status: 1, 'payment.reservationExpiresAt': 1, 'payment.expiryCheckStartedAt': 1, _id: 1 });
    await db.collection('orders').createIndex(
      { buyerId: 1, checkoutKeyHash: 1 },
      {
        name: 'buyer_checkout_key_unique',
        unique: true,
        partialFilterExpression: { checkoutKeyHash: { $type: 'string' } },
      }
    );
    await db.collection('idempotencykeys').createIndex({ key: 1 }, { unique: true });
    await db.collection('idempotencykeys').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('Payment order and idempotency indexes created');

    // Seller earnings and payout indexes
    await db.collection('sellerearnings').createIndex({ sellerId: 1, status: 1 });
    await db.collection('sellerearnings').createIndex({ sellerId: 1, status: 1, createdAt: -1, _id: 1 });
    await db.collection('sellerearnings').createIndex({ orderId: 1, sellerId: 1 }, { unique: true });
    await db.collection('sellerearnings').createIndex({ status: 1, holdUntil: 1, _id: 1 });
    await db.collection('sellerearnings').createIndex({ payoutId: 1, status: 1 });
    await db.collection('payouts').createIndex({ sellerId: 1, status: 1 });
    await db.collection('payouts').createIndex({ status: 1, createdAt: -1 });
    console.log('Seller earning and payout indexes created');

    // Support request indexes
    await db.collection('supportrequests').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('supportrequests').createIndex({ status: 1, createdAt: -1 });
    await db.collection('supportrequests').createIndex({ type: 1, status: 1, createdAt: -1 });
    await db.collection('supportrequests').createIndex({ type: 1, status: 1, priority: 1, createdAt: -1 });
    await db.collection('supportrequests').createIndex({ priority: 1, createdAt: -1 });
    await db.collection('supportrequests').createIndex({ status: 1, priority: 1, createdAt: -1 });
    await db.collection('supportrequests').createIndex({ status: 1, assignedTo: 1, createdAt: -1 });
    await db.collection('supportrequests').createIndex({ createdAt: -1 });
    await db.collection('supportrequests').createIndex({ email: 1, createdAt: -1 });
    console.log('Support request indexes created');

    console.log('\nAll indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
};

createIndexes();
