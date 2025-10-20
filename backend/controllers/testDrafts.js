// Test script to check drafts in database
require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');

const testDrafts = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Find all blogs
    const allBlogs = await Blog.find();
    console.log(`Total blogs in database: ${allBlogs.length}`);

    // Find drafts
    const drafts = await Blog.find({ isDraft: true });
    console.log(`Total drafts: ${drafts.length}\n`);

    if (drafts.length > 0) {
      console.log('Drafts found:');
      drafts.forEach((draft, index) => {
        console.log(`\n${index + 1}. ${draft.title}`);
        console.log(`   Author ID: ${draft.author}`);
        console.log(`   isDraft: ${draft.isDraft}`);
        console.log(`   Created: ${draft.createdAt}`);
        console.log(`   Content preview: ${draft.content.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ No drafts found in database');
    }

    // Find published blogs
    const published = await Blog.find({ isDraft: false });
    console.log(`\n\nPublished blogs: ${published.length}`);
    
    // Show all blogs with isDraft status
    console.log('\n\nAll blogs with isDraft status:');
    allBlogs.forEach((blog, index) => {
      console.log(`${index + 1}. "${blog.title}" - isDraft: ${blog.isDraft}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testDrafts();
