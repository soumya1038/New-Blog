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
    console.log('User indexes created');

    // Comment indexes
    await db.collection('comments').createIndex({ blog: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ article: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ short: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ blog: 1, parentComment: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ article: 1, parentComment: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ short: 1, parentComment: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ parentComment: 1, createdAt: 1, _id: 1 });
    await db.collection('comments').createIndex({ author: 1 });
    console.log('Comment indexes created');

    // Short indexes
    await db.collection('shorts').createIndex({ author: 1, createdAt: -1 });
    await db.collection('shorts').createIndex({ tags: 1 });
    await db.collection('shorts').createIndex({ isDraft: 1, createdAt: -1 });
    console.log('Short indexes created');

    // Notification indexes
    await db.collection('notifications').createIndex({ recipient: 1, createdAt: -1 });
    await db.collection('notifications').createIndex({ read: 1, createdAt: -1 });
    console.log('Notification indexes created');

    console.log('\nAll indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
};

createIndexes();
