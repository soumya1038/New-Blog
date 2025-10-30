import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { FaHeart, FaComment, FaClock, FaSearch, FaTimes } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { BlogCardSkeleton } from '../components/SkeletonLoader';
import soundNotification from '../utils/soundNotifications';
import Avatar from '../components/Avatar';
import ProductTour from '../components/ProductTour';

const Home = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clickTimer, setClickTimer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [visibleTagCount, setVisibleTagCount] = useState(5);
  const [error, setError] = useState(false);
  const searchBarRef = useRef(null);
  const tagContainerRef = useRef(null);
  const [showTour, setShowTour] = useState(false);
  
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
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data } = await api.get('/blogs');
      setBlogs(data.blogs);
      setError(false);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setError(true);
    } finally {
      setLoading(false);
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
      
      if (data.liked) {
        soundNotification.playLikeActionSound();
      }
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const handleCardClick = (blogId) => {
    if (clickTimer) clearTimeout(clickTimer);
    
    const timer = setTimeout(() => {
      navigate(`/blog/${blogId}`);
    }, 300);
    
    setClickTimer(timer);
  };

  const handleCardDoubleClick = (e, blogId) => {
    e.preventDefault();
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
    }
    handleLike(null, blogId);
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

  const filteredBlogs = blogs.filter(blog => {
    // If tags selected, blog must have at least one of those tags
    if (selectedTags.length > 0) {
      const hasTags = selectedTags.some(tag => blog.tags?.includes(tag));
      if (!hasTags) return false;
    }
    
    // If search term entered, blog title must match
    if (searchTerm.trim()) {
      const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Prioritize blogs that match selected tags
    if (selectedTags.length > 0) {
      const aMatchCount = selectedTags.filter(tag => a.tags?.includes(tag)).length;
      const bMatchCount = selectedTags.filter(tag => b.tags?.includes(tag)).length;
      if (aMatchCount !== bMatchCount) return bMatchCount - aMatchCount;
    }
    return 0;
  });

  const allTags = [...new Set(blogs.flatMap(blog => blog.tags || []))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">{t('Latest Blog Posts')}</h1>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <BlogCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-8">
        <div className="text-center max-w-2xl">
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
      {showTour && <ProductTour onComplete={() => setShowTour(false)} />}
      
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <h1 className="text-4xl font-bold text-gray-800">{t('Welcome to Modern Blog')}</h1>
          
          <div className="w-full md:w-96">
            <div className="search-bar relative" ref={searchBarRef}>
              <input
                type="text"
                placeholder={t('Search blogs...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog, index) => (
            <div 
              key={blog._id} 
              className="rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group relative border-4 border-white"
              onClick={() => handleCardClick(blog._id)}
              onDoubleClick={(e) => handleCardDoubleClick(e, blog._id)}
              style={getBackgroundStyle(blog, index)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 group-hover:from-black/90 group-hover:via-black/60 transition-all duration-300"></div>
              
              <div className="relative z-10 p-6 min-h-[400px] flex flex-col justify-end">
                <div className="w-[90%] mx-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Link 
                    to={`/user/${blog.author?._id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="border-2 border-white rounded-full hover:opacity-80 transition"
                  >
                    <Avatar user={blog.author} size="sm" />
                  </Link>
                  <Link 
                    to={`/user/${blog.author?._id}`} 
                    className="text-sm font-medium hover:underline text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {blog.author?.username}
                  </Link>
                  <span className="text-gray-300 text-sm">•</span>
                  <span className="text-sm text-gray-300">{new Date(blog.createdAt).toLocaleDateString()}</span>
                </div>
                
                <h2 
                  className="text-2xl font-bold mb-3 line-clamp-2 transition text-white drop-shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link to={`/blog/${blog._id}`}>{blog.title}</Link>
                </h2>
                
                <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-200">
                  {blog.content.replace(/[#*_`]/g, '').substring(0, 120)}...
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-200">
                  <button
                    onClick={(e) => handleLike(e, blog._id)}
                    className={`flex items-center gap-1 transition ${
                      blog.likes?.includes(user?._id) ? 'text-red-400' : 'hover:text-red-400'
                    }`}
                  >
                    <FaHeart className={blog.likes?.includes(user?._id) ? 'fill-current' : ''} /> {blog.likes?.length || 0}
                  </button>
                  <span className="flex items-center gap-1">
                    <FaClock /> {blog.readingTime} {t('min read')}
                  </span>
                </div>
                
                {blog.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {blog.tags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm border border-white/30 hover:bg-white/30 cursor-pointer transition"
                        onClick={(e) => handleTagClick(e, tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredBlogs.length === 0 && blogs.length > 0 && (
          <div className="text-center text-gray-600 py-20">
            <p className="text-xl">{t('No blogs found matching your search.')}</p>
          </div>
        )}
        
        {blogs.length === 0 && (
          <div className="text-center text-gray-600 py-20">
            <p className="text-xl">{t('No blogs yet. Be the first to create one!')}</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default Home;
