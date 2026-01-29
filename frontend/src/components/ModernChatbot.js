import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaTimes, FaPaperPlane, FaMicrophone, FaStop, FaPaperclip, FaTrash, FaExpand, FaCompress } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../services/api';

const ModernChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const location = useLocation();

  const quickActions = [
    { text: '📝 Create a blog', emoji: '📝', key: 'create-blog' },
    { text: '⚡ Short blogs', emoji: '⚡', key: 'short-blogs' },
    { text: '🔑 API keys', emoji: '🔑', key: 'api-keys' },
    { text: '📰 News features', emoji: '📰', key: 'news-page' },
    { text: '💡 Tips & tricks', emoji: '💡', key: 'tips' },
    { text: '🎨 Markdown guide', emoji: '🎨', key: 'markdown' }
  ];

  useEffect(() => {
    const savedMessages = localStorage.getItem('chatbot-history');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatbot-history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = {
        text: `👋 **Hi there!** I'm your AI assistant.\n\nI can help you with:\n- Creating and managing blogs\n- Understanding features\n- Technical support\n- Tips and best practices\n\nTry voice input 🎤 or ask me anything!`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([greeting]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const { data } = await api.post('/chatbot/message', {
        message: input,
        context: location.pathname,
        history: messages.slice(-5)
      });

      setTimeout(() => {
        setMessages(prev => [...prev, {
          text: data.response,
          sender: 'bot',
          timestamp: new Date(),
          suggestions: data.suggestions
        }]);
        setIsTyping(false);
      }, 800);
    } catch (error) {
      const fallbackResponse = getFallbackResponse(input);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          text: fallbackResponse,
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 800);
    }
  };

  const getFallbackResponse = (input) => {
    const lower = input.toLowerCase();
    if (lower.includes('create') || lower.includes('blog') || lower.includes('write')) {
      return `**Creating a Blog** 📝\n\n1. Click **"Create Blog"** in navbar\n2. Write your content using **Markdown**\n3. Add tags and cover image\n4. Click **"Publish"** or **"Save as Draft"**\n\n💡 **Pro tip:** Use Markdown for rich formatting!`;
    }
    if (lower.includes('short')) {
      return `**Short Blogs** ⚡\n\nQuick posts under 100 words that appear in a special carousel. Perfect for:\n- Quick updates\n- Announcements\n- Daily thoughts\n\nThey get more visibility on the home page!`;
    }
    if (lower.includes('api') || lower.includes('key')) {
      return `**API Keys** 🔑\n\n1. Go to **Profile → Settings**\n2. Scroll to **Developer Section**\n3. Click **"Generate New API Key"**\n4. Copy and use in your apps\n\n⚠️ Keep your keys secure!`;
    }
    if (lower.includes('markdown')) {
      return `**Markdown Guide** 🎨\n\n\`\`\`markdown\n# Heading 1\n## Heading 2\n**Bold** *Italic*\n- List item\n[Link](url)\n![Image](url)\n\`\`\`code\`\`\`\n\`\`\`\n\nTry it in your blogs!`;
    }
    return `I can help you with:\n\n- 📝 Creating blogs\n- ⚡ Short blogs\n- 🔑 API keys\n- 📰 News features\n- 🎨 Markdown formatting\n\nWhat would you like to know?`;
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input not supported in your browser');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const clearHistory = () => {
    if (window.confirm('Clear all chat history?')) {
      setMessages([]);
      localStorage.removeItem('chatbot-history');
    }
  };

  const handleQuickAction = (key) => {
    const action = quickActions.find(a => a.key === key);
    setInput(action.text);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-30 ${
            showScrollTop ? 'bottom-20' : 'bottom-6'
          }`}
        >
          <FaRobot size={28} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className={`fixed right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          isFullscreen ? 'inset-6' : `${showScrollTop ? 'bottom-20' : 'bottom-6'} w-96 h-[600px]`
        }`}>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <FaRobot size={24} className="text-white" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h3 className="text-white font-bold">AI Assistant</h3>
                <p className="text-white/80 text-xs">Powered by AI • Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-white hover:text-gray-200">
                {isFullscreen ? <FaCompress size={18} /> : <FaExpand size={18} />}
              </button>
              <button onClick={clearHistory} className="text-white hover:text-gray-200">
                <FaTrash size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`p-3 rounded-2xl ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-md'
                  }`}>
                    {msg.sender === 'bot' ? (
                      <ReactMarkdown
                        className="prose prose-sm dark:prose-invert max-w-none"
                        components={{
                          code({node, inline, className, children, ...props}) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg text-xs"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm">{msg.text}</p>
                    )}
                  </div>
                  {msg.suggestions && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.suggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(sug)}
                          className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-none shadow-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">Quick actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.slice(0, 4).map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleQuickAction(action.key)}
                    className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition flex items-center gap-2"
                  >
                    <span>{action.emoji}</span>
                    <span className="truncate">{action.text.replace(action.emoji, '').trim()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
              <button
                onClick={isRecording ? stopVoiceInput : startVoiceInput}
                className={`p-2 rounded-xl transition ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                } text-gray-700 dark:text-gray-200`}
              >
                {isRecording ? <FaStop size={20} /> : <FaMicrophone size={20} />}
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModernChatbot;
