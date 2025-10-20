import React, { useState, useEffect, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatSkeleton } from '../components/SkeletonLoader';
import api from '../services/api';
import socketService from '../services/socket';
import { FiSend, FiSearch, FiMoreVertical, FiX, FiTrash2, FiBell, FiBellOff, FiUserX, FiArchive, FiAlertCircle, FiSmile, FiCornerUpLeft, FiShare2, FiUser, FiChevronDown, FiBookmark, FiZap, FiEdit3 } from 'react-icons/fi';
import { BsCheck, BsCheckAll, BsPinAngleFill, BsPinAngle } from 'react-icons/bs';
import soundNotification from '../utils/soundNotifications';
// Translation support - Import useTranslation hook from react-i18next
// This enables multi-language support for the chat interface
import { useTranslation } from 'react-i18next';

const ChatNew = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  // Initialize translation hook - t() function is used to translate text
  // Language is automatically detected from localStorage or browser settings
  // To add more languages: Update src/i18n.js with new translation keys
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinningMessage, setPinningMessage] = useState(null);
  const [selectedPinDuration, setSelectedPinDuration] = useState(24);
  const [showPinDropdown, setShowPinDropdown] = useState(false);
  const [showConvMenu, setShowConvMenu] = useState(null);
  const [mutedUsers, setMutedUsers] = useState(new Set());
  const [blockedUsers, setBlockedUsers] = useState(new Set());
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState(new Set());
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showQuickChatModal, setShowQuickChatModal] = useState(false);
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const messageMenuRef = useRef(null);
  const chatMenuRef = useRef(null);
  const userPanelRef = useRef(null);
  const pinDropdownRef = useRef(null);
  const convMenuRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    if (user) {
      socket.current = socketService.connect(user._id);

      // Notify backend that user is on /chat route
      socketService.updateRoute('/chat');

      socket.current.on('users:online', (userIds) => {
        setOnlineUsers(new Set(userIds));
      });

      socket.current.on('user:status', ({ userId, status }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (status === 'online') newSet.add(userId);
          else newSet.delete(userId);
          return newSet;
        });
      });

      socket.current.on('message:receive', (message) => {
        // Check if chat is open with the sender
        const isChatOpen = selectedChat && message.sender._id === selectedChat._id;

        if (isChatOpen) {
          // Chat is OPEN - add message with SOFT sound
          setMessages(prev => [...prev, message]);
          // Play sound only if not muted - use callback to get latest state
          setMutedUsers(currentMuted => {
            if (!currentMuted.has(message.sender._id)) {
              soundNotification.playReceiveSoundActive(); // Soft sound for active chat
            }
            return currentMuted;
          });
          // Mark as read immediately and notify sender
          socket.current.emit('messages:mark-read', { senderId: message.sender._id });
          api.put(`/messages/mark-read/${message.sender._id}`).catch(err => console.error(err));
        } else {
          // Chat is CLOSED - play ALERT sound only if not muted - use callback to get latest state
          setMutedUsers(currentMuted => {
            if (!currentMuted.has(message.sender._id)) {
              soundNotification.playReceiveSound(); // Louder alert sound
            }
            return currentMuted;
          });
        }

        // Always refresh conversations to update unread counts
        loadConversations();
      });

      socket.current.on('message:sent', (message) => {
        setMessages(prev => [...prev, message]);
        soundNotification.playSendSound();
        loadConversations();
      });

      socket.current.on('message:status', ({ messageId, status, readAt }) => {
        setMessages(prev => prev.map(msg => {
          if (msg._id === messageId) {
            if (status === 'delivered') {
              return { ...msg, delivered: true };
            } else if (status === 'read') {
              return { ...msg, delivered: true, read: true, readAt };
            }
          }
          return msg;
        }));
      });

      socket.current.on('typing:status', ({ userId, typing }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (typing) newSet.add(userId);
          else newSet.delete(userId);
          return newSet;
        });
      });

      socket.current.on('message:reaction', ({ messageId, reactions }) => {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ));
      });

      socket.current.on('message:pinned', ({ messageId, pinned }) => {
        if (pinned) {
          loadPinnedMessages();
        } else {
          setPinnedMessages(prev => prev.filter(m => m._id !== messageId));
        }
      });

      loadConversations();
      loadBlockedUsers();
      loadMutedUsers();

      // Check if warning banner was dismissed
      const warningDismissed = localStorage.getItem('chatWarningDismissed');
      if (!warningDismissed) {
        setShowWarningBanner(true);
      }
    }

    return () => {
      // Notify backend that user left /chat route
      socketService.updateRoute(null);

      if (socket.current) {
        socketService.disconnect();
      }
    };
  }, [user]);

  useEffect(() => {
    if (!loading && location.state?.selectedUser) {
      setSelectedChat(location.state.selectedUser);
    }
  }, [loading, location.state]);

  // Scroll position tracker
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsAtBottom(isBottom);
    if (isBottom) setNewMessageCount(0);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target)) {
        setShowChatMenu(false);
      }
      if (convMenuRef.current && !convMenuRef.current.contains(event.target)) {
        setShowConvMenu(null);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(null);
      }
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
        setShowMessageMenu(null);
      }
      if (userPanelRef.current && !userPanelRef.current.contains(event.target)) {
        setShowUserPanel(false);
      }
      if (pinDropdownRef.current && !pinDropdownRef.current.contains(event.target)) {
        setShowPinDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat._id);
      loadPinnedMessages();
      // Load full user details if description is missing
      if (!selectedChat.description) {
        loadUserDetails(selectedChat._id);
      }
    }
  }, [selectedChat]);

  // Auto-refresh messages every 2 seconds when chat is open
  useEffect(() => {
    if (!selectedChat?._id) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/messages/${selectedChat._id}`);

        // Only update if messages changed
        setMessages(prev => {
          if (data.messages.length !== prev.length ||
            data.messages[data.messages.length - 1]?._id !== prev[prev.length - 1]?._id) {

            if (!isAtBottom) {
              setNewMessageCount(c => c + (data.messages.length - prev.length));
            }
            return data.messages;
          }
          return prev;
        });

        // Mark messages as read
        await api.put(`/messages/mark-read/${selectedChat._id}`);
      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedChat?._id, isAtBottom]);

  // Auto-refresh conversations every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const { data } = await api.get('/messages/blocked-users');
      const blockedIds = new Set(data.blockedUsers.map(u => u._id));
      setBlockedUsers(blockedIds);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    }
  };

  const loadMutedUsers = async () => {
    try {
      const { data } = await api.get('/messages/muted-users');
      const mutedIds = new Set(data.mutedUsers.map(u => u._id));
      setMutedUsers(mutedIds);
    } catch (error) {
      console.error('Failed to load muted users:', error);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const { data } = await api.get(`/messages/${userId}`);
      setMessages(data.messages);

      // Mark all messages from this user as read
      await api.put(`/messages/mark-read/${userId}`);

      // Notify sender via socket for real-time status update
      socket.current.emit('messages:mark-read', { senderId: userId });

      // Refresh conversation list to update unread count
      loadConversations();
      // Scroll to bottom when opening chat
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        setIsAtBottom(true);
        setNewMessageCount(0);
      }, 200);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadUserDetails = async (userId) => {
    try {
      const { data } = await api.get(`/users/profile/${userId}`);
      setSelectedChat(data.user);
    } catch (error) {
      console.error('Failed to load user details:', error);
    }
  };

  const loadPinnedMessages = async () => {
    if (!selectedChat) return;
    try {
      const { data } = await api.get(`/messages/pinned/${selectedChat._id}`);
      setPinnedMessages(data.pinnedMessages || []);
    } catch (error) {
      console.error('Failed to load pinned messages:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const { data } = await api.get(`/messages/search-users?query=${query}`);
        setSearchResults(data.users);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;

    socket.current.emit('message:send', {
      receiverId: selectedChat._id,
      content: newMessage.trim(),
      replyTo: replyingTo?._id || null
    });

    setNewMessage('');
    setReplyingTo(null);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.current.emit('typing:stop', selectedChat._id);
    }

    // Scroll to bottom when user sends message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setIsAtBottom(true);
      setNewMessageCount(0);
    }, 100);
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setShowMessageMenu(null);
  };

  const handleForward = (message) => {
    setForwardMessage(message);
    setSelectedRecipients(new Set());
    setShowMessageMenu(null);
  };

  const toggleRecipient = (userId) => {
    setSelectedRecipients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleForwardConfirm = () => {
    if (!forwardMessage || selectedRecipients.size === 0) return;

    selectedRecipients.forEach(recipientId => {
      socket.current.emit('message:send', {
        receiverId: recipientId,
        content: forwardMessage.content
      });
    });

    setForwardMessage(null);
    setSelectedRecipients(new Set());
    showAlertModal('Success', `Message forwarded to ${selectedRecipients.size} user${selectedRecipients.size > 1 ? 's' : ''}`);
  };

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-yellow-100');
      setTimeout(() => element.classList.remove('bg-yellow-100'), 2000);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!selectedChat) return;

    socket.current.emit('typing:start', selectedChat._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.current.emit('typing:stop', selectedChat._id);
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return t('Today');
    if (d.toDateString() === yesterday.toDateString()) return t('Yesterday');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOnline = (userId) => onlineUsers.has(userId);

  const getUserDisplayName = (user) => {
    return user?.fullName || user?.name || user?.username || user?.email?.split('@')[0] || 'Unknown User';
  };

  const getUserAvatar = (user) => {
    const displayName = getUserDisplayName(user);
    return user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
  };

  const getLastSeenText = (lastSeen) => {
    if (!lastSeen) return t('Offline');

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('Just now');
    if (diffMins < 60) return `${t('Last seen')} ${diffMins}m ${t('ago')}`;
    if (diffHours < 24) return `${t('Last seen')} ${diffHours}h ${t('ago')}`;
    if (diffDays < 7) return `${t('Last seen')} ${diffDays}d ${t('ago')}`;
    return `${t('Last seen')} ${lastSeenDate.toLocaleDateString()}`;
  };

  const handleReaction = (messageId, emoji) => {
    socket.current.emit('message:react', { messageId, emoji });
    setShowReactionPicker(null);
  };

  const handleRemoveReaction = (messageId) => {
    socket.current.emit('message:unreact', { messageId });
  };

  const handlePinMessage = async (duration) => {
    if (!pinningMessage) return;

    try {
      await api.post(`/messages/pin/${pinningMessage._id}`, { duration });
      socket.current.emit('message:pin', { messageId: pinningMessage._id, receiverId: selectedChat._id });
      loadPinnedMessages();
      setShowPinModal(false);
      setPinningMessage(null);
      setShowMessageMenu(null);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to pin message';
      showAlertModal('Error', errorMsg);
    }
  };

  const openPinModal = (message) => {
    setPinningMessage(message);
    setSelectedPinDuration(24); // Default to 24 hours
    setShowPinModal(true);
    setShowMessageMenu(null);
  };

  const handleUnpinMessage = async (messageId) => {
    try {
      await api.post(`/messages/unpin/${messageId}`);
      socket.current.emit('message:unpin', { messageId, receiverId: selectedChat._id });
      setPinnedMessages(prev => prev.filter(m => m._id !== messageId));
    } catch (error) {
      console.error('Failed to unpin message:', error);
      showAlertModal('Error', 'Failed to unpin message');
    }
  };

  const showConfirmModal = (title, message, onConfirm) => {
    setModal({ show: true, type: 'confirm', title, message, onConfirm });
  };

  const showAlertModal = (title, message) => {
    setModal({ show: true, type: 'alert', title, message, onConfirm: null });
  };

  const closeModal = () => {
    setModal({ show: false, type: '', title: '', message: '', onConfirm: null });
  };

  const handleModalConfirm = () => {
    if (modal.onConfirm) modal.onConfirm();
    closeModal();
  };

  const handleDeleteConversation = async (userId) => {
    showConfirmModal(
      'Delete Conversation',
      'Delete this entire conversation? This cannot be undone.',
      async () => {
        try {
          await api.delete(`/messages/conversation/${userId}`);
          setConversations(prev => prev.filter(c => c.user._id !== userId));
          if (selectedChat?._id === userId) {
            setSelectedChat(null);
            setMessages([]);
          }
          setShowConvMenu(null);
        } catch (error) {
          console.error('Failed to delete conversation:', error);
          showAlertModal('Error', 'Failed to delete conversation');
        }
      }
    );
  };

  const handleMuteUser = async (userId) => {
    const isMuted = mutedUsers.has(userId);

    try {
      if (isMuted) {
        // Unmute
        await api.post(`/messages/unmute/${userId}`);
        setMutedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        // Mute
        await api.post(`/messages/mute/${userId}`);
        setMutedUsers(prev => new Set([...prev, userId]));
      }
      setShowConvMenu(null);
      setShowChatMenu(false);
    } catch (error) {
      console.error('Failed to mute/unmute user:', error);
      alert('Failed to update mute status');
    }
  };

  const handleBlockUser = async (userId) => {
    showConfirmModal(
      'Block User',
      'Block this user? They will not be able to message you.',
      async () => {
        try {
          await api.post(`/messages/block/${userId}`);
          setBlockedUsers(prev => new Set([...prev, userId]));
          setShowConvMenu(null);
          setShowChatMenu(false);
          showAlertModal('Success', 'User blocked successfully. You can unblock them anytime from the menu.');
        } catch (error) {
          console.error('Failed to block user:', error);
          showAlertModal('Error', 'Failed to block user');
        }
      }
    );
  };

  const handleUnblockUser = async (userId) => {
    showConfirmModal(
      'Unblock User',
      'Unblock this user? They will be able to message you again.',
      async () => {
        try {
          await api.post(`/messages/unblock/${userId}`);
          setBlockedUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
          setShowConvMenu(null);
          setShowChatMenu(false);
          showAlertModal('Success', 'User unblocked successfully. You can now message each other.');
        } catch (error) {
          console.error('Failed to unblock user:', error);
          showAlertModal('Error', 'Failed to unblock user');
        }
      }
    );
  };

  const handleClearChat = async () => {
    showConfirmModal(
      'Clear Messages',
      'Clear all messages in this chat? This cannot be undone.',
      async () => {
        try {
          await api.delete(`/messages/clear/${selectedChat._id}`);
          setMessages([]);
          loadConversations();
          setShowChatMenu(false);
        } catch (error) {
          console.error('Failed to clear chat:', error);
          showAlertModal('Error', 'Failed to clear chat');
        }
      }
    );
  };

  const dismissWarningBanner = () => {
    localStorage.setItem('chatWarningDismissed', 'true');
    setShowWarningBanner(false);
  };

  const handleQuickChat = async (category) => {
    setAiLoading(true);
    try {
      const { data } = await api.post('/ai/quick-chat', {
        category,
        recipientName: selectedChat ? getUserDisplayName(selectedChat) : 'them'
      });
      setNewMessage(data.message);
      setShowQuickChatModal(false);
    } catch (error) {
      console.error('Quick chat error:', error);
      showAlertModal('Error', 'Failed to generate message');
    } finally {
      setAiLoading(false);
    }
  };

  const handleEnhance = async (enhanceType) => {
    if (!newMessage.trim()) {
      showAlertModal('Error', 'Please enter a message first');
      return;
    }

    setAiLoading(true);
    try {
      const { data } = await api.post('/ai/enhance-message', {
        message: newMessage,
        enhanceType
      });
      setNewMessage(data.enhancedMessage);
      setShowEnhanceModal(false);
    } catch (error) {
      console.error('Enhance error:', error);
      showAlertModal('Error', 'Failed to enhance message');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Profile Image Modal */}
      {showImageModal && selectedChat && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowImageModal(false);
          }}
        >
          <div className="relative max-w-sm md:max-w-md lg:max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowImageModal(false);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-3xl z-10 bg-black bg-opacity-50 rounded-full p-2"
            >
              <FiX />
            </button>
            <img
              src={getUserAvatar(selectedChat)}
              alt={getUserDisplayName(selectedChat)}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Pin Duration Modal */}
      {showPinModal && pinningMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('Choose How Long Your Pin Lasts')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('You can unpin at any time')}</p>

              <div className="space-y-2 mb-5">
                <label
                  className={`w-full px-4 py-3 text-sm rounded-lg transition-colors border-2 cursor-pointer flex items-center gap-3 ${selectedPinDuration === 24
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                >
                  <input
                    type="radio"
                    name="pinDuration"
                    checked={selectedPinDuration === 24}
                    onChange={() => setSelectedPinDuration(24)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="flex-1">{t('24 hours')}</span>
                </label>
                <label
                  className={`w-full px-4 py-3 text-sm rounded-lg transition-colors border-2 cursor-pointer flex items-center gap-3 ${selectedPinDuration === 168
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                >
                  <input
                    type="radio"
                    name="pinDuration"
                    checked={selectedPinDuration === 168}
                    onChange={() => setSelectedPinDuration(168)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="flex-1">{t('7 days')}</span>
                </label>
                <label
                  className={`w-full px-4 py-3 text-sm rounded-lg transition-colors border-2 cursor-pointer flex items-center gap-3 ${selectedPinDuration === 720
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                >
                  <input
                    type="radio"
                    name="pinDuration"
                    checked={selectedPinDuration === 720}
                    onChange={() => setSelectedPinDuration(720)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="flex-1">{t('30 days')}</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setPinningMessage(null);
                    setSelectedPinDuration(24);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={() => handlePinMessage(selectedPinDuration)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {t('Pin')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('Forward Message')}</h3>
              <button onClick={() => {
                setForwardMessage(null);
                setSelectedRecipients(new Set());
              }} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600">{forwardMessage.content}</p>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t('Select recipients')} ({selectedRecipients.size} {t('selected')}):
              </p>
              <div className="space-y-2">
                {conversations.map(conv => (
                  <label
                    key={conv.user._id}
                    className={`w-full flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${selectedRecipients.has(conv.user._id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.has(conv.user._id)}
                      onChange={() => toggleRecipient(conv.user._id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <img
                      src={getUserAvatar(conv.user)}
                      alt={getUserDisplayName(conv.user)}
                      className="w-10 h-10 rounded-full object-cover ml-3"
                    />
                    <p className="ml-3 font-medium text-gray-900">{getUserDisplayName(conv.user)}</p>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setForwardMessage(null);
                  setSelectedRecipients(new Set());
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleForwardConfirm}
                disabled={selectedRecipients.size === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {t('Forward to')} {selectedRecipients.size || '...'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Chat Modal */}
      {showQuickChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiZap className="text-purple-600" /> {t('Quick Chat')}
                </h3>
                <button onClick={() => setShowQuickChatModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">{t('Select a message type to generate')}</p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickChat('greeting')}
                  disabled={aiLoading}
                  className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">👋 {t('Greeting')}</div>
                  <div className="text-xs text-gray-500">{t('Say hello')}</div>
                </button>
                <button
                  onClick={() => handleQuickChat('question')}
                  disabled={aiLoading}
                  className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">❓ {t('Question')}</div>
                  <div className="text-xs text-gray-500">{t('Ask how they are')}</div>
                </button>
                <button
                  onClick={() => handleQuickChat('thanks')}
                  disabled={aiLoading}
                  className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">🙏 {t('Thanks')}</div>
                  <div className="text-xs text-gray-500">{t('Say thank you')}</div>
                </button>
                <button
                  onClick={() => handleQuickChat('apology')}
                  disabled={aiLoading}
                  className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">😔 {t('Apology')}</div>
                  <div className="text-xs text-gray-500">{t('Say sorry')}</div>
                </button>
                <button
                  onClick={() => handleQuickChat('meeting')}
                  disabled={aiLoading}
                  className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">📅 {t('Meeting')}</div>
                  <div className="text-xs text-gray-500">{t('Schedule meeting')}</div>
                </button>
                <button
                  onClick={() => handleQuickChat('followup')}
                  disabled={aiLoading}
                  className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">📬 {t('Follow-up')}</div>
                  <div className="text-xs text-gray-500">{t('Check in')}</div>
                </button>
                <button
                  onClick={() => handleQuickChat('congratulations')}
                  disabled={aiLoading}
                  className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">🎉 {t('Congrats')}</div>
                  <div className="text-xs text-gray-500">{t('Celebrate')}</div>
                </button>
                <button
                  onClick={() => handleQuickChat('support')}
                  disabled={aiLoading}
                  className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">💪 {t('Support')}</div>
                  <div className="text-xs text-gray-500">{t('Show support')}</div>
                </button>
              </div>

              {aiLoading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-purple-600">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">{t('Generating')}...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhance Modal */}
      {showEnhanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiEdit3 className="text-blue-600" /> {t('Enhance Message')}
                </h3>
                <button onClick={() => setShowEnhanceModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">{t('Choose how to improve your message')}</p>

              <div className="space-y-2">
                <button
                  onClick={() => handleEnhance('grammar')}
                  disabled={aiLoading}
                  className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">✓ {t('Fix Grammar')}</div>
                  <div className="text-xs text-gray-500">{t('Correct spelling and grammar errors')}</div>
                </button>
                <button
                  onClick={() => handleEnhance('formal')}
                  disabled={aiLoading}
                  className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">👔 {t('Make Formal')}</div>
                  <div className="text-xs text-gray-500">{t('More professional tone')}</div>
                </button>
                <button
                  onClick={() => handleEnhance('casual')}
                  disabled={aiLoading}
                  className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">😊 {t('Make Casual')}</div>
                  <div className="text-xs text-gray-500">{t('More friendly tone')}</div>
                </button>
                <button
                  onClick={() => handleEnhance('shorter')}
                  disabled={aiLoading}
                  className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">📉 {t('Make Shorter')}</div>
                  <div className="text-xs text-gray-500">{t('More concise')}</div>
                </button>
                <button
                  onClick={() => handleEnhance('longer')}
                  disabled={aiLoading}
                  className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">📈 {t('Make Longer')}</div>
                  <div className="text-xs text-gray-500">{t('Add more detail')}</div>
                </button>
                <button
                  onClick={() => handleEnhance('polite')}
                  disabled={aiLoading}
                  className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">🙏 {t('Make Polite')}</div>
                  <div className="text-xs text-gray-500">{t('More respectful tone')}</div>
                </button>
              </div>

              {aiLoading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">{t('Enhancing')}...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-fadeIn">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{modal.title}</h3>
              <p className="text-gray-600 mb-6">{modal.message}</p>
              <div className="flex justify-end gap-3">
                {modal.type === 'confirm' && (
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {t('Cancel')}
                  </button>
                )}
                <button
                  onClick={modal.type === 'confirm' ? handleModalConfirm : closeModal}
                  className={`px-4 py-2 rounded-lg transition-colors ${modal.type === 'confirm'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {modal.type === 'confirm' ? t('Confirm') : t('OK')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">{t('Messaging')}</h1>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('Search messages')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            searchResults.map(user => (
              <div
                key={user._id}
                className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                onClick={() => {
                  setSelectedChat(user);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <div className="relative">
                  <img
                    src={getUserAvatar(user)}
                    alt={getUserDisplayName(user)}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-medium text-gray-900">{getUserDisplayName(user)}</p>
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>{t('No conversations yet')}</p>
              <p className="text-sm mt-2">{t('Search for users to start chatting')}</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.user._id}
                className={`flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 relative group cursor-pointer ${selectedChat?._id === conv.user._id ? 'bg-blue-50' : ''
                  }`}
                onClick={async () => {
                  // Clear unread count immediately for better UX
                  setConversations(prev => prev.map(c =>
                    c.user._id === conv.user._id ? { ...c, unreadCount: 0 } : c
                  ));
                  console.log('Conversation user selected:', conv.user);
                  setSelectedChat(conv.user);
                }}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="relative">
                    <img
                      src={getUserAvatar(conv.user)}
                      alt={getUserDisplayName(conv.user)}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {isOnline(conv.user._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{getUserDisplayName(conv.user)}</p>
                        {blockedUsers.has(conv.user._id) && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{t('Blocked')}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2">{formatDate(conv.lastMessage.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {mutedUsers.has(conv.user._id) && (
                        <FiBellOff className="text-gray-400 text-xs" />
                      )}
                      <p className="text-sm text-gray-600 truncate flex-1">{conv.lastMessage.content}</p>
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConvMenu(showConvMenu === conv.user._id ? null : conv.user._id);
                    }}
                    className="p-2 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiMoreVertical className="text-gray-600" />
                  </button>
                  {showConvMenu === conv.user._id && (
                    <div ref={convMenuRef} className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => handleMuteUser(conv.user._id)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        {mutedUsers.has(conv.user._id) ? (
                          <><FiBell className="text-gray-600" /> {t('Unmute')}</>
                        ) : (
                          <><FiBellOff className="text-gray-600" /> {t('Mute notifications')}</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteConversation(conv.user._id)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      >
                        <FiTrash2 /> {t('Delete conversation')}
                      </button>
                      {blockedUsers.has(conv.user._id) ? (
                        <button
                          onClick={() => handleUnblockUser(conv.user._id)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600 rounded-b-lg"
                        >
                          <FiUserX /> {t('Unblock user')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlockUser(conv.user._id)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600 rounded-b-lg"
                        >
                          <FiUserX /> {t('Block user')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white relative ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {/* Dismissible Warning Banner */}
        {showWarningBanner && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-800">
              <FiAlertCircle className="text-lg flex-shrink-0" />
              <p className="text-sm">
                <strong>{t('Important')}:</strong> {t('All messages are automatically deleted after 30 days for privacy and storage management')}
              </p>
            </div>
            <button
              onClick={dismissWarningBanner}
              className="text-yellow-600 hover:text-yellow-800 ml-4"
              title="Dismiss"
            >
              <FiX className="text-lg" />
            </button>
          </div>
        )}

        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="relative">
              <div
                className="p-4 border-b border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setShowUserPanel(!showUserPanel)}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChat(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full md:hidden flex-shrink-0"
                  >
                    <FiX className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="relative flex-shrink-0">
                    <img
                      src={getUserAvatar(selectedChat)}
                      alt={getUserDisplayName(selectedChat)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {isOnline(selectedChat._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900">{getUserDisplayName(selectedChat)}</h2>
                    <p className="text-xs text-gray-500">
                      {isOnline(selectedChat._id) ? t('Active now') : getLastSeenText(selectedChat.lastSeen)}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Details Panel - Popup Overlay */}
              {showUserPanel && (
                <div ref={userPanelRef} className="absolute top-full left-0 w-full md:w-1/2 bg-white border border-gray-200 rounded-b-lg shadow-2xl z-50 animate-slideDown">
                  {/* Profile Section */}
                  <div className="p-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-3 cursor-pointer" onClick={() => setShowImageModal(true)}>
                        <img
                          src={getUserAvatar(selectedChat)}
                          alt={getUserDisplayName(selectedChat)}
                          className="w-16 h-16 rounded-full object-cover hover:opacity-80 transition-opacity"
                        />
                        {isOnline(selectedChat._id) && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{getUserDisplayName(selectedChat)}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {isOnline(selectedChat._id) ? t('Active now') : getLastSeenText(selectedChat.lastSeen)}
                      </p>
                      {selectedChat.description && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-1">{t('Description')}</p>
                          <p className="text-sm text-gray-600 italic">{selectedChat.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 mt-5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/${selectedChat._id}`);
                          setShowUserPanel(false);
                        }}
                        className="col-span-2 px-4 py-2.5 text-sm hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 transition-colors border border-blue-200 text-blue-600"
                      >
                        <FiUser className="w-4 h-4" /> <span>{t('View Profile')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMuteUser(selectedChat._id);
                          setShowUserPanel(false);
                        }}
                        className="px-4 py-2.5 text-sm hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-200"
                      >
                        {mutedUsers.has(selectedChat._id) ? (
                          <><FiBell className="w-4 h-4 text-gray-600" /> <span>{t('Unmute')}</span></>
                        ) : (
                          <><FiBellOff className="w-4 h-4 text-gray-600" /> <span>{t('Mute')}</span></>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearChat();
                          setShowUserPanel(false);
                        }}
                        className="px-4 py-2.5 text-sm hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-200"
                      >
                        <FiArchive className="w-4 h-4 text-gray-600" /> <span>{t('Clear')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(selectedChat._id);
                          setShowUserPanel(false);
                        }}
                        className="px-4 py-2.5 text-sm hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 text-red-600 transition-colors border border-red-200"
                      >
                        <FiTrash2 className="w-4 h-4" /> <span>{t('Delete')}</span>
                      </button>
                      {blockedUsers.has(selectedChat._id) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnblockUser(selectedChat._id);
                            setShowUserPanel(false);
                          }}
                          className="px-4 py-2.5 text-sm hover:bg-green-50 rounded-lg flex items-center justify-center gap-2 text-green-600 transition-colors border border-green-200"
                        >
                          <FiUserX className="w-4 h-4" /> <span>{t('Unblock')}</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBlockUser(selectedChat._id);
                            setShowUserPanel(false);
                          }}
                          className="px-4 py-2.5 text-sm hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 text-red-600 transition-colors border border-red-200"
                        >
                          <FiUserX className="w-4 h-4" /> <span>{t('Block')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Messages Banner */}
            {pinnedMessages.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => scrollToMessage(pinnedMessages[0]._id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <BsPinAngleFill className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  {pinnedMessages.length > 1 && (
                    <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {pinnedMessages.length}
                    </span>
                  )}
                  <p className="text-sm text-blue-800 truncate flex-1">
                    <span className="font-semibold">
                      {pinnedMessages[0].sender._id === user._id ? t('You') : getUserDisplayName(pinnedMessages[0].sender)}:
                    </span>
                    {' '}{pinnedMessages[0].content}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPinDropdown(!showPinDropdown);
                    }}
                    className="p-1 hover:bg-blue-200 rounded transition-colors"
                  >
                    <FiChevronDown className="w-4 h-4 text-blue-600" />
                  </button>
                  {showPinDropdown && (
                    <div ref={pinDropdownRef} className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-80 overflow-y-auto">
                      {pinnedMessages.map((msg, index) => (
                        <div key={msg._id} className={`px-3 py-2 hover:bg-gray-50 ${index < pinnedMessages.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 mb-1">
                                {msg.sender._id === user._id ? t('You') : getUserDisplayName(msg.sender)}
                              </p>
                              <p className="text-xs text-gray-600 line-clamp-2">{msg.content}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  scrollToMessage(msg._id);
                                  setShowPinDropdown(false);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Go to message"
                              >
                                <FiCornerUpLeft className="w-3 h-3 text-gray-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnpinMessage(msg._id);
                                  setShowPinDropdown(false);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Unpin"
                              >
                                <BsPinAngle className="w-3 h-3 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {/* System Message - Auto-delete Warning */}
              <div className="flex justify-center my-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 max-w-md shadow-sm">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-yellow-800 mb-1">{t('System Message')}</p>
                      <p className="text-xs text-yellow-700">
                        {t('Messages in this conversation are automatically deleted after 30 days for privacy and storage management')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {messages.map((msg, index) => {
                const isOwn = msg.sender._id === user._id;
                const showDate = index === 0 || formatDate(messages[index - 1].createdAt) !== formatDate(msg.createdAt);
                const userReaction = msg.reactions?.find(r => r.user._id === user._id || r.user === user._id);
                const otherReactions = msg.reactions?.filter(r => r.user._id !== user._id && r.user !== user._id) || [];

                // Message grouping logic
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

                const isSameSenderAsPrev = prevMsg && prevMsg.sender._id === msg.sender._id;
                const isSameSenderAsNext = nextMsg && nextMsg.sender._id === msg.sender._id;

                const isFirstInGroup = !isSameSenderAsPrev;
                const isLastInGroup = !isSameSenderAsNext;

                // Determine border radius based on position in group
                let borderRadiusClass = '';
                if (isOwn) {
                  if (isFirstInGroup && isLastInGroup) {
                    borderRadiusClass = 'rounded-3xl'; // Single message
                  } else if (isFirstInGroup) {
                    borderRadiusClass = 'rounded-t-3xl rounded-bl-3xl rounded-br-md'; // First in group
                  } else if (isLastInGroup) {
                    borderRadiusClass = 'rounded-b-3xl rounded-tl-3xl rounded-tr-md'; // Last in group
                  } else {
                    borderRadiusClass = 'rounded-l-3xl rounded-r-md'; // Middle of group
                  }
                } else {
                  if (isFirstInGroup && isLastInGroup) {
                    borderRadiusClass = 'rounded-3xl'; // Single message
                  } else if (isFirstInGroup) {
                    borderRadiusClass = 'rounded-t-3xl rounded-br-3xl rounded-bl-md'; // First in group
                  } else if (isLastInGroup) {
                    borderRadiusClass = 'rounded-b-3xl rounded-tr-3xl rounded-tl-md'; // Last in group
                  } else {
                    borderRadiusClass = 'rounded-r-3xl rounded-l-md'; // Middle of group
                  }
                }

                return (
                  <div key={msg._id} id={`msg-${msg._id}`} className="transition-colors duration-500">
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group ${isLastInGroup ? 'mb-[2px]' : 'mb-[2px]'}`}>
                      <div className={`flex items-end max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'} relative`}>
                        {/* Avatar - only show on last message in group */}
                        {isLastInGroup ? (
                          <img
                            src={isOwn ? getUserAvatar(user) : getUserAvatar(msg.sender)}
                            alt={isOwn ? getUserDisplayName(user) : getUserDisplayName(msg.sender)}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                        <div className="mx-2 relative flex items-end gap-2">
                          <div className={`${isOwn ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-200 text-gray-900'} ${borderRadiusClass} px-4 py-2 shadow-sm`}>
                            {/* Reply Quote */}
                            {msg.replyTo && (
                              <div
                                onClick={() => scrollToMessage(msg.replyTo._id)}
                                className={`${isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-300'} rounded-2xl p-2 mb-2 cursor-pointer hover:opacity-80 border-l-4 ${isOwn ? 'border-white border-opacity-50' : 'border-gray-500'}`}
                              >
                                <p className={`text-xs font-semibold ${isOwn ? 'text-white text-opacity-90' : 'text-gray-700'}`}>
                                  {getUserDisplayName(msg.replyTo.sender)}
                                </p>
                                <p className={`text-xs ${isOwn ? 'text-white text-opacity-80' : 'text-gray-600'} truncate`}>
                                  {msg.replyTo.content.length > 50 ? msg.replyTo.content.substring(0, 50) + '...' : msg.replyTo.content}
                                </p>
                              </div>
                            )}
                            <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                          </div>

                          {/* Timestamp outside bubble */}
                          <div className={`flex items-center gap-1 text-xs text-gray-500 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isOwn && (
                              msg.read ? (
                                <BsCheckAll className="text-sm text-green-500" title="Read" />
                              ) : msg.delivered ? (
                                <BsCheckAll className="text-sm" title="Delivered" />
                              ) : (
                                <BsCheck className="text-sm" title="Sent" />
                              )
                            )}
                          </div>

                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              {userReaction && (
                                <button
                                  onClick={() => handleRemoveReaction(msg._id)}
                                  className="bg-white border border-gray-200 rounded-full px-2 py-0.5 text-sm hover:bg-gray-50 shadow-sm"
                                  title="Remove your reaction"
                                >
                                  {userReaction.emoji}
                                </button>
                              )}
                              {otherReactions.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-full px-2 py-0.5 text-sm shadow-sm">
                                  {otherReactions.map((r, i) => (
                                    <span key={i}>{r.emoji}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                        {/* Message Menu Button */}
                        <button
                          onClick={() => setShowMessageMenu(showMessageMenu === msg._id ? null : msg._id)}
                          className={`absolute ${isOwn ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 ${isOwn ? '-translate-x-8' : 'translate-x-8'} opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-full p-1.5 hover:bg-gray-50 shadow-sm`}
                          title="More"
                        >
                          <FiMoreVertical className="w-4 h-4 text-gray-600" />
                        </button>

                        {/* Message Menu */}
                        {showMessageMenu === msg._id && (
                          <div ref={messageMenuRef} className={`absolute ${isOwn ? 'left-0' : 'right-0'} bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-40`}>
                            <button
                              onClick={() => {
                                setShowReactionPicker(msg._id);
                                setShowMessageMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiSmile className="w-4 h-4" /> {t('React')}
                            </button>
                            <button
                              onClick={() => handleReply(msg)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiCornerUpLeft className="w-4 h-4" /> {t('Reply')}
                            </button>
                            <button
                              onClick={() => handleForward(msg)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FiShare2 className="w-4 h-4" /> {t('Forward')}
                            </button>
                            <button
                              onClick={() => openPinModal(msg)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <BsPinAngleFill className="w-4 h-4" /> {t('Pin')}
                            </button>
                          </div>
                        )}

                        {/* Reaction Picker */}
                        {showReactionPicker === msg._id && (
                          <div
                            ref={reactionPickerRef}
                            className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-2 z-10`}
                          >
                            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg._id, emoji)}
                                className="text-2xl hover:scale-125 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {typingUsers.has(selectedChat._id) && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">{getUserDisplayName(selectedChat)} {t('is typing')}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button - WhatsApp style */}
            {!isAtBottom && (
              <button
                onClick={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  setNewMessageCount(0);
                  setIsAtBottom(true);
                }}
                className="fixed bottom-28 sm:bottom-32 right-6 sm:right-8 bg-white hover:bg-gray-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-50 border border-gray-200 transition-all"
              >
                <FiChevronDown className="w-6 h-6 text-gray-700" />
                {newMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
                    {newMessageCount > 9 ? '9+' : newMessageCount}
                  </span>
                )}
              </button>
            )}

            {/* Message Input - Fixed to bottom */}
            <div className="sticky bottom-0 p-2 sm:p-4 border-t border-gray-200 bg-white">
              {/* Quick Chat & Enhance Text Links */}
              <div className="flex gap-3 mb-0.5">
                <button
                  onClick={() => setShowQuickChatModal(true)}
                  className="flex items-center gap-1.5 text-xs sm:text-sm text-purple-600 hover:text-purple-700 transition-colors bg-transparent"
                >
                  <FiZap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="font-medium">{t('Quick Chat')}</span>
                </button>
                <button
                  onClick={() => setShowEnhanceModal(true)}
                  disabled={!newMessage.trim()}
                  className="flex items-center gap-1.5 text-xs sm:text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-transparent"
                >
                  <FiEdit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="font-medium">{t('Enhance')}</span>
                </button>
              </div>

              {/* Reply Preview */}
              {replyingTo && (
                <div className="mb-2 bg-gray-100 rounded-lg p-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FiCornerUpLeft className="w-4 h-4 text-gray-600" />
                      <p className="text-xs font-medium text-gray-700">
                        {t('Replying to')} {getUserDisplayName(replyingTo.sender)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {replyingTo.content.length > 60 ? replyingTo.content.substring(0, 60) + '...' : replyingTo.content}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 sm:gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => {
                    handleTyping(e);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 72) + 'px';
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                      e.target.style.height = 'auto';
                    }
                  }}
                  placeholder={t('Write a message')}
                  rows="1"
                  className="flex-1 w-0 px-2 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm overflow-hidden"
                  style={{ height: 'auto', maxHeight: '72px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <FiSearch className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('Your Messages')}</h3>
              <p className="text-sm">{t('Select a conversation or search for someone to start messaging')}</p>
              <p className="text-xs text-gray-400 mt-4">💡 {t('Messages are automatically deleted after 30 days')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatNew;
