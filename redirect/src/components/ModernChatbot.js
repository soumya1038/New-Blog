import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaBell,
  FaComments,
  FaCompress,
  FaExpand,
  FaInfoCircle,
  FaMicrophone,
  FaMoon,
  FaNewspaper,
  FaPaperPlane,
  FaPenNib,
  FaRobot,
  FaShieldAlt,
  FaStop,
  FaTimes,
  FaTrash,
  FaUserCog
} from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../services/api';
import SafeMarkdown from './SafeMarkdown';

const HISTORY_STORAGE_KEY = 'chatbot-history-v2';
const LEGACY_HISTORY_STORAGE_KEY = 'chatbot-history';
const CHAT_HISTORY_STORAGE_VERSION = 2;
const CHAT_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_STORED_MESSAGES = 80;
const MAX_STORED_MESSAGE_TEXT_LENGTH = 8000;
const MAX_STORED_SUGGESTION_LENGTH = 160;
const MAX_INPUT_LENGTH = 600;
const REQUEST_TIMEOUT_MS = 12000;
const MIN_TYPING_MS = 280;

const getBrowserStorage = (type) => {
  if (typeof window === 'undefined') return null;
  try {
    return window[type] || null;
  } catch {
    return null;
  }
};

const cleanMessageText = (value, maxLength = MAX_STORED_MESSAGE_TEXT_LENGTH) =>
  String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLength);

const cleanCompactText = (value, maxLength = MAX_STORED_SUGGESTION_LENGTH) =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const getTimestampIso = (value) => {
  const parsedMs = new Date(value || Date.now()).getTime();
  const timestamp = Number.isFinite(parsedMs) && parsedMs > 0 ? parsedMs : Date.now();
  return new Date(timestamp).toISOString();
};

const removeStoredHistory = () => {
  getBrowserStorage('sessionStorage')?.removeItem(HISTORY_STORAGE_KEY);
  getBrowserStorage('localStorage')?.removeItem(HISTORY_STORAGE_KEY);
  getBrowserStorage('localStorage')?.removeItem(LEGACY_HISTORY_STORAGE_KEY);
};

const BASE_QUICK_ACTIONS = [
  { key: 'create-content', text: 'How do I create posts, articles, and shorts?', icon: FaPenNib },
  { key: 'drafts', text: 'How do drafts and scheduling work?', icon: FaRobot },
  { key: 'profile-settings', text: 'Show profile, privacy, and email settings', icon: FaUserCog },
  { key: 'chat-calls', text: 'How do chat, calls, and group calls work?', icon: FaComments },
  { key: 'news-features', text: 'What can I use on the news page?', icon: FaNewspaper },
  { key: 'theme-language', text: 'How do theme and language switching work?', icon: FaMoon }
];

const CONTEXT_HELP = {
  home: 'You are on Home. I can guide you through feed browsing, shorts, and discovery.',
  create: 'You are on Create. I can help with content type, markdown, media, and publishing flow.',
  profile: 'You are on Profile. I can help with settings, privacy, email preferences, and account tools.',
  news: 'You are on News. I can help with categories, weather, market widgets, and feed behavior.',
  chat: 'You are on Chat. I can help with messaging, calls, group calls, files, and voice notes.',
  drafts: 'You are on Drafts. I can help with editing, scheduling, and publishing drafts.',
  user: 'You are on a public user profile. I can explain activity, posts, and social actions.',
  default: 'I can help with content creation, profile settings, chat, notifications, and news.'
};

const asString = (value) => (typeof value === 'string' ? value : '');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getContextKey = (pathname) => {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/create') || pathname.startsWith('/edit')) return 'create';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/news')) return 'news';
  if (pathname.startsWith('/chat')) return 'chat';
  if (pathname.startsWith('/drafts')) return 'drafts';
  if (pathname.startsWith('/user/')) return 'user';
  return 'default';
};

const mapSuggestionIcon = (text) => {
  const value = asString(text).toLowerCase();
  if (value.includes('news') || value.includes('weather') || value.includes('market')) return FaNewspaper;
  if (value.includes('chat') || value.includes('call') || value.includes('message')) return FaComments;
  if (value.includes('profile') || value.includes('privacy') || value.includes('settings')) return FaUserCog;
  if (value.includes('notification') || value.includes('email')) return FaBell;
  if (value.includes('security') || value.includes('password')) return FaShieldAlt;
  return FaRobot;
};

const normalizeMessages = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const text = cleanMessageText(item.text);
      const suggestions = Array.isArray(item.suggestions)
        ? item.suggestions
            .map((suggestion) => cleanCompactText(suggestion))
            .filter(Boolean)
            .slice(0, 6)
        : [];
      return {
        sender: item.sender === 'user' || item.sender === 'system' ? item.sender : 'bot',
        text,
        timestamp: getTimestampIso(item.timestamp),
        suggestions
      };
    })
    .filter((item) => item.text.length > 0)
    .slice(-MAX_STORED_MESSAGES);
};

const createHistoryPayload = (messages) => ({
  version: CHAT_HISTORY_STORAGE_VERSION,
  savedAt: new Date().toISOString(),
  messages: normalizeMessages(messages)
});

const parseStoredHistory = (raw) => {
  const parsed = JSON.parse(raw);

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.messages)) {
    const savedAtMs = new Date(parsed.savedAt || 0).getTime();
    const expired =
      Number.isFinite(savedAtMs) &&
      savedAtMs > 0 &&
      Date.now() - savedAtMs > CHAT_HISTORY_TTL_MS;
    if (expired) return { messages: [], expired: true, shouldRewrite: true };

    const messages = normalizeMessages(parsed.messages);
    const shouldRewrite =
      parsed.version !== CHAT_HISTORY_STORAGE_VERSION ||
      !Number.isFinite(savedAtMs) ||
      savedAtMs <= 0 ||
      JSON.stringify(messages) !== JSON.stringify(parsed.messages);
    return { messages, shouldRewrite };
  }

  return { messages: normalizeMessages(parsed), shouldRewrite: true };
};

const writeStoredHistory = (messages) => {
  const payload = createHistoryPayload(messages);
  const sessionStorage = getBrowserStorage('sessionStorage');
  const localStorage = getBrowserStorage('localStorage');

  if (!payload.messages.length) {
    removeStoredHistory();
    return [];
  }

  sessionStorage?.setItem(HISTORY_STORAGE_KEY, JSON.stringify(payload));
  localStorage?.removeItem(HISTORY_STORAGE_KEY);
  localStorage?.removeItem(LEGACY_HISTORY_STORAGE_KEY);
  return payload.messages;
};

const buildBotMessage = (text, suggestions = []) => ({
  text,
  sender: 'bot',
  timestamp: new Date().toISOString(),
  suggestions
});

const buildSystemMessage = (text) => ({
  text,
  sender: 'system',
  timestamp: new Date().toISOString(),
  suggestions: []
});

const getFallbackResponse = (message, pathname) => {
  const text = message.toLowerCase();
  const contextKey = getContextKey(pathname);

  if (text.includes('wrong') || text.includes('mistake') || text.includes('afraid') || text.includes('confused')) {
    return {
      response:
        'You are safe here. There are no wrong questions. We can solve this step by step together and keep things simple.',
      suggestions: ['Show me the next step', 'Start from basics', 'Explain this page']
    };
  }

  if (text.includes('create') || text.includes('article') || text.includes('blog') || text.includes('short')) {
    return {
      response:
        'Use Create Post and choose your format: Blog, Article, or Short Blog. Then add title, content, tags, optional media, and publish or save as draft.',
      suggestions: ['Show markdown tips', 'How do drafts work?', 'How do I schedule a post?']
    };
  }

  if (text.includes('draft') || text.includes('schedule') || text.includes('publish')) {
    return {
      response:
        'You can save content as draft, continue editing later, and publish when ready. Drafts help you prepare content safely before going live.',
      suggestions: ['Open create flow', 'Show post types', 'How do tags help?']
    };
  }

  if (text.includes('profile') || text.includes('privacy') || text.includes('email') || text.includes('notification')) {
    return {
      response:
        'Profile settings include personal info, social links, privacy controls, password/security, and email notification toggles for social activity.',
      suggestions: ['Show privacy settings help', 'How do email toggles work?', 'How do I update social links?']
    };
  }

  if (text.includes('chat') || text.includes('call') || text.includes('message') || text.includes('group')) {
    return {
      response:
        'Chat supports direct/group messaging, voice notes, file sharing, and audio/video call flows including group call invite and join.',
      suggestions: ['How do I start a call?', 'How do group calls work?', 'Can I send files?']
    };
  }

  if (text.includes('news') || text.includes('weather') || text.includes('market') || text.includes('score')) {
    return {
      response:
        'News includes category feeds, weather widget, market blocks, and sports sections. Filters help you focus quickly.',
      suggestions: ['Show news categories', 'How often does news update?', 'Can I filter by topic?']
    };
  }

  if (text.includes('theme') || text.includes('dark') || text.includes('light') || text.includes('language')) {
    return {
      response:
        'You can switch theme and language from navbar controls. Most pages automatically follow the active mode.',
      suggestions: ['Theme troubleshooting', 'Profile theme behavior', 'Language selector help']
    };
  }

  return {
    response: `${CONTEXT_HELP[contextKey]} There are no wrong questions, so ask in your own words and I will guide you.`,
    suggestions: ['Create content help', 'Profile and privacy', 'Chat and calls', 'News help']
  };
};

const ModernChatbot = ({ defaultOpen = false }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(() => Boolean(defaultOpen));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [contextSuggestions, setContextSuggestions] = useState([]);
  const [statusHint, setStatusHint] = useState('No wrong questions. Ask anything, and I will guide you.');
  const [lastFailedPrompt, setLastFailedPrompt] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const activeRequestRef = useRef(null);
  const isMountedRef = useRef(false);

  const contextKey = useMemo(() => getContextKey(location.pathname), [location.pathname]);
  const dockedBottom = showScrollTop ? 'bottom-20 sm:bottom-24' : 'bottom-4 sm:bottom-6';

  const quickActions = useMemo(() => {
    if (contextSuggestions.length > 0) {
      return contextSuggestions.slice(0, 6).map((text, index) => ({
        key: `dynamic-${index}-${text}`,
        text,
        icon: mapSuggestionIcon(text)
      }));
    }
    return BASE_QUICK_ACTIONS;
  }, [contextSuggestions]);

  const appendMessages = useCallback((items) => {
    const normalizedItems = Array.isArray(items) ? items : [items];
    setMessages((prev) => normalizeMessages([...prev, ...normalizedItems]));
  }, []);

  const closeChat = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
    setIsTyping(false);
    setIsBusy(false);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activeRequestRef.current) activeRequestRef.current.abort();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    const sessionStorage = getBrowserStorage('sessionStorage');
    const localStorage = getBrowserStorage('localStorage');
    const sessionValue = sessionStorage?.getItem(HISTORY_STORAGE_KEY);
    const legacyValue =
      localStorage?.getItem(HISTORY_STORAGE_KEY) || localStorage?.getItem(LEGACY_HISTORY_STORAGE_KEY);
    const raw = sessionValue || legacyValue;
    if (!raw) return;
    try {
      const { messages: normalized, expired, shouldRewrite } = parseStoredHistory(raw);
      if (expired || normalized.length === 0) {
        removeStoredHistory();
        return;
      }
      setMessages(normalized);
      if (shouldRewrite || legacyValue) writeStoredHistory(normalized);
      else {
        localStorage?.removeItem(HISTORY_STORAGE_KEY);
        localStorage?.removeItem(LEGACY_HISTORY_STORAGE_KEY);
      }
    } catch (error) {
      removeStoredHistory();
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      writeStoredHistory(messages);
    } catch (error) {
      setStatusHint('Chat history could not be saved locally, but chat still works.');
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    appendMessages(
      buildBotMessage(
        `## AI Assistant\n\n${CONTEXT_HELP[contextKey]}\n\nThere are no wrong questions here. Ask anything and I will guide you step by step.`,
        ['Create content help', 'Profile settings help', 'Chat and calls help']
      )
    );
  }, [appendMessages, contextKey, isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) closeChat();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeChat, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        const { data } = await api.get('/chatbot/suggestions', {
          params: { context: location.pathname },
          timeout: REQUEST_TIMEOUT_MS
        });
        if (!cancelled) {
          setContextSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
        }
      } catch (error) {
        if (!cancelled) setContextSuggestions([]);
      }
    };

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [isOpen, location.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const syncTheme = () => setIsDarkMode(root.classList.contains('dark'));
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    syncTheme();
    return () => observer.disconnect();
  }, []);

  const handleSend = useCallback(
    async (forcedInput) => {
      const messageText = asString(forcedInput ?? input).trim();
      if (!messageText) return;

      if (isBusy) {
        setStatusHint('I am finishing the previous response. Please wait a moment.');
        return;
      }

      if (messageText.length > MAX_INPUT_LENGTH) {
        appendMessages(
          buildSystemMessage(
            `Your message is a bit long (${messageText.length} chars). Please keep it under ${MAX_INPUT_LENGTH} characters so I can help faster.`
          )
        );
        setStatusHint('Shorter prompts usually get quicker and clearer answers.');
        return;
      }

      const userMessage = {
        text: messageText,
        sender: 'user',
        timestamp: new Date().toISOString(),
        suggestions: []
      };
      const requestHistory = [...messages.slice(-5), userMessage];

      appendMessages(userMessage);
      setInput('');
      setIsBusy(true);
      setIsTyping(true);
      setLastFailedPrompt('');
      setStatusHint('Thinking...');

      const controller = new AbortController();
      activeRequestRef.current = controller;
      const startedAt = Date.now();

      try {
        const { data } = await api.post(
          '/chatbot/message',
          {
            message: messageText,
            context: location.pathname,
            history: requestHistory
          },
          {
            signal: controller.signal,
            timeout: REQUEST_TIMEOUT_MS
          }
        );

        const responseText = asString(data?.response).trim() || 'I could not prepare a complete answer right now.';
        const responseSuggestions = Array.isArray(data?.suggestions)
          ? data.suggestions.filter((item) => typeof item === 'string').slice(0, 6)
          : [];

        const elapsed = Date.now() - startedAt;
        const wait = Math.max(MIN_TYPING_MS - elapsed, 0);
        if (wait > 0) await delay(wait);

        if (!isMountedRef.current) return;
        appendMessages(buildBotMessage(responseText, responseSuggestions));
        setStatusHint('No wrong questions. Ask anything, and I will guide you.');
      } catch (error) {
        const canceled =
          error?.name === 'CanceledError' ||
          error?.code === 'ERR_CANCELED' ||
          error?.message === 'canceled';
        if (canceled) {
          if (isMountedRef.current) {
            setStatusHint('Request canceled. You can ask again anytime.');
          }
          return;
        }

        const timedOut =
          error?.code === 'ECONNABORTED' || /timeout/i.test(asString(error?.message));
        const fallback = getFallbackResponse(messageText, location.pathname);
        const friendlyError = timedOut
          ? 'Connection is slow right now. I used local help so you can keep going.'
          : 'I hit a temporary issue. You did nothing wrong, and I switched to local help.';

        const elapsed = Date.now() - startedAt;
        const wait = Math.max(MIN_TYPING_MS - elapsed, 0);
        if (wait > 0) await delay(wait);

        if (!isMountedRef.current) return;
        appendMessages([
          buildSystemMessage(friendlyError),
          buildBotMessage(fallback.response, fallback.suggestions)
        ]);
        setLastFailedPrompt(messageText);
        setStatusHint('You can retry your last question with one tap.');
      } finally {
        if (!isMountedRef.current) return;
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
        setIsTyping(false);
        setIsBusy(false);
      }
    },
    [appendMessages, input, isBusy, location.pathname, messages]
  );

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      appendMessages(
        buildSystemMessage('Voice input is not supported in this browser. You can type your message.')
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setStatusHint('Listening...');
    };
    recognition.onend = () => {
      setIsRecording(false);
      setStatusHint('Voice capture ended. You can edit the text before sending.');
    };
    recognition.onerror = () => {
      setIsRecording(false);
      appendMessages(
        buildSystemMessage('Voice capture failed. Please try again or type your message.')
      );
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setInput(transcript);
      inputRef.current?.focus();
      setStatusHint('Voice captured. You can edit the text and press send.');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  const clearHistory = () => {
    if (!window.confirm('Clear all chatbot history?')) return;
    setMessages([]);
    setLastFailedPrompt('');
    removeStoredHistory();
    setStatusHint('History cleared. Start fresh anytime.');
  };

  const renderTime = (timestamp) => {
    const value = new Date(timestamp);
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open assistant"
          className={`fixed right-3 sm:right-4 lg:right-6 ${dockedBottom} text-white p-3 sm:p-4 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 z-30 border border-white/20`}
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
        >
          <FaRobot size={22} className="sm:hidden" />
          <FaRobot size={26} className="hidden sm:block" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white" />
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed z-30 flex flex-col overflow-hidden border border-[var(--border-default)] shadow-2xl theme-modal-card transition-all duration-300 ${
            isFullscreen
              ? 'inset-2 sm:inset-4 lg:inset-6 rounded-xl sm:rounded-2xl'
              : `left-3 right-3 sm:left-auto sm:right-4 lg:right-6 ${dockedBottom} sm:w-[min(25.5rem,calc(100vw-2rem))] h-[min(72vh,39rem)] min-h-[23rem] max-h-[calc(100vh-5rem)] rounded-xl sm:rounded-2xl`
          }`}
        >
          <div
            className="p-3 sm:p-4 flex items-center justify-between border-b border-black/10"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <FaRobot size={20} className="text-white sm:hidden" />
                <FaRobot size={24} className="text-white hidden sm:block" />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold text-[15px] sm:text-base truncate">AI Assistant</h3>
                <p className="text-white/85 text-[11px] sm:text-xs truncate">
                  Calm, context-aware guidance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="text-white hover:text-white/80 transition"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <FaCompress size={16} /> : <FaExpand size={16} />}
              </button>
              <button onClick={clearHistory} className="text-white hover:text-white/80 transition" aria-label="Clear history">
                <FaTrash size={15} />
              </button>
              <button onClick={closeChat} className="text-white hover:text-white/80 transition" aria-label="Close assistant">
                <FaTimes size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[var(--background-secondary)]" aria-live="polite">
            {messages.map((msg, idx) => (
              <div key={`${msg.sender}-${idx}-${msg.timestamp || idx}`} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] sm:max-w-[85%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'text-white rounded-br-md'
                        : msg.sender === 'system'
                          ? 'bg-[var(--tag-bg)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-md'
                          : 'bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-bl-md shadow-sm'
                    }`}
                    style={
                      msg.sender === 'user'
                        ? { background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }
                        : undefined
                    }
                  >
                    {msg.sender === 'bot' || msg.sender === 'system' ? (
                      <SafeMarkdown
                        className={`prose max-w-none text-[13px] sm:text-sm leading-relaxed ${
                          msg.sender === 'system' ? 'prose-p:my-1' : 'prose-p:my-2'
                        }`}
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match) {
                              return (
                                <SyntaxHighlighter
                                  style={isDarkMode ? vscDarkPlus : oneLight}
                                  language={match[1]}
                                  PreTag="div"
                                  className="rounded-lg text-xs"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              );
                            }
                            return (
                              <code className="bg-[var(--background-secondary)] px-1 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.text}
                      </SafeMarkdown>
                    ) : (
                      <p className="text-[13px] sm:text-sm leading-relaxed break-words">{msg.text}</p>
                    )}
                  </div>
                  {Array.isArray(msg.suggestions) && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.suggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion}-${index}`}
                          onClick={() => handleSend(suggestion)}
                          disabled={isBusy}
                          className="text-[11px] px-3 py-1 rounded-full border border-[var(--border-default)] bg-[var(--tag-bg)] text-[var(--brand-primary)] hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 px-1">{renderTime(msg.timestamp)}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] p-3 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="p-3 border-t border-[var(--border-default)] bg-[var(--surface-card)]">
              <p className="text-xs text-[var(--text-secondary)] mb-2 font-semibold">Quick actions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const ActionIcon = action.icon || FaRobot;
                  return (
                    <button
                      key={action.key}
                      onClick={() => handleSend(action.text)}
                      disabled={isBusy}
                      className="text-xs bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 rounded-lg border border-[var(--border-default)] hover:bg-[var(--background-secondary)] transition flex items-center gap-2 text-left disabled:opacity-65 disabled:cursor-not-allowed"
                    >
                      <ActionIcon className="shrink-0 text-[var(--brand-primary)]" />
                      <span className="truncate">{action.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-3 sm:p-4 border-t border-[var(--border-default)] bg-[var(--surface-card)]">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                maxLength={MAX_INPUT_LENGTH}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me anything about this app..."
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm"
              />
              <button
                onClick={isRecording ? stopVoiceInput : startVoiceInput}
                disabled={isBusy}
                className={`p-2 rounded-xl border transition ${
                  isRecording
                    ? 'bg-red-500 text-white border-red-500 animate-pulse'
                    : 'theme-soft-button border-[var(--border-default)]'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
              >
                {isRecording ? <FaStop size={18} /> : <FaMicrophone size={18} />}
              </button>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isBusy}
                className="text-white p-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
                aria-label="Send message"
              >
                <FaPaperPlane size={18} />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 min-w-0">
                <FaInfoCircle className="shrink-0" />
                <span className="truncate">{statusHint}</span>
              </p>
              {lastFailedPrompt && !isBusy && (
                <button
                  onClick={() => handleSend(lastFailedPrompt)}
                  className="text-[11px] px-2 py-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background-secondary)] transition shrink-0"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModernChatbot;
