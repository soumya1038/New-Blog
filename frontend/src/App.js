import React, { useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import NotFound from './pages/NotFound';
import ErrorFallback from './components/ErrorFallback';
import socketService from './services/socket';
import soundNotification from './utils/soundNotifications';
import api from './services/api';
import { ErrorBoundary } from 'react-error-boundary';
import { useRouteTracker } from './hooks/useRouteTracker';

function AppContent() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  
  // Track route changes and emit to backend
  useRouteTracker();

  useEffect(() => {
    if (!user) return;

    const socket = socketService.connect(user._id);

    const handleMessageReceive = async (message) => {
      const isInChat = location.pathname === '/chat';
      
      if (!isInChat) {
        soundNotification.playMessageNotificationSound();
        window.dispatchEvent(new CustomEvent('newNotification'));
      }
    };

    const handleNotificationLike = () => {
      soundNotification.playNotificationReceivedSound();
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleNotificationComment = () => {
      soundNotification.playNotificationReceivedSound();
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleNotificationFollow = () => {
      soundNotification.playNotificationReceivedSound();
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleNotificationsUpdated = () => {
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    const handleNotificationMessage = () => {
      soundNotification.playMessageNotificationSound();
      window.dispatchEvent(new CustomEvent('newNotification'));
    };

    socket.on('message:receive', handleMessageReceive);
    socket.on('notification:like', handleNotificationLike);
    socket.on('notification:comment', handleNotificationComment);
    socket.on('notification:follow', handleNotificationFollow);
    socket.on('notification:message', handleNotificationMessage);
    socket.on('notifications:updated', handleNotificationsUpdated);

    return () => {
      socket.off('message:receive', handleMessageReceive);
      socket.off('notification:like', handleNotificationLike);
      socket.off('notification:comment', handleNotificationComment);
      socket.off('notification:follow', handleNotificationFollow);
      socket.off('notification:message', handleNotificationMessage);
      socket.off('notifications:updated', handleNotificationsUpdated);
    };
  }, [user, location.pathname]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen">
        <Navbar />
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
