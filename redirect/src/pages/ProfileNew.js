import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaCamera, FaKey, FaTrash, FaEye, FaEyeSlash, FaCopy, FaPlus, FaEdit, FaTimes, FaArrowLeft, FaArrowRight, FaShare, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaFacebookF, FaGoogle, FaLinkedinIn, FaGithub, FaGlobe, FaVideo, FaMusic, FaRegSmile, FaShieldAlt, FaMobileAlt, FaTelegramPlane } from 'react-icons/fa';
import { PiBookOpenTextThin } from 'react-icons/pi';
import { FaXTwitter } from 'react-icons/fa6';
import { GoVerified, GoUnverified } from 'react-icons/go';
import { QRCodeSVG } from 'qrcode.react';
import AIBioGenerator from '../components/AIBioGenerator';
import Avatar from '../components/Avatar';
import GuestBadge from '../components/GuestBadge';
import { ScaleLoader, SyncLoader, BeatLoader, HashLoader } from 'react-spinners';
import ScrollToTop from '../components/ScrollToTop';
import ProfileCompleteness from '../components/ProfileCompleteness';
import ActivityStats from '../components/ActivityStats';
import QuickActions from '../components/QuickActions';
import PrivacySettings from '../components/PrivacySettings';
import EmailNotificationSettings from '../components/EmailNotificationSettings';
import Achievements from '../components/Achievements';
import QRCodeModal from '../components/QRCodeModal';
import StatusViewer from '../components/StatusViewer';
import TwoFactorVerificationModal from '../components/TwoFactorVerificationModal';
import SensitiveActionAuthModal from '../components/SensitiveActionAuthModal';
import SavedItemsModal from '../components/SavedItemsModal';
import { getOAuthRedirectUri } from '../utils/oauthRedirects';
import { isNativeApp } from '../utils/nativeApp';
import {
  buildSensitiveActionHeaders,
  buildTwoFactorHeaders,
  getSensitiveActionRequirement,
  getTwoFactorRequirement,
  requestAuthenticatedTwoFactorChallenge,
  verifyAuthenticatedTwoFactorChallenge,
} from '../utils/twoFactorFlow';
import useCompactProfileLayout from '../hooks/useCompactProfileLayout';
import useSavedItemsLibrary from '../hooks/useSavedItemsLibrary';
import ProfileOverviewMobile from './ProfileOverviewMobile';
import { authorizeWithTelegram, isTelegramAuthOrigin, TELEGRAM_AUTH_ORIGIN } from '../utils/telegramAuth';
import { clearAuthSession } from '../utils/authSession';

const STORY_STYLE_PRESETS = [
  {
    id: 'sunset',
    label: 'Sunset',
    backgroundColor: '#ea580c',
    textColor: '#fff7ed',
    fontFamily: 'Playfair Display',
    textAlign: 'center',
    textPosX: 50,
    textPosY: 50,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    backgroundColor: '#0f172a',
    textColor: '#67e8f9',
    fontFamily: 'Space Grotesk',
    textAlign: 'left',
    textPosX: 40,
    textPosY: 58,
  },
  {
    id: 'mint',
    label: 'Mint',
    backgroundColor: '#14532d',
    textColor: '#ecfdf5',
    fontFamily: 'DM Sans',
    textAlign: 'center',
    textPosX: 50,
    textPosY: 44,
  },
  {
    id: 'mono',
    label: 'Mono',
    backgroundColor: '#111827',
    textColor: '#f9fafb',
    fontFamily: 'Inter',
    textAlign: 'right',
    textPosX: 60,
    textPosY: 54,
  },
];

const STORY_STICKER_RECENT_STORAGE_KEY = 'lekhon_story_recent_stickers_v1';
const MAX_STATUS_STICKERS = 8;
const MAX_RECENT_STICKERS = 12;

const STORY_STICKER_GROUPS = [
  {
    id: 'popular',
    label: 'Popular',
    items: ['\u{1F525}', '\u{2728}', '\u{1F4AB}', '\u{1F496}', '\u{1F389}', '\u{1F680}', '\u{1F4A1}', '\u{2705}'],
  },
  {
    id: 'mood',
    label: 'Mood',
    items: ['\u{1F60E}', '\u{1F60A}', '\u{1F62E}', '\u{1F60D}', '\u{1F622}', '\u{1F970}', '\u{1F9E0}', '\u{1F44F}'],
  },
  {
    id: 'travel',
    label: 'Travel',
    items: ['\u{1F30D}', '\u{1F30A}', '\u{1F5FA}', '\u{1F3D6}', '\u{1F31E}', '\u{1F319}', '\u{1F6F8}', '\u{1F6F0}'],
  },
];

const STORY_MUSIC_SOURCE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'apple', label: 'Apple Music' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'custom', label: 'Custom' },
];

const STORY_MUSIC_PRESETS = [
  {
    id: 'night-drive',
    label: 'Night Drive',
    musicLabel: 'Night Drive - Ambient Edit',
    musicSourceType: 'spotify',
    musicSourceUrl: 'https://open.spotify.com/',
  },
  {
    id: 'focus-flow',
    label: 'Focus Flow',
    musicLabel: 'Focus Flow - Instrumental',
    musicSourceType: 'youtube',
    musicSourceUrl: 'https://www.youtube.com/',
  },
  {
    id: 'sunrise-notes',
    label: 'Sunrise Notes',
    musicLabel: 'Sunrise Notes - Acoustic',
    musicSourceType: 'apple',
    musicSourceUrl: 'https://music.apple.com/',
  },
];

const getProfileArray = (value) => (Array.isArray(value) ? value : []);
const getProfileWishlistItems = (data = {}) => getProfileArray(data.products || data.items || data.wishlist);

const PROFILE_SECTION_ICON_CLASS = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] text-[var(--brand-primary)]';

const clampStatusStickerSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 48;
  return Math.max(24, Math.min(96, Math.round(parsed)));
};

const clampStatusStickerRotate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(-60, Math.min(60, Math.round(parsed)));
};

const normalizeStatusStickerList = (stickers = []) =>
  Array.isArray(stickers)
    ? stickers
        .slice(0, MAX_STATUS_STICKERS)
        .map((sticker, index) => ({
          id: String(sticker?.id || `sticker-${Date.now()}-${index}`),
          emoji: String(sticker?.emoji || '').trim().slice(0, 8),
          x: Number.isFinite(Number(sticker?.x)) ? Math.max(0, Math.min(100, Number(sticker.x))) : 50,
          y: Number.isFinite(Number(sticker?.y)) ? Math.max(0, Math.min(100, Number(sticker.y))) : 50,
          size: clampStatusStickerSize(sticker?.size),
          rotate: clampStatusStickerRotate(sticker?.rotate),
        }))
        .filter((sticker) => sticker.emoji.length > 0)
    : [];

const normalizeRecentStickerList = (items = []) =>
  Array.isArray(items)
    ? items
        .map((item) => String(item || '').trim().slice(0, 8))
        .filter(Boolean)
        .slice(0, MAX_RECENT_STICKERS)
    : [];

const normalizeStoryMusicSourceType = (value) => {
  const nextValue = String(value || 'none').trim().toLowerCase();
  return STORY_MUSIC_SOURCE_OPTIONS.some((item) => item.value === nextValue) ? nextValue : 'none';
};

const normalizeStoryMusicSourceUrl = (value) => String(value || '').trim().slice(0, 240);

const clampStoryTrimValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(300, Number(parsed.toFixed(2))));
};

const normalizeStoryTrimRange = (startValue, endValue, durationValue) => {
  const maxClipDurationSec = 10;
  const duration = Number.isFinite(Number(durationValue)) ? Math.max(0, Number(durationValue)) : 0;
  const start = clampStoryTrimValue(startValue);
  const cappedStart = duration > 0 ? Math.min(start, Math.max(0, duration - 0.1)) : start;
  const maxAllowedEnd = duration > 0
    ? Math.min(duration, cappedStart + maxClipDurationSec)
    : cappedStart + maxClipDurationSec;
  const endCandidate = Number.isFinite(Number(endValue)) ? clampStoryTrimValue(endValue) : null;
  const cappedEnd = endCandidate !== null ? Math.min(endCandidate, maxAllowedEnd) : maxAllowedEnd;
  const end = cappedEnd > cappedStart ? Number(cappedEnd.toFixed(2)) : Number(maxAllowedEnd.toFixed(2));

  return {
    trimStartSec: Number(cappedStart.toFixed(2)),
    trimEndSec: end,
  };
};

export const ProfileLegacy = () => {
  const { t } = useTranslation();
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = React.useRef(null);
  const statusPreviewRef = React.useRef(null);

  // State
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '', dateOfBirth: '', bio: '', socialMedia: [] });
  const [blogs, setBlogs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDeleting, setImageDeleting] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [highlightTarget, setHighlightTarget] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPasswordSetupNotice, setShowPasswordSetupNotice] = useState(false);
  const [passwordDeliveryChannel, setPasswordDeliveryChannel] = useState('email');
  const [showTelegramDeliveryFailure, setShowTelegramDeliveryFailure] = useState(false);
  const [showSocialEmailNotice, setShowSocialEmailNotice] = useState(false);
  const [socialEmailSource, setSocialEmailSource] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
  const [showPasswordCodeModal, setShowPasswordCodeModal] = useState(false);
  const [passwordCode, setPasswordCode] = useState('');
  const [passwordCodeDelivery, setPasswordCodeDelivery] = useState('email');
  const [forgotPasswordValues, setForgotPasswordValues] = useState({ newPassword: '', confirmPassword: '' });
  const [sendingForgotPasswordCode, setSendingForgotPasswordCode] = useState(false);
  const [showForgotPasswordCodeModal, setShowForgotPasswordCodeModal] = useState(false);
  const [forgotPasswordCode, setForgotPasswordCode] = useState('');
  const [forgotPasswordCodeDelivery, setForgotPasswordCodeDelivery] = useState('email');
  const [confirmingForgotPassword, setConfirmingForgotPassword] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [authenticatorSetup, setAuthenticatorSetup] = useState(null);
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [smsSetupChallenge, setSmsSetupChallenge] = useState(null);
  const [smsCode, setSmsCode] = useState('');
  const [showSmsSetup, setShowSmsSetup] = useState(false);
  const [showTwoFactorSetupOptions, setShowTwoFactorSetupOptions] = useState(false);
  const [isTwoFactorExpanded, setIsTwoFactorExpanded] = useState(false);
  const [twoFactorPrompt, setTwoFactorPrompt] = useState(null);
  const [sensitiveAuthPrompt, setSensitiveAuthPrompt] = useState(null);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState({});
  const [showContactSection, setShowContactSection] = useState(false);
  const [contactForm, setContactForm] = useState({ issue: '', advice: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [deleteAttemptsRemaining, setDeleteAttemptsRemaining] = useState(5);
  const [sendingDeleteCode, setSendingDeleteCode] = useState(false);
  const [showDeleteCodeModal, setShowDeleteCodeModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteCodeDelivery, setDeleteCodeDelivery] = useState('email');
  const [verifyingDeleteCode, setVerifyingDeleteCode] = useState(false);
  const [showDeleteFinalConfirm, setShowDeleteFinalConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [cancellingDelete, setCancellingDelete] = useState(false);
  const [showDeleteMethodModal, setShowDeleteMethodModal] = useState(false);
  const [deleteVerificationMethods, setDeleteVerificationMethods] = useState([]);
  const [selectedDeleteMethod, setSelectedDeleteMethod] = useState('');
  const [deleteVerificationMethod, setDeleteVerificationMethod] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [showSocialSection, setShowSocialSection] = useState(false);
  const [socialForm, setSocialForm] = useState({ name: '', url: '', editIndex: -1 });
  const [socialConnectLoading, setSocialConnectLoading] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProfileShareModal, setShowProfileShareModal] = useState(false);
  const [showSavedItemsModal, setShowSavedItemsModal] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [showStatusComposer, setShowStatusComposer] = useState(false);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [statusViewerIndex, setStatusViewerIndex] = useState(0);
  const [statusForm, setStatusForm] = useState({
    contentType: 'story',
    text: '',
    musicLabel: '',
    musicSourceType: 'none',
    musicSourceUrl: '',
    trimStartSec: 0,
    trimEndSec: null,
    stickers: [],
    mediaFile: null,
    mediaPreview: '',
    mediaType: 'text',
    removeExistingMedia: false,
    backgroundColor: '#1f2937',
    textColor: '#ffffff',
    fontFamily: 'Inter',
    textAlign: 'center',
    textPosX: 50,
    textPosY: 50,
    audience: 'public',
    durationSec: 7,
  });
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusDeletingId, setStatusDeletingId] = useState('');
  const [editingStatusId, setEditingStatusId] = useState('');
  const [statusTextDragging, setStatusTextDragging] = useState(false);
  const [statusDraggingStickerId, setStatusDraggingStickerId] = useState('');
  const [statusStickerTab, setStatusStickerTab] = useState('popular');
  const [recentStatusStickers, setRecentStatusStickers] = useState([]);
  const [statusVideoDurationSec, setStatusVideoDurationSec] = useState(0);
  const savedLibrary = useSavedItemsLibrary({ user, wishlist, blogs, articles, shorts });

  // Fetch data
  useEffect(() => {
    if (!user?._id) return;
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const profileRes = await api.get('/users/profile');
        if (!isMounted) return;

        const loadedProfile = profileRes.data.user || {};
        setProfile(loadedProfile);
        setSmsPhone(loadedProfile?.phone || '');
        setUser((currentUser) => (
          currentUser?._id === loadedProfile?._id
            ? { ...currentUser, ...loadedProfile }
            : currentUser || loadedProfile
        ));

        const optionalRequests = await Promise.allSettled([
          api.get('/users/api-keys'),
          api.get(`/blogs?author=${user._id}`),
          api.get(`/articles?author=${user._id}`),
          api.get(`/shorts?author=${user._id}`),
          api.get('/marketplace/wishlist'),
          api.get('/users/2fa/status')
        ]);
        if (!isMounted) return;

        const [keysRes, blogsRes, articlesRes, shortsRes, wishlistRes, twoFactorRes] = optionalRequests;
        if (keysRes.status === 'fulfilled') setApiKeys(keysRes.value.data.apiKeys || []);
        if (blogsRes.status === 'fulfilled') setBlogs(blogsRes.value.data.blogs || []);
        if (articlesRes.status === 'fulfilled') setArticles(articlesRes.value.data.articles || []);
        if (shortsRes.status === 'fulfilled') setShorts(shortsRes.value.data.shorts || []);
        if (wishlistRes.status === 'fulfilled') setWishlist(getProfileWishlistItems(wishlistRes.value.data));
        if (twoFactorRes.status === 'fulfilled') setTwoFactorStatus(twoFactorRes.value.data.twoFactor || null);

        optionalRequests.forEach((result, index) => {
          if (result.status === 'rejected') {
            const labels = ['api keys', 'blogs', 'articles', 'shorts', 'wishlist', 'two-factor status'];
            console.warn(`Unable to load profile ${labels[index]}`, result.reason);
          }
        });

        try {
          const statusesRes = await api.get('/users/statuses');
          if (isMounted) {
            syncStatuses(statusesRes.data?.statuses || []);
          }
        } catch (statusError) {
          if (isMounted) {
            syncStatuses(profileRes.data?.user?.statuses || []);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search || '');
    const forcePasswordChange = searchParams.get('forcePasswordChange') === '1';
    const fromGoogleSession = sessionStorage.getItem('googlePasswordSetupRequired') === 'true';
    const openForgotPassword = searchParams.get('forgotPassword') === '1';

    if (openForgotPassword) {
      setExpandedCard(null);
      setShowPasswordForm(false);
      setShowForgotPassword(true);
      navigate('/profile/manage', { replace: true });
      return;
    }

    if (!forcePasswordChange && !fromGoogleSession) return;

    setPasswordDeliveryChannel(sessionStorage.getItem('passwordDeliveryChannel') || 'email');
    setExpandedCard(null);
    setShowForgotPassword(false);
    setShowPasswordForm(true);
    setShowPasswordSetupNotice(true);

    if (forcePasswordChange) {
      navigate('/profile/manage', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (loading) return undefined;

    const searchParams = new URLSearchParams(location.search || '');
    const target = searchParams.get('target') || '';
    if (!target) return undefined;

    if (target === 'profile-details') {
      setShowProfileForm(true);
    }

    if (target === 'developer') {
      setExpandedCard('developer');
    }

    if (target === 'contact') {
      setExpandedCard('contact');
      setShowContactSection(true);
    }

    if (target === 'security' || target === 'password') {
      setExpandedCard(null);
    }

    if (target === 'password') {
      setShowForgotPassword(false);
      setShowPasswordForm(true);
    }

    if (target === 'two-factor') {
      setIsTwoFactorExpanded(true);
      setShowTwoFactorSetupOptions(true);
    }

    const startedAt = Date.now();
    let retryTimeoutId;
    let clearHighlightTimeoutId;

    const focusTarget = () => {
      const targetElement = document.querySelector(`[data-profile-manage-target="${target}"]`);
      if (!targetElement) {
        if (Date.now() - startedAt < 2400) {
          retryTimeoutId = window.setTimeout(focusTarget, 120);
        }
        return;
      }

      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightTarget('');
      window.requestAnimationFrame(() => setHighlightTarget(target));
      clearHighlightTimeoutId = window.setTimeout(() => setHighlightTarget(''), 2600);
    };

    const timeoutId = window.setTimeout(focusTarget, 180);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(retryTimeoutId);
      window.clearTimeout(clearHighlightTimeoutId);
    };
  }, [loading, location.search]);

  useEffect(() => {
    const onboardingSource = sessionStorage.getItem('socialEmailSetupRequired');
    if (!onboardingSource) return;

    setSocialEmailSource(onboardingSource);
    setShowSocialEmailNotice(true);
    sessionStorage.removeItem('socialEmailSetupRequired');
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('telegramPasswordDeliveryFailed') !== 'true') return;
    setShowTelegramDeliveryFailure(true);
    sessionStorage.removeItem('telegramPasswordDeliveryFailed');
  }, []);

  useEffect(() => {
    const connectedProvider = sessionStorage.getItem('socialConnectSuccess');
    if (!connectedProvider) return;
    sessionStorage.removeItem('socialConnectSuccess');
    const label = connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1);
    showModal('success', 'Connected', `${label} account connected successfully.`);
  }, []);

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (expandedCard && profileRef.current && !profileRef.current.contains(e.target)) {
        setExpandedCard(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedCard]);

  useEffect(() => () => {
    if (statusForm.mediaPreview && statusForm.mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(statusForm.mediaPreview);
    }
  }, [statusForm.mediaPreview]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORY_STICKER_RECENT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setRecentStatusStickers(normalizeRecentStickerList(parsed));
    } catch (error) {
      setRecentStatusStickers([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORY_STICKER_RECENT_STORAGE_KEY,
        JSON.stringify(normalizeRecentStickerList(recentStatusStickers))
      );
    } catch (error) {
      // Ignore localStorage write failures in private mode or restricted environments.
    }
  }, [recentStatusStickers]);

  const showModal = (type, title, message, onConfirm = null) => {
    setModal({ show: true, type, title, message, onConfirm });
  };

  const socialProviderOptions = [
    {
      key: 'google',
      label: 'Google',
      icon: <FaGoogle size={16} className="text-red-500" />,
      connectMode: 'oauth',
      matches: ['google.com', 'accounts.google.com'],
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <FaFacebookF size={16} className="text-blue-600" />,
      connectMode: 'oauth',
      matches: ['facebook.com', 'fb.com'],
    },
    {
      key: 'twitter',
      label: 'Twitter',
      icon: <FaXTwitter size={16} className="text-gray-900 dark:text-gray-100" />,
      connectMode: 'oauth',
      matches: ['twitter.com', 'x.com'],
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <FaLinkedinIn size={16} className="text-blue-700" />,
      connectMode: 'oauth',
      suggestedUrl: 'https://www.linkedin.com/in/',
      matches: ['linkedin.com'],
    },
    {
      key: 'github',
      label: 'GitHub',
      icon: <FaGithub size={16} className="text-[var(--text-primary)]" />,
      connectMode: 'manual',
      suggestedUrl: 'https://github.com/',
      matches: ['github.com'],
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: <FaTelegramPlane size={16} className="text-sky-500" />,
      connectMode: 'telegram',
      matches: ['telegram', 't.me'],
    },
  ];

  const normalizeSocialUrl = (value = '') => String(value).trim().toLowerCase();

  const parseSocialHostname = (rawUrl = '') => {
    const value = String(rawUrl || '').trim();
    if (!value) return '';

    try {
      return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    } catch (error) {
      try {
        return new URL(`https://${value}`).hostname.toLowerCase().replace(/^www\./, '');
      } catch (nestedError) {
        return '';
      }
    }
  };

  const isUrlForProvider = (url, provider) => {
    const normalizedUrl = normalizeSocialUrl(url);
    return provider.matches.some((domain) => normalizedUrl.includes(domain));
  };

  const findProviderForSocialEntry = (entry) => {
    const nameValue = normalizeSocialUrl(entry?.name);
    return (
      socialProviderOptions.find((provider) => {
        if (isUrlForProvider(entry?.url, provider)) return true;
        if (nameValue.includes(provider.key)) return true;
        return nameValue.includes(provider.label.toLowerCase());
      }) || null
    );
  };

  const linkedProviders = socialProviderOptions.reduce((acc, provider) => {
    const linkedByOauth =
      provider.connectMode !== 'manual' && Boolean(profile?.linkedProviders?.[provider.key]);
    const linkedByUrl = Array.isArray(profile?.socialMedia)
      ? profile.socialMedia.some((entry) => isUrlForProvider(entry?.url, provider))
      : false;

    acc[provider.key] = Boolean(linkedByOauth || linkedByUrl);
    return acc;
  }, {});

  const availableSocialConnectProviders = socialProviderOptions.filter(
    (provider) => !linkedProviders[provider.key]
  );

  const connectedSocialAccounts = React.useMemo(() => {
    const accounts = [];
    const knownProvidersAdded = new Set();
    const customEntriesAdded = new Set();
    const socialMedia = Array.isArray(profile?.socialMedia) ? profile.socialMedia : [];

    socialMedia.forEach((entry, index) => {
      const matchedProvider = findProviderForSocialEntry(entry);
      if (matchedProvider) {
        if (knownProvidersAdded.has(matchedProvider.key)) return;
        accounts.push({
          key: `provider:${matchedProvider.key}`,
          providerKey: matchedProvider.key,
          label: matchedProvider.label,
          icon: matchedProvider.icon,
          actionType: 'provider',
        });
        knownProvidersAdded.add(matchedProvider.key);
        return;
      }

      const rawUrl = String(entry?.url || '').trim();
      const host = parseSocialHostname(rawUrl);
      const displayLabel = String(entry?.name || '').trim() || host || 'Website';
      const customKey = `custom:${rawUrl.toLowerCase() || displayLabel.toLowerCase()}:${index}`;
      if (customEntriesAdded.has(customKey)) return;

      accounts.push({
        key: customKey,
        providerKey: '',
        label: displayLabel,
        icon: <FaGlobe size={16} className="text-[var(--text-secondary)]" />,
        actionType: 'custom',
        socialIndex: index,
      });
      customEntriesAdded.add(customKey);
    });

    socialProviderOptions.forEach((provider) => {
      if (provider.connectMode === 'manual') return;
      const linkedByOauth = Boolean(profile?.linkedProviders?.[provider.key]);
      if (!linkedByOauth || knownProvidersAdded.has(provider.key)) return;

      accounts.push({
        key: `provider:${provider.key}`,
        providerKey: provider.key,
        label: provider.label,
        icon: provider.icon,
        actionType: 'provider',
      });
      knownProvidersAdded.add(provider.key);
    });

    return accounts;
  }, [profile?.socialMedia, profile?.linkedProviders]);

  const availableDeleteMethods = [
    ...(String(profile?.email || '').trim() ? ['email'] : []),
    ...(profile?.linkedProviders?.telegram ? ['telegram'] : []),
    ...(twoFactorStatus?.methods?.includes('authenticator') ? ['authenticator'] : []),
  ];

  const maskEmailAddress = (email = '') => {
    const [localPart = '', domain = ''] = String(email).trim().split('@');
    if (!localPart || !domain) return 'Email';
    const first = localPart.slice(0, Math.min(2, localPart.length));
    const last = localPart.length > 2 ? localPart.slice(-1) : '';
    return `${first}***${last}@${domain}`;
  };

  const linkedAuthProviderCount = ['google', 'facebook', 'twitter', 'linkedin', 'telegram']
    .filter((providerKey) => Boolean(profile?.linkedProviders?.[providerKey]))
    .length;
  const hasPermanentPasswordLogin = !profile?.mustChangePasswordAfterGoogle;
  const canDisconnectAuthProvider = linkedAuthProviderCount > 1 || hasPermanentPasswordLogin;

  const closeModal = () => {
    setModal({ show: false, type: '', title: '', message: '', onConfirm: null });
  };

  const MAX_ACTIVE_STATUSES = 5;
  const hasActiveStatus = statuses.length > 0;
  const statusSlotsRemaining = Math.max(0, MAX_ACTIVE_STATUSES - statuses.length);
  const displayUser = React.useMemo(
    () => ({ ...(user || {}), ...(profile || {}) }),
    [user, profile]
  );
  const avatarUser = React.useMemo(
    () => ({ ...(displayUser || {}), hasActiveStatus }),
    [displayUser, hasActiveStatus]
  );
  const displayUserId = displayUser?._id || displayUser?.id || user?._id || user?.id;
  const memberSinceLabel = displayUser?.createdAt
    ? new Date(displayUser.createdAt).toLocaleDateString()
    : t('Not available');

  const getActiveStatuses = (items = []) =>
    Array.isArray(items)
      ? items.filter((status) => status?.expiresAt && new Date(status.expiresAt) > new Date())
      : [];

  const normalizeStatusContentType = (value) => {
    const nextType = String(value || 'story').trim().toLowerCase();
    return nextType === 'post' ? 'post' : 'story';
  };

  const syncStatuses = (incomingStatuses = []) => {
    const nextStatuses = getActiveStatuses(incomingStatuses).map((status) => ({
      ...status,
      contentType: normalizeStatusContentType(status?.contentType),
    }));
    setStatuses(nextStatuses);
  };

  const getStatusMediaType = (status) => {
    if (!status) return 'text';
    if (status.mediaType) return status.mediaType;
    if (status.video) return 'video';
    if (status.image) return 'image';
    return 'text';
  };

  const getStatusMediaUrl = (status) => {
    if (!status) return '';
    return status.video || status.image || '';
  };

  const clampStatusTextPosition = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 50;
    return Math.max(8, Math.min(92, parsed));
  };

  const updateStatusTextPositionFromPointer = (clientX, clientY) => {
    const previewNode = statusPreviewRef.current;
    if (!previewNode) return;
    const rect = previewNode.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setStatusForm((prev) => ({
      ...prev,
      textPosX: clampStatusTextPosition(x),
      textPosY: clampStatusTextPosition(y),
    }));
  };

  const handleStatusTextPointerDown = (event) => {
    if (!statusForm.text.trim()) return;
    event.preventDefault();
    event.stopPropagation();
    setStatusTextDragging(true);
    if (event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (_) {}
    }
    updateStatusTextPositionFromPointer(event.clientX, event.clientY);
  };

  const handleStatusTextPointerMove = (event) => {
    if (!statusTextDragging) return;
    event.preventDefault();
    updateStatusTextPositionFromPointer(event.clientX, event.clientY);
  };

  const handleStatusTextPointerUp = (event) => {
    if (!statusTextDragging) return;
    setStatusTextDragging(false);
    if (event.currentTarget.releasePointerCapture) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (_) {}
    }
  };

  const activeStickerChoices = React.useMemo(() => {
    if (statusStickerTab === 'recent') {
      return recentStatusStickers;
    }
    const activeGroup = STORY_STICKER_GROUPS.find((group) => group.id === statusStickerTab);
    return activeGroup?.items || STORY_STICKER_GROUPS[0]?.items || [];
  }, [recentStatusStickers, statusStickerTab]);

  const rememberRecentSticker = (emoji) => {
    const nextEmoji = String(emoji || '').trim().slice(0, 8);
    if (!nextEmoji) return;
    setRecentStatusStickers((prev) => {
      const next = [nextEmoji, ...prev.filter((item) => item !== nextEmoji)];
      return normalizeRecentStickerList(next);
    });
  };

  const addStatusSticker = (emoji) => {
    const nextEmoji = String(emoji || '').trim();
    if (!nextEmoji) return;
    setStatusForm((prev) => {
      if (prev.stickers.length >= MAX_STATUS_STICKERS) return prev;
      return {
        ...prev,
        stickers: [
          ...prev.stickers,
          {
            id: `sticker-${Date.now()}-${prev.stickers.length}`,
            emoji: nextEmoji.slice(0, 8),
            x: 50,
            y: 50,
            size: 48,
            rotate: 0,
          },
        ],
      };
    });
    rememberRecentSticker(nextEmoji);
  };

  const removeStatusSticker = (stickerId) => {
    setStatusForm((prev) => ({
      ...prev,
      stickers: prev.stickers.filter((sticker) => sticker.id !== stickerId),
    }));
    if (statusDraggingStickerId === stickerId) {
      setStatusDraggingStickerId('');
    }
  };

  const updateStatusSticker = (stickerId, updater) => {
    setStatusForm((prev) => ({
      ...prev,
      stickers: prev.stickers.map((sticker) => {
        if (sticker.id !== stickerId) return sticker;
        const nextSticker = typeof updater === 'function' ? updater(sticker) : { ...sticker, ...updater };
        return {
          ...sticker,
          ...nextSticker,
          size: clampStatusStickerSize(nextSticker?.size ?? sticker.size),
          rotate: clampStatusStickerRotate(nextSticker?.rotate ?? sticker.rotate),
          x: clampStatusTextPosition(nextSticker?.x ?? sticker.x),
          y: clampStatusTextPosition(nextSticker?.y ?? sticker.y),
        };
      }),
    }));
  };

  const updateStatusStickerPositionFromPointer = (stickerId, clientX, clientY) => {
    const previewNode = statusPreviewRef.current;
    if (!previewNode) return;
    const rect = previewNode.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    updateStatusSticker(stickerId, { x, y });
  };

  const handleStatusStickerPointerDown = (event, stickerId) => {
    event.preventDefault();
    event.stopPropagation();
    setStatusDraggingStickerId(stickerId);
    if (event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (_) {}
    }
    updateStatusStickerPositionFromPointer(stickerId, event.clientX, event.clientY);
  };

  const handleStatusStickerPointerMove = (event, stickerId) => {
    if (statusDraggingStickerId !== stickerId) return;
    event.preventDefault();
    updateStatusStickerPositionFromPointer(stickerId, event.clientX, event.clientY);
  };

  const handleStatusStickerPointerUp = (event, stickerId) => {
    if (statusDraggingStickerId !== stickerId) return;
    setStatusDraggingStickerId('');
    if (event.currentTarget.releasePointerCapture) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (_) {}
    }
  };

  const applyStoryStylePreset = (presetId) => {
    const preset = STORY_STYLE_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    setStatusForm((prev) => ({
      ...prev,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
      fontFamily: preset.fontFamily,
      textAlign: preset.textAlign,
      textPosX: preset.textPosX,
      textPosY: preset.textPosY,
    }));
  };

  const applyStoryMusicPreset = (presetId) => {
    const preset = STORY_MUSIC_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setStatusForm((prev) => ({
      ...prev,
      musicLabel: preset.musicLabel,
      musicSourceType: normalizeStoryMusicSourceType(preset.musicSourceType),
      musicSourceUrl: normalizeStoryMusicSourceUrl(preset.musicSourceUrl),
    }));
  };

  const setStatusComposerContentType = (nextType) => {
    const normalizedType = normalizeStatusContentType(nextType);
    setStatusForm((prev) => {
      const nextForm = {
        ...prev,
        contentType: normalizedType,
      };

      if (normalizedType === 'post' && prev.mediaType === 'video') {
        if (prev.mediaPreview && prev.mediaPreview.startsWith('blob:')) {
          URL.revokeObjectURL(prev.mediaPreview);
        }
        const shouldMarkRemove =
          Boolean(editingStatusId) &&
          Boolean(prev.mediaPreview) &&
          !prev.mediaPreview.startsWith('blob:');
        nextForm.mediaFile = null;
        nextForm.mediaPreview = '';
        nextForm.mediaType = 'text';
        nextForm.trimStartSec = 0;
        nextForm.trimEndSec = null;
        nextForm.removeExistingMedia = shouldMarkRemove;
      }

      return nextForm;
    });

    if (normalizedType === 'post') {
      setStatusVideoDurationSec(0);
    }
  };

  const resetStatusComposer = () => {
    if (statusForm.mediaPreview && statusForm.mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(statusForm.mediaPreview);
    }
    setStatusTextDragging(false);
    setStatusDraggingStickerId('');
    setStatusStickerTab('popular');
    setStatusForm({
      contentType: 'story',
      text: '',
      musicLabel: '',
      musicSourceType: 'none',
      musicSourceUrl: '',
      trimStartSec: 0,
      trimEndSec: null,
      stickers: [],
      mediaFile: null,
      mediaPreview: '',
      mediaType: 'text',
      removeExistingMedia: false,
      backgroundColor: '#1f2937',
      textColor: '#ffffff',
      fontFamily: 'Inter',
      textAlign: 'center',
      textPosX: 50,
      textPosY: 50,
      audience: 'public',
      durationSec: 7,
    });
    setStatusVideoDurationSec(0);
    setEditingStatusId('');
  };

  const openCreateStatusComposer = () => {
    if (statusSlotsRemaining <= 0) {
      showModal('error', 'Status Limit Reached', 'You can have up to 5 active statuses at a time.');
      return;
    }
    resetStatusComposer();
    setShowStatusComposer(true);
  };

  const openEditStatusComposer = (status) => {
    if (!status) return;
    if (statusForm.mediaPreview && statusForm.mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(statusForm.mediaPreview);
    }
    setStatusForm({
      contentType: normalizeStatusContentType(status.contentType),
      text: status.text || '',
      musicLabel: status.musicLabel || '',
      musicSourceType: normalizeStoryMusicSourceType(status.musicSourceType),
      musicSourceUrl: normalizeStoryMusicSourceUrl(status.musicSourceUrl),
      trimStartSec: Number.isFinite(Number(status.trimStartSec)) ? Number(status.trimStartSec) : 0,
      trimEndSec: Number.isFinite(Number(status.trimEndSec)) ? Number(status.trimEndSec) : null,
      stickers: normalizeStatusStickerList(status.stickers),
      mediaFile: null,
      mediaPreview: getStatusMediaUrl(status),
      mediaType: getStatusMediaType(status),
      removeExistingMedia: false,
      backgroundColor: status.backgroundColor || '#1f2937',
      textColor: status.textColor || '#ffffff',
      fontFamily: status.fontFamily || 'Inter',
      textAlign: status.textAlign || 'center',
      textPosX: clampStatusTextPosition(status.textPosX),
      textPosY: clampStatusTextPosition(status.textPosY),
      audience: ['public', 'followers', 'private'].includes(status.audience) ? status.audience : 'public',
      durationSec: status.durationSec || 7,
    });
    setStatusVideoDurationSec(0);
    setStatusStickerTab('popular');
    setStatusDraggingStickerId('');
    setEditingStatusId(status._id);
    setShowStatusComposer(true);
  };

  const fetchStatuses = async () => {
    try {
      const { data } = await api.get('/users/statuses');
      syncStatuses(data?.statuses || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const handleStatusMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideoFile = String(file.type || '').startsWith('video/');
    const isPostMode = normalizeStatusContentType(statusForm.contentType) === 'post';

    if (isPostMode && isVideoFile) {
      showModal('error', 'Video Not Allowed', 'Post mode supports image uploads only. Switch to Story mode to use video.');
      e.target.value = '';
      return;
    }

    if (statusForm.mediaPreview && statusForm.mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(statusForm.mediaPreview);
    }

    const nextType = isVideoFile ? 'video' : 'image';
    const baseTrimRange = normalizeStoryTrimRange(0, null, 0);
    setStatusForm((prev) => ({
      ...prev,
      mediaFile: file,
      mediaPreview: URL.createObjectURL(file),
      mediaType: nextType,
      trimStartSec: nextType === 'video' ? baseTrimRange.trimStartSec : 0,
      trimEndSec: nextType === 'video' ? baseTrimRange.trimEndSec : null,
      removeExistingMedia: false,
    }));
    setStatusVideoDurationSec(0);
  };

  const handleStatusPreviewVideoLoadedMetadata = (event) => {
    const duration = Number(event?.target?.duration);
    if (!Number.isFinite(duration) || duration <= 0) return;
    setStatusVideoDurationSec(Number(duration.toFixed(2)));
    setStatusForm((prev) => {
      const nextRange = normalizeStoryTrimRange(prev.trimStartSec, prev.trimEndSec, duration);
      return {
        ...prev,
        trimStartSec: nextRange.trimStartSec,
        trimEndSec: nextRange.trimEndSec,
      };
    });
  };

  const setStatusVideoTrimStart = (value) => {
    setStatusForm((prev) => {
      const nextRange = normalizeStoryTrimRange(value, prev.trimEndSec, statusVideoDurationSec);
      return {
        ...prev,
        trimStartSec: nextRange.trimStartSec,
        trimEndSec: nextRange.trimEndSec,
      };
    });
  };

  const setStatusVideoTrimEnd = (value) => {
    setStatusForm((prev) => {
      const nextRange = normalizeStoryTrimRange(prev.trimStartSec, value, statusVideoDurationSec);
      return {
        ...prev,
        trimStartSec: nextRange.trimStartSec,
        trimEndSec: nextRange.trimEndSec,
      };
    });
  };

  const previewVideoTrimRange = React.useMemo(
    () => normalizeStoryTrimRange(statusForm.trimStartSec, statusForm.trimEndSec, statusVideoDurationSec),
    [statusForm.trimStartSec, statusForm.trimEndSec, statusVideoDurationSec]
  );
  const statusComposerMode = normalizeStatusContentType(statusForm.contentType);
  const isPostComposer = statusComposerMode === 'post';
  const isStoryComposer = statusComposerMode === 'story';
  const statusMediaAccept = isPostComposer ? 'image/*' : 'image/*,video/*';

  const handleStatusSave = async (e) => {
    e.preventDefault();
    const normalizedContentType = normalizeStatusContentType(statusForm.contentType);
    const isPostMode = normalizedContentType === 'post';
    const trimmedText = statusForm.text.trim();
    const hasStickers = Array.isArray(statusForm.stickers) && statusForm.stickers.length > 0;
    const hasVideoInComposer =
      statusForm.mediaType === 'video' && Boolean(statusForm.mediaFile || statusForm.mediaPreview);
    const requiredMessage = isPostMode
      ? 'Please add text, image, or stickers to publish this post.'
      : 'Please add text, image, video, or stickers to post a status.';

    if (isPostMode && hasVideoInComposer) {
      showModal('error', 'Video Not Allowed', 'Post mode supports image uploads only. Remove video or switch to Story mode.');
      return;
    }

    if (!trimmedText && !statusForm.mediaFile && !hasStickers && !editingStatusId) {
      showModal('error', 'Status Required', requiredMessage);
      return;
    }

    if (!trimmedText && !statusForm.mediaFile && !hasStickers && editingStatusId && !statusForm.mediaPreview) {
      showModal('error', 'Status Required', requiredMessage);
      return;
    }

    const formData = new FormData();
    formData.append('contentType', normalizedContentType);
    formData.append('text', trimmedText);
    formData.append('musicLabel', String(statusForm.musicLabel || '').trim());
    formData.append('musicSourceType', normalizeStoryMusicSourceType(statusForm.musicSourceType));
    formData.append('musicSourceUrl', normalizeStoryMusicSourceUrl(statusForm.musicSourceUrl));
    formData.append('stickers', JSON.stringify(statusForm.stickers || []));
    formData.append('backgroundColor', statusForm.backgroundColor);
    formData.append('textColor', statusForm.textColor);
    formData.append('fontFamily', statusForm.fontFamily);
    formData.append('textAlign', statusForm.textAlign);
    formData.append('textPosX', String(statusForm.textPosX));
    formData.append('textPosY', String(statusForm.textPosY));
    formData.append('audience', statusForm.audience);
    formData.append('durationSec', String(statusForm.durationSec || 7));
    if (normalizedContentType === 'story' && statusForm.mediaFile && statusForm.mediaType === 'video') {
      const normalizedTrim = normalizeStoryTrimRange(
        statusForm.trimStartSec,
        statusForm.trimEndSec,
        statusVideoDurationSec
      );
      formData.append('trimStartSec', String(normalizedTrim.trimStartSec));
      if (normalizedTrim.trimEndSec !== null) {
        formData.append('trimEndSec', String(normalizedTrim.trimEndSec));
      }
    }
    if (editingStatusId && statusForm.removeExistingMedia && !statusForm.mediaFile) {
      formData.append('removeMedia', 'true');
    }
    if (statusForm.mediaFile) {
      formData.append('statusMedia', statusForm.mediaFile);
    }

    setStatusSaving(true);
    try {
      if (editingStatusId) {
        await api.put(`/users/statuses/${editingStatusId}`, formData);
        showModal('success', 'Success', 'Status updated successfully.');
      } else {
        await api.post('/users/statuses', formData);
        showModal('success', 'Success', 'Status posted successfully.');
      }

      await fetchStatuses();
      setShowStatusComposer(false);
      resetStatusComposer();
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed to save status.');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteStatus = (statusId) => {
    showModal('confirm', 'Delete Status', 'Delete this status?', async () => {
      setStatusDeletingId(statusId);
      try {
        await api.delete(`/users/statuses/${statusId}`);
        await fetchStatuses();
        showModal('success', 'Success', 'Status deleted successfully.');
      } catch (error) {
        showModal('error', 'Error', error.response?.data?.message || 'Failed to delete status.');
      } finally {
        setStatusDeletingId('');
      }
    });
  };

  const formatStatusTimeLeft = (expiresAt) => {
    if (!expiresAt) return 'Expires soon';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours <= 0) return `${minutes}m left`;
    return `${hours}h ${minutes}m left`;
  };

  const handleUpdateProfileSettings = async (updates, successMessage) => {
    const nextProfile = { ...profile, ...updates };
    try {
      await api.put('/users/profile', nextProfile);
      setProfile(nextProfile);
      showModal('success', 'Success', successMessage);
    } catch (error) {
      showModal('error', 'Error', 'Failed to update settings');
    }
  };

  const refreshTwoFactorStatus = async () => {
    const { data } = await api.get('/users/2fa/status');
    setTwoFactorStatus(data.twoFactor);
    return data.twoFactor;
  };

  const openTwoFactorPrompt = ({ requirement, onVerified }) => {
    setTwoFactorPrompt({
      action: requirement.action,
      actionLabel: requirement.actionLabel,
      twoFactor: requirement.twoFactor,
      onVerified,
    });
  };

  const openSensitiveAuthPrompt = ({ requirement, onVerified, title, description }) => {
    setSensitiveAuthPrompt({
      action: requirement.action,
      actionLabel: requirement.actionLabel,
      title,
      description,
      onVerified,
    });
  };

  const handleSensitiveAuthVerified = async (result) => {
    const prompt = sensitiveAuthPrompt;
    setSensitiveAuthPrompt(null);
    if (!prompt?.onVerified) return;
    await prompt.onVerified(result);
  };

  const handleSensitiveAuthForgotPassword = () => {
    setSensitiveAuthPrompt(null);
    navigate('/profile?forgotPassword=1');
  };

  const runAfterSensitiveAuth = ({ result, fallbackAction, fallbackActionLabel, runWithTokens }) => {
    const sensitiveActionToken = result?.sensitiveActionToken || '';
    if (result?.requiresTwoFactor) {
      openTwoFactorPrompt({
        requirement: {
          action: result.action || fallbackAction,
          actionLabel: result.actionLabel || fallbackActionLabel,
          twoFactor: result.twoFactor,
        },
        onVerified: async (twoFactorToken) => runWithTokens({ sensitiveActionToken, twoFactorToken }),
      });
      return;
    }

    return runWithTokens({ sensitiveActionToken });
  };

  const completeProfileUpdate = async (actionTokens = {}) => {
    const twoFactorToken = typeof actionTokens === 'string' ? actionTokens : actionTokens.twoFactorToken || '';
    const sensitiveActionToken = typeof actionTokens === 'object' ? actionTokens.sensitiveActionToken || '' : '';
    const payload = {
      ...profile,
      ...(twoFactorToken ? { twoFactorToken } : {}),
      ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
    };
    const { data } = await api.put('/users/profile', payload, {
      headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
    });
    if (data?.user) {
      setProfile(data.user);
    }
    if (String(profile?.email || '').trim()) {
      setShowSocialEmailNotice(false);
    }
    showModal('success', 'Success', 'Profile updated!');
    setShowProfileForm(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await completeProfileUpdate();
    } catch (error) {
      const passwordRequirement = getSensitiveActionRequirement(error);
      if (passwordRequirement) {
        openSensitiveAuthPrompt({
          requirement: passwordRequirement,
          title: 'Verify before changing email',
          description: 'Confirm your password before your account email is changed.',
          onVerified: async (result) => runAfterSensitiveAuth({
            result,
            fallbackAction: 'change_email',
            fallbackActionLabel: 'change your email',
            runWithTokens: completeProfileUpdate,
          }),
        });
        return;
      }
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (twoFactorToken) => completeProfileUpdate({ twoFactorToken }),
        });
        return;
      }
      showModal('error', 'Error', 'Failed to update profile');
    }
  };

  const startAuthenticatorSetup = async (actionTokens = {}) => {
    setTwoFactorLoading(true);
    try {
      const twoFactorToken = typeof actionTokens === 'string' ? actionTokens : actionTokens.twoFactorToken || '';
      const sensitiveActionToken = typeof actionTokens === 'object' ? actionTokens.sensitiveActionToken || '' : '';
      const { data } = await api.post('/users/2fa/authenticator/setup', {
        ...(twoFactorToken ? { twoFactorToken } : {}),
        ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
      }, {
        headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
      });
      setAuthenticatorSetup(data);
      if (data.twoFactor) setTwoFactorStatus(data.twoFactor);
      setShowTwoFactorSetupOptions(true);
      setIsTwoFactorExpanded(true);
      setAuthenticatorCode('');
    } catch (error) {
      const passwordRequirement = getSensitiveActionRequirement(error);
      if (passwordRequirement) {
        openSensitiveAuthPrompt({
          requirement: passwordRequirement,
          title: 'Verify before managing 2FA',
          description: 'Confirm your password before changing two-factor authentication.',
          onVerified: async (result) => runAfterSensitiveAuth({
            result,
            fallbackAction: 'manage_2fa',
            fallbackActionLabel: 'manage two-factor authentication',
            runWithTokens: startAuthenticatorSetup,
          }),
        });
        return;
      }
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (twoFactorToken) => startAuthenticatorSetup({ twoFactorToken }),
        });
        return;
      }
      showModal('error', 'Error', error.response?.data?.message || 'Failed to start authenticator setup');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const verifyAuthenticatorSetup = async (e) => {
    e.preventDefault();
    if (!authenticatorCode) return;
    setTwoFactorLoading(true);
    try {
      const { data } = await api.post('/users/2fa/authenticator/verify', { code: authenticatorCode });
      setTwoFactorStatus(data.twoFactor);
      setAuthenticatorSetup(null);
      setAuthenticatorCode('');
      setShowTwoFactorSetupOptions(false);
      setIsTwoFactorExpanded(true);
      showModal('success', 'Success', 'Authenticator app enabled!');
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Invalid authenticator code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const submitSmsSetup = async (actionTokens = {}) => {
    if (!smsPhone.trim()) return;
    setTwoFactorLoading(true);
    try {
      const twoFactorToken = typeof actionTokens === 'string' ? actionTokens : actionTokens.twoFactorToken || '';
      const sensitiveActionToken = typeof actionTokens === 'object' ? actionTokens.sensitiveActionToken || '' : '';
      const { data } = await api.post('/users/2fa/sms/setup', {
        phone: smsPhone,
        ...(twoFactorToken ? { twoFactorToken } : {}),
        ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
      }, {
        headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
      });
      setSmsSetupChallenge(data.challengeId);
      setShowTwoFactorSetupOptions(true);
      setIsTwoFactorExpanded(true);
      setSmsCode('');
      showModal('success', 'Code Sent', 'SMS verification code sent.');
    } catch (error) {
      const passwordRequirement = getSensitiveActionRequirement(error);
      if (passwordRequirement) {
        openSensitiveAuthPrompt({
          requirement: passwordRequirement,
          title: 'Verify before managing 2FA',
          description: 'Confirm your password before changing two-factor authentication.',
          onVerified: async (result) => runAfterSensitiveAuth({
            result,
            fallbackAction: 'manage_2fa',
            fallbackActionLabel: 'manage two-factor authentication',
            runWithTokens: submitSmsSetup,
          }),
        });
        return;
      }
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (twoFactorToken) => submitSmsSetup({ twoFactorToken }),
        });
        return;
      }
      showModal('error', 'Error', error.response?.data?.message || 'Failed to send SMS code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const startSmsSetup = async (e) => {
    e.preventDefault();
    await submitSmsSetup();
  };

  const verifySmsSetup = async (e) => {
    e.preventDefault();
    if (!smsSetupChallenge || !smsCode) return;
    setTwoFactorLoading(true);
    try {
      const { data } = await api.post('/users/2fa/sms/verify', {
        challengeId: smsSetupChallenge,
        code: smsCode,
      });
      setTwoFactorStatus(data.twoFactor);
      setSmsSetupChallenge(null);
      setSmsCode('');
      setShowSmsSetup(false);
      setShowTwoFactorSetupOptions(false);
      setIsTwoFactorExpanded(true);
      showModal('success', 'Success', 'SMS verification enabled!');
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Invalid SMS code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const setPreferredTwoFactorMethod = async (method) => {
    setTwoFactorLoading(true);
    try {
      const { data } = await api.post('/users/2fa/preferred', { method });
      setTwoFactorStatus(data.twoFactor);
      showModal('success', 'Success', 'Preferred method updated.');
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed to update preferred method');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const disableTwoFactor = () => {
    if (!twoFactorStatus?.enabled) return;
    openSensitiveAuthPrompt({
      requirement: {
        action: 'disable_2fa',
        actionLabel: 'turn off two-factor authentication',
      },
      title: 'Verify before disabling 2FA',
      description: 'Confirm your password before two-factor authentication is turned off.',
      onVerified: async (result) => runAfterSensitiveAuth({
        result,
        fallbackAction: 'disable_2fa',
        fallbackActionLabel: 'turn off two-factor authentication',
        runWithTokens: async ({ sensitiveActionToken, twoFactorToken }) => {
          const { data } = await api.post('/users/2fa/disable', {
            ...(twoFactorToken ? { twoFactorToken } : {}),
            ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
          }, {
            headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
          });
          setTwoFactorStatus(data.twoFactor);
          setAuthenticatorSetup(null);
          setSmsSetupChallenge(null);
          setShowSmsSetup(false);
          setShowTwoFactorSetupOptions(false);
          setIsTwoFactorExpanded(false);
          showModal('success', 'Success', 'Two-factor authentication turned off.');
        },
      }),
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('profileImage', file);
    setImageUploading(true);
    try {
      const { data } = await api.post('/users/profile/image', formData);
      setUser({ ...user, profileImage: data.profileImage });
      showModal('success', 'Success', 'Image updated!');
    } catch (error) {
      showModal('error', 'Error', 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    showModal('confirm', 'Remove Image', 'Remove profile image?', async () => {
      setImageDeleting(true);
      try {
        await api.delete('/users/profile/image');
        setUser({ ...user, profileImage: '' });
        showModal('success', 'Success', 'Image removed!');
      } catch (error) {
        showModal('error', 'Error', 'Failed to remove');
      } finally {
        setImageDeleting(false);
      }
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSendingPasswordCode(true);
    try {
      const { data } = await api.post('/users/password/request', passwords);
      setPasswordCodeDelivery(data?.deliveryChannel || 'email');
      setShowPasswordForm(false);
      setShowPasswordCodeModal(true);
      showModal('success', 'Code Sent', data?.message || 'Confirmation code sent.');
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed');
    } finally {
      setSendingPasswordCode(false);
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/password/confirm', { code: passwordCode });
      showModal('success', 'Success', 'Password changed!');
      setShowPasswordCodeModal(false);
      setPasswordCode('');
      setPasswords({ currentPassword: '', newPassword: '' });
      setShowPasswordSetupNotice(false);
      sessionStorage.removeItem('googlePasswordSetupRequired');
      sessionStorage.removeItem('passwordDeliveryChannel');
    } catch (error) {
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (token) => {
            await api.post('/users/password/confirm', { code: passwordCode, twoFactorToken: token }, {
              headers: buildTwoFactorHeaders(token),
            });
            showModal('success', 'Success', 'Password changed!');
            setShowPasswordCodeModal(false);
            setPasswordCode('');
            setPasswords({ currentPassword: '', newPassword: '' });
            setShowPasswordSetupNotice(false);
            sessionStorage.removeItem('googlePasswordSetupRequired');
            sessionStorage.removeItem('passwordDeliveryChannel');
          },
        });
        return;
      }
      showModal('error', 'Error', 'Invalid code');
    }
  };

  const handleAuthenticatedForgotPasswordRequest = async (e) => {
    e.preventDefault();
    const nextPassword = forgotPasswordValues.newPassword;
    if (nextPassword !== forgotPasswordValues.confirmPassword) {
      showModal('error', 'Password mismatch', 'Passwords do not match');
      return;
    }
    if (nextPassword.length < 6) {
      showModal('error', 'Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setSendingForgotPasswordCode(true);
    try {
      const { data } = await api.post('/auth/forgot-password/change-authenticated', { newPassword: nextPassword });
      setForgotPasswordCodeDelivery(data?.deliveryChannel || 'email');
      setShowForgotPassword(false);
      setShowForgotPasswordCodeModal(true);
      showModal('success', 'Code Sent', data?.message || 'Confirmation code sent.');
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed to send confirmation code');
    } finally {
      setSendingForgotPasswordCode(false);
    }
  };

  const handleConfirmAuthenticatedForgotPassword = async (e) => {
    e.preventDefault();
    setConfirmingForgotPassword(true);
    try {
      await api.post('/auth/forgot-password/confirm-authenticated', { code: forgotPasswordCode });
      showModal('success', 'Success', 'Password changed!');
      setShowForgotPasswordCodeModal(false);
      setForgotPasswordCode('');
      setForgotPasswordValues({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (token) => {
            await api.post('/auth/forgot-password/confirm-authenticated', {
              code: forgotPasswordCode,
              twoFactorToken: token,
            }, {
              headers: buildTwoFactorHeaders(token),
            });
            showModal('success', 'Success', 'Password changed!');
            setShowForgotPasswordCodeModal(false);
            setForgotPasswordCode('');
            setForgotPasswordValues({ newPassword: '', confirmPassword: '' });
          },
        });
        return;
      }
      showModal('error', 'Error', error.response?.data?.message || 'Invalid confirmation code');
    } finally {
      setConfirmingForgotPassword(false);
    }
  };

  const completeGenerateApiKey = async ({ keyName, sensitiveActionToken = '', twoFactorToken = '' }) => {
    const createRes = await api.post('/users/api-keys', {
      name: keyName,
      ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
      ...(twoFactorToken ? { twoFactorToken } : {}),
    }, {
      headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
    });
    const { data } = await api.get('/users/api-keys');
    const createdKey = createRes.data?.apiKey;
    setApiKeys((data.apiKeys || []).map((key) => (
      createdKey?._id && String(key._id) === String(createdKey._id) ? createdKey : key
    )));
    setNewKeyName('');
    setShowApiKeyForm(false);
    showModal('success', 'Success', 'API key generated!');
  };

  const generateApiKey = async (e) => {
    e.preventDefault();
    const keyName = newKeyName.trim();
    if (!keyName) return;
    try {
      await completeGenerateApiKey({ keyName });
    } catch (error) {
      const passwordRequirement = getSensitiveActionRequirement(error);
      if (passwordRequirement) {
        openSensitiveAuthPrompt({
          requirement: passwordRequirement,
          title: 'Verify before generating API key',
          description: 'Confirm your password before a new API credential is created.',
          onVerified: async (result) => runAfterSensitiveAuth({
            result,
            fallbackAction: 'generate_api_key',
            fallbackActionLabel: 'generate an API key',
            runWithTokens: async (tokens) => completeGenerateApiKey({ keyName, ...tokens }),
          }),
        });
        return;
      }
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (token) => completeGenerateApiKey({ keyName, twoFactorToken: token }),
        });
        return;
      }
      showModal('error', 'Error', error.response?.data?.message || 'Failed to generate');
    }
  };

  const performRevokeApiKey = async ({ keyId, sensitiveActionToken = '', twoFactorToken = '' }) => {
    await api.delete(`/users/api-keys/${keyId}`, {
      headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
      data: {
        ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
        ...(twoFactorToken ? { twoFactorToken } : {}),
      },
    });
    showModal('success', 'Success', 'Key revoked');
    const { data } = await api.get('/users/api-keys');
    setApiKeys(data.apiKeys);
  };

  const revokeApiKey = (keyId, keyName) => {
    showModal('confirm', 'Revoke Key', `Revoke "${keyName}"?`, async () => {
      try {
        await performRevokeApiKey({ keyId });
      } catch (error) {
        const passwordRequirement = getSensitiveActionRequirement(error);
        if (passwordRequirement) {
          openSensitiveAuthPrompt({
            requirement: passwordRequirement,
            title: 'Verify before revoking API key',
            description: 'Confirm your password before this API credential is revoked.',
            onVerified: async (result) => runAfterSensitiveAuth({
              result,
              fallbackAction: 'revoke_api_key',
              fallbackActionLabel: 'revoke an API key',
              runWithTokens: async (tokens) => performRevokeApiKey({ keyId, ...tokens }),
            }),
          });
          return;
        }
        const requirement = getTwoFactorRequirement(error);
        if (requirement) {
          openTwoFactorPrompt({
            requirement,
            onVerified: async (token) => performRevokeApiKey({ keyId, twoFactorToken: token }),
          });
          return;
        }
        showModal('error', 'Error', error.response?.data?.message || 'Failed to revoke');
      }
    });
  };

  const saveSocialMedia = async () => {
    const trimmedUrl = socialForm.url.trim();
    if (!trimmedUrl) return;

    const updatedSocial = [...(profile.socialMedia || [])];
    const normalizedNewUrl = normalizeSocialUrl(trimmedUrl);
    const isDuplicate = updatedSocial.some(
      (entry, idx) =>
        idx !== socialForm.editIndex &&
        normalizeSocialUrl(entry?.url) === normalizedNewUrl
    );

    if (isDuplicate) {
      showModal('error', 'Duplicate Link', 'This social link is already connected.');
      return;
    }

    const newItem = { name: socialForm.name.trim(), url: socialForm.url.trim() };
    if (socialForm.editIndex >= 0) {
      updatedSocial[socialForm.editIndex] = newItem;
    } else {
      updatedSocial.push(newItem);
    }
    try {
      await api.put('/users/profile', { ...profile, socialMedia: updatedSocial });
      setProfile({ ...profile, socialMedia: updatedSocial });
      setShowSocialSection(false);
      setSocialForm({ name: '', url: '', editIndex: -1 });
      showModal('success', 'Success', 'Link saved!');
    } catch (error) {
      showModal('error', 'Error', 'Failed to save');
    }
  };

  const performDisconnectSocialAccount = async ({ providerKey, sensitiveActionToken = '', twoFactorToken = '' }) => {
    const { data } = await api.delete(`/users/social/${providerKey}`, {
      headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
      data: {
        ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
        ...(twoFactorToken ? { twoFactorToken } : {}),
      },
    });
    if (data?.user) {
      setProfile(data.user);
    }
    showModal('success', 'Success', 'Connection removed!');
  };

  const disconnectSocialAccount = (providerKey) => {
    showModal('confirm', 'Remove Connection', 'Remove this connected social account?', async () => {
      try {
        await performDisconnectSocialAccount({ providerKey });
      } catch (error) {
        const passwordRequirement = getSensitiveActionRequirement(error);
        if (passwordRequirement) {
          openSensitiveAuthPrompt({
            requirement: passwordRequirement,
            title: 'Verify before disconnecting',
            description: 'Confirm your password before this social connection is removed.',
            onVerified: async (result) => runAfterSensitiveAuth({
              result,
              fallbackAction: 'disconnect_social',
              fallbackActionLabel: 'disconnect a social account',
              runWithTokens: async (tokens) => performDisconnectSocialAccount({ providerKey, ...tokens }),
            }),
          });
          return;
        }
        const requirement = getTwoFactorRequirement(error);
        if (requirement) {
          openTwoFactorPrompt({
            requirement,
            onVerified: async (twoFactorToken) => performDisconnectSocialAccount({ providerKey, twoFactorToken }),
          });
          return;
        }
        showModal('error', 'Error', error.response?.data?.message || 'Failed to remove connection');
      }
    });
  };

  const deleteCustomSocialMedia = (index) => {
    showModal('confirm', 'Delete Link', 'Delete this link?', async () => {
      const currentSocial = Array.isArray(profile?.socialMedia) ? profile.socialMedia : [];
      const updatedSocial = currentSocial.filter((_, i) => i !== index);
      try {
        await api.put('/users/profile', { ...profile, socialMedia: updatedSocial });
        setProfile({ ...profile, socialMedia: updatedSocial });
        showModal('success', 'Success', 'Link deleted!');
      } catch (error) {
        showModal('error', 'Error', 'Failed to delete');
      }
    });
  };

  const findExistingSocialLinkIndexByProvider = (provider) => {
    if (!Array.isArray(profile?.socialMedia)) return -1;
    return profile.socialMedia.findIndex((entry) => isUrlForProvider(entry?.url, provider));
  };

  const handlePrepareManualSocialLink = (provider) => {
    if (!provider) return;

    const existingIndex = findExistingSocialLinkIndexByProvider(provider);
    if (existingIndex >= 0) {
      const existingEntry = profile.socialMedia[existingIndex];
      setSocialForm({
        name: existingEntry?.name || provider.label,
        url: existingEntry?.url || provider.suggestedUrl || '',
        editIndex: existingIndex,
      });
      setShowSocialSection(true);
      return;
    }

    setSocialForm({
      name: provider.label,
      url: provider.suggestedUrl || '',
      editIndex: -1,
    });
    setShowSocialSection(true);
  };

  const handleStartSocialConnect = async (provider) => {
    if (!provider) return;
    setSocialConnectLoading(provider);
    try {
      const redirectUri = getOAuthRedirectUri(provider);
      const { data } = await api.get(`/auth/${provider}/connect/start`, {
        params: {
          redirect_uri: redirectUri,
          ...(isNativeApp() ? { native_app: '1' } : {}),
        }
      });

      const authUrl = data?.authUrl;
      if (!authUrl) {
        throw new Error(`Unable to start ${provider} connection`);
      }

      sessionStorage.setItem('socialConnectIntent', provider);
      window.location.href = authUrl;
    } catch (error) {
      sessionStorage.removeItem('socialConnectIntent');
      showModal('error', 'Connection Failed', error.response?.data?.message || `Failed to connect ${provider}`);
      setSocialConnectLoading('');
    }
  };

  const handleStartTelegramConnect = async () => {
    if (!isTelegramAuthOrigin()) {
      window.location.assign(`${TELEGRAM_AUTH_ORIGIN}/profile/manage`);
      return;
    }

    setSocialConnectLoading('telegram');
    try {
      const telegramUser = await authorizeWithTelegram();
      const { data } = await api.post('/auth/telegram/connect/exchange', telegramUser);
      if (data?.user) {
        setProfile(data.user);
        setUser((currentUser) => ({ ...(currentUser || {}), ...data.user }));
      }
      showModal('success', 'Connected', 'Telegram account connected successfully. You can now use it to sign in.');
    } catch (error) {
      showModal('error', 'Connection Failed', error.response?.data?.message || 'Telegram could not be connected. Please try again.');
    } finally {
      setSocialConnectLoading('');
    }
  };

  const handleSocialProviderAction = (provider) => {
    if (!provider) return;
    if (provider.connectMode === 'oauth') {
      handleStartSocialConnect(provider.key);
      return;
    }
    if (provider.connectMode === 'telegram') {
      handleStartTelegramConnect();
      return;
    }
    handlePrepareManualSocialLink(provider);
  };

  const updateUsernameWithProof = ({ username, sensitiveActionToken = '', twoFactorToken = '' }) =>
    api.put('/users/username', {
      username,
      ...(sensitiveActionToken ? { sensitiveActionToken } : {}),
      ...(twoFactorToken ? { twoFactorToken } : {}),
    }, {
      headers: buildSensitiveActionHeaders({ sensitiveActionToken, twoFactorToken }),
    });

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    const nextUsername = newUsername.trim();
    if (!nextUsername || nextUsername.length < 3) return;
    setUsernameLoading(true);
    try {
      const { data } = await updateUsernameWithProof({ username: nextUsername });
      setUser((currentUser) => ({ ...(currentUser || {}), username: data.user.username }));
      setProfile((currentProfile) => ({ ...(currentProfile || {}), username: data.user.username }));
      setShowUsernameModal(false);
      setNewUsername('');
      showModal('success', 'Success', 'Username updated!');
    } catch (error) {
      const passwordRequirement = getSensitiveActionRequirement(error);
      if (passwordRequirement) {
        openSensitiveAuthPrompt({
          requirement: passwordRequirement,
          title: 'Verify before changing username',
          description: 'Confirm your password before your username is changed.',
          onVerified: async (result) => runAfterSensitiveAuth({
            result,
            fallbackAction: 'change_username',
            fallbackActionLabel: 'change your username',
            runWithTokens: async (tokens) => {
              const { data } = await updateUsernameWithProof({ username: nextUsername, ...tokens });
              setUser((currentUser) => ({ ...(currentUser || {}), username: data.user.username }));
              setProfile((currentProfile) => ({ ...(currentProfile || {}), username: data.user.username }));
              setShowUsernameModal(false);
              setNewUsername('');
              showModal('success', 'Success', 'Username updated!');
            },
          }),
        });
        return;
      }
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (twoFactorToken) => {
            const { data } = await updateUsernameWithProof({ username: nextUsername, twoFactorToken });
            setUser((currentUser) => ({ ...(currentUser || {}), username: data.user.username }));
            setProfile((currentProfile) => ({ ...(currentProfile || {}), username: data.user.username }));
            setShowUsernameModal(false);
            setNewUsername('');
            showModal('success', 'Success', 'Username updated!');
          },
        });
        return;
      }
      showModal('error', 'Error', error.response?.data?.message || 'Failed');
    } finally {
      setUsernameLoading(false);
    }
  };

  const requestDeleteVerification = async (deliveryMethod = '') => {
    setDeletePasswordError('');
    setSendingDeleteCode(true);
    try {
      const { data } = await api.post(
        '/users/account/delete-request',
        { password: deletePassword, ...(deliveryMethod ? { deliveryMethod } : {}) },
        { skipAuthFailureLogout: true }
      );
      if (data?.requiresDeliveryMethod) {
        const methods = Array.isArray(data.methods) ? data.methods : [];
        setDeleteVerificationMethods(methods);
        setSelectedDeleteMethod(methods[0] || '');
        setShowDeleteModal(false);
        setShowDeleteMethodModal(true);
        return;
      }
      if (data?.requiresAuthenticator) {
        setDeleteVerificationMethod('authenticator');
        setShowDeleteModal(false);
        setShowDeleteMethodModal(false);
        openTwoFactorPrompt({
          requirement: {
            action: 'delete_account',
            actionLabel: 'delete your account',
            twoFactor: { ...data.twoFactor, methods: ['authenticator'], preferredMethod: 'authenticator' },
          },
          onVerified: async (token) => {
            sessionStorage.setItem('pendingDeleteAuthenticatorToken', token);
            setShowDeleteFinalConfirm(true);
          },
        });
        return;
      }
      setDeleteCodeDelivery(data?.deliveryChannel || 'email');
      setDeleteVerificationMethod(data?.deliveryMethod || deliveryMethod || data?.deliveryChannel || 'email');
      setDeleteAttemptsRemaining(5);
      setShowDeleteModal(false);
      setShowDeleteMethodModal(false);
      setShowDeleteCodeModal(true);
      showModal('success', 'Code Sent', data?.message || 'Confirmation code sent.');
    } catch (error) {
      const status = error.response?.status;
      const remaining = Number(error.response?.data?.attemptsRemaining);
      if (Number.isFinite(remaining)) setDeleteAttemptsRemaining(Math.max(0, remaining));

      if (status === 401) {
        setDeletePasswordError(`Wrong password. Try again.${Number.isFinite(remaining) ? ` ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : ''}`);
      } else if (status === 429 && remaining === 0) {
        setDeletePasswordError('Too many wrong password attempts. You will be signed out.');
        window.setTimeout(() => {
          clearAuthSession();
          navigate('/login', { replace: true });
        }, 1200);
      } else {
        setDeletePasswordError(error.response?.data?.message || 'Unable to start account deletion.');
      }
    } finally {
      setSendingDeleteCode(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) return;
    await requestDeleteVerification('');
  };

  const handleSelectedDeleteMethod = async (e) => {
    e.preventDefault();
    if (!selectedDeleteMethod) return;
    await requestDeleteVerification(selectedDeleteMethod);
  };

  const verifyDeleteCode = async ({ twoFactorToken = '' } = {}) => {
    const { data } = await api.post('/users/account/delete-verify', {
      code: deleteCode,
      ...(twoFactorToken ? { twoFactorToken } : {}),
    }, twoFactorToken ? { headers: buildTwoFactorHeaders(twoFactorToken) } : undefined);
    setShowDeleteCodeModal(false);
    setShowDeleteFinalConfirm(true);
    return data;
  };

  const handleVerifyDeleteCode = async (e) => {
    e.preventDefault();
    setVerifyingDeleteCode(true);
    try {
      await verifyDeleteCode();
    } catch (error) {
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (token) => {
            await verifyDeleteCode({ twoFactorToken: token });
          },
        });
        return;
      }
      showModal('error', 'Invalid Code', error.response?.data?.message || 'Wrong verification code. Try again.');
    } finally {
      setVerifyingDeleteCode(false);
    }
  };

  const executeFinalDeleteAccount = async ({ twoFactorToken = '' } = {}) => {
    const authenticatorToken = twoFactorToken || sessionStorage.getItem('pendingDeleteAuthenticatorToken') || '';
    const usesAuthenticator = deleteVerificationMethod === 'authenticator';
    const endpoint = usesAuthenticator
      ? '/users/account/delete-confirm-authenticator'
      : '/users/account/delete-confirm';
    await api.post(endpoint, {
      ...(usesAuthenticator ? { twoFactorToken: authenticatorToken } : { code: deleteCode }),
    }, usesAuthenticator ? { headers: buildTwoFactorHeaders(authenticatorToken) } : undefined);
    sessionStorage.removeItem('pendingDeleteAuthenticatorToken');
    clearAuthSession();
    setShowDeleteFinalConfirm(false);
    navigate('/login', { replace: true });
  };

  const handleFinalDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await executeFinalDeleteAccount();
    } catch (error) {
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: async (token) => executeFinalDeleteAccount({ twoFactorToken: token }),
        });
        return;
      }
      showModal('error', 'Deletion Failed', error.response?.data?.message || 'Account could not be deleted. Please start again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleCancelFinalDelete = async () => {
    setCancellingDelete(true);
    try {
      await api.post('/users/account/delete-cancel');
      sessionStorage.removeItem('pendingDeleteAuthenticatorToken');
      setShowDeleteFinalConfirm(false);
      setDeleteCode('');
      setDeletePassword('');
      showModal('success', 'Deletion Cancelled', 'Your account was not deleted.');
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Could not cancel the deletion request.');
    } finally {
      setCancellingDelete(false);
    }
  };

  const handleShare = (postId, postTitle, isArticle = false) => {
    const url = `${window.location.origin}/${isArticle ? 'article' : 'blog'}/${postId}`;
    setShareUrl(url);
    setShareTitle(postTitle);
    setShowShareModal(true);
  };

  const handleTwoFactorPromptVerified = async (token) => {
    const pendingPrompt = twoFactorPrompt;
    setTwoFactorPrompt(null);
    if (!pendingPrompt?.onVerified) return;
    try {
      await pendingPrompt.onVerified(token);
      await refreshTwoFactorStatus().catch(() => null);
    } catch (error) {
      const requirement = getTwoFactorRequirement(error);
      if (requirement) {
        openTwoFactorPrompt({
          requirement,
          onVerified: pendingPrompt.onVerified,
        });
        return;
      }
      showModal('error', 'Error', error.response?.data?.message || 'Two-factor verification failed');
    }
  };

  const twoFactorMethods = Array.isArray(twoFactorStatus?.methods) ? twoFactorStatus.methods : [];
  const isTwoFactorEnabled = Boolean(twoFactorStatus?.enabled);
  const isAuthenticatorEnabled = Boolean(twoFactorStatus?.authenticator?.enabled);
  const isSmsEnabled = Boolean(twoFactorStatus?.sms?.enabled);
  const preferredTwoFactorMethod = twoFactorStatus?.preferredMethod || twoFactorMethods[0] || '';
  const authenticatorConnectedLabel = twoFactorStatus?.authenticator?.connectedAt
    ? new Date(twoFactorStatus.authenticator.connectedAt).toLocaleDateString()
    : '';
  const isTwoFactorSetupActive = Boolean(showTwoFactorSetupOptions || authenticatorSetup || showSmsSetup || smsSetupChallenge);
  const isTwoFactorDetailsExpanded = Boolean(isTwoFactorExpanded || isTwoFactorSetupActive);
  const shouldShowTwoFactorMethods = isTwoFactorEnabled || isTwoFactorSetupActive;
  const twoFactorQrCenterImage = displayUser?.profileImage || '/image/lekhon_url.png';
  const twoFactorDetailsId = 'profile-two-factor-details';
  const twoFactorSummary = authenticatorSetup
    ? t('Finish setup to protect sensitive actions')
    : smsSetupChallenge
      ? t('Enter the SMS code to finish setup')
      : showTwoFactorSetupOptions && !isTwoFactorEnabled
        ? t('Choose a verification method to turn it on')
        : isTwoFactorEnabled
          ? t('Enabled for sensitive account actions')
          : t('Off until you set up Authenticator or SMS');

  const resetTwoFactorSetupDrafts = () => {
    setAuthenticatorSetup(null);
    setAuthenticatorCode('');
    setShowSmsSetup(false);
    setSmsSetupChallenge(null);
    setSmsCode('');
  };

  const handleTwoFactorToggle = () => {
    if (twoFactorLoading) return;

    if (isTwoFactorEnabled) {
      disableTwoFactor();
      return;
    }

    if (isTwoFactorSetupActive) {
      resetTwoFactorSetupDrafts();
      setShowTwoFactorSetupOptions(false);
      setIsTwoFactorExpanded(false);
      return;
    }

    resetTwoFactorSetupDrafts();
    setShowTwoFactorSetupOptions(true);
    setIsTwoFactorExpanded(true);
  };

  const handleAuthenticatorSetupClick = () => {
    if (!isAuthenticatorEnabled) {
      setShowTwoFactorSetupOptions(true);
      startAuthenticatorSetup();
      return;
    }

    showModal(
      'confirm',
      t('Set up another authenticator app?'),
      t('Starting setup will remove the currently connected authenticator app. Only continue if you can finish setup with the new app.'),
      () => startAuthenticatorSetup()
    );
  };

  const formatPostDate = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffDays = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return postDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
    const startDay = startDate.getDay();
    for (let i = 0; i < startDay; i++) {
      week.push({ date: null, count: -1, isInYear: false });
    }
    const monthFirstWeek = {};
    while (current <= endDate) {
      const monthNum = current.getMonth();
      if (current.getDate() === 1) {
        monthFirstWeek[monthNum] = weekCount;
      }
      const dateStr = current.toDateString();
      const count = allContent.filter(item => new Date(item.createdAt).toDateString() === dateStr).length;
      week.push({ date: new Date(current), count, isInYear: true });
      if (week.length === 7) {
        weeks.push([...week]);
        week = [];
        weekCount++;
      }
      current.setDate(current.getDate() + 1);
    }
    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ date: null, count: -1, isInYear: false });
      }
      weeks.push(week);
    }
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
    allContent.forEach(item => years.add(new Date(item.createdAt).getFullYear()));
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

  if (loading) {
    return (
      <div className="min-h-screen theme-page-bg flex items-center justify-center">
        <ScaleLoader color="#6366f1" />
      </div>
    );
  }

  return (
    <div className="lekhon-profile-page min-h-screen theme-page-bg py-8">
      <ScrollToTop />
      <div className="lekhon-profile-shell container mx-auto px-4 max-w-7xl" ref={profileRef}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 font-semibold text-[var(--brand-primary)] hover:opacity-80 transition">
          <FaArrowLeft /> {t('Back')}
        </button>

        <div className="lekhon-profile-grid grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Card */}
            <div
              data-profile-manage-target="profile-details"
              className={`lekhon-profile-card theme-panel rounded-3xl shadow-xl p-6 transition-all duration-300 ${highlightTarget === 'profile-details' ? 'lekhon-target-pulse' : ''}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:gap-6 lg:flex-col lg:items-center">
                {/* Avatar Section */}
                <div className="flex flex-col items-center md:items-start lg:items-center mb-4 md:mb-0 lg:mb-4">
                  <div className="relative mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (hasActiveStatus) {
                          setStatusViewerIndex(0);
                          setShowStatusViewer(true);
                        }
                      }}
                      className={`${hasActiveStatus ? 'cursor-pointer hover:opacity-90 transition' : 'cursor-default'}`}
                      title={hasActiveStatus ? 'View status' : 'No active status'}
                    >
                      <Avatar user={avatarUser} size="xl" showStatusRing />
                    </button>
                    {(imageUploading || imageDeleting) && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <ScaleLoader color="#fff" height={20} width={3} />
                      </div>
                    )}
                    {displayUser?.profileImage && !imageUploading && !imageDeleting && (
                      <button onClick={handleRemoveImage} className="absolute top-0 right-0 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600" title="Remove">
                        <FaTimes size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={openCreateStatusComposer}
                      disabled={statusSaving}
                      className="absolute bottom-0 left-0 bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 disabled:opacity-60"
                      title={statusSlotsRemaining > 0 ? 'Set status' : 'Status limit reached'}
                    >
                      {hasActiveStatus ? <FaEdit size={13} /> : <FaPlus size={13} />}
                    </button>
                    <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700">
                      <FaCamera />
                      <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" disabled={imageUploading || imageDeleting} />
                    </label>
                  </div>
                  <div className="text-center md:text-left lg:text-center">
                    <div className="flex items-center justify-center md:justify-start lg:justify-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{displayUser?.username}</h2>
                      {!displayUser?.isGuest && displayUser?.role !== 'guest' && (
                        displayUser?.isVerified ? (
                          <div className="bg-blue-600 rounded-full p-1"><GoVerified className="text-white" size={18} /></div>
                        ) : (
                          <GoUnverified className="text-gray-400" size={20} />
                        )
                      )}
                     {(displayUser?.isGuest || displayUser?.role === 'guest') && <GuestBadge size="lg" />}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('Member since')} {memberSinceLabel}</p>
                    <div className="mt-2 flex items-center justify-center md:justify-start lg:justify-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {statuses.length}/{MAX_ACTIVE_STATUSES} active status
                      </span>
                      {hasActiveStatus && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatusViewerIndex(0);
                            setShowStatusViewer(true);
                          }}
                          className="text-xs font-semibold text-[var(--brand-primary)] hover:opacity-80"
                        >
                          <FaEye className="inline mr-1" />
                          View
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {!showProfileForm ? (
                  <div className="w-full md:flex-1 lg:w-full">
                    <div className="space-y-3 mb-4">
                      {profile.fullName && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('Name')}</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile.fullName}</span>
                        </div>
                      )}
                      {profile.email && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('Email')}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-300 truncate ml-2">{profile.email}</span>
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('Phone')}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-300">{profile.phone}</span>
                        </div>
                      )}
                      {profile.bio && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('Bio')}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
                        </div>
                      )}
                    </div>
                    {/* Buttons always at bottom */}
                    <div className="flex gap-2 w-full lg:flex-col xl:flex-row">
                      <button onClick={() => { setNewUsername(displayUser?.username || ''); setShowUsernameModal(true); }} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                        <FaEdit size={14} /> {t('Username')}
                      </button>
                      <button onClick={() => setShowProfileForm(true)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2">
                        <FaEdit size={14} /> {t('Profile')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="w-full space-y-3">
                    <input type="text" placeholder={t('Full Name')} value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="email" placeholder={t('Email')} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="tel" placeholder={t('Phone')} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="date" value={profile.dateOfBirth?.split('T')[0] || ''} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold dark:text-gray-300">{t('Bio')}</label>
                        <AIBioGenerator onGenerate={(bio) => setProfile({ ...profile, bio })} />
                      </div>
                      <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows="3" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">{t('Save')}</button>
                      <button type="button" onClick={() => setShowProfileForm(false)} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">{t('Cancel')}</button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Status Card */}
            <div className="theme-panel rounded-3xl shadow-xl p-6 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('My Status')}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {statuses.length} active - {statusSlotsRemaining} slot{statusSlotsRemaining === 1 ? '' : 's'} left
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateStatusComposer}
                  disabled={statusSaving || statusSlotsRemaining <= 0}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                >
                  <FaPlus size={12} />
                  {t('Set Status')}
                </button>
              </div>

              {statuses.length > 0 ? (
                <div className="space-y-3">
                  {statuses.map((status, index) => (
                    <div
                      key={status._id}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-3"
                    >
                      <div className="flex items-start gap-3">
                        {getStatusMediaType(status) === 'video' && getStatusMediaUrl(status) ? (
                          <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-[var(--border-default)] bg-black/80">
                            <video
                              src={getStatusMediaUrl(status)}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-white/90">
                              <FaVideo size={14} />
                            </span>
                          </div>
                        ) : getStatusMediaType(status) === 'image' && getStatusMediaUrl(status) ? (
                          <img
                            src={getStatusMediaUrl(status)}
                            alt="status"
                            className="h-14 w-14 rounded-lg object-cover border border-[var(--border-default)]"
                          />
                        ) : (
                          <div
                            className="h-14 w-14 rounded-lg border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)]"
                            style={{ backgroundColor: status.backgroundColor || '#1f2937' }}
                          >
                            <FaEdit size={14} className="text-white/90" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <span className="inline-flex items-center rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                              {normalizeStatusContentType(status.contentType) === 'post' ? 'Post' : 'Story'}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                            {status.text ||
                              (getStatusMediaType(status) === 'video'
                                ? 'Video update'
                                : getStatusMediaType(status) === 'image'
                                  ? 'Image update'
                                  : normalizeStatusContentType(status.contentType) === 'post'
                                    ? 'Post update'
                                    : 'Story update')}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {formatStatusTimeLeft(status.expiresAt)} - Audience: {status.audience === 'followers' ? 'Followers' : status.audience === 'private' ? 'Only me' : 'Public'}
                          </p>
                          {status.musicLabel ? (
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1 inline-flex items-center gap-1">
                              <FaMusic size={10} />
                              {status.musicLabel}
                              {status.musicSourceType && status.musicSourceType !== 'none'
                                ? ` (${status.musicSourceType})`
                                : ''}
                              {status.musicSourceUrl ? ' * linked' : ''}
                            </p>
                          ) : null}
                          {Array.isArray(status.stickers) && status.stickers.length > 0 ? (
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1 inline-flex items-center gap-1">
                              <FaRegSmile size={10} />
                              {status.stickers.length} sticker{status.stickers.length === 1 ? '' : 's'}
                            </p>
                          ) : null}
                          {getStatusMediaType(status) === 'video' ? (
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                              Trim: {Number(status.trimStartSec || 0).toFixed(1)}s
                              {` - ${Number(
                                Number.isFinite(Number(status.trimEndSec))
                                  ? Number(status.trimEndSec)
                                  : Number(status.trimStartSec || 0) + 10
                              ).toFixed(1)}s`}
                            </p>
                          ) : null}
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                            Seen by {Array.isArray(status.seenBy) ? status.seenBy.length : status.seenByCount || 0}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusViewerIndex(index);
                            setShowStatusViewer(true);
                          }}
                          className="flex-1 bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] px-3 py-2 rounded-lg hover:bg-[var(--surface-elevated)] text-sm font-semibold inline-flex items-center justify-center gap-2"
                        >
                          <FaEye size={12} />
                          {t('View')}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditStatusComposer(status)}
                          className="flex-1 bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] px-3 py-2 rounded-lg hover:bg-[var(--surface-elevated)] text-sm font-semibold inline-flex items-center justify-center gap-2"
                        >
                          <FaEdit size={12} />
                          {t('Edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStatus(status._id)}
                          disabled={statusDeletingId === status._id}
                          className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                          title={t('Delete')}
                        >
                          {statusDeletingId === status._id ? <SyncLoader color="#fff" size={5} /> : <FaTrash size={12} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--background-secondary)] p-4 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">{t('No active status yet. Add one to show your latest update.')}</p>
                </div>
              )}
            </div>

            {/* Social Media Card */}
            <div className="theme-panel rounded-3xl shadow-xl p-6 transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('Social Links')}</h3>
                <button onClick={() => setShowSocialSection(!showSocialSection)} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                  {showSocialSection ? <FaTimes /> : <FaPlus />}
                </button>
              </div>
              
              {showSocialSection && (
                <div className="p-4 rounded-lg mb-4 border border-[var(--border-default)] bg-[var(--background-secondary)]">
                  <div className="space-y-3">
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] p-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t('Connect or add social account')}</p>
                      {availableSocialConnectProviders.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableSocialConnectProviders.map((provider) => (
                            <button
                              key={provider.key}
                              type="button"
                              onClick={() => handleSocialProviderAction(provider)}
                              disabled={provider.connectMode !== 'manual' && socialConnectLoading === provider.key}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--background-secondary)] text-[var(--text-primary)] hover:opacity-90 disabled:opacity-60"
                            >
                              {provider.connectMode !== 'manual' && socialConnectLoading === provider.key ? (
                                <SyncLoader color="var(--brand-primary)" size={6} />
                              ) : (
                                provider.icon
                              )}
                              <span className="text-sm">
                                {provider.connectMode !== 'manual' ? `Connect ${provider.label}` : `Add ${provider.label}`}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-secondary)]">{t('All supported social accounts are already connected.')}</p>
                      )}
                    </div>
                    <input type="text" value={socialForm.name} onChange={(e) => setSocialForm({ ...socialForm, name: e.target.value })} placeholder="Name (optional)" className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                    <input type="url" value={socialForm.url} onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" required />
                    <div className="flex gap-2">
                      <button onClick={saveSocialMedia} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t('Save')}</button>
                      <button onClick={() => { setShowSocialSection(false); setSocialForm({ name: '', url: '', editIndex: -1 }); }} className="flex-1 theme-soft-button px-4 py-2 rounded-lg">{t('Cancel')}</button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid gap-3">
                {connectedSocialAccounts.map((account) => (
                  <div key={account.key} className="flex items-center justify-between gap-3 bg-[var(--background-secondary)] border border-[var(--border-default)] px-4 py-3 rounded-xl">
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-card)] border border-[var(--border-default)]">
                        {account.icon}
                      </span>
                      <p className="font-semibold text-base text-[var(--text-primary)] truncate">{account.label}</p>
                    </div>
                    <button
                      onClick={() =>
                        account.actionType === 'provider'
                          ? disconnectSocialAccount(account.providerKey)
                          : deleteCustomSocialMedia(account.socialIndex)
                      }
                      disabled={account.actionType === 'provider' && !canDisconnectAuthProvider}
                      className="text-red-600 hover:text-red-800 shrink-0 disabled:cursor-not-allowed disabled:text-[var(--text-muted)] disabled:opacity-50"
                      aria-label={account.actionType === 'provider' && !canDisconnectAuthProvider
                        ? `Cannot remove ${account.label} until another sign-in method is available`
                        : `Delete ${account.label} connection`}
                      title={account.actionType === 'provider' && !canDisconnectAuthProvider
                        ? 'Set a permanent password or connect another sign-in method first.'
                        : `Remove ${account.label}`}
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                ))}
                {connectedSocialAccounts.length === 0 && (
                  <p className="text-[var(--text-secondary)] text-sm text-center py-4">{t('No connected accounts')}</p>
                )}
              </div>
            </div>

            {/* Quick Actions - Only on large+ screens */}
            <div className="hidden lg:block">
              <QuickActions 
                user={user} 
                onShareProfile={() => setShowProfileShareModal(true)}
                onShowQR={() => setShowQRModal(true)}
              />
            </div>

            {/* Email Notifications - Only on large+ screens */}
            <div className="hidden lg:block">
              <EmailNotificationSettings
                profile={profile}
                onUpdate={(updates) => handleUpdateProfileSettings(updates, 'Email notification settings updated!')}
              />
            </div>

            {/* Privacy Settings - Only on large+ screens */}
            <div className="hidden lg:block">
              <PrivacySettings
                profile={profile}
                onUpdate={(updates) => handleUpdateProfileSettings(updates, 'Privacy settings updated!')}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-9 space-y-6">
            {/* Profile Completeness */}
            <ProfileCompleteness user={user} profile={profile} />

            {/* Activity Statistics */}
            <ActivityStats
              blogs={blogs}
              articles={articles}
              shorts={shorts}
              user={user}
              savedSummary={savedLibrary.summary}
              onOpenSaved={() => setShowSavedItemsModal(true)}
            />

            {/* Quick Actions - Only on small/medium screens */}
            <div className="lg:hidden">
              <QuickActions 
                user={user} 
                onShareProfile={() => setShowProfileShareModal(true)}
                onShowQR={() => setShowQRModal(true)}
              />
            </div>

            {/* Email Notifications - Only on small/medium screens */}
            <div className="lg:hidden">
              <EmailNotificationSettings
                profile={profile}
                onUpdate={(updates) => handleUpdateProfileSettings(updates, 'Email notification settings updated!')}
              />
            </div>

            {/* Privacy Settings - Only on small/medium screens */}
            <div className="lg:hidden">
              <PrivacySettings
                profile={profile}
                onUpdate={(updates) => handleUpdateProfileSettings(updates, 'Privacy settings updated!')}
              />
            </div>

            {/* Achievements */}
            <Achievements blogs={blogs} articles={articles} shorts={shorts} user={user} />

            {/* Activity Graph */}
            {(blogs.length > 0 || articles.length > 0 || shorts.length > 0) && (
              <div className="theme-panel rounded-3xl shadow-xl p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('Activity')}</h3>
                  <select value={heatmapYear} onChange={(e) => setHeatmapYear(Number(e.target.value))} className="text-xs border border-[var(--border-default)] rounded px-2 py-1 focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--background-secondary)] text-[var(--text-primary)]">
                    {getAvailableYears().map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto pb-2">
                  <div className="inline-flex gap-0.5 min-w-max">
                    <div className="flex flex-col gap-0.5 mr-1">
                      <div className="h-2.5"></div>
                      <div className="w-6 h-2.5 text-[9px] text-[var(--text-secondary)] flex items-center">Mon</div>
                      <div className="w-6 h-2.5"></div>
                      <div className="w-6 h-2.5 text-[9px] text-[var(--text-secondary)] flex items-center">Wed</div>
                      <div className="w-6 h-2.5"></div>
                      <div className="w-6 h-2.5 text-[9px] text-[var(--text-secondary)] flex items-center">Fri</div>
                      <div className="w-6 h-2.5"></div>
                    </div>
                    <div>
                      <div className="relative h-3 mb-0.5">
                        {getContributionData().months.map((m, idx) => (
                          <div key={idx} className="text-[9px] text-[var(--text-secondary)] absolute" style={{ left: `${m.weekIndex * 12}px` }}>{m.month}</div>
                        ))}
                      </div>
                      <div className="flex gap-0.5">
                        {getContributionData().weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className="flex flex-col gap-0.5">
                            {week.map((day, dayIndex) => (
                              <div key={dayIndex} className={`w-2.5 h-2.5 rounded-sm ${getHeatmapColor(day.count, day.isInYear)} ${day.isInYear && day.count > 0 ? 'hover:ring-1 hover:ring-blue-400 cursor-pointer' : ''} transition`} title={day.isInYear ? `${day.date.toLocaleDateString()}: ${day.count} post${day.count !== 1 ? 's' : ''}` : ''}></div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--text-secondary)]">
                  <span>Less</span>
                  <div className="flex gap-0.5">
                    <div className="w-2.5 h-2.5 bg-[var(--background-secondary)] rounded-sm"></div>
                    <div className="w-2.5 h-2.5 bg-green-200 dark:bg-green-800 rounded-sm"></div>
                    <div className="w-2.5 h-2.5 bg-green-400 dark:bg-green-600 rounded-sm"></div>
                    <div className="w-2.5 h-2.5 bg-green-600 dark:bg-green-400 rounded-sm"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>
            )}

            {/* Posts & Shorts Row */}
            <div className="flex flex-col md:flex-row gap-6">
              <div onClick={() => setExpandedCard(expandedCard === 'posts' ? null : 'posts')} className={`theme-panel rounded-3xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 ${
                expandedCard === 'posts' ? 'md:w-full' : expandedCard === 'shorts' ? 'md:w-1/2' : 'md:w-1/2'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('Posts')} ({blogs.length + articles.length})</h3>
                  {(blogs.length > 0 || articles.length > 0) && (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${displayUserId}`); }} className="flex items-center gap-1 text-[var(--brand-primary)] hover:opacity-80 text-sm font-semibold">
                      {t('View All')} <FaArrowRight size={12} />
                    </button>
                  )}
                </div>
                {(blogs.length > 0 || articles.length > 0) ? (
                  <div className={`grid gap-3 ${expandedCard === 'posts' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-1'}`}>
                    {[...blogs, ...articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, expandedCard === 'posts' ? 10 : 2).map(post => (
                      <div key={post._id} className="bg-[var(--background-secondary)] p-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--brand-primary)] hover:shadow-md transition group">
                        <div onClick={(e) => { e.stopPropagation(); navigate(post.author ? `/blog/${post._id}` : `/article/${post._id}`); }} className="cursor-pointer">
                          <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate mb-1" title={post.title}>{post.title}</h4>
                          <p className="text-xs text-[var(--text-secondary)]">{formatPostDate(post.createdAt)}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleShare(post._id, post.title, !post.author); }} className="mt-2 text-[var(--brand-primary)] hover:opacity-80 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <FaShare size={10} /> Share
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)] text-sm">{t('No posts yet')}</p>
                )}
              </div>
              
              <div onClick={() => setExpandedCard(expandedCard === 'shorts' ? null : 'shorts')} className={`theme-panel rounded-3xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 ${
                expandedCard === 'shorts' ? 'md:w-full' : expandedCard === 'posts' ? 'md:w-1/2' : 'md:w-1/2'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('Shorts')} ({shorts.length})</h3>
                  {shorts.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${displayUserId}`); }} className="flex items-center gap-1 text-[var(--brand-primary)] hover:opacity-80 text-sm font-semibold">
                      {t('View All')} <FaArrowRight size={12} />
                    </button>
                  )}
                </div>
                {shorts.length > 0 ? (
                  <div className={`grid gap-3 ${expandedCard === 'shorts' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-1'}`}>
                    {shorts.slice(0, expandedCard === 'shorts' ? 10 : 2).map(short => (
                      <div key={short._id} onClick={(e) => { e.stopPropagation(); navigate(`/shorts/${short._id}`); }} className="bg-[var(--background-secondary)] p-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--brand-primary)] hover:shadow-md transition cursor-pointer">
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate mb-1" title={short.title}>{short.title}</h4>
                        <p className="text-xs text-[var(--text-secondary)]">{formatPostDate(short.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)] text-sm">{t('No shorts yet')}</p>
                )}
              </div>
            </div>

            {/* Developer & Contact Row */}
            <div className="flex flex-col md:flex-row gap-6">
              <div data-profile-manage-target="developer" onClick={() => setExpandedCard(expandedCard === 'developer' ? null : 'developer')} className={`theme-panel rounded-3xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 ${highlightTarget === 'developer' ? 'lekhon-target-pulse' : ''} ${
                expandedCard === 'developer' ? 'md:w-full' : expandedCard === 'contact' ? 'md:w-1/2' : 'md:w-1/2'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{t('Developer')}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{t('Generate API keys for external access')}</p>
                  </div>
                  <div className={PROFILE_SECTION_ICON_CLASS}>
                    <FaKey size={16} />
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowApiKeyForm(!showApiKeyForm); }} className="theme-soft-button mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand-primary)]">
                  {showApiKeyForm ? <><FaTimes size={11} className="text-[var(--brand-primary)]" /> {t('Cancel')}</> : <><FaPlus size={11} className="text-[var(--brand-primary)]" /> {t('Generate Key')}</>}
                </button>
                {showApiKeyForm && (
                  <form onSubmit={(e) => { e.preventDefault(); generateApiKey(e); }} className="bg-[var(--background-secondary)] border border-[var(--border-default)] p-4 rounded-lg mb-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Key name" className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-primary)]" required />
                      <button type="submit" className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)]">{t('Generate')}</button>
                    </div>
                  </form>
                )}
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div key={key._id} className="bg-[var(--background-secondary)] border border-[var(--border-default)] p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-[var(--text-primary)]">{key.name}</h4>
                          <p className="text-xs text-[var(--text-secondary)]">{new Date(key.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); revokeApiKey(key._id, key.name); }} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                          <FaTrash size={12} /> {t('Revoke')}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 bg-[var(--surface-card)] p-2 rounded border border-[var(--border-default)]">
                        <code className="flex-1 text-sm font-mono overflow-x-auto text-[var(--text-primary)]">{visibleKeys[key._id] ? (key.key || key.keyPreview || 'Hidden') : '*'.repeat(40)}</code>
                        <button onClick={(e) => { e.stopPropagation(); setVisibleKeys(prev => ({ ...prev, [key._id]: !prev[key._id] })); }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1">
                          {visibleKeys[key._id] ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <button disabled={!key.key} onClick={(e) => { e.stopPropagation(); if (!key.key) return; navigator.clipboard.writeText(key.key); showModal('success', 'Success', 'Copied!'); }} className={`p-1 ${key.key ? 'text-[var(--brand-primary)] hover:opacity-80' : 'cursor-not-allowed text-[var(--text-muted)]'}`}>
                          <FaCopy />
                        </button>
                      </div>
                    </div>
                  ))}
                  {apiKeys.length === 0 && <p className="text-[var(--text-secondary)] text-center py-4">{t('No keys')}</p>}
                </div>
              </div>
              
              <div data-profile-manage-target="contact" onClick={() => setExpandedCard(expandedCard === 'contact' ? null : 'contact')} className={`theme-panel rounded-3xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 ${highlightTarget === 'contact' ? 'lekhon-target-pulse' : ''} ${
                expandedCard === 'contact' ? 'md:w-full' : expandedCard === 'developer' ? 'md:w-1/2' : 'md:w-1/2'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{t('Help & Info')}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{t('Get support or learn about us')}</p>
                  </div>
                  <div className={PROFILE_SECTION_ICON_CLASS}>
                    <FaEdit size={15} />
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button onClick={(e) => { e.stopPropagation(); navigate('/about'); }} className="theme-soft-button flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:border-[var(--brand-primary)]">
                    <PiBookOpenTextThin size={16} className="text-[var(--brand-primary)]" /> About Us
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowContactSection(true); }} className="theme-soft-button flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:border-[var(--brand-primary)]">
                    <FaEdit size={13} className="text-[var(--brand-primary)]" /> Contact
                  </button>
                </div>
                {showContactSection && (
                  <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] p-4 rounded-lg" onClick={(e) => e.stopPropagation()}>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!contactForm.issue.trim()) return;
                      setContactLoading(true);
                      try {
                        await api.post('/users/contact', { issue: contactForm.issue, advice: contactForm.advice, userEmail: displayUser.email, username: displayUser.username });
                        setShowContactSection(false);
                        setContactForm({ issue: '', advice: '' });
                        showModal('success', 'Success', 'Message sent!');
                      } catch (error) {
                        showModal('error', 'Error', 'Failed to send');
                      } finally {
                        setContactLoading(false);
                      }
                    }}>
                      <div className="space-y-3">
                        <textarea value={contactForm.issue} onChange={(e) => setContactForm({ ...contactForm, issue: e.target.value })} className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-green-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" rows="3" placeholder="Your issue..." required />
                        <textarea value={contactForm.advice} onChange={(e) => setContactForm({ ...contactForm, advice: e.target.value })} className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-green-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" rows="2" placeholder="Suggestions..." />
                        <div className="flex gap-2">
                          <button type="submit" disabled={contactLoading} className="flex-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-70 flex items-center justify-center gap-2">
                            {contactLoading ? <HashLoader color="#fff" size={20} /> : t('Send')}
                          </button>
                          <button type="button" onClick={() => { setShowContactSection(false); setContactForm({ issue: '', advice: '' }); }} className="flex-1 theme-soft-button px-3 py-2 rounded-lg text-sm font-semibold">{t('Cancel')}</button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Password & Security */}
            <div
              data-profile-manage-target="security"
              className={`theme-panel rounded-3xl shadow-xl p-6 transition-all duration-300 ${highlightTarget === 'security' ? 'lekhon-target-pulse' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{t('Password & Security')}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{t('Manage your account security')}</p>
                </div>
                <div className={PROFILE_SECTION_ICON_CLASS}>
                  <FaKey size={16} />
                </div>
              </div>
              {showPasswordSetupNotice && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {t('For security, please change your temporary password now.')}
                  </p>
                  <p className="text-xs mt-1 text-amber-700 dark:text-amber-400">
                    {passwordDeliveryChannel === 'telegram'
                      ? t('We sent the temporary password in a private message from the Lekhon Telegram bot. Use it as the current password, then set a new one.')
                      : t('Use the temporary password from your welcome email as the current password, then set a new one.')}
                  </p>
                </div>
              )}
              {showTelegramDeliveryFailure && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-3">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    {t('We could not deliver your temporary password on Telegram.')}
                  </p>
                  <p className="text-xs mt-1 text-red-700 dark:text-red-400">
                    {t('Open the Lekhon Telegram bot, tap Start, then sign in with Telegram again so we can send a private message.')}
                  </p>
                </div>
              )}
              {showSocialEmailNotice && (
                <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 p-3">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    {t('Add an email to complete onboarding')}
                  </p>
                  <p className="text-xs mt-1 text-blue-700 dark:text-blue-400">
                    {socialEmailSource === 'telegram'
                      ? t('Telegram does not provide your email. Add one in profile details for account recovery and security notifications; Telegram will remain available for sign-in.')
                      : t('Your social sign-in account did not provide an email. Add your email in profile details to receive welcome and security notifications.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowProfileForm(true)}
                    className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300 underline"
                  >
                    {t('Open profile details')}
                  </button>
                </div>
              )}
              <div
                data-profile-manage-target="two-factor"
                className={`mb-4 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] ${highlightTarget === 'two-factor' ? 'lekhon-target-pulse' : ''}`}
              >
                <div className="flex flex-col gap-2 border-b border-[var(--border-default)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setIsTwoFactorExpanded((current) => !current)}
                    aria-expanded={isTwoFactorDetailsExpanded}
                    aria-controls={twoFactorDetailsId}
                    className="flex w-full min-w-0 items-center gap-2 rounded-lg text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] sm:flex-1"
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${
                      isTwoFactorEnabled
                        ? 'border-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--brand-primary)]'
                        : 'border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)]'
                    }`}>
                      <FaShieldAlt size={13} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{t('Two-factor authentication')}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{twoFactorSummary}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className={`text-[11px] font-bold ${isTwoFactorEnabled ? 'text-[var(--brand-primary)]' : isTwoFactorSetupActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`}>
                      {isTwoFactorEnabled ? t('On') : isTwoFactorSetupActive ? t('Setup') : t('Off')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isTwoFactorEnabled}
                      aria-label={isTwoFactorEnabled ? t('Turn off two-factor authentication') : isTwoFactorSetupActive ? t('Cancel two-factor setup') : t('Turn on two-factor authentication')}
                      onClick={handleTwoFactorToggle}
                      disabled={twoFactorLoading}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border p-0.5 transition disabled:cursor-not-allowed disabled:opacity-70 ${
                        isTwoFactorEnabled
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]'
                          : isTwoFactorSetupActive
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]'
                            : 'border-[var(--border-default)] bg-[var(--surface-card)]'
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full shadow-sm transition ${
                          isTwoFactorEnabled
                            ? 'translate-x-4 bg-[var(--surface-card)]'
                            : isTwoFactorSetupActive
                              ? 'translate-x-2 bg-[var(--surface-card)]'
                              : 'translate-x-0 bg-[var(--text-muted)]'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {isTwoFactorDetailsExpanded && (
                <div id={twoFactorDetailsId} className="divide-y divide-[var(--border-default)]">
                  {!shouldShowTwoFactorMethods ? (
                    <div className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                      {t('Turn on two-factor authentication to choose Authenticator app or SMS verification.')}
                    </div>
                  ) : (
                    <>
                  <div className="px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-card)] text-[var(--brand-primary)]">
                          <FaKey size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)]">{t('Authenticator app')}</p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {isAuthenticatorEnabled
                              ? `${t('Connected authenticator app')}${authenticatorConnectedLabel ? ` · ${authenticatorConnectedLabel}` : ''}`
                              : t('No authenticator app connected')}
                          </p>
                          {isAuthenticatorEnabled && (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {t('Only one authenticator app can be connected at a time.')}
                            </p>
                          )}
                        </div>
                      </div>
                      {!authenticatorSetup && (
                        <button
                          type="button"
                          onClick={handleAuthenticatorSetupClick}
                          disabled={twoFactorLoading}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold theme-soft-button hover:border-[var(--brand-primary)] disabled:opacity-70"
                        >
                          <FaPlus size={10} className="text-[var(--brand-primary)]" />
                          {isAuthenticatorEnabled ? t('Set up another') : t('Set up')}
                        </button>
                      )}
                    </div>

                    {authenticatorSetup && (
                      <form onSubmit={verifyAuthenticatorSetup} className="mt-4 grid gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 lg:grid-cols-[auto_1fr]">
                        <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                          <QRCodeSVG
                            value={authenticatorSetup.otpAuthUrl}
                            size={220}
                            bgColor="#ffffff"
                            fgColor="#111827"
                            level="H"
                            marginSize={4}
                            imageSettings={{
                              src: twoFactorQrCenterImage,
                              height: 22,
                              width: 22,
                              excavate: true,
                              crossOrigin: 'anonymous',
                            }}
                          />
                        </div>
                        <div className="min-w-0 space-y-3">
                          {authenticatorSetup.previousAuthenticatorRemoved && (
                            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                              {t('Previous authenticator app removed. Verify the new code to finish setup.')}
                            </p>
                          )}
                          <div>
                            <p className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">{t('Manual key')}</p>
                            <code className="block break-all rounded-lg bg-[var(--background-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]">
                              {authenticatorSetup.secret}
                            </code>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={authenticatorCode}
                            onChange={(e) => setAuthenticatorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-center text-xl tracking-[0.25em] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                            maxLength={6}
                            required
                          />
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button type="submit" disabled={twoFactorLoading || authenticatorCode.length < 6} className="flex-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-70">
                              {twoFactorLoading ? t('Verifying...') : t('Verify')}
                            </button>
                            <button type="button" onClick={() => { setAuthenticatorSetup(null); setAuthenticatorCode(''); if (!isTwoFactorEnabled && !showSmsSetup && !smsSetupChallenge) setShowTwoFactorSetupOptions(false); }} className="rounded-lg px-3 py-2 text-sm font-semibold theme-soft-button">
                              {t('Cancel')}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>

                  <div className="px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-card)] text-[var(--brand-primary)]">
                          <FaMobileAlt size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)]">{t('SMS verification')}</p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {isSmsEnabled && twoFactorStatus?.sms?.phoneMasked
                              ? `${t('Verified mobile')} ${twoFactorStatus.sms.phoneMasked}`
                              : t('No mobile number connected')}
                          </p>
                        </div>
                      </div>
                      {!showSmsSetup && !smsSetupChallenge && (
                        <button
                          type="button"
                          onClick={() => setShowSmsSetup(true)}
                          disabled={twoFactorLoading}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold theme-soft-button hover:border-[var(--brand-primary)] disabled:opacity-70"
                        >
                          <FaPlus size={10} className="text-[var(--brand-primary)]" />
                          {isSmsEnabled ? t('Change mobile') : t('Set up SMS')}
                        </button>
                      )}
                    </div>

                    {(showSmsSetup || smsSetupChallenge) && (
                      !smsSetupChallenge ? (
                        <form onSubmit={startSmsSetup} className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 sm:flex-row">
                          <input
                            type="tel"
                            value={smsPhone}
                            onChange={(e) => setSmsPhone(e.target.value)}
                            placeholder="+919876543210"
                            className="min-w-0 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                            required
                          />
                          <button type="submit" disabled={twoFactorLoading} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-70">
                            {twoFactorLoading ? t('Sending...') : t('Send code')}
                          </button>
                          <button type="button" onClick={() => { setShowSmsSetup(false); if (!isTwoFactorEnabled && !authenticatorSetup && !smsSetupChallenge) setShowTwoFactorSetupOptions(false); }} className="rounded-lg px-3 py-2 text-sm font-semibold theme-soft-button">
                            {t('Cancel')}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={verifySmsSetup} className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 sm:flex-row">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="min-w-0 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-center text-xl tracking-[0.25em] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                            maxLength={6}
                            required
                          />
                          <button type="submit" disabled={twoFactorLoading || smsCode.length < 6} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-70">
                            {twoFactorLoading ? t('Verifying...') : t('Verify')}
                          </button>
                          <button type="button" onClick={() => { setSmsSetupChallenge(null); setSmsCode(''); setShowSmsSetup(false); if (!isTwoFactorEnabled && !authenticatorSetup) setShowTwoFactorSetupOptions(false); }} className="rounded-lg px-3 py-2 text-sm font-semibold theme-soft-button">
                            {t('Cancel')}
                          </button>
                        </form>
                      )
                    )}
                  </div>

                  {isTwoFactorEnabled && twoFactorMethods.length > 1 && (
                    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{t('Default verification method')}</p>
                      <div className="flex flex-wrap gap-2">
                        {twoFactorMethods.map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPreferredTwoFactorMethod(method)}
                            disabled={twoFactorLoading || preferredTwoFactorMethod === method}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                              preferredTwoFactorMethod === method
                                ? 'bg-[var(--brand-primary)] text-white'
                                : 'theme-soft-button'
                            }`}
                          >
                            {method === 'sms' ? t('SMS') : t('Authenticator')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                    </>
                  )}
                </div>
                )}
              </div>
              <div
                data-profile-manage-target="password"
                className={`flex flex-wrap gap-2 rounded-xl ${highlightTarget === 'password' ? 'lekhon-target-pulse' : ''}`}
              >
                <button onClick={() => { setShowPasswordForm(!showPasswordForm); setShowForgotPassword(false); }} className="theme-soft-button inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand-primary)]">
                  <FaKey size={11} className="text-[var(--brand-primary)]" /> {t('Change Password')}
                </button>
                <button onClick={() => { setShowForgotPassword(!showForgotPassword); setShowPasswordForm(false); }} className="theme-soft-button inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand-primary)]">
                  <FaKey size={11} className="text-[var(--brand-primary)]" /> {t('Forgot Password')}
                </button>
              </div>
              {showPasswordForm && (
                <form onSubmit={handleChangePassword} className="space-y-4 mt-4 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--background-secondary)]">
                  <div className="relative">
                    <input type={showCurrentPassword ? 'text' : 'password'} placeholder={t('Current Password')} value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} className="w-full px-4 py-2 pr-10 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" required />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                      {showCurrentPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showNewPassword ? 'text' : 'password'} placeholder={t('New Password')} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full px-4 py-2 pr-10 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" required minLength={6} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                      {showNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                  {/* Password Strength Meter */}
                  {passwords.newPassword && (
                    <div>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              passwords.newPassword.length >= level * 3
                                ? passwords.newPassword.length < 6
                                  ? 'bg-red-500'
                                  : passwords.newPassword.length < 10
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                                : 'bg-[var(--text-muted)]/40'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {passwords.newPassword.length < 6 ? 'Weak' : passwords.newPassword.length < 10 ? 'Medium' : 'Strong'}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] flex items-center justify-center gap-2 disabled:opacity-70" disabled={sendingPasswordCode}>
                      {sendingPasswordCode ? <SyncLoader color="#fff" size={8} /> : t('Change Password')}
                    </button>
                    <button type="button" onClick={() => { setShowPasswordForm(false); setPasswords({ currentPassword: '', newPassword: '' }); }} className="theme-soft-button px-3 py-2 rounded-lg text-sm font-semibold">{t('Cancel')}</button>
                  </div>
                </form>
              )}
              {showForgotPassword && (
                <form onSubmit={handleAuthenticatedForgotPasswordRequest} className="space-y-4 mt-4 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--background-secondary)]">
                  <p className="text-sm text-[var(--text-primary)]">
                    {t('Set a new password and confirm it with a code sent through your linked email or Telegram account.')}
                  </p>
                  <input
                    type="password"
                    value={forgotPasswordValues.newPassword}
                    onChange={(e) => setForgotPasswordValues({ ...forgotPasswordValues, newPassword: e.target.value })}
                    placeholder={t('New Password')}
                    className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-orange-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    minLength={6}
                    required
                  />
                  <input
                    type="password"
                    value={forgotPasswordValues.confirmPassword}
                    onChange={(e) => setForgotPasswordValues({ ...forgotPasswordValues, confirmPassword: e.target.value })}
                    placeholder={t('Confirm Password')}
                    className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-orange-500 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    minLength={6}
                    required
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={sendingForgotPasswordCode} className="flex-1 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-hover)] flex items-center justify-center gap-2 disabled:opacity-70">
                      {sendingForgotPasswordCode ? <SyncLoader color="#fff" size={8} /> : t('Send Confirmation Code')}
                    </button>
                    <button type="button" onClick={() => { setShowForgotPassword(false); setForgotPasswordValues({ newPassword: '', confirmPassword: '' }); }} className="theme-soft-button px-3 py-2 rounded-lg text-sm font-semibold">{t('Cancel')}</button>
                  </div>
                </form>
              )}
            </div>

            {/* Danger Zone */}
            {!displayUser?.isGuest && displayUser?.role !== 'guest' && (
              <div className="theme-panel rounded-3xl shadow-xl p-6 border border-red-200 dark:border-red-700">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">{t('Danger Zone')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('Delete account permanently')}</p>
                <button onClick={() => setShowDeleteModal(true)} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2">
                  <FaTrash /> {t('Delete Account')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <TwoFactorVerificationModal
        open={Boolean(twoFactorPrompt)}
        action={twoFactorPrompt?.action}
        actionLabel={twoFactorPrompt?.actionLabel}
        twoFactor={twoFactorPrompt?.twoFactor}
        requestChallenge={requestAuthenticatedTwoFactorChallenge}
        verifyChallenge={verifyAuthenticatedTwoFactorChallenge}
        onVerified={handleTwoFactorPromptVerified}
        onClose={() => setTwoFactorPrompt(null)}
      />

      <SensitiveActionAuthModal
        open={Boolean(sensitiveAuthPrompt)}
        action={sensitiveAuthPrompt?.action}
        actionLabel={sensitiveAuthPrompt?.actionLabel}
        title={sensitiveAuthPrompt?.title}
        description={sensitiveAuthPrompt?.description}
        onVerified={handleSensitiveAuthVerified}
        onForgotPassword={handleSensitiveAuthForgotPassword}
        onClose={() => setSensitiveAuthPrompt(null)}
      />

      {/* Universal Modal */}
      {modal.show && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-[60] p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {modal.type === 'success' && <FaCheckCircle className="text-green-500 text-3xl" />}
                {modal.type === 'error' && <FaTimesCircle className="text-red-500 text-3xl" />}
                {modal.type === 'confirm' && <FaExclamationCircle className="text-yellow-500 text-3xl" />}
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${modal.type === 'success' ? 'text-green-700' : modal.type === 'error' ? 'text-red-700' : 'text-yellow-700'}`}>{modal.title}</h3>
                <p className="text-gray-700 dark:text-gray-300">{modal.message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {modal.type === 'confirm' ? (
                <>
                  <button onClick={() => { modal.onConfirm(); closeModal(); }} className="flex-1 bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600">Confirm</button>
                  <button onClick={closeModal} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">Cancel</button>
                </>
              ) : (
                <button onClick={closeModal} className={`w-full px-6 py-2 rounded-lg ${modal.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 dark:text-white">{t('Edit Username')}</h3>
            <form onSubmit={handleUpdateUsername}>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="New username" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white" minLength={3} required />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2" disabled={usernameLoading}>
                  {usernameLoading ? <BeatLoader color="#fff" size={8} /> : t('Change')}
                </button>
                <button type="button" onClick={() => { setShowUsernameModal(false); setNewUsername(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Code Modal */}
      {showPasswordCodeModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-blue-600 mb-4">{t('Enter Code')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {passwordCodeDelivery === 'both'
                ? t('Enter the 6-digit code sent to your email and privately by the Lekhon Telegram bot')
                : passwordCodeDelivery === 'telegram'
                  ? t('Enter the 6-digit code sent privately by the Lekhon Telegram bot')
                  : t('6-digit code sent to email')}
            </p>
            <form onSubmit={handleConfirmPasswordChange}>
              <input type="text" value={passwordCode} onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4 text-center text-2xl tracking-widest dark:bg-gray-700 dark:border-gray-600 dark:text-white" maxLength={6} required />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">{t('Confirm')}</button>
                <button type="button" onClick={() => { setShowPasswordCodeModal(false); setPasswordCode(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authenticated Forgot Password Code Modal */}
      {showForgotPasswordCodeModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-orange-600 mb-4">{t('Enter Confirmation Code')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {forgotPasswordCodeDelivery === 'both'
                ? t('Enter the 6-digit code sent to your email and privately by the Lekhon Telegram bot')
                : forgotPasswordCodeDelivery === 'telegram'
                  ? t('Enter the 6-digit code sent privately by the Lekhon Telegram bot')
                  : t('6-digit code sent to email')}
            </p>
            <form onSubmit={handleConfirmAuthenticatedForgotPassword}>
              <input
                type="text"
                value={forgotPasswordCode}
                onChange={(e) => setForgotPasswordCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 mb-4 text-center text-2xl tracking-widest dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                maxLength={6}
                required
              />
              <div className="flex gap-3">
                <button type="submit" disabled={confirmingForgotPassword || forgotPasswordCode.length < 6} className="flex-1 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-70 flex items-center justify-center gap-2">
                  {confirmingForgotPassword ? <SyncLoader color="#fff" size={8} /> : t('Confirm')}
                </button>
                <button type="button" onClick={() => { setShowForgotPasswordCodeModal(false); setForgotPasswordCode(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Delete Account')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{t('This will permanently delete all your data')}</p>
            <p className="text-red-600 font-semibold mb-4">{t('This cannot be undone!')}</p>
            <form onSubmit={handleDeleteAccount}>
              <input type="password" value={deletePassword} onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(''); }} placeholder={t('Your password')} className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-2 bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" disabled={sendingDeleteCode} required />
              {deletePasswordError && <p className="mb-2 text-sm font-semibold text-red-600">{t(deletePasswordError)}</p>}
              <p className="mb-4 text-xs text-[var(--text-secondary)]">{t('Maximum 5 password attempts.')} {deleteAttemptsRemaining} {t('remaining')}.</p>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2" disabled={sendingDeleteCode}>
                  {sendingDeleteCode
                    ? <SyncLoader color="#fff" size={8} />
                    : t(availableDeleteMethods.length > 1 ? 'Continue' : 'Send Code')}
                </button>
                <button type="button" disabled={sendingDeleteCode} onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeletePasswordError(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg disabled:opacity-60">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Deletion Verification Method */}
      {showDeleteMethodModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-2">{t('Choose Verification Method')}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{t('Select where you want to verify this account deletion request.')}</p>
            <form onSubmit={handleSelectedDeleteMethod}>
              <div className="space-y-2 mb-5">
                {deleteVerificationMethods.map((method) => {
                  const methodLabel = method === 'email'
                    ? `Email${profile?.email ? ` (${maskEmailAddress(profile.email)})` : ''}`
                    : method === 'telegram'
                      ? 'Telegram'
                      : 'Authenticator app';
                  return (
                    <label key={method} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${selectedDeleteMethod === method ? 'border-[var(--brand-primary)] bg-[var(--brand-soft)]' : 'border-[var(--border-default)] bg-[var(--background-secondary)]'}`}>
                      <input
                        type="radio"
                        name="deleteVerificationMethod"
                        value={method}
                        checked={selectedDeleteMethod === method}
                        onChange={() => setSelectedDeleteMethod(method)}
                        disabled={sendingDeleteCode}
                        className="h-4 w-4 accent-[var(--brand-primary)]"
                      />
                      <span className="font-semibold text-[var(--text-primary)]">{t(methodLabel)}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={sendingDeleteCode || !selectedDeleteMethod} className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {sendingDeleteCode
                    ? <SyncLoader color="#fff" size={8} />
                    : t(selectedDeleteMethod === 'authenticator' ? 'Continue' : 'Send Code')}
                </button>
                <button type="button" disabled={sendingDeleteCode} onClick={() => { setShowDeleteMethodModal(false); setDeletePassword(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg disabled:opacity-60">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Code Modal */}
      {showDeleteCodeModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Enter Code')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              {deleteCodeDelivery === 'both'
                ? t('Enter the 6-digit deletion code sent to your email and privately by the Lekhon Telegram bot')
                : deleteCodeDelivery === 'telegram'
                  ? t('Enter the 6-digit deletion code sent privately by the Lekhon Telegram bot')
                  : t('6-digit code sent to email')}
            </p>
            <p className="text-red-600 font-semibold mb-4 flex items-center gap-1"><FaExclamationCircle className="text-red-500" /> {t('Permanent!')}</p>
            <form onSubmit={handleVerifyDeleteCode}>
              <input type="text" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 text-center text-2xl tracking-widest bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" maxLength={6} disabled={verifyingDeleteCode} required />
              <div className="flex gap-3">
                <button type="submit" disabled={verifyingDeleteCode || deleteCode.length < 6} className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {verifyingDeleteCode ? <SyncLoader color="#fff" size={8} /> : t('Verify Code')}
                </button>
                <button type="button" disabled={verifyingDeleteCode} onClick={() => { setShowDeleteCodeModal(false); setDeleteCode(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg disabled:opacity-60">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Final Account Deletion Confirmation */}
      {showDeleteFinalConfirm && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Final Confirmation')}</h3>
            <p className="text-[var(--text-primary)] mb-2">{t('Your verification code was accepted.')}</p>
            <p className="text-red-600 font-semibold mb-5">{t('Do you still want to permanently delete your account and all corresponding data?')}</p>
            <div className="flex gap-3">
              <button type="button" onClick={handleFinalDeleteAccount} disabled={deletingAccount || cancellingDelete} className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {deletingAccount ? <SyncLoader color="#fff" size={8} /> : t('Permanently Delete')}
              </button>
              <button type="button" disabled={deletingAccount || cancellingDelete} onClick={handleCancelFinalDelete} className="flex-1 theme-soft-button px-6 py-2 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
                {cancellingDelete ? <SyncLoader color="var(--text-primary)" size={8} /> : t('Keep Account')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('Share')}</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-gray-700"><FaTimes size={24} /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaFacebookF className="text-2xl" />
                <span className="text-xs font-semibold">Facebook</span>
              </button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank', 'noopener,noreferrer')} className="bg-black hover:bg-gray-800 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaXTwitter className="text-2xl" />
                <span className="text-xs font-semibold">Twitter</span>
              </button>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); showModal('success', 'Success', 'Link copied!'); setShowShareModal(false); }} className="bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaCopy className="text-2xl" />
                <span className="text-xs font-semibold">Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Share Modal */}
      {showProfileShareModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowProfileShareModal(false)}>
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Share Profile</h3>
              <button onClick={() => setShowProfileShareModal(false)} className="text-gray-500 hover:text-gray-700"><FaTimes size={24} /></button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/user/${displayUserId}`)}`, '_blank', 'noopener,noreferrer')} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaFacebookF className="text-2xl" />
                <span className="text-xs font-semibold">Facebook</span>
              </button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/user/${displayUserId}`)}&text=${encodeURIComponent(`Check out ${displayUser.username}'s profile!`)}`, '_blank', 'noopener,noreferrer')} className="bg-black hover:bg-gray-800 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaXTwitter className="text-2xl" />
                <span className="text-xs font-semibold">Twitter</span>
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/user/${displayUserId}`); showModal('success', 'Success', 'Profile link copied!'); setShowProfileShareModal(false); }} className="bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-lg flex flex-col items-center gap-2">
                <FaCopy className="text-2xl" />
                <span className="text-xs font-semibold">Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal 
        show={showQRModal} 
        onClose={() => setShowQRModal(false)}
        profileUrl={`${window.location.origin}/user/${displayUserId}`}
        username={displayUser.username}
        logoSrc={displayUser?.profileImage || '/image/lekhon_url.png'}
      />

      {/* Status Composer Modal */}
      {showStatusComposer && (
        <div className="fixed inset-0 theme-modal-overlay flex items-stretch sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="theme-modal-card w-full h-full sm:h-auto sm:max-h-[92vh] max-w-6xl rounded-none sm:rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--border-default)]">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {editingStatusId ? t('Edit Status') : t('Set Status')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowStatusComposer(false);
                  resetStatusComposer();
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="px-4 sm:px-6 pt-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] p-1 bg-[var(--surface-card)]">
                <button
                  type="button"
                  onClick={() => setStatusComposerContentType('story')}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isStoryComposer
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Story
                </button>
                <button
                  type="button"
                  onClick={() => setStatusComposerContentType('post')}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isPostComposer
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Post
                </button>
              </div>
            </div>

            <form onSubmit={handleStatusSave} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4 pt-4">
                <div className="grid grid-cols-1 xl:grid-cols-[350px_minmax(0,1fr)] gap-5 min-h-0">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-2">
                      {isPostComposer ? 'Post Preview (9:16)' : 'Story Preview (9:16)'}
                    </div>
                    <div
                      ref={statusPreviewRef}
                      className="relative mx-auto w-full max-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden border border-[var(--border-default)] bg-black"
                      onPointerDown={(event) => {
                        if (event.target === event.currentTarget) {
                          updateStatusTextPositionFromPointer(event.clientX, event.clientY);
                        }
                      }}
                    >
                      {statusForm.mediaPreview ? (
                        statusForm.mediaType === 'video' ? (
                          <video
                            src={statusForm.mediaPreview}
                            className="absolute inset-0 w-full h-full object-cover"
                            playsInline
                            muted
                            autoPlay
                            loop
                            onLoadedMetadata={handleStatusPreviewVideoLoadedMetadata}
                          />
                        ) : (
                          <img
                            src={statusForm.mediaPreview}
                            alt="Status preview"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{ backgroundColor: statusForm.backgroundColor }}
                        />
                      )}

                      {Array.isArray(statusForm.stickers) &&
                        statusForm.stickers.map((sticker) => (
                          <button
                            key={sticker.id}
                            type="button"
                            className={`absolute select-none ${statusDraggingStickerId === sticker.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                            style={{
                              left: `${sticker.x}%`,
                              top: `${sticker.y}%`,
                              transform: `translate(-50%, -50%) rotate(${sticker.rotate || 0}deg)`,
                              fontSize: `${clampStatusStickerSize(sticker.size)}px`,
                              lineHeight: 1,
                              textShadow: '0 2px 8px rgba(0,0,0,0.35)',
                            }}
                            onPointerDown={(event) => handleStatusStickerPointerDown(event, sticker.id)}
                            onPointerMove={(event) => handleStatusStickerPointerMove(event, sticker.id)}
                            onPointerUp={(event) => handleStatusStickerPointerUp(event, sticker.id)}
                            onPointerCancel={(event) => handleStatusStickerPointerUp(event, sticker.id)}
                          >
                            {sticker.emoji}
                          </button>
                        ))}

                      <div
                        className={`absolute max-w-[88%] px-3 py-2 rounded-lg select-none shadow-lg transition-opacity ${
                          statusTextDragging ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                        style={{
                          left: `${statusForm.textPosX}%`,
                          top: `${statusForm.textPosY}%`,
                          transform: 'translate(-50%, -50%)',
                          color: statusForm.textColor,
                          fontFamily: statusForm.fontFamily,
                          textAlign: statusForm.textAlign,
                          backgroundColor: statusForm.mediaPreview ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.22)',
                          width: '82%',
                          opacity: statusForm.text.trim() ? 1 : 0.85,
                        }}
                        onPointerDown={handleStatusTextPointerDown}
                        onPointerMove={handleStatusTextPointerMove}
                        onPointerUp={handleStatusTextPointerUp}
                        onPointerCancel={handleStatusTextPointerUp}
                      >
                        {statusForm.text.trim() || 'Type text and drag it anywhere'}
                      </div>

                      {statusForm.musicLabel?.trim() ? (
                        <div className="absolute left-3 right-3 bottom-3">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs backdrop-blur-sm">
                            <FaMusic size={11} />
                            {statusForm.musicLabel.trim()}
                            {statusForm.musicSourceType && statusForm.musicSourceType !== 'none'
                              ? ` - ${statusForm.musicSourceType}`
                              : ''}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Drag text or stickers to position them. Tap empty preview area to quickly move text.
                  </p>
                </div>

                <div className="space-y-4 pb-2">
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3">
                    <p className="text-xs text-[var(--text-secondary)] mb-2">Quick style presets</p>
                    <div className="flex flex-wrap gap-2">
                      {STORY_STYLE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyStoryStylePreset(preset.id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-default)] text-[var(--text-primary)] text-xs hover:bg-[var(--surface-elevated)]"
                          title={`Apply ${preset.label} preset`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-white/50"
                            style={{ backgroundColor: preset.backgroundColor }}
                          />
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[var(--text-secondary)]">Music (optional)</p>
                      <div className="flex flex-wrap gap-2">
                        {STORY_MUSIC_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyStoryMusicPreset(preset.id)}
                            className="px-2 py-1 rounded border border-[var(--border-default)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Music label
                      <input
                        type="text"
                        value={statusForm.musicLabel}
                        onChange={(e) =>
                          setStatusForm((prev) => ({
                            ...prev,
                            musicLabel: e.target.value.slice(0, 80),
                          }))
                        }
                        placeholder="e.g. Midnight Waves - Lekhon Mix"
                        className="h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                        Source
                        <select
                          value={statusForm.musicSourceType}
                          onChange={(e) =>
                            setStatusForm((prev) => {
                              const nextType = normalizeStoryMusicSourceType(e.target.value);
                              return {
                                ...prev,
                                musicSourceType: nextType,
                                musicSourceUrl: nextType === 'none' ? '' : prev.musicSourceUrl,
                              };
                            })
                          }
                          className="h-10 px-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)]"
                        >
                          {STORY_MUSIC_SOURCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                        Source URL
                        <input
                          type="url"
                          value={statusForm.musicSourceUrl}
                          onChange={(e) =>
                            setStatusForm((prev) => ({
                              ...prev,
                              musicSourceUrl: normalizeStoryMusicSourceUrl(e.target.value),
                            }))
                          }
                          disabled={statusForm.musicSourceType === 'none'}
                          placeholder={statusForm.musicSourceType === 'none' ? 'Select a source first' : 'https://...'}
                          className="h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-60"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[var(--text-secondary)]">Stickers ({statusForm.stickers.length}/{MAX_STATUS_STICKERS})</p>
                      {statusForm.stickers.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setStatusForm((prev) => ({ ...prev, stickers: [] }))}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setStatusStickerTab('recent')}
                        className={`px-2.5 py-1 rounded-full border text-xs ${
                          statusStickerTab === 'recent'
                            ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                            : 'border-[var(--border-default)] text-[var(--text-secondary)]'
                        }`}
                      >
                        Recent
                      </button>
                      {STORY_STICKER_GROUPS.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setStatusStickerTab(group.id)}
                          className={`px-2.5 py-1 rounded-full border text-xs ${
                            statusStickerTab === group.id
                              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                              : 'border-[var(--border-default)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {activeStickerChoices.length > 0 ? (
                        activeStickerChoices.map((emoji) => (
                          <button
                            key={`${statusStickerTab}-${emoji}`}
                            type="button"
                            onClick={() => addStatusSticker(emoji)}
                            disabled={statusForm.stickers.length >= MAX_STATUS_STICKERS}
                            className="h-9 w-9 rounded-lg border border-[var(--border-default)] bg-[var(--background-secondary)] text-lg inline-flex items-center justify-center hover:bg-[var(--surface-elevated)] disabled:opacity-45"
                            title="Add sticker"
                          >
                            {emoji}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-[var(--text-secondary)]">No recent stickers yet. Add one to see it here.</p>
                      )}
                    </div>

                    {statusForm.stickers.length > 0 ? (
                      <div className="space-y-2">
                        {statusForm.stickers.map((sticker, index) => (
                          <div
                            key={`control-${sticker.id}`}
                            className="rounded-lg border border-[var(--border-default)] bg-[var(--background-secondary)] p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)] inline-flex items-center gap-2">
                                <span className="text-base">{sticker.emoji}</span>
                                Sticker {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeStatusSticker(sticker.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Remove sticker"
                              >
                                <FaTimes size={12} />
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusSticker(sticker.id, (current) => ({
                                    ...current,
                                    size: clampStatusStickerSize(current.size - 6),
                                  }))
                                }
                                className="px-2 py-1 rounded border border-[var(--border-default)] text-xs text-[var(--text-primary)]"
                              >
                                Smaller
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusSticker(sticker.id, (current) => ({
                                    ...current,
                                    size: clampStatusStickerSize(current.size + 6),
                                  }))
                                }
                                className="px-2 py-1 rounded border border-[var(--border-default)] text-xs text-[var(--text-primary)]"
                              >
                                Bigger
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusSticker(sticker.id, (current) => ({
                                    ...current,
                                    rotate: clampStatusStickerRotate(current.rotate - 12),
                                  }))
                                }
                                className="px-2 py-1 rounded border border-[var(--border-default)] text-xs text-[var(--text-primary)]"
                              >
                                Rotate -
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatusSticker(sticker.id, (current) => ({
                                    ...current,
                                    rotate: clampStatusStickerRotate(current.rotate + 12),
                                  }))
                                }
                                className="px-2 py-1 rounded border border-[var(--border-default)] text-xs text-[var(--text-primary)]"
                              >
                                Rotate +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <textarea
                    value={statusForm.text}
                    onChange={(e) => setStatusForm((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder={t('Share a quick update...')}
                    rows="4"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-elevated)]">
                      {statusForm.mediaType === 'video' ? <FaVideo size={14} /> : <FaCamera size={14} />}
                      {statusForm.mediaPreview ? t('Change Media') : isPostComposer ? t('Add Image') : t('Add Image/Video')}
                      <input
                        type="file"
                        className="hidden"
                        accept={statusMediaAccept}
                        onChange={handleStatusMediaChange}
                      />
                    </label>
                    {statusForm.mediaPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          const shouldMarkRemove =
                            Boolean(editingStatusId) &&
                            Boolean(statusForm.mediaPreview) &&
                            !statusForm.mediaPreview.startsWith('blob:');
                          if (statusForm.mediaPreview.startsWith('blob:')) {
                            URL.revokeObjectURL(statusForm.mediaPreview);
                          }
                          setStatusForm((prev) => ({
                            ...prev,
                            mediaFile: null,
                            mediaPreview: '',
                            mediaType: 'text',
                            trimStartSec: 0,
                            trimEndSec: null,
                            removeExistingMedia: shouldMarkRemove,
                          }));
                          setStatusVideoDurationSec(0);
                        }}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        {t('Remove Media')}
                      </button>
                    )}
                  </div>

                  {isStoryComposer && statusForm.mediaType === 'video' && statusForm.mediaPreview ? (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[var(--text-secondary)]">Video trim before upload (max 10s)</p>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {statusVideoDurationSec > 0
                            ? `Duration ${statusVideoDurationSec.toFixed(1)}s`
                            : 'Reading duration...'}
                        </span>
                      </div>
                      {statusForm.mediaFile ? (
                        <>
                          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                            Start at: {Number(statusForm.trimStartSec || 0).toFixed(1)}s
                            <input
                              type="range"
                              min="0"
                              max={statusVideoDurationSec > 0 ? Math.max(0, statusVideoDurationSec - 0.1) : 300}
                              step="0.1"
                              value={statusForm.trimStartSec || 0}
                              onChange={(e) => setStatusVideoTrimStart(e.target.value)}
                              className="w-full"
                              disabled={statusVideoDurationSec <= 0}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                            End at: {Number(previewVideoTrimRange.trimEndSec).toFixed(1)}s
                            <input
                              type="range"
                              min={previewVideoTrimRange.trimStartSec}
                              max={
                                statusVideoDurationSec > 0
                                  ? Math.min(statusVideoDurationSec, previewVideoTrimRange.trimStartSec + 10)
                                  : previewVideoTrimRange.trimStartSec + 10
                              }
                              step="0.1"
                              value={previewVideoTrimRange.trimEndSec}
                              onChange={(e) => setStatusVideoTrimEnd(e.target.value)}
                              className="w-full"
                              disabled={statusVideoDurationSec <= 0}
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const autoTrim = normalizeStoryTrimRange(0, 10, statusVideoDurationSec);
                                setStatusForm((prev) => ({
                                  ...prev,
                                  trimStartSec: autoTrim.trimStartSec,
                                  trimEndSec: autoTrim.trimEndSec,
                                }));
                              }}
                              className="px-2 py-1 rounded border border-[var(--border-default)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                            >
                              Quick 10s
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Trim applies when you upload this video. Existing remote videos need re-upload to re-trim.
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-[var(--text-secondary)]">
                          Select a local video to apply trim settings before posting.
                        </p>
                      )}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Background
                      <input
                        type="color"
                        value={statusForm.backgroundColor}
                        onChange={(e) => setStatusForm((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Text Color
                      <input
                        type="color"
                        value={statusForm.textColor}
                        onChange={(e) => setStatusForm((prev) => ({ ...prev, textColor: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Font
                      <select
                        value={statusForm.fontFamily}
                        onChange={(e) => setStatusForm((prev) => ({ ...prev, fontFamily: e.target.value }))}
                        className="h-10 px-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)]"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Playfair Display">Playfair</option>
                        <option value="DM Sans">DM Sans</option>
                        <option value="Space Grotesk">Space Grotesk</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Alignment
                      <select
                        value={statusForm.textAlign}
                        onChange={(e) => setStatusForm((prev) => ({ ...prev, textAlign: e.target.value }))}
                        className="h-10 px-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)]"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                    {isStoryComposer ? (
                      <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Duration (sec)
                      <input
                        type="number"
                        min="3"
                        max="30"
                        value={statusForm.durationSec}
                        onChange={(e) => setStatusForm((prev) => ({ ...prev, durationSec: Math.max(3, Math.min(30, Number(e.target.value) || 7)) }))}
                        className="h-10 px-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)]"
                      />
                    </label>
                    ) : null}
                    <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Audience
                      <select
                        value={statusForm.audience}
                        onChange={(e) => setStatusForm((prev) => ({ ...prev, audience: e.target.value }))}
                        className="h-10 px-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)]"
                      >
                        <option value="public">Public</option>
                        <option value="followers">Followers</option>
                        <option value="private">Only me</option>
                      </select>
                    </label>
                    <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Text Position
                      <button
                        type="button"
                        onClick={() =>
                          setStatusForm((prev) => ({ ...prev, textPosX: 50, textPosY: 50 }))
                        }
                        className="h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                      >
                        Center Text
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    {isPostComposer
                      ? 'Post mode currently uses the same 24-hour lifecycle as stories. Video is disabled in this mode.'
                      : t('Statuses expire automatically after 24 hours.')}
                  </p>
                </div>
              </div>
              </div>

              <div className="border-t border-[var(--border-default)] px-4 sm:px-6 py-3 bg-[var(--surface-card)]/90 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={statusSaving}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {statusSaving ? <SyncLoader color="#fff" size={7} /> : editingStatusId ? t('Update Status') : t('Post Status')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusComposer(false);
                    resetStatusComposer();
                  }}
                  className="flex-1 theme-soft-button px-4 py-2 rounded-lg"
                >
                  {t('Cancel')}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatusViewer && statuses.length > 0 && (
        <StatusViewer
          statuses={statuses}
          initialIndex={statusViewerIndex}
          onClose={() => setShowStatusViewer(false)}
          userName={displayUser?.username || t('User')}
        />
      )}

      <SavedItemsModal
        open={showSavedItemsModal}
        onClose={() => setShowSavedItemsModal(false)}
        itemsByType={savedLibrary.itemsByType}
        summary={savedLibrary.summary}
        loading={savedLibrary.loading}
      />
    </div>
  );
};

const ProfileNew = () => {
  const location = useLocation();
  const isCompactProfileLayout = useCompactProfileLayout();
  const searchParams = new URLSearchParams(location.search || '');
  const forceLegacyProfile =
    location.pathname === '/profile/manage' ||
    searchParams.get('full') === '1' ||
    searchParams.get('forcePasswordChange') === '1' ||
    searchParams.get('forgotPassword') === '1';

  if (isCompactProfileLayout && !forceLegacyProfile) {
    return <ProfileOverviewMobile />;
  }

  return <ProfileLegacy />;
};

export default ProfileNew;



