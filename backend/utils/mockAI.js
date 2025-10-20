// Mock AI service for testing when OpenAI quota is exceeded
// Remove this and use real OpenAI once you add credits

const mockAI = {
  async generateBlog(title, tags, tone, length) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const lengthMap = {
      short: 300,
      medium: 600,
      long: 1000
    };

    const words = lengthMap[length] || 600;
    const tagsText = tags ? ` focusing on ${tags}` : '';

    return `## Introduction

This is an AI-generated blog post about "${title}"${tagsText}. This is a **mock response** because your OpenAI API quota has been exceeded.

## Main Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

### Key Points

- **Point 1**: Important information about ${title}
- **Point 2**: Detailed analysis and insights
- **Point 3**: Practical applications and examples

## Deep Dive

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Benefits

1. Enhanced understanding of the topic
2. Practical implementation strategies
3. Real-world applications

## Conclusion

In conclusion, ${title} is an important topic that deserves attention. This mock content demonstrates the UI flow while you add credits to your OpenAI account.

---

**Note**: This is mock content. Add credits to your OpenAI account to get real AI-generated content!`;
  },

  async generateBio(name, profession, interests, style) {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const interestsText = interests ? ` with interests in ${interests}` : '';
    
    return `${name} is a ${profession}${interestsText}. Passionate about innovation and excellence, ${name.split(' ')[0]} brings expertise and dedication to every project. [Mock bio - add OpenAI credits for real AI generation]`;
  },

  async improveContent(content, type) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return `[IMPROVED - ${type.toUpperCase()}]\n\n${content}\n\n[Note: This is mock improvement. Add OpenAI credits for real AI enhancement]`;
  },

  async generateTitles(topic) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return [
      `The Ultimate Guide to ${topic}`,
      `10 Things You Need to Know About ${topic}`,
      `How ${topic} Can Transform Your Life`,
      `${topic}: A Comprehensive Overview`,
      `Mastering ${topic} in 2024`
    ];
  },

  async generateTags(content) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const uniqueWords = [...new Set(words.filter(w => w.length > 4 && !commonWords.includes(w)))];
    
    return uniqueWords.slice(0, 5).join(', ') || 'technology, innovation, development, guide, tutorial';
  }
};

module.exports = mockAI;
