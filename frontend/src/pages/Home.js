import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FaHeart, FaComment, FaClock, FaSearch, FaTimes, FaEye } from 'react-icons/fa';
import { GoVerified } from 'react-icons/go';
import { PiMonitorPlayDuotone } from 'react-icons/pi';
import { TbBrandBlogger, TbBrandAmongUs } from 'react-icons/tb';
import { MdOutlineSwitchAccessShortcutAdd } from 'react-icons/md';
import { AuthContext } from '../context/AuthContext';
import { BlogCardSkeleton } from '../components/SkeletonLoader';
import soundNotification from '../utils/soundNotifications';
import Avatar from '../components/Avatar';
import ModernProductTour from '../components/ModernProductTour';
import ShortBlogs from '../components/ShortBlogs';
import ScrollToTop from '../components/ScrollToTop';
import { useDebounce } from '../hooks/useDebounce';
import { apiCache } from '../utils/apiCache';

const Home = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [shortBlogs, setShortBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentFilter, setContentFilter] = useState('all');
  const [showShortBlogs, setShowShortBlogs] = useState(true);
  const [clickTimer, setClickTimer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [visibleTagCount, setVisibleTagCount] = useState(5);
  const [error, setError] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const searchBarRef = useRef(null);
  const tagContainerRef = useRef(null);
  const [showTour, setShowTour] = useState(false);
  
  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
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

  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  ];



  const getSvgPattern = (index) => {
    const patterns = [
      // Dots pattern - increased opacity
      `data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='3' fill='white' opacity='0.5'/%3E%3Ccircle cx='40' cy='25' r='4' fill='white' opacity='0.4'/%3E%3Ccircle cx='25' cy='45' r='2' fill='white' opacity='0.6'/%3E%3Ccircle cx='50' cy='50' r='3' fill='white' opacity='0.5'/%3E%3C/svg%3E`,
      // Waves pattern - increased opacity
      `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 30, 50 50 T 100 50' stroke='white' stroke-width='2' fill='none' opacity='0.4'/%3E%3Cpath d='M0 70 Q 25 50, 50 70 T 100 70' stroke='white' stroke-width='2' fill='none' opacity='0.35'/%3E%3C/svg%3E`,
      // Triangles pattern - increased opacity
      `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='10,10 20,30 0,30' fill='white' opacity='0.4'/%3E%3Cpolygon points='50,20 65,45 35,45' fill='white' opacity='0.35'/%3E%3Cpolygon points='60,60 75,80 45,80' fill='white' opacity='0.45'/%3E%3C/svg%3E`,
      // Circles pattern - increased opacity
      `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='15' cy='15' r='8' fill='none' stroke='white' stroke-width='2' opacity='0.4'/%3E%3Ccircle cx='55' cy='25' r='10' fill='none' stroke='white' stroke-width='2' opacity='0.35'/%3E%3Ccircle cx='30' cy='60' r='6' fill='none' stroke='white' stroke-width='2' opacity='0.45'/%3E%3C/svg%3E`,
      // Dashed lines pattern - increased opacity
      `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='20' x2='100' y2='20' stroke='white' stroke-width='2' stroke-dasharray='5,5' opacity='0.4'/%3E%3Cline x1='0' y1='50' x2='100' y2='50' stroke='white' stroke-width='2' stroke-dasharray='8,4' opacity='0.35'/%3E%3Cline x1='0' y1='80' x2='100' y2='80' stroke='white' stroke-width='2' stroke-dasharray='3,7' opacity='0.4'/%3E%3C/svg%3E`,
      // Abstract blobs pattern - increased opacity
      `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cellipse cx='20' cy='30' rx='15' ry='10' fill='white' opacity='0.35'/%3E%3Cellipse cx='70' cy='20' rx='12' ry='18' fill='white' opacity='0.4'/%3E%3Cellipse cx='50' cy='70' rx='20' ry='12' fill='white' opacity='0.38'/%3E%3C/svg%3E`,
      // Confetti pattern - increased opacity
      `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='15' width='8' height='3' fill='white' opacity='0.5' transform='rotate(45 14 16.5)'/%3E%3Crect x='50' y='25' width='6' height='3' fill='white' opacity='0.4' transform='rotate(-30 53 26.5)'/%3E%3Crect x='30' y='55' width='7' height='3' fill='white' opacity='0.45' transform='rotate(60 33.5 56.5)'/%3E%3Crect x='65' y='65' width='5' height='3' fill='white' opacity='0.4' transform='rotate(-45 67.5 66.5)'/%3E%3C/svg%3E`,
      // Grid pattern - increased opacity
      `data:image/svg+xml,%3Csvg width='50' height='50' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='25' x2='50' y2='25' stroke='white' stroke-width='1' opacity='0.35'/%3E%3Cline x1='25' y1='0' x2='25' y2='50' stroke='white' stroke-width='1' opacity='0.35'/%3E%3C/svg%3E`,
    ];
    return patterns[index % patterns.length];
  };

  const getBackgroundStyle = (blog, index) => {
    if (blog.coverImage) {
      return {
        backgroundImage: `url(${blog.coverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }

    // Random gradient + multiple layered patterns for non-image blogs
    const baseGradient = gradients[index % gradients.length];
    const pattern1 = getSvgPattern(index);
    const pattern2 = getSvgPattern((index + 3) % 8);
    const pattern3 = getSvgPattern((index + 5) % 8);
    return { 
      backgroundImage: `url("${pattern1}"), url("${pattern2}"), url("${pattern3}"), ${baseGradient}`,
      backgroundSize: 'auto, 120px, 80px, cover',
      backgroundPosition: 'center, top right, bottom left, center'
    };
  };

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">{t('Latest Blog Posts')}</h1>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <BlogCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
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
      
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 overflow-y-auto relative">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Welcome to Lekhon</h1>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setContentFilter('all')}
                className={`group relative px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 overflow-hidden ${
                  contentFilter === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md hover:scale-105'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${contentFilter === 'all' ? 'bg-white' : 'bg-blue-500'} transition-colors`}></span>
                  {t('All')}
                </span>
              </button>
              <button
                onClick={() => setContentFilter('blogs')}
                className={`group relative px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 overflow-hidden flex items-center gap-2 ${
                  contentFilter === 'blogs'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:shadow-md hover:scale-105'
                }`}
              >
                <TbBrandBlogger className={`w-5 h-5 ${contentFilter === 'blogs' ? '' : 'text-purple-600'}`} />
                {t('Blogs')}
              </button>
              <button
                onClick={() => setContentFilter('articles')}
                className={`group relative px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 overflow-hidden flex items-center gap-2 ${
                  contentFilter === 'articles'
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 hover:shadow-md hover:scale-105'
                }`}
              >
                <img src={contentFilter === 'articles' ? '/image/article_logo_light.png' : (isDark ? '/image/article_logo_light.png' : '/image/article_logo_dark.png')} alt="Article" className="w-5 h-5" />
                {t('Articles')}
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-96">
            <div className="search-bar relative group" ref={searchBarRef}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-xl opacity-0 group-hover:opacity-20 group-focus-within:opacity-25 transition-opacity duration-500"></div>
              <input
                type="text"
                placeholder={t('Search blogs...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="relative w-full px-5 py-3.5 pl-12 pr-12 border-2 border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-400/50 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 group-focus-within:scale-110 transition-all duration-300" size={20} />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 hover:rotate-90 transition-all duration-300"
                >
                  <FaTimes size={16} />
                </button>
              )}
            </div>
            
            {selectedTags.length > 0 && (
              <div 
                className="pt-2 px-2"
                ref={tagContainerRef}
              >
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedTags.map((tag, idx) => (
                    <div
                      key={idx}
                      className={`tag-item group relative bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-blue-700 transition flex items-center gap-2 ${
                        !showAllTags && idx >= visibleTagCount ? 'hidden' : ''
                      }`}
                      onClick={() => removeTag(tag)}
                    >
                      {tag}
                      <FaTimes className="opacity-0 group-hover:opacity-100 transition" size={10} />
                    </div>
                  ))}
                  {selectedTags.length > visibleTagCount && !showAllTags && (
                    <button
                      onClick={() => setShowAllTags(true)}
                      className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-400 transition"
                    >
                      +{selectedTags.length - visibleTagCount}
                    </button>
                  )}
                  {showAllTags && selectedTags.length > visibleTagCount && (
                    <button
                      onClick={() => setShowAllTags(false)}
                      className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-400 transition"
                    >
                      {t('Show less')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.slice(0, 3).map((blog, index) => (
            <div 
              key={blog._id} 
              className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 hover:rotate-1"
              onClick={() => handleCardClick(blog._id, blog.type)}
              onDoubleClick={(e) => handleCardDoubleClick(e, blog._id, blog.type)}
              style={getBackgroundStyle(blog, index)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10 group-hover:from-black/85 group-hover:via-black/40 transition-all duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500"></div>
              
              <div className="absolute top-4 right-4 z-20">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  {blog.type === 'article' ? (
                    <img src={isDark ? '/image/article_logo_light.png' : '/image/article_logo_dark.png'} alt="Article" className="w-5 h-5" />
                  ) : (
                    <TbBrandBlogger className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </div>
              
              <div className="relative z-10 p-6 min-h-[420px] flex flex-col justify-end">
                <div className="flex items-center gap-3 mb-3">
                  <Link 
                    to={`/user/${blog.author?._id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="border-2 border-white rounded-full hover:scale-110 hover:border-blue-400 transition-all duration-300"
                  >
                    <Avatar user={blog.author} size="sm" showStatusRing={true} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/user/${blog.author?._id}`} 
                      className="text-sm font-semibold hover:underline text-white flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate">{blog.author?.username}</span>
                      {(blog.author?.isGuest || blog.author?.role === 'guest') ? (
                        <TbBrandAmongUs className="text-purple-300 flex-shrink-0" size={14} title="Guest User" />
                      ) : blog.author?.isVerified && (
                        <div className="bg-blue-500 rounded-full p-0.5 flex items-center justify-center flex-shrink-0" title="Verified">
                          <GoVerified className="text-white" size={10} />
                        </div>
                      )}
                    </Link>
                    <span className="text-xs text-gray-300">{new Date(blog.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <h2 
                  className="text-2xl font-bold mb-3 line-clamp-2 text-white leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link to={blog.type === 'article' ? `/article/${blog._id}` : `/blog/${blog._id}`}>{blog.title}</Link>
                </h2>
                
                <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-200">
                  {blog.content.replace(/[#*_`]/g, '').substring(0, 120)}...
                </p>
                
                {blog.videoUrls && blog.videoUrls.length > 0 && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-red-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                      <PiMonitorPlayDuotone className="w-4 h-4" /> 
                      {blog.videoUrls[0] && getVideoTitle(blog.videoUrls[0])}{blog.videoUrls.length > 1 && ` +${blog.videoUrls.length - 1}`}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-200 mb-4">
                  <button
                    onClick={(e) => blog.type === 'article' ? handleArticleLike(e, blog._id) : handleLike(e, blog._id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      blog.likes?.includes(user?._id) ? 'text-red-400' : 'hover:text-red-400'
                    }`}
                  >
                    <FaHeart className={blog.likes?.includes(user?._id) ? 'fill-current' : ''} size={16} />
                    <span className="font-semibold">{blog.likes?.length || 0}</span>
                  </button>
                  <span className="flex items-center gap-1.5">
                    <FaClock size={14} />
                    <span>{blog.readingTime} {t('min')}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FaEye size={14} />
                    <span>{blog.views || 0}</span>
                  </span>
                </div>
                
                {blog.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {blog.tags.slice(0, 3).map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/40 hover:from-blue-500/50 hover:to-purple-500/50 hover:scale-110 hover:shadow-lg cursor-pointer transition-all duration-300"
                        onClick={(e) => handleTagClick(e, tag)}
                      >
                        #{tag}
                      </span>
                    ))}
                    {blog.tags.length > 3 && (
                      <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium border border-white/30">+{blog.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Short Blogs Section */}
        {showShortBlogs && (() => {
          const filteredShortBlogs = shortBlogs.filter(blog => {
            if (selectedTags.length > 0) {
              const hasTags = selectedTags.some(tag => blog.tags?.includes(tag));
              if (!hasTags) return false;
            }
            if (debouncedSearch.trim()) {
              const matchesSearch = 
                blog.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                blog.content.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                blog.tags?.some(tag => tag.toLowerCase().includes(debouncedSearch.toLowerCase()));
              if (!matchesSearch) return false;
            }
            return true;
          });
          
          return filteredShortBlogs.length > 0 ? (
            <div className="mt-12">
              <ShortBlogs blogs={filteredShortBlogs} onClose={() => setShowShortBlogs(false)} />
            </div>
          ) : null;
        })()}
        
        {/* Remaining Blogs */}
        {filteredBlogs.length > 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {filteredBlogs.slice(3).map((blog, index) => (
              <div 
                key={blog._id} 
                className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 hover:rotate-1"
                onClick={() => handleCardClick(blog._id, blog.type)}
                onDoubleClick={(e) => handleCardDoubleClick(e, blog._id, blog.type)}
                style={getBackgroundStyle(blog, index + 3)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10 group-hover:from-black/85 group-hover:via-black/40 transition-all duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500"></div>
                <div className="absolute top-4 right-4 z-20">
                  <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    {blog.type === 'article' ? (
                      <img src={isDark ? '/image/article_logo_light.png' : '/image/article_logo_dark.png'} alt="Article" className="w-5 h-5" />
                    ) : (
                      <TbBrandBlogger className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
                <div className="relative z-10 p-6 min-h-[420px] flex flex-col justify-end">
                  <div className="flex items-center gap-3 mb-3">
                    <Link 
                      to={`/user/${blog.author?._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="border-2 border-white rounded-full hover:scale-110 hover:border-blue-400 transition-all duration-300"
                    >
                      <Avatar user={blog.author} size="sm" showStatusRing={true} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/user/${blog.author?._id}`} 
                        className="text-sm font-semibold hover:underline text-white flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate">{blog.author?.username}</span>
                        {(blog.author?.isGuest || blog.author?.role === 'guest') ? (
                          <TbBrandAmongUs className="text-purple-300 flex-shrink-0" size={14} title="Guest User" />
                        ) : blog.author?.isVerified && (
                          <div className="bg-blue-500 rounded-full p-0.5 flex items-center justify-center flex-shrink-0" title="Verified">
                            <GoVerified className="text-white" size={10} />
                          </div>
                        )}
                      </Link>
                      <span className="text-xs text-gray-300">{new Date(blog.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <h2 
                    className="text-2xl font-bold mb-3 line-clamp-2 text-white leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link to={blog.type === 'article' ? `/article/${blog._id}` : `/blog/${blog._id}`}>{blog.title}</Link>
                  </h2>
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-200">
                    {blog.content.replace(/[#*_`]/g, '').substring(0, 120)}...
                  </p>
                  {blog.videoUrls && blog.videoUrls.length > 0 && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1.5 bg-red-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                        <PiMonitorPlayDuotone className="w-4 h-4" /> 
                        {blog.videoUrls[0] && getVideoTitle(blog.videoUrls[0])}{blog.videoUrls.length > 1 && ` +${blog.videoUrls.length - 1}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-200 mb-4">
                    <button
                      onClick={(e) => blog.type === 'article' ? handleArticleLike(e, blog._id) : handleLike(e, blog._id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        blog.likes?.includes(user?._id) ? 'text-red-400' : 'hover:text-red-400'
                      }`}
                    >
                      <FaHeart className={blog.likes?.includes(user?._id) ? 'fill-current' : ''} size={16} />
                      <span className="font-semibold">{blog.likes?.length || 0}</span>
                    </button>
                    <span className="flex items-center gap-1.5">
                      <FaClock size={14} />
                      <span>{blog.readingTime} {t('min')}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FaEye size={14} />
                      <span>{blog.views || 0}</span>
                    </span>
                  </div>
                  {blog.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {blog.tags.slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/40 hover:from-blue-500/50 hover:to-purple-500/50 hover:scale-110 hover:shadow-lg cursor-pointer transition-all duration-300"
                          onClick={(e) => handleTagClick(e, tag)}
                        >
                          #{tag}
                        </span>
                      ))}
                      {blog.tags.length > 3 && (
                        <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium border border-white/30">+{blog.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {filteredBlogs.length === 0 && blogs.length > 0 && (
          <div className="text-center text-gray-600 dark:text-gray-400 py-20">
            <p className="text-xl">{t('No blogs found matching your search.')}</p>
          </div>
        )}
        
        {blogs.length === 0 && (
          <div className="text-center text-gray-600 dark:text-gray-400 py-20">
            <p className="text-xl">{t('No blogs yet. Be the first to create one!')}</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default Home;
