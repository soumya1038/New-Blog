import React, { useEffect, useContext, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import ErrorFallback from './components/ErrorFallback';
import IncomingCallModal from './components/IncomingCallModal';
import GuestExpiredModal from './components/GuestExpiredModal';
import FloatingCallBanner from './components/FloatingCallBanner';
import FloatingGroupCallBanner from './components/FloatingGroupCallBanner';
import GlobalGroupCallListener from './components/GlobalGroupCallListener';
import socketService from './services/socket';
import webrtcService from './services/webrtc';
import soundManager from './utils/soundManager';
import { ErrorBoundary } from 'react-error-boundary';
import { useRouteTracker } from './hooks/useRouteTracker';
import guestTracker from './services/guestTracking';
import { getCallState, clearCallState } from './utils/callStateManager';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CreateBlog = lazy(() => import('./pages/CreateBlog'));
const EditBlog = lazy(() => import('./pages/EditBlog'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Drafts = lazy(() => import('./pages/Drafts'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ChatNew = lazy(() => import('./pages/ChatNew'));
const JoinGroup = lazy(() => import('./pages/JoinGroup'));
const ShortBlogsViewer = lazy(() => import('./pages/ShortBlogsViewer'));
const News = lazy(() => import('./pages/News'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Chatbot = lazy(() => import('./components/Chatbot'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function AppContent() {
  const { user, sessionExpired, guestExpired, setGuestExpired } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [globalCallState, setGlobalCallState] = useState(null);
  const [globalGroupCallState, setGlobalGroupCallState] = useState(null);
  
  useRouteTracker();

  useEffect(() => {
    const savedState = getCallState('one-to-one');
    if (savedState && savedState.callAccepted) {
      setGlobalCallState(savedState);
    }
    const savedGroupState = getCallState('group');
    if (savedGroupState) {
      setGlobalGroupCallState(savedGroupState);
    }
  }, []);

  useEffect(() => {
    const handleCallStateUpdate = (e) => setGlobalCallState(e.detail);
    const handleCallEnd = () => {
      setGlobalCallState(null);
      clearCallState('one-to-one');
    };
    const handleGroupCallStateUpdate = (e) => setGlobalGroupCallState(e.detail);
    const handleGroupCallEnd = () => {
      setGlobalGroupCallState(null);
      clearCallState('group');
    };
    window.addEventListener('callStateUpdate', handleCallStateUpdate);
    window.addEventListener('callEnded', handleCallEnd);
    window.addEventListener('groupCallStateUpdate', handleGroupCallStateUpdate);
    window.addEventListener('groupCallEnded', handleGroupCallEnd);
    return () => {
      window.removeEventListener('callStateUpdate', handleCallStateUpdate);
      window.removeEventListener('callEnded', handleCallEnd);
      window.removeEventListener('groupCallStateUpdate', handleGroupCallStateUpdate);
      window.removeEventListener('groupCallEnded', handleGroupCallEnd);
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
      console.log('📞 App.js: Global incoming call:', { callerId, caller, callType });
      if (location.pathname !== '/chat') {
        soundManager.play('incomingCall');
        setGlobalIncomingCall({ callerId, caller, callType, callLogId });
      }
    };

    const handleCallRejected = () => {
      console.log('📞 App.js: Call rejected');
      soundManager.stop('callRing');
      soundManager.play('endCall');
      setGlobalIncomingCall(null);
    };

    const handleCallEnded = () => {
      console.log('📞 App.js: Call ended');
      soundManager.stop('callRing');
      soundManager.stop('incomingCall');
      soundManager.play('endCall');
      setGlobalIncomingCall(null);
      window.dispatchEvent(new CustomEvent('callEnded'));
    };

    const handleCallAccepted = () => {
      console.log('📞 App.js: Call accepted, clearing global popup');
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
    
    console.log('🔊 Global audio toggled:', audioTrack.enabled);
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

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen">
        <Navbar />
        {user && <GlobalGroupCallListener />}
        {location.pathname !== '/chat' && (
          <Suspense fallback={null}>
            <Chatbot />
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
        {globalGroupCallState && (
          <FloatingGroupCallBanner
            token={globalGroupCallState.token}
            wsUrl={globalGroupCallState.wsUrl}
            callType={globalGroupCallState.callType || 'video'}
            onOpen={() => {
              navigate('/chat');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('openGroupCallFromGlobal'));
              }, 100);
            }}
            onEnd={() => {
              clearCallState('group');
              setGlobalGroupCallState(null);
              window.dispatchEvent(new CustomEvent('groupCallEnded'));
            }}
          />
        )}
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/create" element={<CreateBlog />} />
            <Route path="/edit/:id" element={<EditBlog />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/profile" element={<Profile />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
