const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Blog indexes
    await db.collection('blogs').createIndex({ author: 1, createdAt: -1 });
    await db.collection('blogs').createIndex({ tags: 1 });
    await db.collection('blogs').createIndex({ title: 'text', content: 'text' });
    await db.collection('blogs').createIndex({ isDraft: 1, createdAt: -1 });
    await db.collection('blogs').createIndex({ slug: 1 });
    console.log('✅ Blog indexes created');

    // User indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { sparse: true });
    await db.collection('users').createIndex({ lastActive: -1 });
    console.log('✅ User indexes created');

    // Comment indexes
    await db.collection('comments').createIndex({ blog: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ short: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ author: 1 });
    console.log('✅ Comment indexes created');

    // Short indexes
    await db.collection('shorts').createIndex({ author: 1, createdAt: -1 });
    await db.collection('shorts').createIndex({ tags: 1 });
    await db.collection('shorts').createIndex({ isDraft: 1, createdAt: -1 });
    console.log('✅ Short indexes created');

    // Notification indexes
    await db.collection('notifications').createIndex({ recipient: 1, createdAt: -1 });
    await db.collection('notifications').createIndex({ read: 1, createdAt: -1 });
    console.log('✅ Notification indexes created');

    console.log('\n🎉 All indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
};

createIndexes();
