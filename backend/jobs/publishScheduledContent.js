const cron = require('node-cron');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Article = require('../models/Article');
const Notification = require('../models/Notification');

const publishScheduledContent = (io) => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find scheduled blogs ready to publish
      const scheduledBlogs = await Blog.find({
        isScheduled: true,
        isDraft: true,
        scheduledPublishDate: { $lte: now }
      }).populate('author', 'username');
      
      for (const blog of scheduledBlogs) {
        blog.isDraft = false;
        blog.isScheduled = false;
        await blog.save();
        
        // Create notification
        await Notification.create({
          recipient: blog.author._id,
          sender: blog.author._id,
          type: 'publish',
          blog: blog._id,
          message: `Your blog "${blog.title}" has been published successfully!`
        });
        
        // Emit socket event
        if (io) {
          io.to(`user:${blog.author._id.toString()}`).emit('notification:scheduled-publish', {
            blogId: blog._id,
            blogTitle: blog.title,
            type: 'blog'
          });
        }
        
        console.log(`✅ Published scheduled blog: ${blog.title}`);
      }
      
      // Find scheduled shorts ready to publish
      const scheduledShorts = await Short.find({
        isScheduled: true,
        isDraft: true,
        scheduledPublishDate: { $lte: now }
      }).populate('author', 'username');
      
      for (const short of scheduledShorts) {
        short.isDraft = false;
        short.isScheduled = false;
        await short.save();
        
        // Create notification
        await Notification.create({
          recipient: short.author._id,
          sender: short.author._id,
          type: 'publish',
          message: `Your short "${short.title}" has been published successfully!`
        });
        
        // Emit socket event
        if (io) {
          io.to(`user:${short.author._id.toString()}`).emit('notification:scheduled-publish', {
            shortId: short._id,
            shortTitle: short.title,
            type: 'short'
          });
        }
        
        console.log(`✅ Published scheduled short: ${short.title}`);
      }
      
      // Find scheduled articles ready to publish
      const scheduledArticles = await Article.find({
        isScheduled: true,
        isDraft: true,
        scheduledPublishDate: { $lte: now }
      }).populate('author', 'username');
      
      for (const article of scheduledArticles) {
        article.isDraft = false;
        article.isScheduled = false;
        await article.save();
        
        // Create notification
        await Notification.create({
          recipient: article.author._id,
          sender: article.author._id,
          type: 'publish',
          article: article._id,
          message: `Your article "${article.title}" has been published successfully!`
        });
        
        // Emit socket event
        if (io) {
          io.to(`user:${article.author._id.toString()}`).emit('notification:scheduled-publish', {
            articleId: article._id,
            articleTitle: article.title,
            type: 'article'
          });
        }
        
        console.log(`✅ Published scheduled article: ${article.title}`);
      }
    } catch (error) {
      console.error('❌ Scheduled publish job failed:', error);
    }
  });
};

module.exports = publishScheduledContent;
