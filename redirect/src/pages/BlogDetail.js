import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import ReadingProgressBar from '../components/ReadingProgressBar';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import ReactMarkdown from 'react-markdown';
import { FaHeart, FaComment, FaClock, FaEdit, FaTrash, FaArrowLeft, FaShare, FaRetweet, FaTimes, FaFacebook, FaLinkedin, FaWhatsapp, FaEnvelope, FaLink, FaUserPlus, FaUserCheck, FaChevronLeft, FaChevronRight, FaEye, FaLock } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { GoVerified } from 'react-icons/go';
import { BiMenuAltRight } from 'react-icons/bi';
import { TbBrandAmongUs } from 'react-icons/tb';
import { BlogDetailSkeleton } from '../components/SkeletonLoader';
import soundNotification from '../utils/soundNotifications';
import { BarLoader, ScaleLoader } from 'react-spinners';
import toast, { Toaster } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import AudioControls from '../components/AudioControls';
import ScrollToTop from '../components/ScrollToTop';
import EnhancedComment from '../components/EnhancedComment';
import StatusViewer from '../components/StatusViewer';
import SEOHead from '../components/SEOHead';
import ProductTagOverlay from '../components/ProductTagOverlay';
import { bumpReplyCount, removeCommentFromReplyMap, updateCommentsById, updateReplyMapById } from '../utils/commentTree';

const BlogDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [replies, setReplies] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [deletingComment, setDeletingComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const contentId = blog?._id || id;

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    fetchBlog();
    fetchComments();
  }, [id]);

  useEffect(() => {
    const handleNewComment = () => {
      fetchComments();
    };

    window.addEventListener('newComment', handleNewComment);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('comment:new', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(blog?._id)) {
          fetchComments();
        }
      });

      socket.on('comment:updated', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(blog?._id)) {
          fetchComments();
        }
      });

      socket.on('comment:deleted', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(blog?._id)) {
          fetchComments();
        }
      });
    }

    return () => {
      window.removeEventListener('newComment', handleNewComment);
      if (socket) {
        socket.off('comment:new');
        socket.off('comment:updated');
        socket.off('comment:deleted');
      }
    };
  }, [id, blog?._id]);

  const fetchBlog = async () => {
    try {
      const { data } = await api.get(`/blogs/${id}`);
      setBlog(data.blog);
      setLiked(data.blog.likes?.some(like => like._id === user?._id));

      if (data.redirect?.shouldRedirect && data.redirect?.to) {
        navigate(data.redirect.to, { replace: true });
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (user && blog?.author?._id && blog.author._id !== user._id) {
      try {
        const { data } = await api.get('/users/profile');
        // following is populated with user objects, extract _id
        const followingIds = data.user.following?.map(f => typeof f === 'object' ? f._id : f) || [];
        setIsFollowing(followingIds.includes(blog.author._id));
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    }
  };

  useEffect(() => {
    if (blog && user) {
      checkFollowStatus();
    }
  }, [blog?.author?._id, user?._id]);

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/comments/${contentId}`);
      const commentsWithReplies = await Promise.all(data.comments.map(async (comment) => {
        const replyCount = await api.get(`/comments/${comment._id}/replies`).then(res => res.data.replies.length).catch(() => 0);
        return { ...comment, replyCount };
      }));
      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchReplies = async (commentId, keepOpen = false) => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
    try {
      const { data } = await api.get(`/comments/${commentId}/replies`);
      setReplies(prev => ({ ...prev, [commentId]: data.replies }));

      if (keepOpen) {
        setShowReplies(prev => ({ ...prev, [commentId]: true }));
      } else {
        setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/blogs/${contentId}/like`);
      setLiked(data.liked);
      setBlog({ ...blog, likeCount: data.likeCount });

      if (data.liked) {
        soundNotification.playLikeActionSound();
      }
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/comments/${contentId}`, { content: newComment });
      await fetchComments();
      setNewComment('');
      window.dispatchEvent(new CustomEvent('newComment'));
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReply = async (parentCommentId, content, replyToUserId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/comments/${contentId}`, {
        content,
        parentComment: parentCommentId,
        replyTo: replyToUserId
      });

      setComments(prev => updateCommentsById(prev, parentCommentId, comment => bumpReplyCount(comment, 1)));
      setReplies(prev => updateReplyMapById(prev, parentCommentId, comment => bumpReplyCount(comment, 1)));

      await fetchReplies(parentCommentId, true);
      window.dispatchEvent(new CustomEvent('newComment'));
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/comments/${commentId}/like`);

      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, likes: data.likes, dislikes: data.dislikes } : comment
      ));

      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, likes: data.likes, dislikes: data.dislikes } : reply
          );
        });
        return newReplies;
      });
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleDislikeComment = async (commentId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/comments/${commentId}/dislike`);

      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, likes: data.likes, dislikes: data.dislikes } : comment
      ));

      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, likes: data.likes, dislikes: data.dislikes } : reply
          );
        });
        return newReplies;
      });
    } catch (error) {
      console.error('Error disliking comment:', error);
    }
  };

  const handleHeartComment = async (commentId) => {
    if (!user || !blog || user._id !== blog.author._id) return;

    try {
      const { data } = await api.post(`/comments/${commentId}/heart`);
      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, isHearted: data.isHearted } : comment
      ));
      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, isHearted: data.isHearted } : reply
          );
        });
        return newReplies;
      });
    } catch (error) {
      console.error('Error hearting comment:', error);
    }
  };

  const handlePinComment = async (commentId) => {
    if (!user || !blog || user._id !== blog.author._id) return;

    try {
      const { data } = await api.post(`/comments/${commentId}/pin`);
      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, isPinned: data.isPinned } : comment
      ));
      fetchComments();
    } catch (error) {
      console.error('Error pinning comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingComment(commentId);
    try {
      await api.delete(`/comments/${commentId}`);

      setComments(prev => prev.filter(c => c._id !== commentId));
      setReplies(prev => removeCommentFromReplyMap(prev, commentId));
      window.dispatchEvent(new CustomEvent('newComment'));
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeletingComment(null);
    }
  };

  const handleEditComment = (commentId, currentText) => {
    setEditingComment(commentId);
    setEditText(currentText);
  };

  const handleSaveEdit = async (commentId) => {
    try {
      const { data } = await api.put(`/comments/${commentId}`, { content: editText });
      setComments(prev => prev.map(comment =>
        comment._id === commentId ? { ...comment, content: data.comment.content } : comment
      ));
      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, content: data.comment.content } : reply
          );
        });
        return newReplies;
      });
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/blogs/${contentId}`);
      navigate('/home');
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert('Failed to delete blog');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const shareUrl = window.location.href;
  const shareTitle = blog?.title || 'Check out this blog';

  const shareOptions = [
    {
      name: 'Facebook',
      icon: <FaFacebook className="text-2xl" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
    },
    {
      name: 'Twitter',
      icon: <FaXTwitter className="text-2xl" />,
      color: 'bg-black hover:bg-gray-800',
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank')
    },
    {
      name: 'LinkedIn',
      icon: <FaLinkedin className="text-2xl" />,
      color: 'bg-blue-700 hover:bg-blue-800',
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')
    },
    {
      name: 'WhatsApp',
      icon: <FaWhatsapp className="text-2xl" />,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, '_blank')
    },
    {
      name: 'Email',
      icon: <FaEnvelope className="text-2xl" />,
      color: 'bg-gray-600 hover:bg-gray-700',
      action: () => window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Copy Link',
      icon: <FaLink className="text-2xl" />,
      color: 'bg-gray-800 hover:bg-gray-900',
      action: () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast.success('Link copied to clipboard!');
          setShowShareModal(false);
        });
      }
    }
  ];

  const handleRepost = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/create', {
      state: {
        repostContent: blog.content,
        repostTitle: blog.title,
        repostTags: blog.tags?.join(', '),
        repostMetaDescription: blog.metaDescription,
        repostCategory: blog.category,
        repostCoverImage: blog.coverImage
      }
    });
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/social/follow/${blog.author._id}`);
      setIsFollowing(data.following);
      toast.success(data.following ? 'Following successfully!' : 'Unfollowed successfully!');
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow/unfollow');
    } finally {
      setFollowLoading(false);
    }
  };

  const scrollToComments = () => {
    const commentsSection = document.getElementById('comments-section');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sortedComments = useMemo(() => {
    const sorted = [...comments].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else {
        const aEngagement = (a.likes?.length || 0) + (a.replyCount || 0);
        const bEngagement = (b.likes?.length || 0) + (b.replyCount || 0);
        return bEngagement - aEngagement;
      }
    });
    return sorted;
  }, [comments, sortBy]);

  const canonicalPath = typeof window !== 'undefined' ? window.location.pathname : `/blog/${id}`;
  const seoTitle = blog?.title || (loading ? 'Loading Blog' : 'Blog Not Found');
  const seoDescription = blog?.metaDescription || '';
  const seoContent = blog?.content || '';
  const seoImage = blog?.coverImage || '/image/lekhon_url.png';
  const seoNoIndex = !loading && !blog;

  if (loading) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          content={seoContent}
          canonicalUrl={canonicalPath}
          image={seoImage}
          type="article"
        />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <BlogDetailSkeleton />
          </div>
        </div>
      </>
    );
  }

  if (!blog) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          content={seoContent}
          canonicalUrl={canonicalPath}
          image={seoImage}
          type="article"
          noIndex={seoNoIndex}
        />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="text-center">
            <img
              src="/image/failed_to_load.png"
              alt="Blog Not Found"
              className="w-64 h-64 mx-auto mb-6 object-contain"
            />
            <h1 className="text-4xl font-bold text-gray-800 mb-4">{t('Blog Not Found')}</h1>
            <p className="text-gray-600 mb-8 text-lg">
              {t('The blog you are looking for does not exist or has been removed.')}
            </p>
            <button
              onClick={() => navigate('/home')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {t('Go to Home')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        content={seoContent}
        canonicalUrl={canonicalPath}
        image={seoImage}
        type="article"
      />
      <div className="blog-surface min-h-screen py-8" style={{ minHeight:'100vh', background:'var(--blog-page-bg)' }}>
        {/* Reading Progress Bar */}
        <div className="reading-progress"
          style={{ width:`${progress}%`, background:'var(--blog-accent)' }} />
        <Toaster />
        <ScrollToTop />
        {editLoading && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <BarLoader color="#3B82F6" width="100%" height={4} />
          </div>
        )}
        <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 font-semibold"
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
              <div className="flex-1 w-full">
                <h1 className="blog-title mb-4" style={{
                  fontFamily: 'var(--blog-font-display)',
                  fontSize: 'clamp(26px, 3.5vw, 40px)',
                  fontWeight: 700,
                  color: 'var(--blog-text)',
                  lineHeight: 1.18,
                  letterSpacing: '-0.018em',
                  marginBottom: '16px',
                }}>{blog.title}</h1>
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => {
                      if (blog.author?.hasActiveStatus && blog.author?.statuses?.length > 0) {
                        if (user) {
                          setShowStatusViewer(true);
                        } else {
                          setShowLoginModal(true);
                        }
                      }
                    }}
                    className={blog.author?.hasActiveStatus ? 'cursor-pointer hover:opacity-80 transition' : ''}
                  >
                    <Avatar user={blog.author} size="md" showStatusRing={true} />
                  </div>
                  <div className="flex-1">
                    <Link to={`/user/${blog.author?._id}`} className="font-semibold text-gray-800 hover:text-blue-600 flex items-center gap-1">
                      {blog.author?.username}
                      {(blog.author?.isGuest || blog.author?.role === 'guest') ? (
                        <TbBrandAmongUs className="text-purple-500" size={16} title="Guest User" />
                      ) : blog.author?.isVerified && (
                        <div className="bg-blue-600 rounded-full p-0.5 flex items-center justify-center" title="Verified">
                          <GoVerified className="text-white flex-shrink-0" size={12} />
                        </div>
                      )}
                    </Link>
                    <p className="text-sm text-gray-500">{new Date(blog.createdAt).toLocaleDateString()}</p>
                  </div>
                  {user && user._id !== blog.author?._id && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`flex items-center gap-2 font-semibold transition ${isFollowing
                          ? 'text-gray-600 hover:text-gray-800'
                          : 'text-blue-600 hover:text-blue-800'
                        } disabled:opacity-50`}
                    >
                      {followLoading ? (
                        '...'
                      ) : isFollowing ? (
                        <>
                          <FaUserCheck /> {t('Following')}
                        </>
                      ) : (
                        <>
                          <FaUserPlus /> {t('Follow')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {blog.coverImage && (
                <div
                  onClick={() => setShowImageLightbox(true)}
                  className="flex-shrink-0 cursor-pointer group relative w-full sm:w-32 mt-4 sm:mt-0"
                >
                  <img
                    src={blog.coverImage}
                    alt={blog.title}
                    className="w-full sm:w-32 h-48 sm:h-32 object-cover rounded-lg shadow-md group-hover:shadow-xl transition-all"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold flex items-center gap-1">
                      <FaEye /> {t('View')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-6">
              <div></div>
              {user?._id === blog.author?._id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditLoading(true);
                      navigate(`/edit/${contentId}`);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaEdit size={20} />
                  </button>
                  <button onClick={() => setShowDeleteModal(true)} className="text-red-600 hover:text-red-800">
                    <FaTrash size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 mb-6 text-gray-600">
              <button onClick={handleLike} className={`flex items-center gap-2 transition`} style={{ color: liked ? 'var(--blog-like)' : 'var(--blog-muted)' }}>
                <FaHeart /> {blog.likeCount || 0}
              </button>
              <button onClick={scrollToComments} className="flex items-center gap-2 hover:text-blue-600 transition">
                <FaComment /> {blog.commentCount || 0}
              </button>
              <span className="flex items-center gap-2">
                <FaClock /> {blog.readingTime} {t('min read')}
              </span>
              {user?._id !== blog.author?._id && (
                <button onClick={handleRepost} className="flex items-center gap-2 hover:text-green-600 transition">
                  <FaRetweet /> {t('Repost')}
                </button>
              )}
              <button onClick={handleShare} className="flex items-center gap-2 hover:text-blue-600 transition">
                <FaShare /> {t('Share')}
              </button>
            </div>

            {/* Share Modal */}
            {showShareModal && (
              <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
                <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('Share this post')}</h3>
                    <button onClick={() => setShowShareModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <FaTimes size={24} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {shareOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={option.action}
                        className={`${option.color} text-white p-4 rounded-lg flex flex-col items-center gap-2 transition`}
                      >
                        {option.icon}
                        <span className="text-xs font-semibold">{option.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {blog.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {blog.tags.map((tag, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <ProductTagOverlay content={blog} />

            <AudioControls text={blog.content} content={blog.content} blogId={blog._id} />

            <div className="blog-content">
              <ReactMarkdown>{blog.content}</ReactMarkdown>
            </div>

            </div>

            {blog.videoUrls && blog.videoUrls.length > 0 && (
              <div className="mb-6">
                <div className="relative">
                  <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
                    <iframe
                      src={blog.videoUrls[currentVideoIndex].includes('youtube.com') || blog.videoUrls[currentVideoIndex].includes('youtu.be')
                        ? `https://www.youtube.com/embed/${blog.videoUrls[currentVideoIndex].includes('youtu.be') ? blog.videoUrls[currentVideoIndex].split('/').pop().split('?')[0] : new URLSearchParams(new URL(blog.videoUrls[currentVideoIndex]).search).get('v')}`
                        : blog.videoUrls[currentVideoIndex].includes('vimeo.com')
                          ? `https://player.vimeo.com/video/${blog.videoUrls[currentVideoIndex].split('vimeo.com/')[1]}`
                          : blog.videoUrls[currentVideoIndex]}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`Video ${currentVideoIndex + 1}`}
                    />
                  </div>
                  {blog.videoUrls.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentVideoIndex((prev) => (prev === 0 ? blog.videoUrls.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                      >
                        <FaChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentVideoIndex((prev) => (prev === blog.videoUrls.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                      >
                        <FaChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {blog.videoUrls.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentVideoIndex(index)}
                            className={`w-2 h-2 rounded-full transition ${
                              index === currentVideoIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {currentVideoIndex + 1} / {blog.videoUrls.length}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <hr className="my-8" />

            <div className="flex items-center justify-between mb-6">
              <h2 id="comments-section" className="text-2xl font-bold">{t('Comments')} ({comments.length})</h2>
              <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
                  >
                    <BiMenuAltRight className="w-4 h-4" />
                    {sortBy === 'newest' ? t('Newest First') : t('Most Engaging')}
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => { setSortBy('top'); setShowSortMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-t-lg"
                      >
                        {t('Most Engaging')}
                      </button>
                      <button
                        onClick={() => { setSortBy('newest'); setShowSortMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-b-lg"
                      >
                        {t('Newest First')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
          
          {user && (
              <form onSubmit={handleComment} className="mb-8">
                <div className="flex gap-3">
                  <Avatar user={user} size="sm" />
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows="3"
                      placeholder={t('Write a comment...')}
                      required
                    />
                    {newComment.trim() && (
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setNewComment('')}
                          className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                          {t('Cancel')}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          {t('Add Comment')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-6 pb-24 md:pb-8">
              {sortedComments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaComment className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">{t('No comments yet. Be the first to comment!')}</p>
                </div>
              ) : (
                sortedComments.map((comment) => (
                  <EnhancedComment
                    key={comment._id}
                    comment={comment}
                    isOwner={user?._id === blog?.author._id}
                    onReply={handleReply}
                    onLike={handleLikeComment}
                    onDislike={handleDislikeComment}
                    onHeart={handleHeartComment}
                    onPin={handlePinComment}
                    onDelete={handleDeleteComment}
                    onEdit={handleEditComment}
                    onSaveEdit={handleSaveEdit}
                    editingComment={editingComment}
                    editText={editText}
                    setEditText={setEditText}
                    onLoadReplies={fetchReplies}
                    replies={replies[comment._id] || []}
                    replyMap={replies}
                    showReplies={showReplies[comment._id]}
                    showRepliesMap={showReplies}
                    loadingReplies={loadingReplies[comment._id]}
                    loadingRepliesMap={loadingReplies}
                    deletingComment={deletingComment}
                    postOwner={blog?.author}
                    showAuthorBadge={true}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Status Viewer */}
        {showStatusViewer && blog.author?.statuses?.length > 0 && (
          <StatusViewer 
            statuses={blog.author.statuses} 
            onClose={() => setShowStatusViewer(false)}
            userName={blog.author.username}
          />
        )}

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
            <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
              <div className="text-6xl mb-4 flex justify-center text-blue-600">
                <FaLock />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('Login Required')}</h2>
              <p className="text-[var(--text-secondary)] mb-6">{t('Please login to view status posts.')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/login', { state: { from: `/blog/${id}` } })}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  {t('Login')}
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 theme-soft-button px-6 py-3 rounded-lg font-semibold transition"
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Lightbox */}
        {showImageLightbox && blog.coverImage && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setShowImageLightbox(false)}
          >
            <button
              onClick={() => setShowImageLightbox(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition"
            >
              <FaTimes size={32} />
            </button>
            <img
              src={blog.coverImage}
              alt={blog.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center p-4">
            <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <FaTrash className="text-red-600" /> {t('Delete Blog')}
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                {t('Are you sure you want to delete this blog? This action cannot be undone.')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <ScaleLoader color="#fff" height={20} width={3} /> : t('Yes, Delete')}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 theme-soft-button py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default BlogDetail;


