import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { HomePageSkeleton } from '../components/SkeletonLoader';
import soundNotification from '../utils/soundNotifications';
import ArticleCard from '../components/ArticleCard';
import BlogCard from '../components/BlogCard';
import ShortPreviewCard from '../components/ShortPreviewCard';
import SectionHeader from '../components/SectionHeader';
import ModernProductTour from '../components/ModernProductTour';
import ShortBlogs from '../components/ShortBlogs';
import ScrollToTop from '../components/ScrollToTop';
import Avatar from '../components/Avatar';
import StatusViewer from '../components/StatusViewer';
import { useDebounce } from '../hooks/useDebounce';
import { apiCache } from '../utils/apiCache';

const STORY_SEEN_STORAGE_PREFIX = 'lekhon_story_seen_v1';
const CONTENT_FILTERS = ['all', 'articles', 'blogs', 'shorts'];

const normalizeContentFilter = (filter) =>
  CONTENT_FILTERS.includes(filter) ? filter : 'all';

const getRequestedContentFilter = (location) => {
  const searchFilter = new URLSearchParams(location.search || '').get('content');
  return normalizeContentFilter(location.state?.contentFilter || searchFilter);
};

const normalizeActiveStatuses = (statuses = []) =>
  Array.isArray(statuses)
    ? statuses.filter((status) => status?.expiresAt && new Date(status.expiresAt) > new Date())
    : [];

const getLatestStatusAt = (statuses = []) => {
  if (!Array.isArray(statuses) || statuses.length === 0) return '';
  return statuses
    .map((status) => new Date(status.createdAt || status.expiresAt || Date.now()).getTime())
    .reduce((latest, current) => (current > latest ? current : latest), 0)
    .toString();
};

const Home = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [blogs, setBlogs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [shortBlogs, setShortBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentFilter, setContentFilter] = useState(() => getRequestedContentFilter(location));
  const [showShortBlogs, setShowShortBlogs] = useState(true);
  const [clickTimer, setClickTimer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [visibleTagCount, setVisibleTagCount] = useState(5);
  const [error, setError] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() => window.innerWidth < 640);
  const searchBarRef = useRef(null);
  const tagContainerRef = useRef(null);
  const [showTour, setShowTour] = useState(false);
  const [myStoryStatuses, setMyStoryStatuses] = useState([]);
  const [storyStatusCache, setStoryStatusCache] = useState({});
  const [seenStories, setSeenStories] = useState({});
  const [storyPreferences, setStoryPreferences] = useState({
    mutedStoryUsers: [],
    hiddenStoryUsers: [],
  });
  const [storyPreferenceSavingUserId, setStoryPreferenceSavingUserId] = useState('');
  const [storyViewerState, setStoryViewerState] = useState({
    open: false,
    userId: '',
    userName: '',
    statuses: [],
    initialIndex: 0,
  });
  const [storyLoadingUserId, setStoryLoadingUserId] = useState('');
  const storySeenStorageKey = user?._id ? `${STORY_SEEN_STORAGE_PREFIX}:${user._id}` : '';
  
  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const requestedFilter = getRequestedContentFilter(location);
    setContentFilter((current) => (current === requestedFilter ? current : requestedFilter));
  }, [location.state?.contentFilter, location.search]);

  useEffect(() => {
    const handleResize = () => setIsCompactViewport(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    // Show tour for new users after they've seen the intro video
    const tourCompleted = localStorage.getItem('tourCompleted');
    const justLoggedIn = sessionStorage.getItem('showTourAfterLogin');
    
    if (!tourCompleted && justLoggedIn && user) {
      sessionStorage.removeItem('showTourAfterLogin');
      setTimeout(() => setShowTour(true), 500);
    }
  }, [user]);

  useEffect(() => {
    if (!storySeenStorageKey) {
      setSeenStories({});
      return;
    }

    try {
      const raw = localStorage.getItem(storySeenStorageKey);
      setSeenStories(raw ? JSON.parse(raw) : {});
    } catch (error) {
      setSeenStories({});
    }
  }, [storySeenStorageKey]);

  useEffect(() => {
    if (!storySeenStorageKey) return;
    try {
      localStorage.setItem(storySeenStorageKey, JSON.stringify(seenStories));
    } catch (error) {
      // Ignore storage write failures
    }
  }, [storySeenStorageKey, seenStories]);

  useEffect(() => {
    let isMounted = true;

    const fetchStoryPreferences = async () => {
      if (!user?._id) {
        if (isMounted) {
          setStoryPreferences({ mutedStoryUsers: [], hiddenStoryUsers: [] });
        }
        return;
      }

      try {
        const { data } = await api.get('/users/statuses/preferences');
        if (!isMounted) return;
        setStoryPreferences({
          mutedStoryUsers: Array.isArray(data?.mutedStoryUsers) ? data.mutedStoryUsers : [],
          hiddenStoryUsers: Array.isArray(data?.hiddenStoryUsers) ? data.hiddenStoryUsers : [],
        });
      } catch (error) {
        if (isMounted) {
          setStoryPreferences({ mutedStoryUsers: [], hiddenStoryUsers: [] });
        }
      }
    };

    fetchStoryPreferences();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  useEffect(() => {
    let isMounted = true;

    const fetchMyStatuses = async () => {
      if (!user?._id) {
        if (isMounted) {
          setMyStoryStatuses([]);
        }
        return;
      }

      try {
        const { data } = await api.get('/users/statuses');
        if (!isMounted) return;

        const activeStatuses = normalizeActiveStatuses(data?.statuses || []);
        setMyStoryStatuses(activeStatuses);
        setStoryStatusCache((prev) => ({
          ...prev,
          [user._id]: {
            statuses: activeStatuses,
            latestStatusAt: getLatestStatusAt(activeStatuses),
            userName: user.username || 'You',
          },
        }));
      } catch (error) {
        if (isMounted) {
          setMyStoryStatuses([]);
        }
      }
    };

    fetchMyStatuses();

    return () => {
      isMounted = false;
    };
  }, [user?._id, user?.username]);

  useEffect(() => {
    fetchBlogs();
    fetchArticles();
    fetchShortBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const cacheKey = 'blogs-list';
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        setBlogs(cached);
        setError(false);
        setLoading(false);
        return;
      }
      
      const { data } = await api.get('/blogs');
      apiCache.set(cacheKey, data.blogs);
      setBlogs(data.blogs);
      setError(false);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchShortBlogs = async () => {
    try {
      const cacheKey = 'shorts-list';
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        setShortBlogs(cached);
        return;
      }
      
      const { data } = await api.get('/shorts');
      apiCache.set(cacheKey, data.shorts);
      setShortBlogs(data.shorts);
    } catch (error) {
      console.error('Error fetching short blogs:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      const cacheKey = 'articles-list';
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        setArticles(cached);
        return;
      }
      
      const { data } = await api.get('/articles');
      apiCache.set(cacheKey, data.articles);
      setArticles(data.articles);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  const handleLike = async (e, blogId) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/blogs/${blogId}/like`);
      setBlogs(blogs.map(blog => 
        blog._id === blogId ? { ...blog, likes: data.likes } : blog
      ));
      apiCache.clear('blogs-list');
      
      if (data.liked) {
        soundNotification.playLikeActionSound();
      }
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const handleArticleLike = async (e, articleId) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/articles/${articleId}/like`);
      setArticles(articles.map(article => 
        article._id === articleId ? { ...article, likes: data.likes } : article
      ));
      apiCache.clear('articles-list');
      
      if (data.liked) {
        soundNotification.playLikeActionSound();
      }
    } catch (error) {
      console.error('Error liking article:', error);
    }
  };

  const handleCardClick = (id, type = 'blog') => {
    if (clickTimer) clearTimeout(clickTimer);
    
    const timer = setTimeout(() => {
      navigate(type === 'article' ? `/article/${id}` : `/blog/${id}`);
    }, 300);
    
    setClickTimer(timer);
  };

  const handleCardDoubleClick = (e, blogId, type = 'blog') => {
    e.preventDefault();
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
    }
    if (type === 'article') {
      handleArticleLike(null, blogId);
    } else {
      handleLike(null, blogId);
    }
  };

  const handleTagClick = (e, tag) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const storyEntries = useMemo(() => {
    if (!user?._id) return [];

    const hiddenSet = new Set((storyPreferences.hiddenStoryUsers || []).map((id) => String(id)));
    const mutedSet = new Set((storyPreferences.mutedStoryUsers || []).map((id) => String(id)));
    const authorMap = new Map();
    const allSources = [...blogs, ...articles, ...shortBlogs];

    allSources.forEach((item) => {
      const author = item?.author;
      const authorId = String(author?._id || '');
      if (!authorId) return;

      const existing = authorMap.get(authorId);
      const nextValue = {
        userId: authorId,
        username: author?.username || 'User',
        profileImage: author?.profileImage || '',
        isGuest: Boolean(author?.isGuest || author?.role === 'guest'),
        hasActiveStatus: Boolean(author?.hasActiveStatus),
      };

      if (!existing) {
        authorMap.set(authorId, nextValue);
      } else if (!existing.hasActiveStatus && nextValue.hasActiveStatus) {
        authorMap.set(authorId, { ...existing, hasActiveStatus: true });
      }
    });

    const activeAuthors = Array.from(authorMap.values())
      .filter((entry) => entry.userId !== user._id && entry.hasActiveStatus)
      .map((entry) => ({
        ...entry,
        isMuted: mutedSet.has(entry.userId),
        isHidden: hiddenSet.has(entry.userId),
      }))
      .sort((a, b) => {
        if (a.isHidden !== b.isHidden) return a.isHidden ? 1 : -1;
        return a.username.localeCompare(b.username);
      });

    const selfEntry = {
      userId: user._id,
      username: myStoryStatuses.length > 0 ? 'Your story' : 'Add story',
      profileImage: user.profileImage || '',
      isGuest: Boolean(user?.isGuest || user?.role === 'guest'),
      hasActiveStatus: myStoryStatuses.length > 0,
      isSelf: true,
    };

    return [selfEntry, ...activeAuthors];
  }, [
    user?._id,
    user?.profileImage,
    user?.isGuest,
    user?.role,
    blogs,
    articles,
    shortBlogs,
    myStoryStatuses.length,
    storyPreferences.hiddenStoryUsers,
    storyPreferences.mutedStoryUsers,
  ]);

  const markStoryAsSeen = (userId, latestStatusAt) => {
    if (!userId || !latestStatusAt) return;
    setSeenStories((prev) => ({
      ...prev,
      [userId]: {
        latestStatusAt: String(latestStatusAt),
        seenAt: Date.now(),
      },
    }));
  };

  const isStorySeen = (entry) => {
    if (!entry?.hasActiveStatus) return false;
    const seenMeta = seenStories?.[entry.userId];
    if (!seenMeta) return false;

    const latestFromCache = storyStatusCache?.[entry.userId]?.latestStatusAt;
    if (latestFromCache && seenMeta.latestStatusAt) {
      return String(latestFromCache) === String(seenMeta.latestStatusAt);
    }

    return Date.now() - Number(seenMeta.seenAt || 0) < 24 * 60 * 60 * 1000;
  };

  const updateStoryPreference = async (entry, action) => {
    if (!entry || entry.isSelf || !entry.userId) return;
    setStoryPreferenceSavingUserId(entry.userId);
    try {
      const { data } = await api.put('/users/statuses/preferences', {
        targetUserId: entry.userId,
        action,
      });
      setStoryPreferences({
        mutedStoryUsers: Array.isArray(data?.mutedStoryUsers) ? data.mutedStoryUsers : [],
        hiddenStoryUsers: Array.isArray(data?.hiddenStoryUsers) ? data.hiddenStoryUsers : [],
      });
    } catch (error) {
      console.error('Failed to update story preference:', error);
    } finally {
      setStoryPreferenceSavingUserId('');
    }
  };

  const openStoryForEntry = async (entry) => {
    if (!entry || !entry.userId) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (entry.isHidden) return;

    if (entry.isSelf && !entry.hasActiveStatus) {
      navigate('/profile');
      return;
    }

    setStoryLoadingUserId(entry.userId);
    try {
      let statusPayload = storyStatusCache?.[entry.userId] || null;

      if (!statusPayload?.statuses || statusPayload.statuses.length === 0) {
        let statuses = [];
        let userName = entry.username || 'User';

        if (entry.isSelf) {
          const { data } = await api.get('/users/statuses');
          statuses = normalizeActiveStatuses(data?.statuses || []);
          userName = user?.username || 'You';
        } else {
          const { data } = await api.get(`/users/statuses/user/${entry.userId}`);
          statuses = normalizeActiveStatuses(data?.statuses || []);
          userName = data?.username || userName;
        }

        statusPayload = {
          statuses,
          latestStatusAt: getLatestStatusAt(statuses),
          userName,
        };

        setStoryStatusCache((prev) => ({
          ...prev,
          [entry.userId]: statusPayload,
        }));
      }

      if (!statusPayload?.statuses?.length) {
        if (entry.isSelf) navigate('/profile');
        return;
      }

      markStoryAsSeen(entry.userId, statusPayload.latestStatusAt);

      setStoryViewerState({
        open: true,
        userId: entry.userId,
        userName: statusPayload.userName || entry.username || 'User',
        statuses: statusPayload.statuses,
        initialIndex: 0,
      });
    } catch (error) {
      console.error('Failed to open story:', error);
    } finally {
      setStoryLoadingUserId('');
    }
  };

  useEffect(() => {
    const calculateVisibleTags = () => {
      if (selectedTags.length > 0 && tagContainerRef.current && searchBarRef.current) {
        // Wait for DOM to render
        setTimeout(() => {
          const containerWidth = searchBarRef.current.offsetWidth - 16; // Subtract padding
          const tags = tagContainerRef.current.querySelectorAll('.tag-item');
          let totalWidth = 0;
          let count = 0;
          const plusButtonWidth = 60; // Estimated width for +N button
          
          tags.forEach((tag) => {
            const tagWidth = tag.offsetWidth + 8; // Include gap
            if (totalWidth + tagWidth + plusButtonWidth < containerWidth) {
              totalWidth += tagWidth;
              count++;
            }
          });
          
          // If all tags fit, show all
          if (count >= selectedTags.length) {
            setVisibleTagCount(selectedTags.length);
          } else {
            setVisibleTagCount(Math.max(1, count));
          }
        }, 50);
      }
    };
    
    calculateVisibleTags();
    window.addEventListener('resize', calculateVisibleTags);
    return () => window.removeEventListener('resize', calculateVisibleTags);
  }, [selectedTags]);

  const filteredBlogs = useMemo(() => {
    let allContent = [];
    
    if (contentFilter === 'all' || contentFilter === 'blogs') {
      allContent = [...allContent, ...blogs.map(b => ({ ...b, type: 'blog' }))];
    }
    if (contentFilter === 'all' || contentFilter === 'articles') {
      allContent = [...allContent, ...articles.map(a => ({ ...a, type: 'article' }))];
    }
    
    return allContent.filter(item => {
      if (selectedTags.length > 0) {
        const hasTags = selectedTags.some(tag => item.tags?.includes(tag));
        if (!hasTags) return false;
      }
      
      if (debouncedSearch.trim()) {
        const matchesSearch = item.title.toLowerCase().includes(debouncedSearch.toLowerCase());
        if (!matchesSearch) return false;
      }
      
      return true;
    }).sort((a, b) => {
      if (selectedTags.length > 0) {
        const aMatchCount = selectedTags.filter(tag => a.tags?.includes(tag)).length;
        const bMatchCount = selectedTags.filter(tag => b.tags?.includes(tag)).length;
        if (aMatchCount !== bMatchCount) return bMatchCount - aMatchCount;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [blogs, articles, selectedTags, debouncedSearch, contentFilter]);

  const allTags = [...new Set(blogs.flatMap(blog => blog.tags || []))];

  const getVideoTitle = (url) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('youtu.be') 
          ? url.split('youtu.be/')[1]?.split('?')[0]
          : new URL(url).searchParams.get('v');
        return `YouTube ${videoId ? videoId.substring(0, 8) : ''}`;
      } else if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        return `Vimeo ${videoId || ''}`;
      } else {
        return 'Video';
      }
    } catch {
      return 'Video';
    }
  };

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-8 relative">
        <div className="absolute inset-0 opacity-20 dark:opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-red-300 dark:bg-red-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-orange-300 dark:bg-orange-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        <div className="text-center max-w-2xl relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-500 blur-3xl opacity-20 rounded-full"></div>
            <img 
              src="/image/failed_to_load.png" 
              alt="Failed to Load" 
              className="w-72 h-72 mx-auto mb-6 object-contain relative z-10 drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Failed to Load Content</h1>
          <p className="text-gray-600 mb-6 text-lg">
            {t('Unable to connect to the server. Please check your connection.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            {t('Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showTour && <ModernProductTour onComplete={() => setShowTour(false)} />}
      <ScrollToTop />
      
      <div className="lekhon-discover-page" style={{ minHeight:'100vh', background:'var(--background-primary)', paddingTop:'80px', paddingBottom:'60px' }}>
        <div className="lekhon-discover-shell" style={{ maxWidth:'1400px', margin:'0 auto', padding:'0 clamp(12px, 4vw, 24px)' }}>
          {/* Search Bar */}
          <div className="lekhon-discover-search" style={{ marginBottom:'clamp(28px, 5vw, 40px)', maxWidth:'600px' }}>
            <div style={{ position:'relative' }}>
              <FaSearch style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:'18px' }} />
              <input
                type="text"
                placeholder={t('Search articles, blogs, shorts...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width:'100%', padding:'14px 48px 14px 48px', background:'var(--surface-card)',
                  border:'1px solid var(--border-default)', borderRadius:'8px', color:'var(--text-primary)',
                  fontSize:'15px', outline:'none', transition:'border-color 200ms'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--art-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
                  <FaTimes size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="lekhon-discover-tabs" style={{ display:'flex', gap:'12px', marginBottom:'clamp(30px, 5vw, 48px)', flexWrap:'wrap' }}>
            {['all', 'articles', 'blogs', 'shorts'].map(filter => (
              <button
                key={filter}
                onClick={() => setContentFilter(filter)}
                style={{
                  fontFamily:'var(--font-primary)', fontSize:'12px', fontWeight:700, letterSpacing:'0.05em',
                  textTransform:'uppercase', padding:'10px 20px', borderRadius:'6px',
                  background: contentFilter === filter ? 'var(--art-accent)' : 'var(--surface-card)',
                  color: contentFilter === filter ? '#1c1812' : 'var(--text-secondary)',
                  border:'none', cursor:'pointer', transition:'all 200ms'
                }}
              >
                {t(filter.charAt(0).toUpperCase() + filter.slice(1))}
              </button>
            ))}
          </div>

          {/* Stories Tray */}
          {user && storyEntries.length > 0 && (
            <section style={{ marginBottom: 'clamp(28px, 5vw, 42px)' }}>
              <SectionHeader type="short" label="Stories" badge={storyEntries.length > 1 ? `${storyEntries.length - 1} active` : 'Create'} />
              <div
                style={{
                  display: 'flex',
                  gap: 'clamp(8px, 2.8vw, 14px)',
                  overflowX: 'auto',
                  paddingBottom: '10px',
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'x proximity',
                  touchAction: 'pan-x',
                }}
              >
                {storyEntries.map((entry) => {
                  const seen = isStorySeen(entry);
                  const hasActive = Boolean(entry.hasActiveStatus);
                  const isLoading = storyLoadingUserId === entry.userId;
                  const isMuted = Boolean(entry.isMuted);
                  const isHidden = Boolean(entry.isHidden);
                  const isSavingPreference = storyPreferenceSavingUserId === entry.userId;
                  const ringColor = !hasActive
                    ? 'var(--border-default)'
                    : isHidden
                      ? 'var(--border-subtle)'
                      : isMuted
                      ? 'var(--text-muted)'
                      : seen
                      ? 'var(--border-subtle)'
                      : 'var(--brand-primary)';

                  return (
                    <div
                      key={entry.userId}
                      style={{
                        minWidth: 'clamp(68px, 18vw, 90px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openStoryForEntry(entry)}
                        disabled={isLoading || isHidden}
                        style={{
                          width: 'clamp(58px, 15vw, 74px)',
                          height: 'clamp(58px, 15vw, 74px)',
                          borderRadius: '999px',
                          border: `2px ${hasActive ? 'solid' : 'dashed'} ${ringColor}`,
                          background: 'var(--surface-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isLoading ? 'wait' : isHidden ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.7 : isHidden ? 0.45 : isMuted ? 0.72 : 1,
                          transition: 'all 180ms ease',
                        }}
                        title={
                          isHidden
                            ? 'Story hidden. Unhide to view.'
                            : entry.isSelf && !hasActive
                              ? t('Add status')
                              : t('View status')
                        }
                      >
                        <Avatar
                          user={entry}
                          size={isCompactViewport ? 'sm' : 'md'}
                          className={isCompactViewport ? '!w-10 !h-10' : '!w-14 !h-14'}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(entry.isSelf ? '/profile' : `/user/${entry.userId}`)}
                        style={{
                          maxWidth: 'clamp(64px, 18vw, 90px)',
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          margin: 0,
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          fontSize: 'clamp(11px, 2.8vw, 12px)',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={entry.isSelf ? t('Go to profile') : t('Open profile')}
                      >
                        {entry.username}{isHidden ? ' (Hidden)' : isMuted ? ' (Muted)' : ''}
                      </button>

                      {!entry.isSelf && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                          <button
                            type="button"
                            disabled={isSavingPreference}
                            onClick={() => updateStoryPreference(entry, isMuted ? 'unmute' : 'mute')}
                            style={{
                              border: '1px solid var(--border-default)',
                              background: 'var(--surface-card)',
                              color: 'var(--text-secondary)',
                              borderRadius: '999px',
                              padding: '2px 6px',
                              fontSize: '10px',
                              cursor: isSavingPreference ? 'wait' : 'pointer',
                              opacity: isSavingPreference ? 0.7 : 1,
                            }}
                            title={isMuted ? 'Unmute stories' : 'Mute stories'}
                          >
                            {isMuted ? 'Unmute' : 'Mute'}
                          </button>
                          <button
                            type="button"
                            disabled={isSavingPreference}
                            onClick={() => updateStoryPreference(entry, isHidden ? 'unhide' : 'hide')}
                            style={{
                              border: '1px solid var(--border-default)',
                              background: 'var(--surface-card)',
                              color: 'var(--text-secondary)',
                              borderRadius: '999px',
                              padding: '2px 6px',
                              fontSize: '10px',
                              cursor: isSavingPreference ? 'wait' : 'pointer',
                              opacity: isSavingPreference ? 0.7 : 1,
                            }}
                            title={isHidden ? 'Unhide stories' : 'Hide stories'}
                          >
                            {isHidden ? 'Unhide' : 'Hide'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Content Sections */}
          {filteredBlogs.length === 0 && shortBlogs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--text-muted)' }}>
              <p style={{ fontSize:'18px' }}>{t('No content found matching your search.')}</p>
            </div>
          ) : (
            <>
              {(contentFilter === 'all' || contentFilter === 'articles') && (
                <section style={{ marginBottom:'60px' }}>
                  <SectionHeader type="article" label="Articles" badge="Premium" />
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap:'20px' }}>
                    {filteredBlogs.filter(b=>b.type==='article').map((article,i) => (
                      <ArticleCard key={article._id} article={article} index={i}
                        onLike={(id,likes) => setArticles(p => p.map(a=>a._id===id?{...a,likes}:a))}
                        onTagClick={tag => setSelectedTags(prev=>prev.includes(tag)?prev.filter(t=>t!==tag):[...prev,tag])} />
                    ))}
                  </div>
                </section>
              )}
              {(contentFilter === 'all' || contentFilter === 'blogs') && (
                <section style={{ marginBottom:'60px' }}>
                  <SectionHeader type="blog" label="Blogs" badge="Community" />
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap:'20px' }}>
                    {filteredBlogs.filter(b=>b.type==='blog').map((blog,i) => (
                      <BlogCard key={blog._id} blog={blog} index={i}
                        onLike={(id,likes) => setBlogs(p => p.map(b=>b._id===id?{...b,likes}:b))}
                        onTagClick={tag => setSelectedTags(prev=>prev.includes(tag)?prev.filter(t=>t!==tag):[...prev,tag])} />
                    ))}
                  </div>
                </section>
              )}
              {(contentFilter === 'all' || contentFilter === 'shorts') && shortBlogs.length > 0 && (
                <section style={{ marginBottom:'60px' }}>
                  <SectionHeader type="short" label="Shorts" badge="Trending" />
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap:'16px' }}>
                    {shortBlogs.slice(0,6).map((short,i) => (
                      <ShortPreviewCard key={short._id} short={short} index={i} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {storyViewerState.open && storyViewerState.statuses.length > 0 && (
        <StatusViewer
          statuses={storyViewerState.statuses}
          initialIndex={storyViewerState.initialIndex}
          userName={storyViewerState.userName}
          onClose={() =>
            setStoryViewerState((prev) => ({
              ...prev,
              open: false,
            }))
          }
        />
      )}
    </>
  );

};

export default Home;
