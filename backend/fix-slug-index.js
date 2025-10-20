// Run this file once to drop the unique index on slug field
// node fix-slug-index.js

const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/modern-blog')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      await mongoose.connection.collection('blogs').dropIndex('slug_1');
      console.log('✅ Successfully dropped slug_1 unique index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ Index slug_1 does not exist (already dropped)');
      } else {
        console.error('❌ Error dropping index:', error.message);
      }
    }
    
    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
