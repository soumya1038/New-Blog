import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import socketService from '../services/socket';
import { AuthContext } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { FaHeart, FaComment, FaClock, FaEye, FaCalendar, FaArrowLeft, FaShare, FaEdit, FaTrash, FaTimes, FaFacebook, FaLinkedin, FaWhatsapp, FaEnvelope, FaLink } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { BiMenuAltRight } from 'react-icons/bi';
import { GoVerified } from 'react-icons/go';
import { TbBrandAmongUs } from 'react-icons/tb';
import toast, { Toaster } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import AudioControls from '../components/AudioControls';
import EnhancedComment from '../components/EnhancedComment';
import StatusViewer from '../components/StatusViewer';

const ArticleDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [replies, setReplies] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [deletingComment, setDeletingComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    console.log('ArticleDetails mounted, id:', id);
    fetchArticle();
    fetchComments();
    trackView();
  }, [id]);

  useEffect(() => {
    const handleNewComment = () => {
      fetchComments();
    };

    window.addEventListener('newComment', handleNewComment);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('comment:new', (data) => {
        if (data.blogId === id) {
          fetchComments();
        }
      });

      socket.on('comment:updated', (data) => {
        if (data.blogId === id) {
          fetchComments();
        }
      });

      socket.on('comment:deleted', (data) => {
        if (data.blogId === id) {
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
  }, [id]);

  const fetchArticle = async () => {
    try {
      console.log('Fetching article:', id);
      const { data } = await api.get(`/articles/${id}`);
      console.log('Article data:', data);
      setArticle(data.article);
      setLiked(data.article.likes?.some(like => like._id === user?._id));
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('Failed to load article');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await api.post(`/articles/${id}/view`);
    } catch (error) {
      console.error('View tracking failed');
    }
  };

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/comments/${id}?isArticle=true`);
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
      const { data } = await api.post(`/articles/${id}/like`);
      setArticle({ ...article, likes: data.likes, likeCount: data.likeCount });
      setLiked(data.liked);
      if (data.liked) toast.success('Article liked!');
    } catch (error) {
      toast.error('Failed to like article');
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const shareUrl = window.location.href;
  const shareTitle = article?.title || 'Check out this article';

  const handleReply = async (parentCommentId, content, replyToUserId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/comments/${id}?isArticle=true`, {
        content,
        parentComment: parentCommentId,
        replyTo: replyToUserId
      });

      setComments(prev => prev.map(comment =>
        comment._id === parentCommentId ?
          { ...comment, replyCount: (comment.replyCount || 0) + 1 } :
          comment
      ));

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
        comment._id === commentId ? { ...comment, likes: data.likes } : comment
      ));

      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply =>
            reply._id === commentId ? { ...reply, likes: data.likes } : reply
          );
        });
        return newReplies;
      });
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleHeartComment = async (commentId) => {
    if (!user || !article || user._id !== article.author._id) return;

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
    if (!user || !article || user._id !== article.author._id) return;

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
      const deletedComment = comments.find(c => c._id === commentId);
      const replyCount = deletedComment?.replyCount || 0;

      setComments(prev => prev.filter(c => c._id !== commentId));
      setReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].filter(reply => reply._id !== commentId);
        });
        return newReplies;
      });
      await fetchArticle();
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
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success('Link copied to clipboard!');
          setShowShareModal(false);
        } catch (err) {
          toast.error('Failed to copy link');
        }
        document.body.removeChild(textArea);
      }
    }
  ];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/articles/${id}`);
      toast.success('Article deleted successfully!');
      setTimeout(() => navigate(-1), 1000);
    } catch (error) {
      toast.error('Failed to delete article');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
          >
            <FaArrowLeft /> {t('Back')}
          </button>
        </div>
      </div>

      {/* Article Container */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <img 
              src={isDark ? '/image/article_logo_light.png' : '/image/article_logo_dark.png'} 
              alt="Article" 
              className="w-6 h-6" 
            />
            <span className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
              {t('Article')}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
            {article.title}
          </h1>

          {article.metaDescription && (
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {article.metaDescription}
            </p>
          )}

          {!article.metaDescription && article.content && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed italic border-l-4 border-green-500 pl-4">
              {article.content.substring(0, 200).replace(/[#*`]/g, '')}...
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <FaCalendar />
              <time>{new Date(article.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</time>
            </div>
            <div className="flex items-center gap-2">
              <FaClock />
              <span>{article.readingTime} {t('min read')}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaEye />
              <span>{article.views} {t('views')}</span>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {article.coverImage && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img 
              src={article.coverImage} 
              alt={article.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <AudioControls text={article.content} content={article.content} />
        <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
              blockquote: ({node, ...props}) => (
                <blockquote className="border-l-4 border-blue-600 pl-4 italic my-4 text-gray-600 dark:text-gray-400" {...props} />
              ),
              code: ({node, inline, ...props}) => 
                inline ? (
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props} />
                ) : (
                  <code className="block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto" {...props} />
                )
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {t('Topics')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Bar */}
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-6">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition ${
                liked ? 'text-red-600' : 'text-gray-600 dark:text-gray-400 hover:text-red-600'
              }`}
            >
              <FaHeart className={liked ? 'fill-current' : ''} size={20} />
              <span className="font-semibold">{article.likeCount || 0}</span>
            </button>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <FaComment size={20} />
              <span className="font-semibold">{article.commentCount || 0}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?._id === article.author._id && (
              <>
                <button
                  onClick={() => navigate(`/edit/${id}`)}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                >
                  <FaEdit size={18} />
                  <span className="font-semibold">{t('Edit')}</span>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition"
                >
                  <FaTrash size={18} />
                  <span className="font-semibold">{t('Delete')}</span>
                </button>
              </>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition"
            >
              <FaShare size={18} />
              <span className="font-semibold">{t('Share')}</span>
            </button>
          </div>
        </div>

        {/* Video Section */}
        {article.videoUrls && article.videoUrls.length > 0 && (
          <div className="mb-8">
            <div className="relative bg-black rounded-xl overflow-hidden group">
              <iframe
                src={`https://www.youtube.com/embed/${article.videoUrls[currentVideoIndex].includes('youtube.com') ? article.videoUrls[currentVideoIndex].split('v=')[1]?.split('&')[0] : article.videoUrls[currentVideoIndex].split('youtu.be/')[1]}`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {article.videoUrls.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentVideoIndex((prev) => (prev === 0 ? article.videoUrls.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <FaArrowLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentVideoIndex((prev) => (prev === article.videoUrls.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <FaArrowLeft size={20} className="rotate-180" />
                  </button>
                </>
              )}
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Video {currentVideoIndex + 1} of {article.videoUrls.length}
              </h3>
            </div>
          </div>
        )}

        {/* Author Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            {t('About the Author')}
          </h3>
          <div className="flex items-start gap-4">
            <Link to={`/user/${article.author._id}`}>
              <Avatar user={article.author} size="lg" />
            </Link>
            <div className="flex-1">
              <Link 
                to={`/user/${article.author._id}`}
                className="flex items-center gap-2 mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {article.author.username}
                </h4>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded font-semibold">
                  Author
                </span>
                {article.author.isGuest ? (
                  <TbBrandAmongUs className="text-purple-500" size={16} />
                ) : article.author.isVerified && (
                  <div className="bg-blue-600 rounded-full p-0.5">
                    <GoVerified className="text-white" size={12} />
                  </div>
                )}
              </Link>
              {article.author.bio && (
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {article.author.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('Comments')} ({comments.length})</h2>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition text-sm font-medium"
              >
                <BiMenuAltRight className="w-4 h-4" />
                {sortBy === 'newest' ? t('Newest First') : t('Most Engaging')}
              </button>
              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <button
                    onClick={() => { setSortBy('top'); setShowSortMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    {t('Most Engaging')}
                  </button>
                  <button
                    onClick={() => { setSortBy('newest'); setShowSortMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                  >
                    {t('Newest First')}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {user && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newComment.trim()) return;
              try {
                await api.post(`/comments/${id}?isArticle=true`, { content: newComment });
                setNewComment('');
                await fetchComments();
                await fetchArticle();
                toast.success('Comment added!');
              } catch (error) {
                toast.error('Failed to add comment');
              }
            }} className="mb-6">
              <div className="flex gap-3">
                <Avatar user={user} size="sm" />
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                    rows="3"
                    placeholder={t('Write a comment...')}
                  />
                  {newComment.trim() && (
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setNewComment('')}
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
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

          <div className="space-y-6">
            {sortedComments.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FaComment className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{t('No comments yet. Be the first to comment!')}</p>
              </div>
            ) : (
              sortedComments.map((comment) => (
                <EnhancedComment
                  key={comment._id}
                  comment={comment}
                  isOwner={user?._id === article?.author._id}
                  onReply={handleReply}
                  onLike={handleLikeComment}
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
                  showReplies={showReplies[comment._id]}
                  loadingReplies={loadingReplies[comment._id]}
                  deletingComment={deletingComment}
                  postOwner={article?.author}
                  showAuthorBadge={true}
                />
              ))
            )}
          </div>
        </div>
      </article>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Share this article')}</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">{t('Delete Article')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{t('Are you sure you want to delete this article? This action cannot be undone.')}</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t('Deleting...') : t('Delete')}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleDetails;
