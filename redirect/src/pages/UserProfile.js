import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaCalendar, FaUsers, FaFileAlt, FaFacebook, FaInstagram, FaYoutube, FaGithub, FaLinkedin, FaGlobe, FaArrowLeft, FaEnvelope, FaUserPlus, FaUserMinus, FaShare, FaEye, FaComment, FaWhatsapp, FaHeart, FaLock, FaTimesCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { GoVerified, GoUnverified } from 'react-icons/go';
import { UserProfileSkeleton } from '../components/SkeletonLoader';
import Avatar from '../components/Avatar';
import StatusViewer from '../components/StatusViewer';
import GuestBadge from '../components/GuestBadge';
import toast, { Toaster } from 'react-hot-toast';

const UserProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [graphView, setGraphView] = useState('months');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [shorts, setShorts] = useState([]);
  const [contentTab, setContentTab] = useState('posts');
  const [error, setError] = useState(null);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');


  useEffect(() => {
    fetchUserProfile();
    fetchUserBlogs();
    fetchUserArticles();
    fetchUserShorts();
  }, [id, currentUser]);

  const fetchUserProfile = async () => {
    try {
      const { data } = await api.get(`/users/profile/${id}`);
      setProfile(data.user);
      setError(null);

      // Check if current user is following this profile
      if (currentUser && currentUser._id) {
        const following = data.user.followers?.some(f => {
          const followerId = typeof f === 'object' ? f._id : f;
          return followerId === currentUser._id;
        }) || false;
        setIsFollowing(following);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      if (error.response?.status === 404) {
        setError('not_found');
      } else if (error.response?.status === 401) {
        setError('unauthorized');
      } else {
        setError('unknown');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBlogs = async () => {
    try {
      const { data } = await api.get(`/blogs?author=${id}`);
      setBlogs(data.blogs);
    } catch (error) {
      console.error('Error fetching user blogs:', error);
    }
  };

  const fetchUserShorts = async () => {
    try {
      const { data } = await api.get(`/shorts?author=${id}`);
      setShorts(data.shorts || []);
    } catch (error) {
      console.error('Error fetching user shorts:', error);
      setShorts([]);
    }
  };

  const fetchUserArticles = async () => {
    try {
      const { data } = await api.get(`/articles?author=${id}`);
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching user articles:', error);
      setArticles([]);
    }
  };

  const getMonthsData = () => {
    const months = [];
    const now = new Date();
    const allContent = [...blogs, ...articles, ...shorts];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const month = date.getMonth();
      const count = allContent.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getMonth() === month && itemDate.getFullYear() === year;
      }).length;
      months.push({ label: monthName, count, year, month });
    }

    const maxCount = Math.max(...months.map(m => m.count), 1);
    return { data: months, maxCount };
  };

  const getWeeksData = (year, month) => {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const allContent = [...blogs, ...articles, ...shorts];

    let weekStart = new Date(firstDay);
    let weekNum = 1;

    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());

      const count = allContent.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= weekStart && itemDate <= weekEnd;
      }).length;

      weeks.push({
        label: `Week ${weekNum}`,
        count,
        start: new Date(weekStart),
        end: new Date(weekEnd)
      });

      weekStart.setDate(weekStart.getDate() + 7);
      weekNum++;
    }

    const maxCount = Math.max(...weeks.map(w => w.count), 1);
    return { data: weeks, maxCount };
  };

  const getDaysData = (startDate, endDate) => {
    const days = [];
    const current = new Date(startDate);
    const allContent = [...blogs, ...articles, ...shorts];

    while (current <= endDate) {
      const dayLabel = current.toLocaleDateString('en-US', { weekday: 'short' });
      const count = allContent.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate.toDateString() === current.toDateString();
      }).length;

      days.push({ label: dayLabel, count, date: new Date(current) });
      current.setDate(current.getDate() + 1);
    }

    const maxCount = Math.max(...days.map(d => d.count), 1);
    return { data: days, maxCount };
  };

  const handleBarClick = (item) => {
    if (graphView === 'months') {
      setSelectedMonth(item);
      setSelectedDay(null);
      setGraphView('weeks');
    } else if (graphView === 'weeks') {
      setSelectedWeek(item);
      setSelectedDay(null);
      setGraphView('days');
    } else if (graphView === 'days') {
      setSelectedDay(item.date);
    }
  };

  const handleBackClick = () => {
    if (graphView === 'days') {
      setGraphView('weeks');
      setSelectedWeek(null);
      setSelectedDay(null);
    } else if (graphView === 'weeks') {
      setGraphView('months');
      setSelectedMonth(null);
      setSelectedDay(null);
    }
  };

  const getFilteredBlogs = () => {
    if (!selectedDay) return blogs;
    return blogs.filter(blog => {
      const blogDate = new Date(blog.createdAt);
      return blogDate.toDateString() === selectedDay.toDateString();
    });
  };

  const getFilteredArticles = () => {
    if (!selectedDay) return articles;
    return articles.filter(article => {
      const articleDate = new Date(article.createdAt);
      return articleDate.toDateString() === selectedDay.toDateString();
    });
  };

  const getFilteredShorts = () => {
    if (!selectedDay) return shorts;
    return shorts.filter(short => {
      const shortDate = new Date(short.createdAt);
      return shortDate.toDateString() === selectedDay.toDateString();
    });
  };

  const getGraphData = () => {
    if (graphView === 'months') return getMonthsData();
    if (graphView === 'weeks' && selectedMonth) return getWeeksData(selectedMonth.year, selectedMonth.month);
    if (graphView === 'days' && selectedWeek) return getDaysData(selectedWeek.start, selectedWeek.end);
    return { data: [], maxCount: 1 };
  };

  const getContributionData = () => {
    const weeks = [];
    const months = [];
    const startDate = new Date(heatmapYear, 0, 1);
    const endDate = new Date(heatmapYear, 11, 31);
    const allContent = [...blogs, ...articles, ...shorts];

    const current = new Date(startDate);

    let week = [];
    let weekCount = 0;

    // Fill empty days at the start if year doesn't start on Sunday
    const startDay = startDate.getDay();
    for (let i = 0; i < startDay; i++) {
      week.push({ date: null, count: -1, isInYear: false });
    }

    // Track first week of each month
    const monthFirstWeek = {};

    while (current <= endDate) {
      const monthNum = current.getMonth();

      // Record the first week index for this month (only on the first day of the month)
      if (current.getDate() === 1) {
        monthFirstWeek[monthNum] = weekCount;
      }

      const dateStr = current.toDateString();
      const count = allContent.filter(item => {
        return new Date(item.createdAt).toDateString() === dateStr;
      }).length;

      week.push({ date: new Date(current), count, isInYear: true });

      if (week.length === 7) {
        weeks.push([...week]);
        week = [];
        weekCount++;
      }

      current.setDate(current.getDate() + 1);
    }

    // Fill remaining days in the last week
    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ date: null, count: -1, isInYear: false });
      }
      weeks.push(week);
    }

    // Create month labels from the tracked data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 12; i++) {
      if (monthFirstWeek.hasOwnProperty(i)) {
        months.push({ month: monthNames[i], weekIndex: monthFirstWeek[i] });
      }
    }

    return { weeks, months };
  };

  const getAvailableYears = () => {
    const allContent = [...blogs, ...articles, ...shorts];
    if (allContent.length === 0) return [new Date().getFullYear()];
    const years = new Set();
    allContent.forEach(item => {
      years.add(new Date(item.createdAt).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getHeatmapColor = (count, isInYear) => {
    if (!isInYear) return 'bg-transparent';
    if (count === 0) return 'bg-[var(--background-secondary)]';
    if (count === 1) return 'bg-green-200 dark:bg-green-800';
    if (count === 2) return 'bg-green-400 dark:bg-green-600';
    if (count >= 3) return 'bg-green-600 dark:bg-green-400';
    return 'bg-[var(--background-secondary)]';
  };

  const getSocialIcon = (name) => {
    if (!name) return <FaGlobe className="text-[var(--text-secondary)]" />;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('facebook')) return <FaFacebook className="text-blue-600" />;
    if (lowerName.includes('twitter') || lowerName.includes('x.com')) return <FaXTwitter className="text-sky-500" />;
    if (lowerName.includes('instagram')) return <FaInstagram className="text-pink-600" />;
    if (lowerName.includes('youtube')) return <FaYoutube className="text-red-600" />;
    if (lowerName.includes('github')) return <FaGithub className="text-[var(--text-primary)]" />;
    if (lowerName.includes('linkedin')) return <FaLinkedin className="text-blue-700" />;
    return <FaGlobe className="text-[var(--text-secondary)]" />;
  };

  const handleShare = async (post, type) => {
    const url = `${window.location.origin}/${type}/${post._id}`;
    setShareUrl(url);
    setShareTitle(post.title);
    setShowShareModal(true);
  };

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
      name: 'Copy Link',
      icon: <FaGlobe className="text-2xl" />,
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

  if (loading) {
    return (
      <div className="min-h-screen theme-page-bg py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <UserProfileSkeleton />
        </div>
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="min-h-screen theme-page-bg flex items-center justify-center px-4">
        <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <FaTimesCircle className="text-6xl mb-4 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('User Does Not Exist')}</h2>
          <p className="text-[var(--text-secondary)] mb-6">{t('This user does not exist or has been removed.')}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {t('Go to Home')}
          </button>
        </div>
      </div>
    );
  }

  // Unauthorized - need to login
  if (error === 'unauthorized') {
    return (
      <div className="min-h-screen theme-page-bg flex items-center justify-center px-4">
        <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <FaLock className="text-6xl mb-4 text-blue-500 mx-auto" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('Login Required')}</h2>
          <p className="text-[var(--text-secondary)] mb-6">{t('Please login to view user profiles.')}</p>
          <button
            onClick={() => navigate('/login', { state: { from: `/user/${id}` } })}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {t('Go to Login')}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen theme-page-bg flex items-center justify-center px-4">
        <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <FaExclamationTriangle className="text-6xl mb-4 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('Something Went Wrong')}</h2>
          <p className="text-[var(--text-secondary)] mb-6">{t('Unable to load user profile.')}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {t('Go to Home')}
          </button>
        </div>
      </div>
    );
  }

return (
  <div className="min-h-screen theme-page-bg py-8">
    <Toaster />
    <div className="container mx-auto px-4 max-w-6xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-4 font-semibold text-[var(--brand-primary)] hover:opacity-80 transition"
      >
        <FaArrowLeft /> {t('Back')}
      </button>
      {/* Profile Header */}
      <div className="theme-panel rounded-3xl shadow-xl p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div
            onClick={() => {
              // Only show full-size image when clicking avatar
              if (profile.profileImage) {
                setShowImageModal(true);
              }
            }}
            className={`border-4 rounded-full ${profile.hasActiveStatus ? 'border-green-500' : 'border-blue-500'
              } ${profile.profileImage ? 'cursor-pointer hover:opacity-90 transition' : ''
              }`}
          >
            <Avatar user={profile} size="xl" showStatusRing={false} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1
              className={`text-3xl font-bold mb-2 flex items-center gap-2 ${profile.hasActiveStatus
                ? 'animate-gradient cursor-pointer'
                : 'text-[var(--text-primary)]'
                }`}
              onClick={() => {
                // Allow status viewing for all logged-in users when clicking username
                if (profile.hasActiveStatus && profile.statuses?.length > 0) {
                  if (currentUser) {
                    setShowStatusViewer(true);
                  } else {
                    setShowLoginModal(true);
                  }
                }
              }}
            >
              {profile.username}
              {!profile.isGuest && profile.role !== 'guest' && (
                profile.isVerified ? (
                  <div className="bg-blue-600 rounded-full p-1 flex items-center justify-center" title="Verified">
                    <GoVerified className="text-white" size={22} />
                  </div>
                ) : (
                  currentUser && currentUser._id === profile._id && (
                    <GoUnverified className="text-[var(--text-muted)]" size={24} title="Not Verified" />
                  )
                )
              )}
              {(profile.isGuest || profile.role === 'guest') && <GuestBadge size="lg" />}
            </h1>
            {profile.fullName && <p className="text-lg text-[var(--text-secondary)] mb-3">{profile.fullName}</p>}
            {profile.description && <p className="text-[var(--text-secondary)] italic mb-3">{profile.description}</p>}
            {profile.bio && <p className="text-[var(--text-primary)] mb-4">{profile.bio}</p>}

            {/* Stats */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-6 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--brand-primary)]">{(blogs.length + articles.length + shorts.length) || 0}</p>
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1"><FaFileAlt /> {t('Posts')} ({blogs.length} blogs + {articles.length} articles + {shorts.length} shorts)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--brand-primary)]">{profile.followerCount || 0}</p>
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1"><FaUsers /> {t('Followers')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--brand-primary)]">{profile.followingCount || 0}</p>
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1"><FaUsers /> {t('Following')}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                  <FaCalendar /> {t('Member since')} {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Follow and Message Buttons - Only show for other users */}
            {currentUser && currentUser._id !== profile._id && (
              <div className="flex gap-3 mb-4">
                <button
                  onClick={async () => {
                    setFollowLoading(true);
                    try {
                      await api.post(`/social/follow/${profile._id}`);
                      setIsFollowing(!isFollowing);
                      setProfile(prev => ({
                        ...prev,
                        followerCount: isFollowing ? prev.followerCount - 1 : prev.followerCount + 1
                      }));
                    } catch (error) {
                      console.error('Error toggling follow:', error);
                    } finally {
                      setFollowLoading(false);
                    }
                  }}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition ${isFollowing
                    ? 'theme-soft-button'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {followLoading ? (
                    t('Loading...')
                  ) : isFollowing ? (
                    <><FaUserMinus /> {t('Unfollow')}</>
                  ) : (
                    <><FaUserPlus /> {t('Follow')}</>
                  )}
                </button>
                <button
                  onClick={() => navigate('/chat', { state: { selectedUser: profile } })}
                  className="flex items-center gap-2 px-6 py-2 theme-soft-button rounded-lg font-semibold transition"
                >
                  <FaEnvelope /> {t('Message')}
                </button>
              </div>
            )}

            {/* Social Media Links */}
            {profile.privacy?.showSocialLinks !== false && profile.socialMedia && profile.socialMedia.length > 0 && (
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {profile.socialMedia.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[var(--background-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] px-3 py-2 rounded-lg transition text-sm"
                    title={social.name || social.url}
                  >
                    <span className="text-xl">{getSocialIcon(social.name || social.url)}</span>
                    {social.name && <span>{social.name}</span>}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GitHub-style Contribution Heatmap */}
        {(blogs.length > 0 || articles.length > 0 || shorts.length > 0) && (
          <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('Post Activity')}</h3>
              <select
                value={heatmapYear}
                onChange={(e) => setHeatmapYear(Number(e.target.value))}
                className="text-xs border border-[var(--border-default)] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--background-secondary)] text-[var(--text-primary)]"
              >
                {getAvailableYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto overflow-y-hidden pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="inline-flex gap-0.5 min-w-max">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
                  <div className="h-2.5"></div>
                  <div className="w-6 h-2.5 text-[9px] text-[var(--text-secondary)] flex items-center">Mon</div>
                  <div className="w-6 h-2.5"></div>
                  <div className="w-6 h-2.5 text-[9px] text-[var(--text-secondary)] flex items-center">Wed</div>
                  <div className="w-6 h-2.5"></div>
                  <div className="w-6 h-2.5 text-[9px] text-[var(--text-secondary)] flex items-center">Fri</div>
                  <div className="w-6 h-2.5"></div>
                </div>

                {/* Heatmap grid */}
                <div className="flex-shrink-0">
                  {/* Month labels */}
                  <div className="relative h-3 mb-0.5">
                    {getContributionData().months.map((m, idx) => (
                      <div
                        key={idx}
                        className="text-[9px] text-[var(--text-secondary)] absolute"
                        style={{ left: `${m.weekIndex * 12}px` }}
                      >
                        {m.month}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-0.5">
                    {getContributionData().weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="flex flex-col gap-0.5">
                        {week.map((day, dayIndex) => (
                          <div
                            key={dayIndex}
                            className={`w-2.5 h-2.5 rounded-sm ${getHeatmapColor(day.count, day.isInYear)} ${day.isInYear && day.count > 0 ? 'hover:ring-1 hover:ring-blue-400 cursor-pointer' : ''
                              } transition group relative`}
                            title={day.isInYear ? `${day.date.toLocaleDateString()}: ${day.count} post${day.count !== 1 ? 's' : ''}` : ''}
                          >
                            {day.isInYear && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                                {day.date.toLocaleDateString()}: {day.count} post{day.count !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 md:hidden">Scroll horizontally to see full year</p>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--text-secondary)]">
              <span>{t('Less')}</span>
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 bg-[var(--background-secondary)] rounded-sm"></div>
                <div className="w-2.5 h-2.5 bg-green-200 rounded-sm"></div>
                <div className="w-2.5 h-2.5 bg-green-400 rounded-sm"></div>
                <div className="w-2.5 h-2.5 bg-green-600 rounded-sm"></div>
              </div>
              <span>{t('More')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Activity Graph */}
      {(blogs.length > 0 || articles.length > 0 || shorts.length > 0) && (
        <div className="theme-modal-card rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('Activity Overview')}</h2>
            {graphView !== 'months' && (
              <button
                onClick={handleBackClick}
                className="text-[var(--brand-primary)] hover:opacity-80 text-sm font-semibold"
              >
                {t('Back')} to {graphView === 'weeks' ? t('Months') : t('Weeks')}
              </button>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {graphView === 'months' && t('Click on a month to see weekly activity')}
            {graphView === 'weeks' && t('Click on a week to see daily activity')}
            {graphView === 'days' && t('Click on a day to filter blog posts below')}
          </p>
          <div className="flex items-end justify-between gap-2 sm:gap-4 h-48">
            {getGraphData().data.map((item, index) => {
              const height = (item.count / getGraphData().maxCount) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-2"
                  onClick={() => item.count > 0 && handleBarClick(item)}
                >
                  <div className="w-full flex flex-col justify-end h-40">
                    <div
                      className={`w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg transition-all relative group ${item.count > 0 ? 'cursor-pointer hover:opacity-80' : ''
                        } ${selectedDay && graphView === 'days' && item.date.toDateString() === selectedDay.toDateString() ? 'ring-2 ring-yellow-400' : ''
                        }`}
                      style={{ height: `${height}%`, minHeight: item.count > 0 ? '8px' : '0' }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                        {item.count} {t('Posts').toLowerCase()}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User's Blog Posts & Shorts */}
      <div className="theme-modal-card rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setContentTab('posts')}
              className={`text-xl font-bold transition ${contentTab === 'posts' ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              {t('Blog Posts')} ({blogs.length})
            </button>
            <button
              onClick={() => setContentTab('articles')}
              className={`text-xl font-bold transition ${contentTab === 'articles' ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              {t('Articles')} ({articles.length})
            </button>
            <button
              onClick={() => setContentTab('shorts')}
              className={`text-xl font-bold transition ${contentTab === 'shorts' ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              {t('Shorts')} ({shorts.length})
            </button>
          </div>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="text-sm text-[var(--brand-primary)] hover:opacity-80"
            >
              {t('Show All Posts')}
            </button>
          )}
        </div>
        {selectedDay && (
          <p className="text-sm text-[var(--text-secondary)] mb-4 bg-[var(--background-secondary)] border border-[var(--border-default)] p-3 rounded-lg">
            {t('Showing posts from')} {selectedDay.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}

        {contentTab === 'posts' ? (
          getFilteredBlogs().length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-8">
              {selectedDay ? t('No posts on this day') : t('No posts yet')}
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredBlogs().map(post => (
                <Link
                  key={post._id}
                  to={`/blog/${post._id}`}
                  className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-xl p-5 hover:shadow-lg hover:border-[var(--brand-primary)] transition flex flex-col"
                >
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-3">{post.content.substring(0, 150)}...</p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--brand-primary)] px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-[var(--text-secondary)] mb-2">{new Date(post.createdAt).toLocaleDateString()}</div>
                  <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] pt-3 border-t border-[var(--border-default)] mt-auto">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><FaEye size={14} /> {post.views || 0}</span>
                      <span className="flex items-center gap-1"><FaComment size={14} /> {post.commentCount || 0}</span>
                      <span className="flex items-center gap-1"><FaHeart className="text-rose-500" /> {post.likes?.length || 0}</span>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(post, 'blog'); }}
                      className="text-[var(--brand-primary)] hover:opacity-80 transition"
                    >
                      <FaShare size={14} />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : contentTab === 'articles' ? (
          getFilteredArticles().length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-8">
              {selectedDay ? t('No articles on this day') : t('No articles yet')}
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredArticles().map(article => (
                <Link
                  key={article._id}
                  to={`/article/${article._id}`}
                  className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-xl p-5 hover:shadow-lg hover:border-[var(--brand-primary)] transition flex flex-col"
                >
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-3">{article.content.substring(0, 150)}...</p>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {article.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--brand-primary)] px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-[var(--text-secondary)] mb-2">{new Date(article.createdAt).toLocaleDateString()}</div>
                  <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] pt-3 border-t border-[var(--border-default)] mt-auto">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><FaEye size={14} /> {article.views || 0}</span>
                      <span className="flex items-center gap-1"><FaComment size={14} /> {article.commentCount || 0}</span>
                      <span className="flex items-center gap-1"><FaHeart className="text-rose-500" /> {article.likes?.length || 0}</span>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(article, 'article'); }}
                      className="text-[var(--brand-primary)] hover:opacity-80 transition"
                    >
                      <FaShare size={14} />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          getFilteredShorts().length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-8">
              {selectedDay ? t('No shorts on this day') : t('No shorts yet')}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {getFilteredShorts().map((short, index) => {
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
                const getBackgroundStyle = (blog, idx) => {
                  if (blog.coverImage) {
                    return { backgroundImage: `url(${blog.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' };
                  }
                  return { backgroundImage: gradients[idx % gradients.length] };
                };
                return (
                  <Link
                    key={short._id}
                    to={`/shorts/${short._id}`}
                    className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer aspect-[9/16]"
                    style={getBackgroundStyle(short, index)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50"></div>
                    <div className="absolute inset-0 flex flex-col p-3">
                      <h3 className="text-white text-sm font-bold line-clamp-1 mb-2">{short.title}</h3>
                      <div className="flex-1 overflow-hidden mb-2">
                        <p className="text-white text-xs leading-relaxed whitespace-pre-wrap line-clamp-6">{short.content}</p>
                      </div>
                      {short.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2 overflow-hidden max-h-6">
                          {short.tags.map((tag, idx) => (
                            <span key={idx} className="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full">#{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-white/90 pt-2 border-t border-white/20 mt-auto">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1"><FaEye size={10} /> {short.views || 0}</span>
                          <span className="flex items-center gap-1"><FaComment size={10} /> {short.commentCount || 0}</span>
                          <span className="flex items-center gap-1"><FaHeart className="text-rose-500" /> {short.likes?.length || 0}</span>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(short, 'shorts'); }}
                          className="text-white hover:text-purple-300 transition"
                        >
                          <FaShare size={10} />
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Full Screen Image Modal */}
      {showImageModal && profile.profileImage && (
        <div
          className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition"
          >
            <FaTimes />
          </button>
          <img
            src={profile.profileImage}
            alt={profile.username}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Status Viewer */}
      {showStatusViewer && profile.statuses?.length > 0 && (
        <StatusViewer
          statuses={profile.statuses}
          onClose={() => setShowStatusViewer(false)}
          userName={profile.username}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">{t('Share this post')}</h3>
              <button onClick={() => setShowShareModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <FaTimes />
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

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <FaLock className="text-6xl mb-4 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('Login Required')}</h2>
            <p className="text-[var(--text-secondary)] mb-6">{t('Please login to view status posts.')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/login', { state: { from: `/user/${id}` } })}
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
    </div>
  </div>
);
};

export default UserProfile;

