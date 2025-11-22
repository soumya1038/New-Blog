import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiX, FiChevronUp, FiChevronDown, FiEye } from 'react-icons/fi';
import { AiOutlineLike, AiFillLike } from 'react-icons/ai';
import { TfiCommentAlt } from 'react-icons/tfi';
import { IoIosShareAlt } from 'react-icons/io';
import { BiRepost, BiMenuAltRight } from 'react-icons/bi';
import { IoClose } from 'react-icons/io5';
import { RxAvatar } from 'react-icons/rx';
import { CiEdit } from 'react-icons/ci';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { FaPlay, FaPause } from 'react-icons/fa6';
import { HiMiniSpeakerWave, HiMiniSpeakerXMark } from 'react-icons/hi2';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const ShortBlogsViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [blogs, setBlogs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({});
  const [showComments, setShowComments] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const utteranceRef = useRef(null);

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

  useEffect(() => {
    fetchShortBlogs();
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [])

  useEffect(() => {
    if (id && blogs.length > 0) {
      const index = blogs.findIndex(blog => blog._id === id);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [id, blogs]);

  useEffect(() => {
    if (blogs[currentIndex]) {
      trackView(blogs[currentIndex]._id);
    }
  }, [currentIndex, blogs]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.deltaY > 0 && currentIndex < blogs.length - 1) {
        handleNext();
      } else if (e.deltaY < 0 && currentIndex > 0) {
        handlePrev();
      }
    };
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentIndex, blogs.length]);

  const fetchShortBlogs = async () => {
    try {
      const { data } = await api.get('/blogs/short/all');
      setBlogs(data.blogs);
      
      if (user) {
        const followStatus = {};
        data.blogs.forEach(blog => {
          followStatus[blog.author._id] = user.following?.includes(blog.author._id);
        });
        setFollowing(followStatus);
      }
    } catch (error) {
      console.error('Error fetching short blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (blogId) => {
    try {
      await api.post(`/blogs/${blogId}/view`);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleLike = async (blogId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/blogs/${blogId}/like`);
      setBlogs(blogs.map(blog => 
        blog._id === blogId ? { ...blog, likes: data.likes } : blog
      ));
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const handleCardDoubleClick = () => {
    handleLike(currentBlog._id);
  };

  const handleTextToSpeech = () => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      const text = `${currentBlog.title}. ${currentBlog.content}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = isMuted ? 0 : volume;
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const handleStopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (utteranceRef.current) {
      utteranceRef.current.volume = !isMuted ? 0 : volume;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (utteranceRef.current && !isMuted) {
      utteranceRef.current.volume = newVolume;
    }
  };

  useEffect(() => {
    handleStopSpeech();
  }, [currentIndex]);

  const handleFollow = async (authorId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/social/follow/${authorId}`);
      setFollowing(prev => ({ ...prev, [authorId]: !prev[authorId] }));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleRepost = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const blog = blogs[currentIndex];
    navigate('/create', {
      state: {
        repostContent: blog.content,
        repostTitle: blog.title,
        repostTags: blog.tags?.join(', '),
        repostCategory: blog.category,
        isShortMode: true
      }
    });
  };

  const handleShare = async () => {
    const blog = blogs[currentIndex];
    const url = `${window.location.origin}/short-blogs/${blog._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: blog.title, url });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const fetchComments = async (blogId) => {
    try {
      const { data } = await api.get(`/comments/${blogId}`);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleCommentClick = () => {
    setShowDescription(false);
    setShowComments(true);
    fetchComments(currentBlog._id);
  };

  const handleDescriptionClick = () => {
    setShowComments(false);
    setShowDescription(true);
  };

  const handleAddComment = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!commentText.trim()) return;
    
    try {
      await api.post(`/comments/${currentBlog._id}`, { content: commentText });
      setCommentText('');
      fetchComments(currentBlog._id);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return (b.likes?.length || 0) - (a.likes?.length || 0);
    }
  });

  const handleNext = () => {
    if (currentIndex < blogs.length - 1) {
      setCurrentIndex(currentIndex + 1);
      navigate(`/short-blogs/${blogs[currentIndex + 1]._id}`);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      navigate(`/short-blogs/${blogs[currentIndex - 1]._id}`);
    }
  };

  const handleEdit = () => {
    navigate(`/edit/${currentBlog._id}`);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/blogs/${currentBlog._id}`);
      setShowDeleteConfirm(false);
      if (blogs.length > 1) {
        const newBlogs = blogs.filter(b => b._id !== currentBlog._id);
        setBlogs(newBlogs);
        if (currentIndex >= newBlogs.length) {
          setCurrentIndex(newBlogs.length - 1);
        }
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert('Failed to delete blog');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-xl">No short blogs available</div>
      </div>
    );
  }

  const currentBlog = blogs[currentIndex];
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

  const isMobile = window.innerWidth < 768;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center gap-4 px-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
      >
        <FiX className="w-6 h-6 text-white" />
      </button>

      <div className="w-full max-w-[400px] aspect-[9/16] sm:h-[85vh] sm:w-auto sm:aspect-[9/16] md:h-[88vh] lg:h-[95vh] relative">
        <div
          onDoubleClick={handleCardDoubleClick}
          className="w-full h-full rounded-3xl overflow-hidden shadow-2xl relative"
          style={getBackgroundStyle(currentBlog, currentIndex)}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50"></div>

          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <button
              onClick={isSpeaking ? handleStopSpeech : handleTextToSpeech}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition backdrop-blur-sm"
            >
              {isSpeaking && !isPaused ? (
                <FaPause className="w-4 h-4 text-white" />
              ) : (
                <FaPlay className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={handleMuteToggle}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition backdrop-blur-sm"
            >
              {isMuted ? (
                <HiMiniSpeakerXMark className="w-5 h-5 text-white" />
              ) : (
                <HiMiniSpeakerWave className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%)`
              }}
            />
          </div>

          <div className="absolute inset-0 flex flex-col p-6 pt-16">
            <h2 className="text-white text-xl font-bold text-center mb-4">{currentBlog.title}</h2>
            
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <p className="text-white text-base leading-relaxed whitespace-pre-wrap text-center line-clamp-[15]">{currentBlog.content}</p>
            </div>
            
            {currentBlog.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {currentBlog.tags.map((tag, idx) => (
                  <span key={idx} className="bg-white/20 text-white text-sm px-3 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mb-3">
              <Link to={`/user/${currentBlog.author._id}`}>
                <Avatar user={currentBlog.author} size="md" className="border-2 border-white" />
              </Link>
              <div className="flex-1 flex items-center gap-2">
                <Link 
                  to={`/user/${currentBlog.author._id}`}
                  className="text-white font-semibold hover:underline"
                >
                  {currentBlog.author?.username}
                </Link>
                {user && user._id !== currentBlog.author._id && (
                  <button
                    onClick={() => handleFollow(currentBlog.author._id)}
                    className={`px-4 py-1.5 rounded-full font-semibold transition text-sm ${
                      following[currentBlog.author._id]
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    {following[currentBlog.author._id] ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {currentBlog.metaDescription && (
              <button
                onClick={handleDescriptionClick}
                className="text-white/70 text-xs text-center line-clamp-2 hover:underline cursor-pointer"
              >
                {currentBlog.metaDescription}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isMobile && (
        <div className="flex flex-col gap-6">
        {user && user._id === currentBlog.author._id && (
          <>
            <button
              onClick={handleEdit}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
            >
              <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                <CiEdit className="w-6 h-6" />
              </div>
              <span className="text-xs">Edit</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
            >
              <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                <RiDeleteBin6Line className="w-6 h-6" />
              </div>
              <span className="text-xs">Delete</span>
            </button>
          </>
        )}
        <button
          onClick={() => handleLike(currentBlog._id)}
          className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
        >
          <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
            {currentBlog.likes?.includes(user?._id) ? (
              <AiFillLike className="w-6 h-6" />
            ) : (
              <AiOutlineLike className="w-6 h-6" />
            )}
          </div>
          <span className="text-sm font-semibold">{currentBlog.likes?.length || 0}</span>
        </button>

        <button
          onClick={handleCommentClick}
          className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
        >
          <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
            <TfiCommentAlt className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold">{comments.length}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
        >
          <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
            <IoIosShareAlt className="w-6 h-6" />
          </div>
          <span className="text-xs">Share</span>
        </button>

        <button
          onClick={handleRepost}
          className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
        >
          <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
            <BiRepost className="w-7 h-7" />
          </div>
          <span className="text-xs">Repost</span>
        </button>

        <Link to={`/user/${currentBlog.author._id}`}>
          <Avatar user={currentBlog.author} size="md" className="border-2 border-white hover:scale-110 transition" />
        </Link>
      </div>
      )}

      {!isMobile && showDescription && (
        <div className="w-full max-w-md h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Description</h3>
            <button
              onClick={() => setShowDescription(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
            >
              <IoClose className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <p className="text-gray-700 dark:text-gray-300">{currentBlog.metaDescription}</p>
            </div>
            {currentBlog.tags?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {currentBlog.tags.map((tag, idx) => (
                    <span key={idx} className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <AiOutlineLike className="w-5 h-5" />
                <span>{currentBlog.likes?.length || 0} likes</span>
              </div>
              <div className="flex items-center gap-2">
                <FiEye className="w-5 h-5" />
                <span>{currentBlog.views || 0} views</span>
              </div>
              <div>
                <span>{new Date(currentBlog.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showComments && !isMobile && (
        <div className="w-full max-w-md h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Comments ({comments.length})
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                >
                  <BiMenuAltRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                    <button
                      onClick={() => { setSortBy('top'); setShowSortMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                    >
                      Top comments
                    </button>
                    <button
                      onClick={() => { setSortBy('newest'); setShowSortMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                    >
                      Newest First
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowComments(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
              >
                <IoClose className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sortedComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              sortedComments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <Avatar user={comment.author} size="sm" />
                  <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {comment.author?.username}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <button className="hover:text-blue-600">Like</button>
                      <button className="hover:text-blue-600">Reply</button>
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              {user ? (
                <Avatar user={user} size="sm" />
              ) : (
                <RxAvatar className="w-10 h-10 text-gray-400" />
              )}
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  rows={2}
                />
                {commentText.trim() && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setCommentText('')}
                      className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && showDescription && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col w-full max-w-md max-h-[80vh]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Description</h3>
              <button
                onClick={() => setShowDescription(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
              >
                <IoClose className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <p className="text-gray-700 dark:text-gray-300">{currentBlog.metaDescription}</p>
              </div>
              {currentBlog.tags?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentBlog.tags.map((tag, idx) => (
                      <span key={idx} className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <AiOutlineLike className="w-5 h-5" />
                  <span>{currentBlog.likes?.length || 0} likes</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiEye className="w-5 h-5" />
                  <span>{currentBlog.views || 0} views</span>
                </div>
                <div>
                  <span>{new Date(currentBlog.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && showComments && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col w-full max-w-md max-h-[80vh]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Comments ({comments.length})
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                  >
                    <BiMenuAltRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <button
                        onClick={() => { setSortBy('top'); setShowSortMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                      >
                        Top comments
                      </button>
                      <button
                        onClick={() => { setSortBy('newest'); setShowSortMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                      >
                        Newest First
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowComments(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                >
                  <IoClose className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {sortedComments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                sortedComments.map((comment) => (
                  <div key={comment._id} className="flex gap-3">
                    <Avatar user={comment.author} size="sm" />
                    <div className="flex-1">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          {comment.author?.username}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {comment.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <button className="hover:text-blue-600">Like</button>
                        <button className="hover:text-blue-600">Reply</button>
                        <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                {user ? (
                  <Avatar user={user} size="sm" />
                ) : (
                  <RxAvatar className="w-10 h-10 text-gray-400" />
                )}
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={2}
                  />
                  {commentText.trim() && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setCommentText('')}
                        className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddComment}
                        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <div className="absolute right-4 bottom-20 flex flex-col gap-4 z-10">
          {user && user._id === currentBlog.author._id && (
            <>
              <button
                onClick={handleEdit}
                className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
              >
                <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                  <CiEdit className="w-6 h-6" />
                </div>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
              >
                <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                  <RiDeleteBin6Line className="w-6 h-6" />
                </div>
              </button>
            </>
          )}
          <button
            onClick={() => handleLike(currentBlog._id)}
            className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
          >
            <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
              {currentBlog.likes?.includes(user?._id) ? (
                <AiFillLike className="w-6 h-6" />
              ) : (
                <AiOutlineLike className="w-6 h-6" />
              )}
            </div>
            <span className="text-sm font-semibold">{currentBlog.likes?.length || 0}</span>
          </button>

          <button
            onClick={handleCommentClick}
            className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
          >
            <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
              <TfiCommentAlt className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold">{comments.length}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
          >
            <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
              <IoIosShareAlt className="w-6 h-6" />
            </div>
          </button>

          <button
            onClick={handleRepost}
            className="flex flex-col items-center gap-1 text-white hover:scale-110 transition"
          >
            <div className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
              <BiRepost className="w-7 h-7" />
            </div>
          </button>

          <Link to={`/user/${currentBlog.author._id}`}>
            <Avatar user={currentBlog.author} size="md" className="border-2 border-white hover:scale-110 transition" />
          </Link>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">⚠️ Delete Short Blog</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this short blog? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`p-3 rounded-full transition ${
            currentIndex === 0
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          <FiChevronUp className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === blogs.length - 1}
          className={`p-3 rounded-full transition ${
            currentIndex === blogs.length - 1
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          <FiChevronDown className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default ShortBlogsViewer;
