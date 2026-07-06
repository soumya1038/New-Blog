import React, { useEffect, useContext, useState, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { GroupCallProvider } from './context/GroupCallContext';
import Navbar from './components/Navbar';
import ErrorFallback from './components/ErrorFallback';
import IncomingCallModal from './components/IncomingCallModal';
import GuestExpiredModal from './components/GuestExpiredModal';
import FloatingCallBanner from './components/FloatingCallBanner';
import GlobalGroupCallListener from './components/GlobalGroupCallListener';
import MinimizedGroupCall from './components/MinimizedGroupCall';
import PublicFooter from './components/PublicFooter';
import MobileAppNav from './components/MobileAppNav';
import { CinematicIntro } from './components/intro/CinematicIntro';
import socketService from './services/socket';
import webrtcService from './services/webrtc';
import soundManager from './utils/soundManager';
import { ErrorBoundary } from 'react-error-boundary';
import { useRouteTracker } from './hooks/useRouteTracker';
import useBackgroundRemovalWarmup from './hooks/useBackgroundRemovalWarmup';
import guestTracker from './services/guestTracking';
import { getCallState, clearCallState } from './utils/callStateManager';
import { useGroupCall } from './context/GroupCallContext';
import { captureFrontendException } from './utils/sentry';
import { isNativeApp } from './utils/nativeApp';
import { hasAuthToken } from './utils/authSession';

const Home = lazy(() => import('./pages/Home'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CreateBlog = lazy(() => import('./pages/CreateBlog'));
const EditBlog = lazy(() => import('./pages/EditBlog'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const ArticleDetails = lazy(() => import('./pages/ArticleDetails'));
// const Profile = lazy(() => import('./pages/Profile'));
const Profile = lazy(() => import('./pages/ProfileNew'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Drafts = lazy(() => import('./pages/Drafts'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ChatNew = lazy(() => import('./pages/ChatNew'));
const JoinGroup = lazy(() => import('./pages/JoinGroup'));
const ShortBlogsViewer = lazy(() => import('./pages/ShortBlogsViewer'));
const News = lazy(() => import('./pages/News'));
const About = lazy(() => import('./pages/About'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const GoogleAuthCallback = lazy(() => import('./pages/GoogleAuthCallback'));
const FacebookAuthCallback = lazy(() => import('./pages/FacebookAuthCallback'));
const TwitterAuthCallback = lazy(() => import('./pages/TwitterAuthCallback'));
const LinkedInAuthCallback = lazy(() => import('./pages/LinkedInAuthCallback'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ModernChatbot = lazy(() => import('./components/ModernChatbot'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const StorePage = lazy(() => import('./pages/StorePage'));
const BecomeASeller = lazy(() => import('./pages/BecomeASeller'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const AddProduct = lazy(() => import('./pages/AddProduct'));
const EditProduct = lazy(() => import('./pages/EditProduct'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const SellerEarnings = lazy(() => import('./pages/SellerEarnings'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const HelpCategory = lazy(() => import('./pages/HelpCategory'));
const HelpArticle = lazy(() => import('./pages/HelpArticle'));
const PolicyCenter = lazy(() => import('./pages/PolicyCenter'));
const PolicyDetail = lazy(() => import('./pages/PolicyDetail'));
const SafetyCenter = lazy(() => import('./pages/SafetyCenter'));
const SupportRequest = lazy(() => import('./pages/SupportRequest'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const TRUSTED_OAUTH_LINK_HOSTS = new Set([
  'lekhon-development.netlify.app',
  'localhost',
  '127.0.0.1'
]);
const OAUTH_CALLBACK_PATH_PATTERN = /^\/auth\/(google|facebook|twitter|linkedin)\/callback$/;

const normalizeOAuthCallbackPath = (path = '') => {
  const normalized = `/${String(path || '').replace(/^\/+/, '')}`.replace(/\/+$/, '');
  return OAUTH_CALLBACK_PATH_PATTERN.test(normalized) ? normalized : '';
};

const getNativeOAuthCallbackRoute = (rawUrl = '') => {
  if (!rawUrl) return '';

  try {
    const parsed = new URL(rawUrl);
    let callbackPath = parsed.pathname || '';

    if (parsed.protocol === 'com.lekhon.app:') {
      const hostSegment = parsed.hostname || parsed.host || '';
      callbackPath = hostSegment ? `/${hostSegment}${parsed.pathname || ''}` : callbackPath;
    } else if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      if (!TRUSTED_OAUTH_LINK_HOSTS.has(parsed.hostname) && parsed.hostname !== currentHost) {
        return '';
      }
    } else {
      return '';
    }

    const routePath = normalizeOAuthCallbackPath(callbackPath);
    return routePath ? `${routePath}${parsed.search}${parsed.hash}` : '';
  } catch {
    return '';
  }
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <LoadingFallback />;
  if (user) return <Navigate to="/home" replace />;

  return children;
};

const RegisteredUserRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return <LoadingFallback />;

  if (!user || !hasAuthToken()) {
    try {
      sessionStorage.setItem('redirectAfterLogin', `${location.pathname}${location.search}${location.hash}`);
    } catch {
      // Ignore storage failures and still send the visitor to sign in.
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.isGuest || user.role === 'guest') {
    return <Navigate to="/home" replace />;
  }

  return children;
};

const ROUTES_WITHOUT_GLOBAL_CHROME = new Set(['/', '/privacy', '/terms', '/auth/google/callback', '/auth/facebook/callback', '/auth/twitter/callback', '/auth/linkedin/callback']);
const PUBLIC_FOOTER_ROUTES = new Set(['/about', '/privacy', '/terms']);
const PUBLIC_FOOTER_PREFIXES = ['/help', '/policies', '/safety', '/contact', '/report', '/appeals'];
const MOBILE_BOTTOM_NAV_FOCUS_ROUTES = new Set(['/checkout']);
const MOBILE_BOTTOM_NAV_FOCUS_PREFIXES = ['/order'];

function AppContent() {
  const { user, sessionExpired, guestExpired, setGuestExpired } = useContext(AuthContext);
  const { currentCall, isMinimized, endCall, toggleMinimize } = useGroupCall();
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedPath = useMemo(() => {
    const path = (location.pathname || '/').replace(/\/+$/, '');
    return path || '/';
  }, [location.pathname]);
  const runningNativeApp = useMemo(() => isNativeApp(), []);
  const hideGlobalChrome = ROUTES_WITHOUT_GLOBAL_CHROME.has(normalizedPath);
  const showPublicFooter =
    PUBLIC_FOOTER_ROUTES.has(normalizedPath) ||
    PUBLIC_FOOTER_PREFIXES.some(
      (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
    );
  const hideMobileBottomNav =
    MOBILE_BOTTOM_NAV_FOCUS_ROUTES.has(normalizedPath) ||
    MOBILE_BOTTOM_NAV_FOCUS_PREFIXES.some(
      (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
    );
  const showMobileBottomNav = Boolean(user) && !hideGlobalChrome && !hideMobileBottomNav;
  const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [globalCallState, setGlobalCallState] = useState(null);
  const [showIntro, setShowIntro] = useState(() => {
    const showLoginIntro = sessionStorage.getItem('showLoginIntro');
    if (ROUTES_WITHOUT_GLOBAL_CHROME.has((location.pathname || '/').replace(/\/+$/, '') || '/')) {
      return false;
    }
    return showLoginIntro === 'true';
  });
  
  useRouteTracker();
  useBackgroundRemovalWarmup();

  useEffect(() => {
    if (hideGlobalChrome) {
      setShowIntro(false);
      return;
    }
    const loginIntro = sessionStorage.getItem('showLoginIntro');
    if (loginIntro === 'true') {
      sessionStorage.removeItem('showLoginIntro');
      setShowIntro(true);
    }
  }, [hideGlobalChrome, location.pathname]);

  useEffect(() => {
    if (!runningNativeApp) return undefined;

    let backButtonListener;
    const setupBackButton = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack } = {}) => {
        const currentPath = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
        const isAtAppRoot = currentPath === '/' || currentPath === '/home';

        if (!isAtAppRoot && (canGoBack || window.history.length > 1)) {
          navigate(-1);
          return;
        }

        if (typeof CapacitorApp.minimizeApp === 'function') {
          CapacitorApp.minimizeApp();
        }
      });
    };

    setupBackButton();

    return () => {
      backButtonListener?.remove?.();
    };
  }, [navigate, runningNativeApp]);

  useEffect(() => {
    if (!runningNativeApp) return undefined;

    let cancelled = false;
    let appUrlOpenListener;

    const openOAuthCallback = (url) => {
      const route = getNativeOAuthCallbackRoute(url);
      if (route) {
        navigate(route, { replace: true });
      }
    };

    const setupUrlOpenListener = async () => {
      if (typeof CapacitorApp.getLaunchUrl === 'function') {
        const launchUrl = await CapacitorApp.getLaunchUrl();
        if (!cancelled) {
          openOAuthCallback(launchUrl?.url);
        }
      }

      if (cancelled) return;

      appUrlOpenListener = await CapacitorApp.addListener('appUrlOpen', ({ url } = {}) => {
        openOAuthCallback(url);
      });

      if (cancelled) {
        appUrlOpenListener?.remove?.();
      }
    };

    setupUrlOpenListener().catch((error) => {
      console.error('Failed to setup native OAuth callback listener:', error);
    });

    return () => {
      cancelled = true;
      appUrlOpenListener?.remove?.();
    };
  }, [navigate, runningNativeApp]);

  useEffect(() => {
    const savedState = getCallState('one-to-one');
    if (savedState && savedState.callAccepted) {
      setGlobalCallState(savedState);
    }
  }, []);

  useEffect(() => {
    const handleCallStateUpdate = (e) => setGlobalCallState(e.detail);
    const handleCallEnd = () => {
      setGlobalCallState(null);
      clearCallState('one-to-one');
    };
    window.addEventListener('callStateUpdate', handleCallStateUpdate);
    window.addEventListener('callEnded', handleCallEnd);
    return () => {
      window.removeEventListener('callStateUpdate', handleCallStateUpdate);
      window.removeEventListener('callEnded', handleCallEnd);
    };
  }, []);
  
  useEffect(() => {
    guestTracker.startTracking();
  }, []);
  
  useEffect(() => {
    if (sessionExpired) {
      setShowSessionExpiredModal(true);
    }
  }, [sessionExpired]);
  
  const handleSessionExpiredClose = () => {
    setShowSessionExpiredModal(false);
    navigate('/login');
  };

  useEffect(() => {
    if (!user) return;

    const socket = socketService.connect(user._id);
    
    setTimeout(() => {
      socketService.updateRoute(location.pathname);
    }, 100);

    const handleMessageReceive = async (message) => {
      const isInChat = location.pathname === '/chat';
      
      if (!isInChat) {
        soundManager.play('notification');
        window.dispatchEvent(new CustomEvent('newNotification'));
      }
    };

    const handleNotificationLike = () => {
      soundManager.play('notification');
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleNotificationComment = () => {
      soundManager.play('notification');
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleNotificationFollow = () => {
      soundManager.play('notification');
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleNotificationsUpdated = () => {
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleNotificationMessage = () => {
      soundManager.play('notification');
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleIncomingCall = ({ callerId, caller, callType, callLogId }) => {
      // console.log('📞 App.js: Global incoming call:', { callerId, caller, callType });
      if (location.pathname !== '/chat') {
        soundManager.play('incomingCall');
        setGlobalIncomingCall({ callerId, caller, callType, callLogId });
      }
    };

    const handleCallRejected = () => {
      // console.log('📞 App.js: Call rejected');
      soundManager.stop('callRing');
      soundManager.play('endCall');
      setGlobalIncomingCall(null);
    };

    const handleCallEnded = () => {
      // console.log('📞 App.js: Call ended');
      soundManager.stop('callRing');
      soundManager.stop('incomingCall');
      soundManager.play('endCall');
      setGlobalIncomingCall(null);
      window.dispatchEvent(new CustomEvent('callEnded'));
    };

    const handleCallAccepted = () => {
      // console.log('📞 App.js: Call accepted, clearing global popup');
      soundManager.stop('callRing');
      soundManager.stop('incomingCall');
      setGlobalIncomingCall(null);
    };

    socket.on('message:receive', handleMessageReceive);
    socket.on('notification:like', handleNotificationLike);
    socket.on('notification:comment', handleNotificationComment);
    socket.on('notification:follow', handleNotificationFollow);
    socket.on('notification:message', handleNotificationMessage);
    socket.on('notifications:updated', handleNotificationsUpdated);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    
    webrtcService.setSocket(socket);

    return () => {
      socket.off('message:receive', handleMessageReceive);
      socket.off('notification:like', handleNotificationLike);
      socket.off('notification:comment', handleNotificationComment);
      socket.off('notification:follow', handleNotificationFollow);
      socket.off('notification:message', handleNotificationMessage);
      socket.off('notifications:updated', handleNotificationsUpdated);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
    };
  }, [user, location.pathname]);

  const handleAcceptGlobalCall = () => {
    soundManager.stop('incomingCall');
    navigate('/chat', { state: { incomingCall: globalIncomingCall } });
    setGlobalIncomingCall(null);
  };

  const handleRejectGlobalCall = () => {
    soundManager.stop('incomingCall');
    soundManager.play('endCall');
    const socket = socketService.getSocket();
    if (socket && globalIncomingCall) {
      socket.emit('call:reject', { callerId: globalIncomingCall.callerId });
    }
    setGlobalIncomingCall(null);
  };

  const handleGlobalCallOpen = () => {
    navigate('/chat');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openCallFromGlobal'));
    }, 100);
  };

  const handleGlobalCallEnd = () => {
    const socket = socketService.getSocket();
    if (socket && globalCallState) {
      socket.emit('call:end', { userId: globalCallState.remoteUser.id });
    }
    webrtcService.endCall();
    setGlobalCallState(null);
    clearCallState('one-to-one');
    window.dispatchEvent(new CustomEvent('callEnded'));
  };

  const handleGlobalToggleAudio = () => {
    if (!webrtcService.localStream) return;
    
    const audioTrack = webrtcService.localStream.getAudioTracks()[0];
    if (!audioTrack) return;
    
    audioTrack.enabled = !audioTrack.enabled;
    setGlobalCallState(prev => prev ? { ...prev, isAudioEnabled: audioTrack.enabled } : null);
    
    // console.log('🔊 Global audio toggled:', audioTrack.enabled);
  };

  const handleGlobalRotateCamera = async () => {
    if (!webrtcService.localStream) return;
    const videoTrack = webrtcService.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    try {
      const constraints = videoTrack.getConstraints();
      const newFacingMode = constraints.facingMode === 'user' ? 'environment' : 'user';
      await videoTrack.applyConstraints({ facingMode: newFacingMode });
    } catch (err) {
      console.error('Failed to rotate camera:', err);
    }
  };

  const handleIntroComplete = () => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
    const showTour = sessionStorage.getItem('showTourAfterLogin');
    if (showTour === 'true') {
      sessionStorage.removeItem('showTourAfterLogin');
    }
  };

  if (showIntro && !hideGlobalChrome) {
    return <CinematicIntro onComplete={handleIntroComplete} />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) =>
        captureFrontendException(error, {
          tags: { area: 'react-error-boundary' },
          extras: { componentStack: info?.componentStack }
        })
      }
    >
      <div className={`min-h-screen lekhon-app-shell${showMobileBottomNav ? ' lekhon-app-shell--with-mobile-tabs' : ''}`}>
        {!hideGlobalChrome && <Navbar />}
        {user && <GlobalGroupCallListener />}
        {!hideGlobalChrome && location.pathname !== '/chat' && (
          <Suspense fallback={null}>
            <ModernChatbot />
          </Suspense>
        )}
        {globalIncomingCall && (
          <IncomingCallModal
            caller={globalIncomingCall.caller}
            callType={globalIncomingCall.callType}
            onAccept={handleAcceptGlobalCall}
            onReject={handleRejectGlobalCall}
          />
        )}
        {showSessionExpiredModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Session Expired</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Your session has expired. Please log in again to continue.</p>
                <button
                  onClick={handleSessionExpiredClose}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        )}
        {guestExpired && (
          <GuestExpiredModal onClose={() => setGuestExpired(false)} />
        )}
        {globalCallState && location.pathname !== '/chat' && (
          <FloatingCallBanner
            remoteUser={{
              fullName: globalCallState.remoteUser.fullName,
              profileImage: globalCallState.remoteUser.profileImage
            }}
            callType={globalCallState.callType}
            startTime={globalCallState.startTime}
            remoteStream={webrtcService.remoteStream}
            isAudioEnabled={globalCallState.isAudioEnabled !== false}
            onOpen={handleGlobalCallOpen}
            onEnd={handleGlobalCallEnd}
            onToggleAudio={handleGlobalToggleAudio}
            onRotateCamera={handleGlobalRotateCamera}
          />
        )}
        {currentCall && isMinimized && location.pathname !== '/chat' && (
          <MinimizedGroupCall
            token={currentCall.token}
            wsUrl={currentCall.wsUrl}
            callType={currentCall.callType}
            onOpen={() => {
              toggleMinimize();
              navigate('/chat');
            }}
            onEnd={endCall}
          />
        )}
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={runningNativeApp ? <Navigate to="/home" replace /> : <LandingPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/create" element={<CreateBlog />} />
            <Route path="/edit/:id" element={<EditBlog />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/article/:id" element={<ArticleDetails />} />
            <Route path="/profile" element={<RegisteredUserRoute><Profile /></RegisteredUserRoute>} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/chat" element={<ChatNew />} />
            <Route path="/join-group/:inviteCode" element={<JoinGroup />} />
            <Route path="/short-blogs" element={<ShortBlogsViewer />} />
            <Route path="/short-blogs/:id" element={<ShortBlogsViewer />} />
            <Route path="/shorts" element={<ShortBlogsViewer />} />
            <Route path="/shorts/:id" element={<ShortBlogsViewer />} />
            <Route path="/news" element={<News />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/help/category/:categoryId" element={<HelpCategory />} />
            <Route path="/help/article/:slug" element={<HelpArticle />} />
            <Route path="/policies" element={<PolicyCenter />} />
            <Route path="/policies/:slug" element={<PolicyDetail />} />
            <Route path="/safety" element={<SafetyCenter />} />
            <Route path="/contact" element={<SupportRequest />} />
            <Route path="/report" element={<SupportRequest />} />
            <Route path="/appeals" element={<SupportRequest />} />
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            <Route path="/auth/facebook/callback" element={<FacebookAuthCallback />} />
            <Route path="/auth/twitter/callback" element={<TwitterAuthCallback />} />
            <Route path="/auth/linkedin/callback" element={<LinkedInAuthCallback />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:slug" element={<ProductDetail />} />
            <Route path="/store/:username" element={<StorePage />} />
            <Route path="/become-seller" element={<BecomeASeller />} />
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/seller/earnings" element={<SellerEarnings />} />
            <Route path="/seller/add-product" element={<AddProduct />} />
            <Route path="/seller/edit-product/:id" element={<EditProduct />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/order/:id/success" element={<OrderSuccess />} />
            <Route path="/order/:id" element={<OrderDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        {showPublicFooter && <PublicFooter />}
        {showMobileBottomNav && <MobileAppNav />}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <GroupCallProvider>
          <AppContent />
        </GroupCallProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
