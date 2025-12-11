import React, { useEffect, useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateBlog from './pages/CreateBlog';
import EditBlog from './pages/EditBlog';
import BlogDetail from './pages/BlogDetail';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Notifications from './pages/Notifications';
import Drafts from './pages/Drafts';
import AdminDashboard from './pages/AdminDashboard';
import VerifyEmail from './pages/VerifyEmail';
import ChatNew from './pages/ChatNew';
import JoinGroup from './pages/JoinGroup';
import ShortBlogsViewer from './pages/ShortBlogsViewer';
import News from './pages/News';
import NotFound from './pages/NotFound';
import ErrorFallback from './components/ErrorFallback';
import IncomingCallModal from './components/IncomingCallModal';
import Chatbot from './components/Chatbot';
import socketService from './services/socket';
import webrtcService from './services/webrtc';
import soundNotification from './utils/soundNotifications';
import soundManager from './utils/soundManager';
import api from './services/api';
import { ErrorBoundary } from 'react-error-boundary';
import { useRouteTracker } from './hooks/useRouteTracker';
import guestTracker from './services/guestTracking';

function AppContent() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
  
  // Track route changes and emit to backend
  useRouteTracker();
  
  // Initialize guest tracking
  useEffect(() => {
    guestTracker.startTracking();
  }, []);

  useEffect(() => {
    if (!user) return;

    const socket = socketService.connect(user._id);
    
    // Send initial route after a brief delay to ensure socket is connected
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

    // Global call listeners
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
  }, [user]);

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

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen">
        <Navbar />
        <Chatbot />
        {globalIncomingCall && (
          <IncomingCallModal
            caller={globalIncomingCall.caller}
            callType={globalIncomingCall.callType}
            onAccept={handleAcceptGlobalCall}
            onReject={handleRejectGlobalCall}
          />
        )}
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
