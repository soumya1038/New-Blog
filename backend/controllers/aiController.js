const groq = require('../utils/openai'); // Using Groq now

// Generate blog content from title and tags
exports.generateBlog = async (req, res) => {
  try {
    const { title, tags = '', category = 'General', existingContent = '', tone = 'professional', length = 'medium', isShortMode = false } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const lengthMap = {
      '10-50': '10-50 words',
      '50-100': '50-100 words',
      '100-110': '100-110 words',
      short: '300-500 words',
      medium: '500-800 words',
      long: '800-1200 words'
    };

    const isShortLength = ['10-50', '50-100', '100-110'].includes(length) || isShortMode;
    const tagsText = tags ? ` Focus on these topics: ${tags}.` : '';
    const categoryText = category ? ` Category: ${category}.` : '';
    
    let userPrompt;
    if (existingContent && existingContent.trim()) {
      if (isShortLength) {
        userPrompt = `Improve this short blog content about "${title}".${categoryText}${tagsText} Target: ${lengthMap[length] || '50-100 words'}.

Existing:
${existingContent}

Make it punchy, engaging, and memorable. Use short sentences. Remove fluff. Keep only the most impactful points.`;
      } else {
        userPrompt = `Enhance this blog about "${title}".${categoryText}${tagsText} Target: ${lengthMap[length] || lengthMap.medium}.

Existing:
${existingContent}

Improve structure, add depth, use markdown formatting (headers, lists, bold). Make it comprehensive and engaging.`;
      }
    } else {
      if (isShortLength) {
        userPrompt = `Write a short, impactful post: "${title}".${categoryText}${tagsText} Length: ${lengthMap[length] || '50-100 words'}.

Make it:
- Punchy and memorable
- Easy to read (short sentences)
- Engaging from first word
- No fluff, only value

Write ONLY the content, NO title.`;
      } else {
        userPrompt = `Write a comprehensive blog: "${title}".${categoryText}${tagsText} Length: ${lengthMap[length] || lengthMap.medium}.

Include:
- Clear structure with headers
- Engaging introduction
- Detailed main points
- Practical examples
- Strong conclusion

Use markdown. Write ONLY content, NO title.`;
      }
    }

    const maxTokens = isShortLength ? 300 : 2000;
    const systemContent = isShortLength 
      ? `You are an expert at writing viral short-form content. Write in a ${tone} tone. Be concise, punchy, and memorable. Every word must add value. No fluff.`
      : `You are a professional blog writer. Write in a ${tone} tone. Create well-structured, engaging content with markdown formatting. Be comprehensive yet readable.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    });

    let content = completion.choices[0].message.content.trim();
    
    // Enforce word limit for short content
    if (isShortLength) {
      const words = content.split(/\s+/);
      const targetWords = {
        '10-50': 50,
        '50-100': 100,
        '100-110': 110
      };
      const maxWords = targetWords[length] || 100;
      
      if (words.length > maxWords) {
        content = words.slice(0, maxWords).join(' ');
        // Remove incomplete sentence at end
        const lastPunctuation = Math.max(
          content.lastIndexOf('.'),
          content.lastIndexOf('!'),
          content.lastIndexOf('?')
        );
        if (lastPunctuation > content.length * 0.7) {
          content = content.substring(0, lastPunctuation + 1);
        }
      }
    }
    
    // Generate fresh SEO meta description
    const metaCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO expert. Write compelling meta descriptions under 160 characters.'
        },
        {
          role: 'user',
          content: `Write a meta description for: "${title}"\n\nContent preview: ${content.substring(0, 200)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 100
    });
    
    const metaDescription = metaCompletion.choices[0].message.content.trim().replace(/^["']|["']$/g, '').substring(0, 160);

    res.json({
      success: true,
      content,
      metaDescription
    });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'AI generation failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Generate bio from user information
exports.generateBio = async (req, res) => {
  try {
    const { name, profession, interests, style = 'professional' } = req.body;

    if (!name || !profession) {
      return res.status(400).json({ success: false, message: 'Name and profession are required' });
    }

    const interestsText = interests ? ` Interests: ${interests}.` : '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a professional bio writer. Write concise, engaging bios in a ${style} style.`
        },
        {
          role: 'user',
          content: `Write a professional bio (2-3 sentences, max 150 words) for: ${name}, who is a ${profession}.${interestsText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const bio = completion.choices[0].message.content.trim();

    res.json({ success: true, bio });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Bio generation failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Improve existing content
exports.improveContent = async (req, res) => {
  try {
    const { content, improvementType = 'grammar', isShortMode = false } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const prompts = isShortMode ? {
      grammar: 'Fix grammar and spelling. Keep it punchy and under 100 words.',
      clarity: 'Make crystal clear and easy to scan. Short sentences. Under 100 words.',
      professional: 'Make professional yet conversational. Remove casual slang. Under 100 words.',
      engaging: 'Make it hook readers instantly. Use power words. Create curiosity. Under 100 words.',
      concise: 'Cut all fluff. Keep only the most impactful words. Maximum impact, minimum words.'
    } : {
      grammar: 'Fix all grammar, spelling, and punctuation errors. Maintain the original tone and message.',
      clarity: 'Improve clarity and flow. Break complex sentences. Add transitions. Make it easy to understand.',
      professional: 'Elevate to professional quality. Polish language. Add structure. Remove casual elements.',
      engaging: 'Make it captivating. Add storytelling elements. Use vivid language. Create emotional connection.',
      concise: 'Remove redundancy and filler. Keep essential information. Make every sentence count.'
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert editor. ${prompts[improvementType] || prompts.grammar} Return only the improved content.`
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.5,
      max_tokens: isShortMode ? 300 : 2000
    });

    let improvedContent = completion.choices[0].message.content.trim();
    
    // Enforce 100 word limit for shorts
    if (isShortMode) {
      const words = improvedContent.split(/\s+/);
      if (words.length > 100) {
        improvedContent = words.slice(0, 100).join(' ');
        const lastPunctuation = Math.max(
          improvedContent.lastIndexOf('.'),
          improvedContent.lastIndexOf('!'),
          improvedContent.lastIndexOf('?')
        );
        if (lastPunctuation > improvedContent.length * 0.7) {
          improvedContent = improvedContent.substring(0, lastPunctuation + 1);
        }
      }
    }

    res.json({ success: true, improvedContent });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Content improvement failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Generate title suggestions
exports.generateTitles = async (req, res) => {
  try {
    const { topic = '', count = 5 } = req.body;

    let userPrompt;
    if (topic && topic.trim()) {
      userPrompt = `Generate ${count} catchy, SEO-friendly blog titles about: ${topic}. Make them compelling and click-worthy. Return only titles, one per line, no numbering.`;
    } else {
      userPrompt = `Generate ${count} catchy blog titles about current trending topics in technology, lifestyle, business, and health. Make them timely and engaging. Return only titles, one per line, no numbering.`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a viral content creator. Generate attention-grabbing, SEO-optimized titles that make people want to click.'
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.9,
      max_tokens: 300
    });

    const titles = completion.choices[0].message.content
      .trim()
      .split('\n')
      .filter(t => t.trim())
      .map(t => t.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim());

    res.json({ success: true, titles });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Title generation failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Generate description from user profile
exports.generateDescription = async (req, res) => {
  try {
    const { fullName, email, phone, bio, existingDescription } = req.body;

    let prompt;
    
    if (existingDescription && existingDescription.trim()) {
      // Improve existing description
      prompt = `Improve and refine this description to make it more engaging and professional (max 200 characters):\n\n"${existingDescription}"\n\nWrite only the improved description, nothing else.`;
    } else {
      // Generate from profile info
      let profileInfo = [];
      if (fullName) profileInfo.push(`Name: ${fullName}`);
      if (email) profileInfo.push(`Email: ${email}`);
      if (phone) profileInfo.push(`Phone: ${phone}`);
      if (bio) profileInfo.push(`Bio: ${bio}`);
      
      if (profileInfo.length === 0) {
        return res.status(400).json({ success: false, message: 'Profile information or existing description is required' });
      }
      
      prompt = `Write a natural, engaging description (max 200 characters) for this person:\n${profileInfo.join('\n')}\n\nWrite in a professional yet casual tone. Write only the description, no labels or extra text.`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writer. Write natural, engaging descriptions without corporate jargon. Avoid words like "Results", "Contact", "Reach out". Be conversational and authentic.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 100
    });

    let description = completion.choices[0].message.content.trim();
    description = description.replace(/^["']|["']$/g, '').substring(0, 200);

    res.json({ success: true, description });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Description generation failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Generate quick chat message
exports.generateQuickChat = async (req, res) => {
  try {
    const { category, recipientName = 'them' } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const prompts = {
      greeting: `Write a short friendly greeting (1 sentence, max 10 words).`,
      question: `Write a brief question to ask how ${recipientName} is doing (1 sentence, max 8 words).`,
      thanks: `Write a short thank you message (1 sentence, max 10 words).`,
      apology: `Write a brief apology (1 sentence, max 10 words).`,
      meeting: `Write a short meeting request (1-2 sentences, max 15 words).`,
      followup: `Write a brief follow-up (1 sentence, max 10 words).`,
      congratulations: `Write a short congratulations (1 sentence, max 10 words).`,
      support: `Write a brief supportive message (1 sentence, max 10 words).`
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that writes natural, conversational messages. Write only the message, no quotes or extra text.'
        },
        {
          role: 'user',
          content: prompts[category] || prompts.greeting
        }
      ],
      temperature: 0.8,
      max_tokens: 50
    });

    const message = completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');

    res.json({ success: true, message });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Quick chat generation failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Enhance chat message
exports.enhanceMessage = async (req, res) => {
  try {
    const { message, enhanceType = 'grammar' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const prompts = {
      grammar: 'Fix grammar and spelling errors. Keep the same tone and meaning.',
      formal: 'Make this message more formal and professional.',
      casual: 'Make this message more casual and friendly.',
      shorter: 'Make this message shorter and more concise.',
      longer: 'Expand this message with more detail and context.',
      polite: 'Make this message more polite and respectful.'
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a message editor. ${prompts[enhanceType] || prompts.grammar} Return only the improved message, no quotes or explanations.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.5,
      max_tokens: 200
    });

    const enhancedMessage = completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');

    res.json({ success: true, enhancedMessage });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Message enhancement failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Generate tags from content
exports.generateTags = async (req, res) => {
  try {
    const { content, count = 5 } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a tag generator. Generate relevant, concise tags for blog posts.'
        },
        {
          role: 'user',
          content: `Generate ${count} relevant tags for this content. Return only the tags, comma-separated:\n\n${content.substring(0, 500)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 100
    });

    const tags = completion.choices[0].message.content
      .trim()
      .split(',')
      .map(t => t.trim())
      .filter(t => t);

    res.json({ success: true, tags: tags.join(', ') });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Tag generation failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};

// Summarize blog content
exports.summarizeBlog = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating concise, structured summaries. Extract key points, core concepts, and main ideas.'
        },
        {
          role: 'user',
          content: `Create a compact summary of this blog with the following structure:

**Key Points:**
- List 3-5 main points

**Core Concepts:**
- List 2-3 fundamental ideas

**Summary:**
A brief 2-3 sentence overview

Content to summarize:
${content}`
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    const summary = completion.choices[0].message.content.trim();

    res.json({ success: true, summary });
  } catch (error) {
    console.error('AI Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Summarization failed';
    res.status(500).json({ success: false, message: errorMessage });
  }
};
