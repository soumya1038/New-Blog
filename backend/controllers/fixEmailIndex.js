// Fix email index issue
require('dotenv').config();
const mongoose = require('mongoose');

const fixEmailIndex = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all indexes
    console.log('Current indexes:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}:`, JSON.stringify(index.key));
    });

    // Drop email index if it exists
    try {
      await usersCollection.dropIndex('email_1');
      console.log('\n✅ Dropped email_1 index successfully!');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️  email_1 index does not exist (already fixed)');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Email index issue fixed!');
    console.log('You can now create new accounts.');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixEmailIndex();
