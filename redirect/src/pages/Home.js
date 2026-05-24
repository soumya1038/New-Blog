import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      
      <div style={{ minHeight:'100vh', background:'var(--background-primary)', paddingTop:'80px', paddingBottom:'60px' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'0 24px' }}>
          {/* Search Bar */}
          <div style={{ marginBottom:'40px', maxWidth:'600px' }}>
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
          <div style={{ display:'flex', gap:'12px', marginBottom:'48px', flexWrap:'wrap' }}>
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
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px' }}>
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
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px' }}>
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
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'16px' }}>
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
    </>
  );

};

export default Home;
