import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaSync } from 'react-icons/fa';
import { BsThreeDotsVertical } from 'react-icons/bs';
import WeatherWidget from '../components/widgets/WeatherWidget';
import MarketWidget from '../components/widgets/MarketWidget';
import CricketWidget from '../components/widgets/CricketWidget';
import GamesWidget from '../components/widgets/GamesWidget';
import NewsCard from '../components/NewsCard';
import NewsModal from '../components/NewsModal';
import ScrollToTop from '../components/ScrollToTop';
import { getSafeHttpUrl, getSafeImageUrl } from '../utils/safeMediaUrls';
import api from '../services/api';

const News = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [allNews, setAllNews] = useState([]);
  const [displayedNews, setDisplayedNews] = useState([]);
  const [carouselNews, setCarouselNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showWidgets, setShowWidgets] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [currentChunk, setCurrentChunk] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const observerRef = useRef();
  const CHUNK_SIZE = 12;

  const categories = ['All', 'India', 'World', 'Business', 'Sports', 'Technology', 'Entertainment', 'Health', 'Esports'];

  useEffect(() => {
    fetchNews();
  }, [activeCategory]);

  useEffect(() => {
    if (carouselNews.length === 0) return;
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % carouselNews.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselNews.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedNews.length < allNews.length) {
          loadMoreNews();
        }
      },
      { threshold: 0.5 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [displayedNews, allNews]);

  useEffect(() => {
    const timer = setInterval(() => {
      setShowRefresh(true);
    }, 120000);
    return () => clearInterval(timer);
  }, [lastRefresh]);

  const fetchNews = async () => {
    setLoading(true);
    setNewsError('');
    try {
      const { data } = await api.get('/widgets/news', {
        params: {
          category: activeCategory,
          limit: 50
        }
      });
      
      if (data?.success && data.articles?.length > 0) {
        const articles = data.articles;
        setCarouselNews(articles.slice(0, 5));
        setAllNews(articles);
        setDisplayedNews(articles.slice(0, CHUNK_SIZE));
        setCurrentChunk(1);
      } else {
        setNewsError('No news articles are available right now.');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsError('News could not be loaded right now.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreNews = () => {
    const start = currentChunk * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const newChunk = allNews.slice(start, end);
    if (newChunk.length > 0) {
      setDisplayedNews(prev => [...prev, ...newChunk]);
      setCurrentChunk(prev => prev + 1);
    }
  };

const handleNewsClick = (newsItem) => {
    const safeUrl = getSafeHttpUrl(newsItem.url);
    if (newsItem.isExternal && safeUrl) {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
    } else {
      setSelectedNews(newsItem);
      setShowModal(true);
    }
  };

  const filteredNews = displayedNews.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    setShowRefresh(false);
    setLastRefresh(Date.now());
    fetchNews();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 animate-pulse">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-4"></div>
                  <div className="h-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 animate-pulse">
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden animate-pulse">
                <div className="h-96 bg-gray-300 dark:bg-gray-600"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ScrollToTop />
      <div className="container mx-auto px-4 py-6">
        {showRefresh && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl shadow-2xl hover:shadow-blue-500/50 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center gap-3"
            >
              <FaSync className="w-5 h-5" />
              <span className="font-semibold">Fresh News Available</span>
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar */}
          <div className={`lg:col-span-1 space-y-6 ${
            showWidgets ? 'fixed inset-0 bg-black/50 z-50 p-4 overflow-y-auto' : 'hidden lg:block'
          }`}>
            {showWidgets && (
              <button
                onClick={() => setShowWidgets(false)}
                className="lg:hidden fixed top-4 right-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-3 rounded-full shadow-lg z-50 hover:scale-110 transition"
              >
                ✕
              </button>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search news..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <WeatherWidget />
            <MarketWidget />
            <CricketWidget />
            <GamesWidget />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="lg:hidden flex justify-start mb-4">
              <button
                onClick={() => setShowWidgets(!showWidgets)}
                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition shadow-md flex items-center gap-2"
              >
                <BsThreeDotsVertical className="w-5 h-5" />
                <span className="text-sm font-semibold">Widgets</span>
              </button>
            </div>

            {/* Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Carousel */}
            {carouselNews.length > 0 && (
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="relative h-80 md:h-96">
                  {carouselNews.map((item, idx) => (
                    <div key={item.id} onClick={() => handleNewsClick(item)}
                      className={`absolute inset-0 transition-opacity duration-1000 cursor-pointer ${
                        idx === carouselIndex ? 'opacity-100' : 'opacity-0'
                      }`}>
                      {getSafeImageUrl(item.image) ? (
                        <img src={getSafeImageUrl(item.image)} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-700 to-slate-900" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">{item.title}</h2>
                        <p className="text-gray-200 text-sm">{item.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {carouselNews.map((_, idx) => (
                    <button key={idx} onClick={() => setCarouselIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === carouselIndex ? 'bg-white w-8' : 'bg-white/50 w-2'
                      }`} />
                  ))}
                </div>
              </div>
            )}

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNews.map((newsItem) => (
                <NewsCard key={newsItem.id} news={newsItem} onClick={() => handleNewsClick(newsItem)} />
              ))}
            </div>

            {/* Load More */}
            <div ref={observerRef} className="h-20 flex items-center justify-center">
              {displayedNews.length < allNews.length && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              )}
            </div>

            {filteredNews.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  {newsError || 'No news found matching your search.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && selectedNews && (
        <NewsModal
          news={selectedNews}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default News;
