const groq = require('../utils/openai'); // Using Groq now

// Generate blog content from title and tags
exports.generateBlog = async (req, res) => {
  try {
    const { title, tags = '', category = 'General', existingContent = '', tone = 'professional', length = 'medium' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const lengthMap = {
      short: '300-500 words',
      medium: '500-800 words',
      long: '800-1200 words'
    };

    const tagsText = tags ? ` Focus on these topics: ${tags}.` : '';
    const categoryText = category ? ` Category: ${category}.` : '';
    
    let userPrompt;
    if (existingContent && existingContent.trim()) {
      // Improve existing content
      userPrompt = `Improve and expand this existing blog content about "${title}".${categoryText}${tagsText} Target length: ${lengthMap[length] || lengthMap.medium}.

Existing content:
${existingContent}

Rewrite and improve it to be more engaging, detailed, and well-structured. Keep the markdown format.`;
    } else {
      // Generate new content
      userPrompt = `Write a blog post with the title: "${title}".${categoryText} Length: ${lengthMap[length] || lengthMap.medium}.${tagsText} Write only the content, not the title.`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a professional blog writer. Write in a ${tone} tone. Generate content in markdown format. Do not include the title in the output.`
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = completion.choices[0].message.content.trim();

    res.json({
      success: true,
      content
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
    const { content, improvementType = 'grammar' } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const prompts = {
      grammar: 'Fix grammar and spelling errors while maintaining the original meaning and style.',
      clarity: 'Improve clarity and readability while keeping the same message.',
      professional: 'Make the content more professional and polished.',
      engaging: 'Make the content more engaging and interesting to read.',
      concise: 'Make the content more concise without losing important information.'
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a professional editor. ${prompts[improvementType] || prompts.grammar}`
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    const improvedContent = completion.choices[0].message.content.trim();

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
    const { topic, count = 5 } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, message: 'Topic is required' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a creative title generator. Generate catchy, SEO-friendly blog titles.'
        },
        {
          role: 'user',
          content: `Generate ${count} catchy blog post titles about: ${topic}. Return only the titles, one per line, without numbering.`
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    });

    const titles = completion.choices[0].message.content
      .trim()
      .split('\n')
      .filter(t => t.trim())
      .map(t => t.replace(/^\d+\.\s*/, '').trim());

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
