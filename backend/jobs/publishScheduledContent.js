const cron = require('node-cron');
const Blog = require('../models/Blog');
const Short = require('../models/Short');
const Article = require('../models/Article');
const Notification = require('../models/Notification');
const { enqueueSearchIndexRefresh, enqueueEmailJob } = require('./queueService');
const { parsePositiveInt } = require('../utils/cacheStore');
const { logError, logWarn } = require('../utils/safeErrorLog');

const SCHEDULED_PUBLISH_BATCH_LIMIT = parsePositiveInt(process.env.SCHEDULED_PUBLISH_BATCH_LIMIT, 50);
const SCHEDULED_PUBLISH_QUERY_MAX_TIME_MS = parsePositiveInt(
  process.env.SCHEDULED_PUBLISH_QUERY_MAX_TIME_MS,
  5000
);

let publishInProgress = false;

const findDueScheduled = (Model, now) => Model.find({
  isScheduled: true,
  isDraft: true,
  scheduledPublishDate: { $lte: now }
})
  .select('_id')
  .sort({ scheduledPublishDate: 1, _id: 1 })
  .limit(SCHEDULED_PUBLISH_BATCH_LIMIT)
  .maxTimeMS(SCHEDULED_PUBLISH_QUERY_MAX_TIME_MS)
  .lean();

const claimScheduledContent = (Model, id) => Model.findOneAndUpdate(
  {
    _id: id,
    isScheduled: true,
    isDraft: true,
    scheduledPublishDate: { $lte: new Date() }
  },
  {
    $set: {
      isDraft: false,
      isScheduled: false
    },
    $unset: {
      scheduledPublishDate: ''
    }
  },
  { new: true }
)
  .maxTimeMS(SCHEDULED_PUBLISH_QUERY_MAX_TIME_MS)
  .populate('author', 'username email');

const getContentUrl = (content, type) => {
  if (type === 'short') {
    return `/shorts/${content._id}`;
  }
  return `/${type}/${content.slug || content._id}`;
};

const createPublishNotification = async (content, type, authorId) => {
  const notification = {
    recipient: authorId,
    sender: authorId,
    type: 'publish',
    message: `Your ${type} "${content.title}" has been published successfully!`
  };

  if (type === 'blog') {
    notification.blog = content._id;
  } else if (type === 'article') {
    notification.article = content._id;
  } else if (type === 'short') {
    notification.short = content._id;
  }

  try {
    await Notification.create(notification);
  } catch (error) {
    logError(`[schedule] Failed to create ${type} publish notification:`, error);
  }
};

const emitPublishNotification = (io, content, type, authorId) => {
  if (!io) return;

  io.to(`user:${authorId.toString()}`).emit('notification:scheduled-publish', {
    type,
    [`${type}Id`]: content._id,
    [`${type}Title`]: content.title
  });
};

const queuePublishedEmail = (content, type) => {
  if (!content.author?.email) return;

  enqueueEmailJob(
    'content-published',
    {
      email: content.author.email,
      username: content.author.username,
      contentType: type,
      postTitle: content.title,
      postUrl: getContentUrl(content, type)
    },
    { jobId: `content-published:${type}:${content._id}` }
  ).catch((error) => {
    logError(`Failed to queue scheduled ${type} published email:`, error);
  });
};

const enqueueRefresh = (type) => {
  enqueueSearchIndexRefresh(`scheduled:${type}:publish`).catch((error) => {
    logWarn(`[search] Failed to enqueue scheduled ${type} index refresh:`, error);
  });
};

const publishDueContent = async ({ Model, type, io, now }) => {
  const scheduledItems = await findDueScheduled(Model, now);
  let publishedCount = 0;

  for (const scheduledItem of scheduledItems) {
    const content = await claimScheduledContent(Model, scheduledItem._id);
    if (!content) continue;

    const authorId = content.author?._id || content.author;
    if (authorId) {
      await createPublishNotification(content, type, authorId);
      emitPublishNotification(io, content, type, authorId);
      queuePublishedEmail(content, type);
    }

    publishedCount += 1;
    console.log(`[schedule] Published scheduled ${type}: ${content._id}`);
  }

  if (publishedCount > 0) {
    enqueueRefresh(type);
  }
};

const publishScheduledContent = (io) => {
  cron.schedule('* * * * *', async () => {
    if (publishInProgress) {
      console.warn('[schedule] Previous scheduled publish run still active; skipping this tick.');
      return;
    }

    publishInProgress = true;

    try {
      const now = new Date();

      await publishDueContent({ Model: Blog, type: 'blog', io, now });
      await publishDueContent({ Model: Short, type: 'short', io, now });
      await publishDueContent({ Model: Article, type: 'article', io, now });
    } catch (error) {
      logError('[schedule] Scheduled publish job failed:', error);
    } finally {
      publishInProgress = false;
    }
  });
};

module.exports = publishScheduledContent;
