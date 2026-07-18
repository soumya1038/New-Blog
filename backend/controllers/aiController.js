const axios = require('axios');
const groq = require('../utils/openai');
const { logError, logWarn } = require('../utils/safeErrorLog');

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_PRODUCT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const AI_INPUT_LIMITS = {
  title: 180,
  shortField: 120,
  mediumField: 500,
  profileField: 180,
  promptContent: 12000,
  summaryContent: 20000,
  chatMessage: 1200,
  productContext: 2500
};

const ALLOWED_BLOG_TONES = new Set(['professional', 'casual', 'friendly', 'formal']);
const ALLOWED_BIO_STYLES = new Set(['professional', 'casual', 'creative']);
const ALLOWED_LENGTHS = new Set(['10-50', '50-100', '100-110', 'short', 'medium', 'long', 'article']);
const ALLOWED_IMPROVEMENTS = new Set(['grammar', 'clarity', 'professional', 'engaging', 'concise']);
const ALLOWED_ENHANCEMENTS = new Set(['grammar', 'formal', 'casual', 'shorter', 'longer', 'polite']);

const sanitizeAiText = (value = '', maxLength = AI_INPUT_LIMITS.mediumField) =>
  String(value || '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLength);

const getBoundedText = (res, value, label, maxLength, { required = false } = {}) => {
  const text = String(value || '').replace(/\0/g, '').trim();
  if (required && !text) {
    res.status(400).json({ success: false, message: `${label} is required` });
    return null;
  }
  if (text.length > maxLength) {
    res.status(400).json({
      success: false,
      message: `${label} is too long. Please keep it under ${maxLength} characters.`
    });
    return null;
  }
  return text;
};

const pickAllowed = (value, allowed, fallback) => {
  const normalized = String(value || '').trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
};

const clampInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const handleAiProviderError = (res, error, fallbackMessage, label = 'AI Error') => {
  logError(`${label}:`, error);
  return res.status(502).json({ success: false, message: fallbackMessage });
};

const cleanJsonFence = (value = '') =>
  String(value)
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

const parseAiJson = (value, fallback = {}) => {
  const cleaned = cleanJsonFence(value);
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
};

const decodeLooseJsonString = (value = '') =>
  String(value)
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();

const extractLooseTextField = (value = '', fieldName = '') => {
  const cleaned = cleanJsonFence(value);
  const quoted = new RegExp(`["']${fieldName}["']\\s*:\\s*["']([\\s\\S]*?)["']\\s*(?:[,}])`, 'i');
  const quotedMatch = cleaned.match(quoted);
  if (quotedMatch?.[1]) return decodeLooseJsonString(quotedMatch[1]);

  const bare = new RegExp(`${fieldName}\\s*:\\s*([\\s\\S]*?)(?:\\n\\s*[,}]|\\n\\s*["']?[a-zA-Z]+["']?\\s*:|$)`, 'i');
  const bareMatch = cleaned.match(bare);
  if (bareMatch?.[1]) {
    return decodeLooseJsonString(bareMatch[1].replace(/^["']|["']$/g, ''));
  }

  return '';
};

const firstTextValue = (...values) =>
  values.map(value => (typeof value === 'string' ? value.trim() : '')).find(Boolean) || '';

const normalizeStringArray = (value = [], limit = 12) => {
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(0, limit);
};

const geminiResponseText = (payload = {}) =>
  (payload.candidates?.[0]?.content?.parts || [])
    .map(part => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();

const extractGroundingSources = (groundingMetadata = {}) => {
  const chunks = groundingMetadata.groundingChunks || [];
  return chunks
    .map(chunk => chunk?.web)
    .filter(source => source?.uri || source?.title)
    .map(source => ({
      title: source.title || '',
      uri: source.uri || ''
    }))
    .slice(0, 6);
};

const getGeminiProductModels = () => {
  const configuredModel = process.env.GEMINI_PRODUCT_MODEL || process.env.GEMINI_MODEL || '';
  return [...new Set([configuredModel, ...DEFAULT_GEMINI_PRODUCT_MODELS].filter(Boolean))];
};

const geminiGenerationConfig = (target, model) => {
  const config = {
    temperature: target === 'description' ? 0.35 : 0.25,
    maxOutputTokens: target === 'description' ? 1800 : 1000
  };

  if (/gemini-2\.5/i.test(model)) {
    config.thinkingConfig = {
      thinkingBudget: 0
    };
  }

  return config;
};

const productContextText = (product = {}) => {
  const title = sanitizeAiText(product.title, AI_INPUT_LIMITS.title);
  const description = sanitizeAiText(product.description, 1200);
  const categories = normalizeStringArray(product.category, 8)
    .map(item => sanitizeAiText(item, 80))
    .filter(Boolean)
    .join(', ');
  const tags = normalizeStringArray(product.tags, 12)
    .map(item => sanitizeAiText(item, 60))
    .filter(Boolean)
    .join(', ');
  const specifications = Array.isArray(product.specifications)
    ? product.specifications
      .slice(0, 12)
      .filter(item => item?.key || item?.value)
      .map(item => `${sanitizeAiText(item.key || 'Property', 80)}: ${sanitizeAiText(item.value || '', 180)}`)
      .join('\n')
    : '';

  return [
    `Type: ${sanitizeAiText(product.type || 'not selected', 80)}`,
    `Title: ${title}`,
    `Description: ${description}`,
    `Categories: ${categories}`,
    `Tags: ${tags}`,
    `Warranty: ${sanitizeAiText(product.warranty, 500)}`,
    `Country of Origin: ${sanitizeAiText(product.countryOfOrigin, 80)}`,
    specifications ? `Specifications:\n${specifications}` : '',
  ].filter(Boolean).join('\n').slice(0, AI_INPUT_LIMITS.productContext);
};

const buildProductListingPrompt = ({ target, instruction, context }) => `
You are a senior e-commerce listing assistant for Lekhon Marketplace.
Use Google Search only to understand public product context, common use-cases, and buyer-friendly wording when seller input is limited.

Rules:
- Seller-provided product context is the source of truth.
- Do not invent exact dimensions, certifications, safety claims, stock, shipping promises, warranty terms, brand ownership, or compatibility.
- If web results are uncertain or generic, write cautiously and make the copy seller-editable.
- Return one valid JSON object only. No markdown, no comments, no citations in the JSON values.

Task target: ${target}
${instruction}

Product context:
${context}
`.trim();

const buildCompactProductListingPrompt = ({ target, instruction, context }) => `
Return one valid JSON object only. No markdown.
Target: ${target}
${instruction}

Use this product context first. If it is limited, use cautious public product context from Google Search. Do not invent exact facts that are not in the seller context.

Product context:
${context}
`.trim();

const requestGeminiProductListing = async ({ target, instruction, context, compact = false }) => {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = compact
    ? buildCompactProductListingPrompt({ target, instruction, context })
    : buildProductListingPrompt({ target, instruction, context });
  let lastError;

  for (const model of getGeminiProductModels()) {
    try {
      const { data } = await axios.post(
        `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
        {
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          tools: [
            {
              google_search: {}
            }
          ],
          generationConfig: geminiGenerationConfig(target, model)
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY
          },
          timeout: 45000
        }
      );

      const candidate = data.candidates?.[0] || {};
      const raw = geminiResponseText(data);
      return {
        raw,
        provider: 'gemini',
        model,
        webSearchQueries: candidate.groundingMetadata?.webSearchQueries || [],
        sources: extractGroundingSources(candidate.groundingMetadata)
      };
    } catch (error) {
      lastError = error;
      logWarn(`[Product AI] Gemini model failed (${model}):`, error);
    }
  }

  throw lastError;
};

const requestGroqProductListing = async ({ target, instruction, context }) => {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You help small sellers create accurate e-commerce product listings. Return valid JSON only. Use the seller's inputs first. Do not claim live web research or invent hard facts.`
      },
      {
        role: 'user',
        content: `${instruction}

Product context:
${context}`
      }
    ],
    temperature: 0.45,
    max_tokens: target === 'description' ? 700 : 450
  });

  return {
    raw: completion.choices[0].message.content,
    provider: 'groq'
  };
};

const normalizeProductAiData = (target, raw) => {
  const data = parseAiJson(raw, {});
  const plainRaw = cleanJsonFence(raw);
  const isJsonish = plainRaw.trim().startsWith('{');

  if (target === 'description') {
    data.description = firstTextValue(
      data.description,
      data.Description,
      data.content,
      data.productDescription,
      extractLooseTextField(raw, 'description'),
      extractLooseTextField(raw, 'content'),
      !isJsonish ? plainRaw : ''
    );
  }
  if (target === 'warranty') {
    data.warranty = firstTextValue(
      data.warranty,
      data.Warranty,
      extractLooseTextField(raw, 'warranty'),
      !isJsonish ? plainRaw : ''
    );
  }
  if (data.tags) data.tags = normalizeStringArray(data.tags, 12);
  if (data.badges) data.badges = normalizeStringArray(data.badges, 3);
  if (data.specifications) {
    data.specifications = (Array.isArray(data.specifications) ? data.specifications : [])
      .map(item => ({
        key: String(item?.key || '').trim(),
        value: String(item?.value || '').trim()
      }))
      .filter(item => item.key || item.value)
      .slice(0, 12);
  }
  if (data.seoDescription) {
    data.seoDescription = String(data.seoDescription).slice(0, 160);
  }

  return data;
};

const hasProductAiData = (target, data = {}) => {
  if (target === 'description') return Boolean(String(data.description || '').trim());
  if (target === 'specifications') return Array.isArray(data.specifications) && data.specifications.length > 0;
  if (target === 'warranty') return Boolean(String(data.warranty || '').trim());
  if (target === 'tags') return Array.isArray(data.tags) && data.tags.length > 0;
  if (target === 'marketing') {
    return Boolean(data.promoBanner || data.seoTitle || data.seoDescription || data.badges?.length);
  }
  return false;
};

// Generate blog content from title and tags
exports.generateBlog = async (req, res) => {
  try {
    const {
      title: rawTitle,
      tags: rawTags = '',
      category: rawCategory = 'General',
      existingContent: rawExistingContent = '',
      tone: rawTone = 'professional',
      length: rawLength = 'medium',
      isShortMode = false,
      isArticleMode = false
    } = req.body;

    const title = getBoundedText(res, rawTitle, 'Title', AI_INPUT_LIMITS.title, { required: true });
    if (title === null) return;

    const tags = getBoundedText(res, rawTags, 'Tags', AI_INPUT_LIMITS.mediumField);
    if (tags === null) return;

    const category = getBoundedText(res, rawCategory, 'Category', AI_INPUT_LIMITS.shortField);
    if (category === null) return;

    const existingContent = getBoundedText(res, rawExistingContent, 'Existing content', AI_INPUT_LIMITS.promptContent);
    if (existingContent === null) return;

    const tone = pickAllowed(rawTone, ALLOWED_BLOG_TONES, 'professional');
    const length = pickAllowed(rawLength, ALLOWED_LENGTHS, 'medium');

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
    return handleAiProviderError(res, error, 'AI generation failed. Please try again later.');
  }
};

exports.generateBio = async (req, res) => {
  try {
    const { name: rawName, profession: rawProfession, interests: rawInterests = '', style: rawStyle = 'professional' } = req.body;

    const name = getBoundedText(res, rawName, 'Name', AI_INPUT_LIMITS.profileField, { required: true });
    if (name === null) return;

    const profession = getBoundedText(res, rawProfession, 'Profession', AI_INPUT_LIMITS.profileField, { required: true });
    if (profession === null) return;

    const interests = getBoundedText(res, rawInterests, 'Interests', AI_INPUT_LIMITS.mediumField);
    if (interests === null) return;

    const style = pickAllowed(rawStyle, ALLOWED_BIO_STYLES, 'professional');

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
    return handleAiProviderError(res, error, 'Bio generation failed. Please try again later.');
  }
};

exports.generateProductListing = async (req, res) => {
  try {
    const { target: rawTarget, product = {} } = req.body;
    const target = sanitizeAiText(rawTarget, 40);
    if (!target) {
      return res.status(400).json({ success: false, message: 'Target is required.' });
    }

    if (!sanitizeAiText(product.title, AI_INPUT_LIMITS.title)) {
      return res.status(400).json({ success: false, message: 'Product title is required before using AI.' });
    }

    const context = productContextText(product);
    const targetInstructions = {
      description: `Return JSON: {"description":"..."}.
Write a professional marketplace description in 2-4 short paragraphs. Make it clear, trustworthy, buyer-focused, and specific. If product input is limited, use public context and common use-cases cautiously. Do not invent warranty, certifications, or shipping promises.`,
      specifications: `Return JSON: {"specifications":[{"key":"Material","value":"..."},{"key":"Use Case","value":"..."}]}.
Create a clean key-value specification table with 5-10 useful rows. Prefer seller-provided facts. If a fact is uncertain, use practical generic rows like Use Case, Compatibility, Package Includes, Care Instructions instead of pretending.`,
      warranty: `Return JSON: {"warranty":"..."}.
Draft a concise warranty/return note based only on provided information. If no warranty is provided, write a cautious seller-editable placeholder that does not overpromise.`,
      tags: `Return JSON: {"tags":["tag one","tag two"]}.
Generate 8-12 concise search tags for a marketplace listing. Mix broad and specific phrases. Avoid irrelevant hype.`,
      marketing: `Return JSON: {"promoBanner":"...","badges":["New"],"seoTitle":"...","seoDescription":"..."}.
Create a short promo banner, 1-3 suitable badges from this list only: Bestseller, New, Limited Edition, Top Rated, Staff Pick, and SEO title/description. SEO description must be under 160 characters.`
    };

    const instruction = targetInstructions[target];
    if (!instruction) {
      return res.status(400).json({ success: false, message: 'Unsupported product AI target.' });
    }

    let aiResult;
    let data;
    try {
      aiResult = await requestGeminiProductListing({ target, instruction, context });
    } catch (geminiError) {
      logWarn('[Product AI] Gemini generation failed; falling back to Groq:', geminiError);
    }

    if (aiResult?.raw) {
      data = normalizeProductAiData(target, aiResult.raw);
    }

    if (aiResult?.provider === 'gemini' && !hasProductAiData(target, data)) {
      try {
        const retryResult = await requestGeminiProductListing({ target, instruction, context, compact: true });
        const retryData = normalizeProductAiData(target, retryResult?.raw || '');
        if (hasProductAiData(target, retryData)) {
          aiResult = retryResult;
          data = retryData;
        }
      } catch (geminiRetryError) {
        logWarn('[Product AI] Gemini retry failed; falling back to Groq:', geminiRetryError);
      }
    }

    if (!aiResult?.raw) {
      aiResult = await requestGroqProductListing({ target, instruction, context });
      data = normalizeProductAiData(target, aiResult.raw);
    }

    if (!hasProductAiData(target, data) && aiResult.provider !== 'groq') {
      aiResult = await requestGroqProductListing({ target, instruction, context });
      data = normalizeProductAiData(target, aiResult.raw);
    }

    res.json({
      success: true,
      target,
      provider: aiResult.provider,
      model: aiResult.model || '',
      webSearchQueries: aiResult.webSearchQueries || [],
      sources: aiResult.sources || [],
      ...data
    });
  } catch (error) {
    return handleAiProviderError(res, error, 'Product AI generation failed. Please try again later.', 'Product AI Error');
  }
};

exports.improveContent = async (req, res) => {
  try {
    const { content: rawContent, improvementType: rawImprovementType = 'grammar', isShortMode = false } = req.body;

    const content = getBoundedText(res, rawContent, 'Content', AI_INPUT_LIMITS.promptContent, { required: true });
    if (content === null) return;

    const improvementType = pickAllowed(rawImprovementType, ALLOWED_IMPROVEMENTS, 'grammar');

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
    return handleAiProviderError(res, error, 'Content improvement failed. Please try again later.');
  }
};

exports.generateTitles = async (req, res) => {
  try {
    const { topic: rawTopic = '', count: rawCount = 5 } = req.body;
    const topic = getBoundedText(res, rawTopic, 'Topic', AI_INPUT_LIMITS.mediumField);
    if (topic === null) return;
    const count = clampInt(rawCount, 5, 1, 10);

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
    return handleAiProviderError(res, error, 'Title generation failed. Please try again later.');
  }
};

exports.generateDescription = async (req, res) => {
  try {
    const { fullName: rawFullName, bio: rawBio, existingDescription: rawExistingDescription } = req.body;
    const fullName = getBoundedText(res, rawFullName, 'Name', AI_INPUT_LIMITS.profileField);
    if (fullName === null) return;

    const bio = getBoundedText(res, rawBio, 'Bio', 1000);
    if (bio === null) return;

    const existingDescription = getBoundedText(res, rawExistingDescription, 'Existing description', 1000);
    if (existingDescription === null) return;

    let prompt;
    
    if (existingDescription && existingDescription.trim()) {
      prompt = `Improve and refine this description to make it more engaging and professional (max 200 characters):\n\n"${existingDescription}"\n\nWrite only the improved description, nothing else.`;
    } else {
      let profileInfo = [];
      if (fullName) profileInfo.push(`Name: ${fullName}`);
      if (bio) profileInfo.push(`Bio: ${bio}`);
      
      if (profileInfo.length === 0) {
        return res.status(400).json({ success: false, message: 'Public profile information or existing description is required' });
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
    return handleAiProviderError(res, error, 'Description generation failed. Please try again later.');
  }
};

exports.generateQuickChat = async (req, res) => {
  try {
    const { category: rawCategory, recipientName: rawRecipientName = 'them' } = req.body;

    const quickChatCategories = new Set([
      'greeting',
      'question',
      'thanks',
      'apology',
      'meeting',
      'followup',
      'congratulations',
      'support',
    ]);
    const category = pickAllowed(rawCategory, quickChatCategories, '');
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const recipientName = getBoundedText(res, rawRecipientName, 'Recipient name', AI_INPUT_LIMITS.shortField);
    if (recipientName === null) return;

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
    return handleAiProviderError(res, error, 'Quick chat generation failed. Please try again later.');
  }
};

exports.enhanceMessage = async (req, res) => {
  try {
    const { message: rawMessage, enhanceType: rawEnhanceType = 'grammar' } = req.body;

    const message = getBoundedText(res, rawMessage, 'Message', AI_INPUT_LIMITS.chatMessage, { required: true });
    if (message === null) return;

    const enhanceType = pickAllowed(rawEnhanceType, ALLOWED_ENHANCEMENTS, 'grammar');

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
    return handleAiProviderError(res, error, 'Message enhancement failed. Please try again later.');
  }
};

exports.generateTags = async (req, res) => {
  try {
    const { content: rawContent, count: rawCount = 5 } = req.body;

    const content = getBoundedText(res, rawContent, 'Content', AI_INPUT_LIMITS.promptContent, { required: true });
    if (content === null) return;
    const count = clampInt(rawCount, 5, 1, 12);

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
    return handleAiProviderError(res, error, 'Tag generation failed. Please try again later.');
  }
};

exports.summarizeBlog = async (req, res) => {
  try {
    const { content: rawContent } = req.body;

    const content = getBoundedText(res, rawContent, 'Content', AI_INPUT_LIMITS.summaryContent, { required: true });
    if (content === null) return;

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
    return handleAiProviderError(res, error, 'Summarization failed. Please try again later.');
  }
};
