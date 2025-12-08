import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  const quickActions = [
    { text: 'How to create a blog?', key: 'create-blog' },
    { text: 'What are short blogs?', key: 'short-blogs' },
    { text: 'How to generate API keys?', key: 'api-keys' },
    { text: 'How to use News page?', key: 'news-page' }
  ];

  const responses = {
    'create-blog': 'To create a blog:\n1. Click "Create Blog" in the navbar\n2. Fill in title, content (supports Markdown)\n3. Add tags and cover image\n4. Click "Publish" or "Save as Draft"',
    'short-blogs': 'Short blogs are quick posts under 100 words. They appear in a special carousel on the home page. Perfect for quick updates!',
    'api-keys': 'To generate API keys:\n1. Go to Profile → Settings\n2. Click "API Keys" tab\n3. Click "Generate New Key"\n4. Use the key in your applications',
    'news-page': 'The News page shows:\n- Latest news from multiple categories\n- Weather widget with your location\n- Market indices (NIFTY, SENSEX)\n- Cricket scores\n- Gaming & Esports updates',
    'home': 'You are on the Home page. Here you can browse all blogs, filter by tags, and see short blogs carousel.',
    'news': 'You are on the News page. Browse latest news, check weather, market updates, cricket scores, and gaming news.',
    'profile': 'You are on the Profile page. Here you can edit your profile, manage API keys, and view your blogs.',
    'create': 'You are on the Create Blog page. Write your blog using Markdown, add tags, and publish!',
    'default': 'I can help you with:\n- Creating blogs\n- Understanding short blogs\n- Generating API keys\n- Using the News page\n- Navigating the app\n\nWhat would you like to know?'
  };

  const getPageContext = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/news')) return 'news';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/create')) return 'create';
    return null;
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const pageContext = getPageContext();
      const greeting = pageContext 
        ? `Hi! 👋 ${responses[pageContext]}\n\nHow can I help you?`
        : `Hi! 👋 Welcome to the Blog App!\n\n${responses.default}`;
      setMessages([{ text: greeting, sender: 'bot' }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { text: input, sender: 'user' }]);
    
    const lowerInput = input.toLowerCase();
    let response = responses.default;

    if (lowerInput.includes('create') || lowerInput.includes('blog') || lowerInput.includes('write')) {
      response = responses['create-blog'];
    } else if (lowerInput.includes('short') || lowerInput.includes('quick')) {
      response = responses['short-blogs'];
    } else if (lowerInput.includes('api') || lowerInput.includes('key')) {
      response = responses['api-keys'];
    } else if (lowerInput.includes('news') || lowerInput.includes('weather') || lowerInput.includes('market')) {
      response = responses['news-page'];
    } else if (lowerInput.includes('help') || lowerInput.includes('how')) {
      response = responses.default;
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { text: response, sender: 'bot' }]);
    }, 500);

    setInput('');
  };

  const handleQuickAction = (key) => {
    setMessages(prev => [...prev, { text: quickActions.find(a => a.key === key).text, sender: 'user' }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { text: responses[key], sender: 'bot' }]);
    }, 500);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 z-30 animate-bounce ${
            showScrollTop ? 'bottom-20' : 'bottom-6'
          }`}
        >
          <FaRobot size={28} />
        </button>
      )}

      {isOpen && (
        <div className={`fixed right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          showScrollTop ? 'bottom-20' : 'bottom-6'
        }`}>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaRobot size={24} className="text-white" />
              <div>
                <h3 className="text-white font-bold">Blog Assistant</h3>
                <p className="text-white/80 text-xs">Always here to help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
              <FaTimes size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg whitespace-pre-line ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none shadow'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleQuickAction(action.key)}
                    className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                  >
                    {action.text}
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
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleSend}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
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

export default Chatbot;
