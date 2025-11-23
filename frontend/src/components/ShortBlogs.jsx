import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineSwitchAccessShortcutAdd } from 'react-icons/md';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FiEye } from 'react-icons/fi';
import { GrView } from 'react-icons/gr';

const ShortBlogs = ({ blogs = [], onClose }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e) => {
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY;
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener('wheel', handleWheel);
  }, []);
  
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
      `data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='3' fill='white' opacity='0.5'/%3E%3Ccircle cx='40' cy='25' r='4' fill='white' opacity='0.4'/%3E%3Ccircle cx='25' cy='45' r='2' fill='white' opacity='0.6'/%3E%3Ccircle cx='50' cy='50' r='3' fill='white' opacity='0.5'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 30, 50 50 T 100 50' stroke='white' stroke-width='2' fill='none' opacity='0.4'/%3E%3Cpath d='M0 70 Q 25 50, 50 70 T 100 70' stroke='white' stroke-width='2' fill='none' opacity='0.35'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='10,10 20,30 0,30' fill='white' opacity='0.4'/%3E%3Cpolygon points='50,20 65,45 35,45' fill='white' opacity='0.35'/%3E%3Cpolygon points='60,60 75,80 45,80' fill='white' opacity='0.45'/%3E%3C/svg%3E`,
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
    const baseGradient = gradients[index % gradients.length];
    const pattern = getSvgPattern(index);
    return { 
      backgroundImage: `url("${pattern}"), ${baseGradient}`,
      backgroundSize: 'auto, cover',
      backgroundPosition: 'center'
    };
  };

  const shortBlogsData = blogs.slice(0, 7);

  const handleCardClick = (blogId) => {
    navigate(`/short-blogs/${blogId}`);
  };

  const handleViewMore = () => {
    navigate('/short-blogs');
    setShowMenu(false);
  };

  if (shortBlogsData.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <MdOutlineSwitchAccessShortcutAdd className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Short Blogs</h2>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          >
            <BsThreeDotsVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <button
                onClick={handleViewMore}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
              >
                View More
              </button>
              <button
                onClick={() => { onClose?.(); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="grid grid-cols-2 sm:flex overflow-x-auto gap-3 sm:gap-4 pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {shortBlogsData.map((blog, index) => (
          <div
            key={blog._id}
            onClick={() => handleCardClick(blog._id)}
            className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group aspect-[9/16] sm:flex-shrink-0 h-72 sm:h-auto sm:w-48"
            style={getBackgroundStyle(blog, index)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50"></div>

            <div className="absolute inset-0 flex flex-col p-3">
              <h3 className="text-white text-sm font-bold line-clamp-2 mb-2">
                {blog.title}
              </h3>

              <div className="flex-1 overflow-hidden mb-2">
                <p className="text-white text-xs leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {blog.content}
                </p>
              </div>

              {blog.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 overflow-hidden max-h-6">
                  {blog.tags.map((tag, idx) => (
                    <span key={idx} className="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}

              {blog.metaDescription && (
                <p className="text-white/60 text-xs line-clamp-1 mb-2">
                  {blog.metaDescription}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-white/80">
                <GrView className="w-3 h-3" />
                <span className="text-xs font-medium">{blog.views || 0} Views</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShortBlogs;
