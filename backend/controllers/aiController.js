const groq = require('../utils/openai');

// Generate blog content from title and tags
exports.generateBlog = async (req, res) => {
  try {
    const { title, tags = '', category = 'General', existingContent = '', tone = 'professional', length = 'medium', isShortMode = false, isArticleMode = false } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const lengthMap = {
      '10-50': '10-50 words',
      '50-100': '50-100 words',
      '100-110': '100-110 words',
      short: '300-500 words',
      medium: '500-800 words',
      long: '800-1200 words',
      article: '1000-1500 words'
    };

    const isShortLength = ['10-50', '50-100', '100-110'].includes(length) || isShortMode;
    const tagsText = tags ? ` Focus on these topics: ${tags}.` : '';
    const categoryText = category ? ` Category: ${category}.` : '';
    
    let userPrompt;
    let systemContent;

    if (isArticleMode) {
      systemContent = `You are a professional article writer specializing in formal, well-researched content. Write in third person, maintain objectivity, use academic tone, and structure content with clear sections.`;
      
      if (existingContent && existingContent.trim()) {
        userPrompt = `Enhance this article about "${title}".${categoryText}${tagsText} Target: ${lengthMap.article}.

Existing:
${existingContent}

Improve by:
- Adding formal structure (Introduction, Analysis, Conclusion)
- Using third-person perspective
- Including factual analysis
- Maintaining objective tone
- Adding depth and research-backed insights
- Using proper markdown formatting

Write ONLY the content, NO title.`;
      } else {
        userPrompt = `Write a professional, formal article: "${title}".${categoryText}${tagsText} Length: ${lengthMap.article}.

Requirements:
- Write in third person (avoid "I", "we", "you")
- Maintain formal, objective tone
- Structure: Introduction → Body (with subheadings) → Conclusion
- Include factual analysis and insights
- Use markdown formatting (headers, lists, emphasis)
- Focus on informing and educating

Write ONLY content, NO title.`;
      }
    } else {
      systemContent = `You are a creative human writer, not an AI. Write naturally as if you're having a conversation with a friend. Use contractions (I'm, you're, it's), vary sentence length, include personal touches, and avoid corporate jargon. Write in ${tone} tone but keep it authentic and relatable.`;
      
      if (existingContent && existingContent.trim()) {
        if (isShortLength) {
          userPrompt = `Improve this short content about "${title}".${categoryText}${tagsText} Target: ${lengthMap[length] || '50-100 words'}.

Existing:
${existingContent}

Make it:
- Sound like a real person wrote it
- Punchy and memorable
- Use short, impactful sentences
- Remove any robotic or formal language
- Keep the human voice and personality
- Make every word count`;
        } else {
          userPrompt = `Enhance this blog about "${title}".${categoryText}${tagsText} Target: ${lengthMap[length] || lengthMap.medium}.

Existing:
${existingContent}

Improve by:
- Making it sound more human and conversational
- Adding personality and relatable examples
- Using varied sentence structure (mix short and long)
- Including transitions like "So", "Well", "Now"
- Adding occasional rhetorical questions
- Using markdown formatting naturally
- Keeping the authentic voice`;
        }
      } else {
        if (isShortLength) {
          userPrompt = `Write a short, impactful post: "${title}".${categoryText}${tagsText} Length: ${lengthMap[length] || '50-100 words'}.

Write like a real person:
- Use contractions (I'm, you're, it's)
- Short, punchy sentences
- Conversational and relatable
- Hook readers from the first word
- No corporate speak or jargon
- Sound authentic, not AI-generated

Write ONLY the content, NO title.`;
        } else {
          userPrompt = `Write a blog: "${title}".${categoryText}${tagsText} Length: ${lengthMap[length] || lengthMap.medium}.

Write naturally like a human:
- Use contractions and conversational language
- Mix short punchy sentences with longer flowing ones
- Include personal touches and relatable examples
- Use transitions (So, Well, Now, Here's the thing)
- Add occasional rhetorical questions
- Include emotions and personality
- Use active voice, avoid passive
- Add specific details and vivid descriptions
- Structure with clear headers (markdown)
- Sound authentic, not robotic

Write ONLY content, NO title.`;
        }
      }
    }

    const maxTokens = isShortLength ? 300 : (isArticleMode ? 2500 : 2000);

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

exports.improveContent = async (req, res) => {
  try {
    const { content, improvementType = 'grammar', isShortMode = false } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const prompts = {
      grammar: {
        system: 'You are an expert editor. Fix grammar and spelling errors while preserving the author\'s natural voice and style.',
        user: `Fix grammar, spelling, and punctuation errors in this content. Keep the conversational tone intact. Don't make it overly formal. Preserve contractions and casual language. Maintain the author's personality.

Content:
${content}

Return only the corrected content:`
      },
      clarity: {
        system: 'You are a clarity expert. Make content clearer and easier to understand while keeping it natural and engaging.',
        user: `Make this content clearer and easier to understand:

Content:
${content}

Guidelines:
- Break down complex ideas into simple terms
- Use shorter sentences where needed
- Add transitions between ideas
- Remove ambiguity and vague language
- Keep the conversational tone
- Use examples to illustrate points
- Maintain the author's voice

Return the improved content:`
      },
      professional: {
        system: 'You are a professional writing coach. Elevate content to sound more professional while still being approachable and human.',
        user: `Make this content more professional while keeping it approachable:

Content:
${content}

Guidelines:
- Use more sophisticated vocabulary where appropriate
- Maintain credibility with specific details
- Structure ideas logically
- Remove excessive casual language (but keep some warmth)
- Add authority without being stuffy
- Keep it readable - professional doesn't mean boring
- Preserve authenticity

Return the professional version:`
      },
      engaging: {
        system: 'You are an engagement specialist. Transform content to be more captivating and fun to read.',
        user: `Make this content more engaging and captivating:

Content:
${content}

Guidelines:
- Add storytelling elements
- Use vivid, sensory descriptions
- Include rhetorical questions
- Add humor or wit where appropriate
- Create emotional connections
- Use power words and strong verbs
- Vary sentence structure for rhythm
- Make readers want to keep reading
- Keep it authentic - don't force engagement

Return the engaging version:`
      },
      concise: {
        system: 'You are a conciseness expert. Make content more concise without losing its essence or personality.',
        user: `Make this content more concise:

Content:
${content}

Guidelines:
- Remove redundancy and filler words
- Keep the most impactful sentences
- Maintain the core message
- Preserve the author's voice
- Use stronger, more precise words
- Cut unnecessary adjectives and adverbs
- Keep it punchy and direct
- Don't sacrifice clarity for brevity

Return the concise version:`
      }
    };

    const selectedPrompt = prompts[improvementType] || prompts.grammar;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: selectedPrompt.system
        },
        {
          role: 'user',
          content: selectedPrompt.user
        }
      ],
      temperature: 0.5,
      max_tokens: isShortMode ? 300 : 2000
    });

    let improvedContent = completion.choices[0].message.content.trim();
    
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

exports.generateTitles = async (req, res) => {
  try {
    const { topic = '', count = 5 } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a creative title writer. Generate attention-grabbing titles that sound human-written, not AI-generated.'
        },
        {
          role: 'user',
          content: `Generate ${count} creative, attention-grabbing blog titles${topic ? ` about: ${topic}` : ' on trending topics'}.

Guidelines:
- Make titles intriguing and clickable
- Use power words that evoke emotion
- Include numbers when relevant (5 Ways, 10 Tips)
- Ask questions that readers want answered
- Use "How to" or "Why" formats when appropriate
- Keep titles between 50-70 characters
- Sound conversational, not corporate
- Avoid clickbait - be genuine

Examples of good titles:
- "I Tried This Morning Routine for 30 Days. Here's What Happened"
- "Why Your Coffee Tastes Bad (And How to Fix It)"
- "5 Simple Tricks That Actually Work for Better Sleep"

Return only titles, one per line, no numbering:`
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

exports.generateDescription = async (req, res) => {
  try {
    const { fullName, email, phone, bio, existingDescription } = req.body;

    let prompt;
    
    if (existingDescription && existingDescription.trim()) {
      prompt = `Improve and refine this description to make it more engaging and professional (max 200 characters):\n\n"${existingDescription}"\n\nWrite only the improved description, nothing else.`;
    } else {
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
          content: 'You are a tag generation expert. Suggest relevant, specific tags that real people would search for.'
        },
        {
          role: 'user',
          content: `Analyze this content and suggest ${count} relevant tags.

Content:
${content.substring(0, 500)}

Guidelines:
- Mix broad and specific tags
- Use tags people actually search for, not just keywords
- Include trending or popular tags when relevant
- Keep tags concise (1-3 words each)
- Think like a reader: what would they search to find this?
- Avoid overly generic tags like "blog" or "post"

Return tags as comma-separated list:`
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
