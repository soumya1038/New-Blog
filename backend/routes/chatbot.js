const express = require('express');
const { logError } = require('../utils/safeErrorLog');
const {
  createRedisBackedRateLimiter,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');

const router = express.Router();
const MAX_MESSAGE_LENGTH = 1200;
const MAX_CONTEXT_LENGTH = 120;
const MAX_HISTORY_TEXT_LENGTH = 600;
const MAX_HISTORY_ITEMS = 8;

const chatbotLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.CHATBOT_RATE_LIMIT_MAX, 60),
  prefix: 'chatbot',
  message: 'Too many chatbot requests. Please wait a moment and try again.',
  responseBuilder: ({ retryAfterSeconds }) => ({
    response: 'Too many chatbot requests. Please wait a moment and try again.',
    suggestions: ['Try again later', 'Open help center'],
    retryAfterSeconds,
  }),
});

const INTENTS = {
  createContent: {
    keywords: ['create', 'write', 'post', 'blog', 'article', 'short', 'publish', 'editor'],
    response: `### Content Creation

Use **Create Post** to choose your format:
- **Blog** for standard posts
- **Article** for long-form professional writing
- **Short Blog** for concise updates

Typical flow:
1. Add title and content
2. Use markdown for formatting
3. Add tags and media
4. Publish now or save draft
5. Schedule when needed`,
    suggestions: ['Show markdown examples', 'How do drafts work?', 'How do I schedule posts?']
  },
  drafts: {
    keywords: ['draft', 'drafts', 'save', 'schedule', 'scheduled', 'pending'],
    response: `### Drafts and Scheduling

From **My Drafts** you can:
- Continue editing saved posts
- Delete old drafts
- Publish when ready
- Use scheduling options from the editor

This helps you prepare content in advance and publish at the right time.`,
    suggestions: ['Open create flow help', 'How do I publish quickly?', 'Best draft workflow']
  },
  markdown: {
    keywords: ['markdown', 'format', 'heading', 'bold', 'italic', 'code block', 'syntax'],
    response: `### Markdown Quick Guide

\`\`\`markdown
# Heading 1
## Heading 2
### Heading 3

**Bold** and *italic*

- Bullet list
1. Numbered list

[Link text](https://example.com)
![Image alt](image-url.jpg)

\`inline code\`
\`\`\`javascript
const answer = 42;
\`\`\`
\`\`\`

You can use markdown in content editors for richer and cleaner posts.`,
    suggestions: ['How do I add images?', 'Show article best practices', 'Tips for readable formatting']
  },
  profile: {
    keywords: ['profile', 'account', 'settings', 'privacy', 'security', 'password', 'social links'],
    response: `### Profile and Settings

Profile tools include:
- Personal info and avatar updates
- Social links management
- Privacy controls
- Password and security settings
- Activity and profile completion areas

Keep profile data updated for better visibility and trust.`,
    suggestions: ['Privacy settings help', 'How do I update social links?', 'Security checklist']
  },
  emailNotifications: {
    keywords: ['email', 'notification', 'notifications', 'follower', 'reaction', 'comment', 'message alert', 'missed call'],
    response: `### Email Notifications

You can control email preferences from profile settings, including:
- New follower emails
- New message emails
- Missed call emails
- New comment emails
- New reaction emails

Some system emails such as essential publishing/status notices may stay enabled.`,
    suggestions: ['Where are notification toggles?', 'Difference between app and email notifications', 'How do I reduce email frequency?']
  },
  messaging: {
    keywords: ['chat', 'message', 'dm', 'call', 'video', 'audio', 'group call', 'voice message', 'file share'],
    response: `### Chat and Calls

Messaging supports:
- Direct and group chats
- Voice notes and file sharing
- Audio/video calls
- Group call invitation and join flow
- Typing/read indicators and conversation history`,
    suggestions: ['How do I start a call?', 'How do group calls work?', 'Can I share files and voice notes?']
  },
  news: {
    keywords: ['news', 'weather', 'market', 'stocks', 'score', 'sports', 'cricket', 'headline'],
    response: `### News Page

News page includes:
- Category-based headline streams
- Weather widget
- Market and trend cards
- Sports update sections

Use categories and filters to focus on the topics you care about.`,
    suggestions: ['Show news categories', 'How often does news refresh?', 'How do I navigate sections quickly?']
  },
  developer: {
    keywords: ['api', 'key', 'developer', 'token', 'integration', 'sdk'],
    response: `### Developer and API Keys

From profile developer tools you can:
- Generate an API key
- Revoke an existing key
- Use key-based access in external apps

Keep keys private and rotate them if exposed.`,
    suggestions: ['How do I generate a key?', 'How do I revoke a key?', 'Basic API usage example']
  },
  themeAndLanguage: {
    keywords: ['theme', 'dark mode', 'light mode', 'language', 'translate', 'ui style'],
    response: `### Theme and Language

The app supports:
- Light and dark theme switching
- Language switching from the navbar

Most interface components follow the active theme automatically.`,
    suggestions: ['Theme not updating?', 'Where is language selector?', 'Dark mode readability tips']
  },
  engagement: {
    keywords: ['like', 'reaction', 'comment', 'follow', 'engagement', 'activity'],
    response: `### Engagement and Activity

Social features include:
- Likes and reactions
- Comments and replies
- Follow/unfollow
- Activity widgets and progress sections

Staying active in comments and reactions improves community reach.`,
    suggestions: ['Comment best practices', 'How to increase engagement', 'Where do I see activity stats?']
  },
  reassurance: {
    keywords: ['wrong', 'mistake', 'afraid', 'stuck', 'confused', 'anxious', 'panic'],
    response: `### You Are Doing Fine

There are no wrong questions here.

If something feels confusing:
- Share what you are trying to do
- Tell me where you are blocked
- I will break it into small next steps`,
    suggestions: ['Give me the next step', 'Explain this page simply', 'Start from basics']
  }
};

const DEFAULT_RESPONSE = {
  response: `### Assistant Help

I can help with:
- Content creation and markdown
- Drafts and publishing flow
- Profile, privacy, and security
- Email notifications
- Chat and calls
- News page usage
- Developer API key tools`,
  suggestions: ['Create content help', 'Profile and privacy', 'Chat and calls', 'News help']
};

const CONTEXT_SUGGESTIONS = {
  '/': ['Create content help', 'Draft workflow', 'Explore news'],
  '/create': ['Markdown examples', 'Post type differences', 'Scheduling help'],
  '/profile': ['Privacy settings', 'Email notification toggles', 'Security and password help'],
  '/news': ['News categories', 'Weather widget help', 'Market cards overview'],
  '/chat': ['Start a new chat', 'Audio/video call help', 'Group call workflow'],
  '/drafts': ['Resume drafts', 'Publish draft', 'Schedule from editor'],
  '/short-blogs': ['Short blog creation', 'Shorts visibility tips', 'Short vs blog'],
  '/shorts': ['Short blog creation', 'Shorts visibility tips', 'Short vs blog'],
  default: ['Create content help', 'Profile and privacy', 'Chat and calls']
};

const hasAnyKeyword = (text, keywords) => keywords.some((keyword) => text.includes(keyword));
const normalizeContextPath = (context) => String(context || '').split('?')[0].trim().toLowerCase();

const getHistoryText = (history) => {
  if (!Array.isArray(history) || history.length === 0) return '';
  const recent = history.slice(-3).map((item) => (item?.text || '').toLowerCase());
  return recent.join(' ');
};

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_ITEMS).map((item) => ({
    text: String(item?.text || '').slice(0, MAX_HISTORY_TEXT_LENGTH)
  }));
};

const matchIntent = (message, context, history) => {
  const normalized = (message || '').toLowerCase();
  const historyText = getHistoryText(history);
  const contextPath = normalizeContextPath(context);

  if (hasAnyKeyword(normalized, INTENTS.createContent.keywords)) return INTENTS.createContent;
  if (hasAnyKeyword(normalized, INTENTS.drafts.keywords)) return INTENTS.drafts;
  if (hasAnyKeyword(normalized, INTENTS.markdown.keywords)) return INTENTS.markdown;
  if (hasAnyKeyword(normalized, INTENTS.profile.keywords)) return INTENTS.profile;
  if (hasAnyKeyword(normalized, INTENTS.emailNotifications.keywords)) return INTENTS.emailNotifications;
  if (hasAnyKeyword(normalized, INTENTS.messaging.keywords)) return INTENTS.messaging;
  if (hasAnyKeyword(normalized, INTENTS.news.keywords)) return INTENTS.news;
  if (hasAnyKeyword(normalized, INTENTS.developer.keywords)) return INTENTS.developer;
  if (hasAnyKeyword(normalized, INTENTS.themeAndLanguage.keywords)) return INTENTS.themeAndLanguage;
  if (hasAnyKeyword(normalized, INTENTS.engagement.keywords)) return INTENTS.engagement;
  if (hasAnyKeyword(normalized, INTENTS.reassurance.keywords)) return INTENTS.reassurance;

  if (historyText && hasAnyKeyword(historyText, INTENTS.profile.keywords)) return INTENTS.profile;
  if (historyText && hasAnyKeyword(historyText, INTENTS.messaging.keywords)) return INTENTS.messaging;
  if (historyText && hasAnyKeyword(historyText, INTENTS.news.keywords)) return INTENTS.news;

  if (contextPath.startsWith('/create') || contextPath.startsWith('/edit')) return INTENTS.createContent;
  if (contextPath.startsWith('/profile')) return INTENTS.profile;
  if (contextPath.startsWith('/chat')) return INTENTS.messaging;
  if (contextPath.startsWith('/news')) return INTENTS.news;
  if (contextPath.startsWith('/drafts')) return INTENTS.drafts;

  return DEFAULT_RESPONSE;
};

const getContextSuggestions = (context) => {
  const path = normalizeContextPath(context);
  if (path.startsWith('/user/')) {
    return ['Profile overview help', 'Engagement features', 'How do follows work?'];
  }
  return CONTEXT_SUGGESTIONS[path] || CONTEXT_SUGGESTIONS.default;
};

router.post('/message', chatbotLimiter, async (req, res) => {
  try {
    const { message, context, history } = req.body;
    const safeMessage = String(message || '').trim();
    if (!safeMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (safeMessage.length > MAX_MESSAGE_LENGTH) {
      return res.json({
        response: `Your message is quite long (${safeMessage.length} characters). Please split it into smaller parts so I can respond more clearly and faster.`,
        suggestions: ['Shorten my question', 'Ask step by step', 'Show quick actions']
      });
    }

    const safeContext = String(context || '').slice(0, MAX_CONTEXT_LENGTH);
    const safeHistory = sanitizeHistory(history);
    const intent = matchIntent(safeMessage, safeContext, safeHistory);
    return setTimeout(() => {
      res.json(intent);
    }, 250);
  } catch (error) {
    logError('Chatbot error:', error);
    return res.status(500).json({
      response: 'Sorry, I hit an error while preparing the response. Please try again.',
      suggestions: ['Try again', 'Open support contact']
    });
  }
});

router.get('/suggestions', chatbotLimiter, async (req, res) => {
  try {
    const { context = '' } = req.query;
    res.json({ suggestions: getContextSuggestions(String(context || '').slice(0, MAX_CONTEXT_LENGTH)) });
  } catch (error) {
    logError('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

module.exports = router;
