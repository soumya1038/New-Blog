import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import { FaHeart, FaComment, FaClock, FaEdit, FaTrash, FaArrowLeft, FaShare, FaRetweet, FaTimes, FaFacebook, FaTwitter, FaLinkedin, FaWhatsapp, FaEnvelope, FaLink, FaUserPlus, FaUserCheck } from 'react-icons/fa';
import { BlogDetailSkeleton } from '../components/SkeletonLoader';
import soundNotification from '../utils/soundNotifications';
import { BarLoader, ScaleLoader } from 'react-spinners';
import toast, { Toaster } from 'react-hot-toast';
import Avatar from '../components/Avatar';

const BlogDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchBlog();
    fetchComments();
  }, [id]);

  const fetchBlog = async () => {
    try {
      const { data } = await api.get(`/blogs/${id}`);
      setBlog(data.blog);
      setLiked(data.blog.likes?.some(like => like._id === user?._id));
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
      const { data } = await api.get(`/comments/${id}`);
      setComments(data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/blogs/${id}/like`);
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
      const { data } = await api.post(`/comments/${id}`, { content: newComment });
      setComments([data.comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/blogs/${id}`);
      navigate('/');
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
      icon: <FaTwitter className="text-2xl" />,
      color: 'bg-blue-400 hover:bg-blue-500',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <BlogDetailSkeleton />
        </div>
      </div>
    );
  }
  
  if (!blog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
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
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {t('Go to Home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <Toaster />
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
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
              <div className="flex-1 w-full">
                <h1 className="text-4xl font-bold mb-4 text-gray-800">{blog.title}</h1>
                <div className="flex items-center gap-3">
                  <Avatar user={blog.author} size="md" />
                  <div className="flex-1">
                    <Link to={`/user/${blog.author?._id}`} className="font-semibold text-gray-800 hover:text-blue-600">
                      {blog.author?.username}
                    </Link>
                    <p className="text-sm text-gray-500">{new Date(blog.createdAt).toLocaleDateString()}</p>
                  </div>
                  {user && user._id !== blog.author?._id && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`flex items-center gap-2 font-semibold transition ${
                        isFollowing 
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
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold">🔍 {t('View')}</span>
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
                    navigate(`/edit/${id}`);
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
            <button onClick={handleLike} className={`flex items-center gap-2 ${liked ? 'text-red-500' : 'hover:text-red-500'} transition`}>
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
              <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{t('Share this post')}</h3>
                  <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-gray-700">
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
          
          <div className="prose max-w-none mb-8">
            <ReactMarkdown>{blog.content}</ReactMarkdown>
          </div>
          
          <hr className="my-8" />
          
          <h2 id="comments-section" className="text-2xl font-bold mb-4">{t('Comments')} ({comments.length})</h2>
          
          {user && (
            <form onSubmit={handleComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder={t('Write a comment...')}
                required
              />
              <button
                type="submit"
                className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                {t('Add Comment')}
              </button>
            </form>
          )}
          
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment._id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar user={comment.author} size="sm" />
                  <span className="font-semibold">{comment.author?.username}</span>
                  <span className="text-sm text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </div>
            ))}
          </div>
          </div>
        </div>

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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🗑️ {t('Delete Blog')}</h3>
              <p className="text-gray-600 mb-6">
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
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogDetail;
