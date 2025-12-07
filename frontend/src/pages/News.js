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
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [currentChunk, setCurrentChunk] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const observerRef = useRef();
  const CHUNK_SIZE = 10;

  const categories = ['All', 'India', 'World', 'Business', 'Sports', 'Technology', 'Entertainment', 'Health', 'Esports'];

  useEffect(() => {
    fetchNews();
  }, [activeCategory]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % carouselNews.length);
    }, 3000);
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
    }, 60000);
    return () => clearInterval(timer);
  }, [lastRefresh]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const NEWSDATA_KEY = process.env.REACT_APP_CRICKET_API_KEY || 'pub_c9ede6d5b52347699fad876627f4fa80';
      const categoryMap = {
        'All': '',
        'India': '&country=in',
        'World': '&country=us,gb,au',
        'Business': '&category=business',
        'Sports': '&category=sports',
        'Technology': '&category=technology',
        'Entertainment': '&category=entertainment',
        'Health': '&category=health',
        'Esports': '&q=esports gaming tournament valorant csgo dota pubg bgmi'
      };
      
      const categoryParam = categoryMap[activeCategory] || '';
      const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&language=en${categoryParam}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'success' && data.results && data.results.length > 0) {
        const articles = data.results.map((article, index) => ({
          id: index,
          title: article.title,
          description: article.description || 'No description available',
          image: article.image_url || 'https://via.placeholder.com/400x250',
          source: article.source_id || 'News Source',
          publishedAt: article.pubDate,
          url: article.link,
          content: article.content,
          isExternal: true
        }));
        
        // Remove duplicates and limit to actual articles
        const uniqueArticles = articles.slice(0, Math.min(articles.length, 50));
        setCarouselNews(uniqueArticles.slice(0, Math.min(6, uniqueArticles.length)));
        setAllNews(uniqueArticles.slice(6));
        setDisplayedNews(uniqueArticles.slice(6, Math.min(6 + CHUNK_SIZE, uniqueArticles.length)));
        setCurrentChunk(1);
      } else {
        setPlaceholderNews();
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setPlaceholderNews();
    } finally {
      setLoading(false);
    }
  };

  const loadMoreNews = () => {
    const start = 6 + currentChunk * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const newChunk = allNews.slice(start, end);
    if (newChunk.length > 0) {
      setDisplayedNews(prev => [...prev, ...newChunk]);
      setCurrentChunk(prev => prev + 1);
    }
  };

  const setPlaceholderNews = () => {
    const mockNews = Array(20).fill(null).map((_, i) => ({
      id: `mock-${i}`,
      title: `Breaking News ${i + 1}: Latest Updates`,
      description: 'Stay tuned for the latest news updates. Refresh the page to try loading news again.',
      image: 'https://via.placeholder.com/400x250',
      source: 'News Source',
      publishedAt: new Date().toISOString(),
      url: '#',
      isExternal: true
    }));
    setCarouselNews(mockNews.slice(0, 6));
    setAllNews(mockNews.slice(6));
    setDisplayedNews(mockNews.slice(6, 6 + CHUNK_SIZE));
    setCurrentChunk(1);
  };

  const handleNewsClick = (newsItem) => {
    if (newsItem.isExternal) {
      window.open(newsItem.url, '_blank');
    } else {
      setSelectedNews(newsItem);
      setShowModal(true);
    }
  };

  const filteredNews = displayedNews.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderNewsLayout = () => {
    const layout = [];
    let index = 0;
    
    while (index < filteredNews.length) {
      const chunk = filteredNews.slice(index, index + 6);
      if (chunk.length === 0) break;
      
      layout.push(
        <div key={`grid-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {chunk.slice(0, 6).map((newsItem) => (
            <NewsCard key={newsItem.id} news={newsItem} onClick={() => handleNewsClick(newsItem)} />
          ))}
        </div>
      );
      
      index += 6;
      
      if (index < filteredNews.length) {
        const horizontalNews = filteredNews[index];
        layout.push(
          <div key={`horizontal-${index}`} onClick={() => handleNewsClick(horizontalNews)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition">
            <div className="md:flex">
              <div className="md:w-1/2 h-64">
                <img src={horizontalNews.image} alt={horizontalNews.title} className="w-full h-full object-cover" />
              </div>
              <div className="md:w-1/2 p-6 flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">{horizontalNews.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{horizontalNews.description}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">{horizontalNews.source}</p>
              </div>
            </div>
          </div>
        );
        index += 1;
      }
    }
    
    return layout;
  };

  const handleRefresh = () => {
    setShowRefresh(false);
    setLastRefresh(Date.now());
    fetchNews();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
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
                <div className="h-80 bg-gray-300 dark:bg-gray-600"></div>
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <ScrollToTop />
      <div className="container mx-auto px-4 py-6">
        {showRefresh && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
            <button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center gap-3 border border-blue-500"
            >
              <FaSync className="w-5 h-5" />
              <span className="font-semibold">Refresh News</span>
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Sidebar */}
          <div className={`lg:col-span-1 space-y-6 ${
            showWidgets ? 'fixed inset-0 bg-black/50 z-50 p-4 overflow-y-auto' : 'hidden lg:block'
          }`}>
            {showWidgets && (
              <button
                onClick={() => setShowWidgets(false)}
                className="lg:hidden fixed top-4 right-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2 rounded-full shadow-lg z-50"
              >
                ✕
              </button>
            )}
            {/* Search Header */}
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

            {/* Weather Widget */}
            <WeatherWidget />

            {/* Market Widget */}
            <MarketWidget />

            {/* Cricket Widget */}
            <CricketWidget />

            {/* Games Widget */}
            <GamesWidget />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Mobile Widget Button */}
            <div className="lg:hidden flex justify-start mb-4">
              <button
                onClick={() => setShowWidgets(!showWidgets)}
                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition shadow-md flex items-center gap-2"
              >
                <BsThreeDotsVertical className="w-5 h-5" />
                <span className="text-sm font-semibold">Widgets</span>
              </button>
            </div>

            {/* Category Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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
                <div className="relative h-64 md:h-96">
                  {carouselNews.map((item, idx) => (
                    <div key={item.id} onClick={() => handleNewsClick(item)}
                      className={`absolute inset-0 transition-opacity duration-1000 cursor-pointer ${
                        idx === carouselIndex ? 'opacity-100' : 'opacity-0'
                      }`}>
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{item.title}</h2>
                        <p className="text-gray-200 text-sm">{item.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {carouselNews.map((_, idx) => (
                    <button key={idx} onClick={() => setCarouselIndex(idx)}
                      className={`w-2 h-2 rounded-full transition ${
                        idx === carouselIndex ? 'bg-white w-8' : 'bg-white/50'
                      }`} />
                  ))}
                </div>
              </div>
            )}

            {/* News Layout */}
            <div className="space-y-6">
              {renderNewsLayout()}
            </div>

            {/* Infinite Scroll Trigger */}
            <div ref={observerRef} className="h-20 flex items-center justify-center">
              {displayedNews.length < allNews.length && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* News Modal */}
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
