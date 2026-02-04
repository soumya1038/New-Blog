const express = require('express');
const router = express.Router();

// Chatbot responses with context awareness
const getContextualResponse = (message, context, history) => {
  const lower = message.toLowerCase();
  
  // Context-aware responses
  const responses = {
    'create-blog': {
      response: `**Creating a Blog** 📝\n\n1. Click **"Create Blog"** in the navbar\n2. Write your content using **Markdown**\n3. Add tags for better discoverability\n4. Upload a cover image (optional)\n5. Click **"Publish"** or **"Save as Draft"**\n\n💡 **Pro tips:**\n- Use headings to structure your content\n- Add code blocks with syntax highlighting\n- Preview before publishing\n- Tags help readers find your content`,
      suggestions: ['Show markdown examples', 'How to add images?', 'What are tags?']
    },
    'articles': {
      response: `**Articles** 📰\n\nArticles are professional, in-depth content pieces perfect for detailed guides, tutorials, and comprehensive posts.\n\n**Features:**\n- Full Markdown support\n- SEO optimization\n- Cover images & videos\n- Tags & categories\n- Schedule publishing\n\n**Perfect for:**\n- Technical tutorials\n- In-depth guides\n- Research articles\n- Professional content\n\n**How to create:**\n1. Go to Create Post\n2. Select **Article** mode\n3. Write your content\n4. Add metadata\n5. Publish or schedule`,
      suggestions: ['Create an article', 'Article vs Blog', 'Article best practices']
    },
    'short-blogs': {
      response: `**Short Blogs** ⚡\n\nQuick posts under 100 words that appear in a special carousel on the home page.\n\n**Perfect for:**\n- Quick updates and announcements\n- Daily thoughts and reflections\n- Breaking news\n- Tips and tricks\n\n**Benefits:**\n- Higher visibility on home page\n- Faster to create\n- More engagement\n- Great for mobile readers`,
      suggestions: ['Create a short blog', 'View short blogs', 'Short vs regular blogs']
    },
    'api-keys': {
      response: `**API Keys** 🔑\n\n**How to generate:**\n1. Go to **Profile → Settings**\n2. Scroll to **Developer Section**\n3. Click **"Generate New API Key"**\n4. Give it a descriptive name\n5. Copy and save securely\n\n**Usage:**\n\`\`\`javascript\nfetch('https://api.yourblog.com/blogs', {\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY'\n  }\n})\n\`\`\`\n\n⚠️ **Security:** Never share your API keys publicly!`,
      suggestions: ['API documentation', 'Revoke API key', 'API rate limits']
    },
    'news-page': {
      response: `**News Page Features** 📰\n\n**What you'll find:**\n- 📰 Latest news from multiple categories\n- 🌤️ Real-time weather widget\n- 📈 Market indices (NIFTY, SENSEX)\n- 🏏 Live cricket scores\n- 🎮 Gaming & Esports updates\n\n**Features:**\n- Auto-refresh every 5 minutes\n- Filter by category\n- Bookmark articles\n- Share on social media`,
      suggestions: ['How to use weather widget?', 'News categories', 'Customize news feed']
    },
    'markdown': {
      response: `**Markdown Guide** 🎨\n\n\`\`\`markdown\n# Heading 1\n## Heading 2\n### Heading 3\n\n**Bold text**\n*Italic text*\n~~Strikethrough~~\n\n- Bullet list\n- Another item\n\n1. Numbered list\n2. Second item\n\n[Link text](https://url.com)\n![Image alt](image-url.jpg)\n\n> Blockquote\n\n\`inline code\`\n\n\`\`\`javascript\n// Code block\nconst hello = 'world';\n\`\`\`\n\`\`\`\n\n---\n\nHorizontal rule\n\`\`\`\n\nTry it in your blogs!`,
      suggestions: ['Markdown cheatsheet', 'Advanced formatting', 'Code highlighting']
    },
    'tips': {
      response: `**Tips & Best Practices** 💡\n\n**Writing:**\n- Use clear, engaging titles\n- Break content into sections\n- Add images and media\n- Proofread before publishing\n\n**Engagement:**\n- Respond to comments\n- Use relevant tags\n- Share on social media\n- Post consistently\n\n**SEO:**\n- Use descriptive titles\n- Add meta descriptions\n- Include keywords naturally\n- Link to related posts\n\n**Growth:**\n- Follow other bloggers\n- Engage with community\n- Cross-promote content\n- Analyze your stats`,
      suggestions: ['SEO tips', 'Content ideas', 'Engagement strategies']
    }
  };

  // Check for quick action keys
  for (const [key, data] of Object.entries(responses)) {
    if (lower.includes(key.replace('-', ' ')) || lower.includes(key)) {
      return data;
    }
  }

  // Keyword-based responses
  if (lower.includes('article') && !lower.includes('short')) {
    return responses['articles'];
  }
  if (lower.includes('create') || lower.includes('write') || lower.includes('post')) {
    return responses['create-blog'];
  }
  if (lower.includes('short') || lower.includes('quick')) {
    return responses['short-blogs'];
  }
  if (lower.includes('api') || lower.includes('key') || lower.includes('developer')) {
    return responses['api-keys'];
  }
  if (lower.includes('news') || lower.includes('weather') || lower.includes('market')) {
    return responses['news-page'];
  }
  if (lower.includes('markdown') || lower.includes('format') || lower.includes('style')) {
    return responses['markdown'];
  }
  if (lower.includes('tip') || lower.includes('help') || lower.includes('how') || lower.includes('best practice')) {
    return responses['tips'];
  }

  // Profile-related
  if (lower.includes('profile') || lower.includes('account') || lower.includes('settings')) {
    return {
      response: `**Profile & Settings** 👤\n\n**You can:**\n- Update personal information\n- Change profile picture\n- Manage social media links\n- Generate API keys\n- Change password\n- View your activity heatmap\n- Delete account\n\n**Pro tip:** Keep your profile updated to build credibility!`,
      suggestions: ['Update profile', 'Change password', 'Privacy settings']
    };
  }

  // Comments and engagement
  if (lower.includes('comment') || lower.includes('engage') || lower.includes('interact')) {
    return {
      response: `**Comments & Engagement** 💬\n\n**Features:**\n- Comment on any blog post\n- Reply to other comments\n- Like/unlike posts\n- Follow/unfollow users\n- Get notifications\n\n**Best practices:**\n- Be respectful and constructive\n- Add value to discussions\n- Respond to replies\n- Report spam or abuse`,
      suggestions: ['Notification settings', 'Block users', 'Comment guidelines']
    };
  }

  // Messaging
  if (lower.includes('message') || lower.includes('chat') || lower.includes('dm')) {
    return {
      response: `**Messaging Features** 💬\n\n**Real-time chat with:**\n- Text messages\n- Voice messages\n- File sharing\n- Audio/Video calls\n- Group chats\n- Group video calls (LiveKit)\n\n**Features:**\n- Online status indicators\n- Read receipts\n- Typing indicators\n- Message history\n- Search conversations`,
      suggestions: ['Start a chat', 'Group calls', 'Voice messages']
    };
  }

  // Default response
  return {
    response: `I'm here to help! 🤖\n\nI can assist you with:\n\n📝 **Content Creation**\n- Creating blogs, articles, and short posts\n- Markdown formatting\n- Adding media and tags\n\n🔧 **Features**\n- API keys and developer tools\n- News and weather updates\n- Messaging and calls\n\n👤 **Account**\n- Profile management\n- Settings and preferences\n- Privacy and security\n\n💡 **Tips**\n- Best practices\n- SEO optimization\n- Engagement strategies\n\nWhat would you like to know more about?`,
    suggestions: ['Create a blog', 'What are articles?', 'API documentation', 'Tips for beginners']
  };
};

// POST /api/chatbot/message
router.post('/message', async (req, res) => {
  try {
    const { message, context, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get contextual response
    const result = getContextualResponse(message, context, history);

    // Simulate AI processing delay for better UX
    setTimeout(() => {
      res.json(result);
    }, 300);

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ 
      response: 'Sorry, I encountered an error. Please try again.',
      suggestions: ['Try again', 'Contact support']
    });
  }
});

// GET /api/chatbot/suggestions - Get smart suggestions based on context
router.get('/suggestions', async (req, res) => {
  try {
    const { context } = req.query;
    
    const suggestions = {
      '/': ['Create a blog', 'View short blogs', 'Explore news'],
      '/create': ['Markdown guide', 'Add images', 'SEO tips'],
      '/profile': ['Update profile', 'Generate API key', 'View stats'],
      '/news': ['Weather widget', 'Market updates', 'Cricket scores'],
      default: ['How to create a blog?', 'What are short blogs?', 'API documentation']
    };

    res.json({ suggestions: suggestions[context] || suggestions.default });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

module.exports = router;
