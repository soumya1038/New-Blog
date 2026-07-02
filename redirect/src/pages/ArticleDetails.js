import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import socketService from '../services/socket';
import { AuthContext } from '../context/AuthContext';
import {
  FaArrowLeft,
  FaComment,
  FaEdit,
  FaEllipsisH,
  FaEnvelope,
  FaFacebook,
  FaFeatherAlt,
  FaGift,
  FaHeart,
  FaLink,
  FaLinkedin,
  FaRegBookmark,
  FaRegCalendarAlt,
  FaRegClock,
  FaRegCommentDots,
  FaRegFolderOpen,
  FaRegShareSquare,
  FaRegUser,
  FaTimes,
  FaTrash,
  FaWhatsapp,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { BiMenuAltRight } from 'react-icons/bi';
import { GoVerified } from 'react-icons/go';
import { TbBrandAmongUs } from 'react-icons/tb';
import toast, { Toaster } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import EnhancedComment from '../components/EnhancedComment';
import ArticleCard from '../components/ArticleCard';
import SEOHead from '../components/SEOHead';
import StatusViewer from '../components/StatusViewer';
import { bumpReplyCount, removeCommentFromReplyMap, updateCommentsById, updateReplyMapById } from '../utils/commentTree';
import TwoFactorVerificationModal from '../components/TwoFactorVerificationModal';
import SensitiveActionAuthModal from '../components/SensitiveActionAuthModal';
import {
  buildSensitiveActionHeaders,
  getTwoFactorRequirement,
  requestAuthenticatedTwoFactorChallenge,
  verifyAuthenticatedTwoFactorChallenge,
} from '../utils/twoFactorFlow';

const formatArticleDate = (value) => {
  if (!value) return 'Draft';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Draft';

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const estimateReadTime = (content = '') => {
  const wordCount = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 220));
};

const compactCount = (value = 0) => {
  const count = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    notation: count >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(count);
};

const stripInlineMarkdown = (value = '') =>
  String(value)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const splitArticleContent = (content = '') => {
  const sections = String(content)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(section => section.trim())
    .filter(Boolean);

  if (sections.length === 0) {
    return { lead: '', rest: '' };
  }

  const firstSectionLines = sections[0].split('\n').map(line => line.trim()).filter(Boolean);
  const firstLine = firstSectionLines[0] || '';
  const firstLineIsHeading = /^#{1,6}\s+/.test(firstLine) || /^introduction$/i.test(firstLine);
  let leadSource = sections[0];
  let restSections = sections.slice(1);

  if (firstLineIsHeading && firstSectionLines.length > 1) {
    leadSource = firstSectionLines.slice(1).join('\n');
  } else if (firstLineIsHeading && sections[1]) {
    leadSource = sections[1];
    restSections = sections.slice(2);
  }

  const lead = stripInlineMarkdown(leadSource || '');
  const rest = restSections.join('\n\n');

  return {
    lead,
    rest,
  };
};

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
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [replies, setReplies] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [deletingComment, setDeletingComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [moreByAuthor, setMoreByAuthor] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showAuthorStatusViewer, setShowAuthorStatusViewer] = useState(false);
  const [twoFactorPrompt, setTwoFactorPrompt] = useState(null);
  const [sensitiveAuthPrompt, setSensitiveAuthPrompt] = useState(false);
  const contentId = article?._id || id;

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
    if (article?.author?._id) {
      api.get(`/articles?author=${article.author._id}&limit=3`)
        .then(({ data }) => setMoreByAuthor(data.articles.filter(a => a._id !== article._id).slice(0, 3)));
    }
  }, [article]);

  useEffect(() => {
    // console.log('ArticleDetails mounted, id:', id);
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
        if (String(data.blogId) === String(id) || String(data.blogId) === String(article?._id)) {
          fetchComments();
        }
      });

      socket.on('comment:updated', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(article?._id)) {
          fetchComments();
        }
      });

      socket.on('comment:deleted', (data) => {
        if (String(data.blogId) === String(id) || String(data.blogId) === String(article?._id)) {
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
  }, [id, article?._id]);

  const fetchArticle = async () => {
    try {
      // console.log('Fetching article:', id);
      const { data } = await api.get(`/articles/${id}`);
      // console.log('Article data:', data);
      setArticle(data.article);
      setLiked(data.article.likes?.some(like => like._id === user?._id));

      if (data.redirect?.shouldRedirect && data.redirect?.to) {
        navigate(data.redirect.to, { replace: true });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast.error('Failed to load article');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await api.post(`/articles/${contentId}/view`);
    } catch (error) {
      console.error('View tracking failed');
    }
  };

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/comments/${contentId}?isArticle=true`);
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
      const { data } = await api.post(`/articles/${contentId}/like`);
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleBackToArticles = () => {
    navigate('/home?content=articles', { state: { contentFilter: 'articles' } });
  };

  const shareUrl = window.location.href;
  const shareTitle = article?.title || 'Check out this article';

  const handleReply = async (parentCommentId, content, replyToUserId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/comments/${contentId}?isArticle=true`, {
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

      setComments(prev => prev.filter(c => c._id !== commentId));
      setReplies(prev => removeCommentFromReplyMap(prev, commentId));
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

  const performDelete = async ({ sensitiveActionToken, twoFactorToken } = {}) => {
    await api.delete(`/articles/${contentId}`, {
      headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
      data: {
        ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
        ...(twoFactorToken ? { twoFactorToken } : {}),
      },
    });
    toast.success('Article deleted successfully!');
    setTimeout(() => navigate(-1), 1000);
  };

  const handleDelete = async () => {
    if (!['admin', 'coAdmin'].includes(user?.role)) {
      setShowDeleteModal(false);
      setSensitiveAuthPrompt(true);
      return;
    }

    setDeleting(true);
    try {
      await performDelete();
    } catch (error) {
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        setTwoFactorPrompt({
          ...requirement,
          onVerified: performDelete,
        });
        setShowDeleteModal(false);
        setDeleting(false);
        return;
      }
      toast.error('Failed to delete article');
      setDeleting(false);
    }
  };

  const handleTwoFactorVerified = async (token) => {
    const prompt = twoFactorPrompt;
    setTwoFactorPrompt(null);
    if (!prompt?.onVerified) return;
    setDeleting(true);
    try {
      await prompt.onVerified(token);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete article');
      setDeleting(false);
    }
  };

  const handleSensitiveAuthVerified = async (result) => {
    setSensitiveAuthPrompt(false);
    const sensitiveActionToken = result.sensitiveActionToken;
    if (result.requiresTwoFactor) {
      setTwoFactorPrompt({
        action: result.action || 'delete_article',
        actionLabel: result.actionLabel || 'delete this article',
        twoFactor: result.twoFactor,
        onVerified: async (twoFactorToken) => performDelete({ sensitiveActionToken, twoFactorToken }),
      });
      return;
    }

    setDeleting(true);
    try {
      await performDelete({ sensitiveActionToken });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete article');
      setDeleting(false);
    }
  };

  const handleDeleteForgotPassword = () => {
    setSensitiveAuthPrompt(false);
    navigate('/profile?forgotPassword=1');
  };

  const canonicalPath = typeof window !== 'undefined' ? window.location.pathname : `/article/${id}`;
  const seoTitle = article?.title || (loading ? 'Loading Article' : 'Article Not Found');
  const seoDescription = article?.metaDescription || '';
  const seoContent = article?.content || '';
  const seoImage = article?.coverImage || '/image/lekhon_url.png';
  const seoNoIndex = !loading && !article;
  const authorName = article?.author?.fullName || article?.author?.username || 'Editorial Desk';
  const articleCategory = article?.category || 'General';
  const articlePublishedDate = formatArticleDate(article?.publishedAt || article?.createdAt);
  const articleReadMinutes = article?.readingTime || article?.readTime || estimateReadTime(article?.content);
  const articleDescription = article?.metaDescription || article?.excerpt || article?.summary || '';
  const articleCoverImage = article?.coverImage || article?.image || article?.featuredImage || '/image/lekhon_url.png';
  const authorFollowerCount = article?.author?.followersCount || article?.author?.followers?.length || 0;
  const authorArticleCount = article?.author?.articleCount || article?.author?.articlesCount || (moreByAuthor.length + 1);
  const { lead: articleLead, rest: articleRest } = useMemo(
    () => splitArticleContent(article?.content || ''),
    [article?.content]
  );

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (!article) {
    return (
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        content={seoContent}
        canonicalUrl={canonicalPath}
        image={seoImage}
        type="article"
        noIndex={seoNoIndex}
      />
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
      <div className="article-detail-page-custom" style={{ minHeight: '100vh' }}>
        {/* Reading Progress Bar */}
        <div className="reading-progress"
          style={{ width:`${progress}%`, background:'linear-gradient(90deg, var(--article-accent), var(--article-accent-soft))' }} />
        <Toaster />
        
        <div className="article-detail-backbar-custom">
        <div className="article-detail-backinner-custom">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={handleBackToArticles}
              className="article-detail-backbutton-custom"
              aria-label={t('Back to all articles')}
            >
              <FaArrowLeft /> {t('Back to all articles')}
            </button>
          </div>
        </div>
      </div>

      <article className="article-detail-shell-custom relative">
        <section className="article-editorial-layout" aria-label={article.title}>
          <div className="article-editorial-top">
            <header className="article-editorial-head">
              <div className="article-editorial-logo-mark" aria-hidden="true">
                <img className="article-editorial-logo-dark" src="/image/article_logo_dark.png" alt="" />
                <img className="article-editorial-logo-light" src="/image/article_logo_light.png" alt="" />
              </div>
              <p className="article-editorial-kicker">
                Custom Layout <span>|</span> {articleCategory}
              </p>
              <h1 className="article-editorial-title">{article.title}</h1>
              {articleDescription && (
                <p className="article-editorial-deck">{articleDescription}</p>
              )}
              <div className="article-editorial-meta-strip" aria-label="Article summary">
                <span><FaFeatherAlt /> {article?.customTemplate?.name || article?.templateName || 'My Signature Layout 102'}</span>
                <span>By {authorName}</span>
                <span>{articlePublishedDate}</span>
                <span>{articleReadMinutes} min read</span>
              </div>
            </header>

            <aside className="article-editorial-meta-panel" aria-label="Article information">
              <dl className="article-editorial-meta-list">
                <div>
                  <dt><FaRegUser /> Author</dt>
                  <dd>{authorName}</dd>
                </div>
                <div>
                  <dt><FaRegCalendarAlt /> Published</dt>
                  <dd>{articlePublishedDate}</dd>
                </div>
                <div>
                  <dt><FaRegClock /> Read Time</dt>
                  <dd>{articleReadMinutes} min</dd>
                </div>
                <div>
                  <dt><FaRegFolderOpen /> Category</dt>
                  <dd><span className="article-editorial-category-pill">{articleCategory}</span></dd>
                </div>
              </dl>
              <div className="article-editorial-actions" aria-label="Article actions">
                <button type="button" aria-label={t('Save')}>
                  <FaRegBookmark />
                  <span>{t('Save')}</span>
                </button>
                <button type="button" aria-label={t('Gift')}>
                  <FaGift />
                  <span>{t('Gift')}</span>
                </button>
                <button type="button" onClick={handleCopyLink} aria-label={t('Copy link')}>
                  <FaLink />
                  <span>{t('Copy link')}</span>
                </button>
                <button type="button" onClick={handleShare} aria-label={t('More')}>
                  <FaEllipsisH />
                  <span>{t('More')}</span>
                </button>
              </div>
            </aside>

            <figure className="article-editorial-hero">
              <img src={articleCoverImage} alt={article.title} />
            </figure>
          </div>

          <div className="article-editorial-reader-grid">
            <aside className="article-editorial-engagement-rail" aria-label="Article engagement">
              <button
                type="button"
                onClick={handleLike}
                className={liked ? 'is-active' : ''}
                aria-label={liked ? t('Unlike article') : t('Like article')}
              >
                <FaHeart />
                <span>{compactCount(article.likeCount || article.likes?.length || 0)}</span>
              </button>
              <button type="button" aria-label={t('Comments')}>
                <FaRegCommentDots />
                <span>{compactCount(article.commentCount || comments.length)}</span>
              </button>
              <button type="button" aria-label={t('Save')}>
                <FaRegBookmark />
              </button>
              <button type="button" onClick={handleShare} aria-label={t('Share')}>
                <FaRegShareSquare />
              </button>
            </aside>

            <section className="article-editorial-body">
              {articleLead && <p className="article-editorial-lead">{articleLead}</p>}
              {articleRest && <ReactMarkdown>{articleRest}</ReactMarkdown>}
            </section>

            <aside className="article-editorial-author-panel" aria-label={t('About the Author')}>
              <div className="article-editorial-author-row">
                {article.author?.hasActiveStatus && article.author?.statuses?.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAuthorStatusViewer(true)}
                    className="article-editorial-author-avatar"
                    title={t('View author status')}
                  >
                    <Avatar user={article.author} size="lg" showStatusRing />
                  </button>
                ) : (
                  <Link to={`/user/${article.author?._id || ''}`} className="article-editorial-author-avatar">
                    <Avatar user={article.author} size="lg" showStatusRing />
                  </Link>
                )}
                <div>
                  <Link to={`/user/${article.author?._id || ''}`} className="article-editorial-author-name">
                    <span>{authorName}</span>
                    {article.author?.isGuest ? (
                      <TbBrandAmongUs className="article-editorial-author-guest" size={15} />
                    ) : article.author?.isVerified && (
                      <GoVerified className="article-editorial-author-verified" size={15} />
                    )}
                  </Link>
                  <p>{article.author?.roleLabel || article.author?.occupation || 'Writer & Researcher'}</p>
                </div>
              </div>
              <div className="article-editorial-author-stats">
                <span>{compactCount(authorFollowerCount)} followers</span>
                <span>{compactCount(authorArticleCount)} articles</span>
              </div>
              {article.author?.bio && (
                <p className="article-editorial-author-bio">{article.author.bio}</p>
              )}
              <Link to={`/user/${article.author?._id || ''}`} className="article-editorial-profile-link">
                {t('View full profile')} <span aria-hidden="true">-></span>
              </Link>
              {user?._id === article.author?._id && (
                <div className="article-editorial-owner-tools">
                  <button type="button" onClick={() => navigate(`/edit/${contentId}`)}>
                    <FaEdit /> {t('Edit')}
                  </button>
                  <button type="button" onClick={() => setShowDeleteModal(true)}>
                    <FaTrash /> {t('Delete')}
                  </button>
                </div>
              )}
            </aside>
          </div>
        </section>

        <div className="article-detail-afterword-custom">
        {moreByAuthor.length > 0 && (
          <section style={{ marginTop: 'var(--spacing-16)', marginBottom: 'var(--spacing-12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-6)' }}>
              <div style={{ width: '4px', height: '20px', background: 'var(--primary)' }} />
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--label-md)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--primary)',
                fontWeight: 700,
              }}>
                More from {article.author?.username}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-5)' }}>
              {moreByAuthor.map((a, i) => (
                <ArticleCard key={a._id} article={a} index={i} />
              ))}
            </div>
          </section>
        )}
        {showAuthorStatusViewer && article.author?.statuses?.length > 0 && (
          <StatusViewer
            statuses={article.author.statuses}
            initialIndex={0}
            onClose={() => setShowAuthorStatusViewer(false)}
            userName={article.author?.username || t('Author')}
          />
        )}

        <section className="article-comments-panel" aria-label={t('Comments')}>
          <div className="article-comments-header">
            <h2 className="article-comments-title">{t('Comments')} <span>({comments.length})</span></h2>
            <div className="article-comments-sort">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="article-comments-sort-button"
              >
                <BiMenuAltRight className="w-4 h-4" />
                {sortBy === 'newest' ? t('Newest First') : t('Most Engaging')}
              </button>
              {showSortMenu && (
                <div className="article-comments-sort-menu">
                  <button
                    onClick={() => { setSortBy('top'); setShowSortMenu(false); }}
                  >
                    {t('Most Engaging')}
                  </button>
                  <button
                    onClick={() => { setSortBy('newest'); setShowSortMenu(false); }}
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
                await api.post(`/comments/${contentId}?isArticle=true`, { content: newComment });
                setNewComment('');
                await fetchComments();
                await fetchArticle();
                toast.success('Comment added!');
              } catch (error) {
                toast.error('Failed to add comment');
              }
            }} className="article-comments-form">
              <div className="article-comments-compose">
                <Avatar user={user} size="sm" />
                <div className="article-comments-editor">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="article-comments-textarea"
                    rows="3"
                    placeholder={t('Write a comment...')}
                  />
                  {newComment.trim() && (
                    <div className="article-comments-form-actions">
                      <button
                        type="button"
                        onClick={() => setNewComment('')}
                        className="article-comments-soft-button"
                      >
                        {t('Cancel')}
                      </button>
                      <button
                        type="submit"
                        className="article-comments-primary-button"
                      >
                        {t('Add Comment')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}

          <div className="article-comments-list">
            {sortedComments.length === 0 ? (
              <div className="article-comments-empty">
                <FaComment />
                <p>{t('No comments yet. Be the first to comment!')}</p>
              </div>
            ) : (
              sortedComments.map((comment) => (
                <EnhancedComment
                  key={comment._id}
                  comment={comment}
                  isOwner={user?._id === article?.author._id}
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
                  postOwner={article?.author}
                  showAuthorBadge={true}
                />
              ))
            )}
          </div>
        </section>
        </div>
      </article>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('Share this article')}</h3>
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

      {/* Delete Confirmation Modal */}
        {showDeleteModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Delete Article')}</h3>
            <p className="text-[var(--text-secondary)] mb-6">{t('Are you sure you want to delete this article? This action cannot be undone.')}</p>
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
                className="flex-1 theme-soft-button px-6 py-2 rounded-lg disabled:opacity-50"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
        )}

      <TwoFactorVerificationModal
        open={Boolean(twoFactorPrompt)}
        action={twoFactorPrompt?.action}
        actionLabel={twoFactorPrompt?.actionLabel}
        twoFactor={twoFactorPrompt?.twoFactor}
        requestChallenge={requestAuthenticatedTwoFactorChallenge}
        verifyChallenge={verifyAuthenticatedTwoFactorChallenge}
        onVerified={handleTwoFactorVerified}
        onClose={() => setTwoFactorPrompt(null)}
      />

      <SensitiveActionAuthModal
        open={sensitiveAuthPrompt}
        action="delete_article"
        actionLabel="delete this article"
        title={t('Verify before deleting')}
        description={t('Confirm your password before this article is permanently deleted.')}
        onVerified={handleSensitiveAuthVerified}
        onForgotPassword={handleDeleteForgotPassword}
        onClose={() => setSensitiveAuthPrompt(false)}
      />
      </div>
    </>
  );
};

export default ArticleDetails;


