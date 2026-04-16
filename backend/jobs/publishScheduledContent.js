const cron = require('node-cron');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Article = require('../models/Article');
const Notification = require('../models/Notification');
const { enqueueSearchIndexRefresh } = require('./queueService');

const publishScheduledContent = (io) => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Publish scheduled blogs
      const scheduledBlogs = await Blog.find({
        isScheduled: true,
        isDraft: true,
        scheduledPublishDate: { $lte: now }
      }).populate('author', 'username');

      for (const blog of scheduledBlogs) {
        blog.isDraft = false;
        blog.isScheduled = false;
        await blog.save();

        await Notification.create({
          recipient: blog.author._id,
          sender: blog.author._id,
          type: 'publish',
          blog: blog._id,
          message: `Your blog "${blog.title}" has been published successfully!`
        });

        if (io) {
          io.to(`user:${blog.author._id.toString()}`).emit('notification:scheduled-publish', {
            blogId: blog._id,
            blogTitle: blog.title,
            type: 'blog'
          });
        }

        console.log(`[schedule] Published scheduled blog: ${blog.title}`);
      }

      if (scheduledBlogs.length > 0) {
        enqueueSearchIndexRefresh('scheduled:blog:publish').catch((error) => {
          console.warn('[search] Failed to enqueue scheduled blog index refresh:', error?.message || error);
        });
      }

      // Publish scheduled shorts
      const scheduledShorts = await Short.find({
        isScheduled: true,
        isDraft: true,
        scheduledPublishDate: { $lte: now }
      }).populate('author', 'username');

      for (const short of scheduledShorts) {
        short.isDraft = false;
        short.isScheduled = false;
        await short.save();

        await Notification.create({
          recipient: short.author._id,
          sender: short.author._id,
          type: 'publish',
          message: `Your short "${short.title}" has been published successfully!`
        });

        if (io) {
          io.to(`user:${short.author._id.toString()}`).emit('notification:scheduled-publish', {
            shortId: short._id,
            shortTitle: short.title,
            type: 'short'
          });
        }

        console.log(`[schedule] Published scheduled short: ${short.title}`);
      }

      // Publish scheduled articles
      const scheduledArticles = await Article.find({
        isScheduled: true,
        isDraft: true,
        scheduledPublishDate: { $lte: now }
      }).populate('author', 'username');

      for (const article of scheduledArticles) {
        article.isDraft = false;
        article.isScheduled = false;
        await article.save();

        await Notification.create({
          recipient: article.author._id,
          sender: article.author._id,
          type: 'publish',
          article: article._id,
          message: `Your article "${article.title}" has been published successfully!`
        });

        if (io) {
          io.to(`user:${article.author._id.toString()}`).emit('notification:scheduled-publish', {
            articleId: article._id,
            articleTitle: article.title,
            type: 'article'
          });
        }

        console.log(`[schedule] Published scheduled article: ${article.title}`);
      }

      if (scheduledArticles.length > 0) {
        enqueueSearchIndexRefresh('scheduled:article:publish').catch((error) => {
          console.warn('[search] Failed to enqueue scheduled article index refresh:', error?.message || error);
        });
      }
    } catch (error) {
      console.error('[schedule] Scheduled publish job failed:', error);
    }
  });
};

module.exports = publishScheduledContent;
