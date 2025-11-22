import React, { useState, useEffect, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatSkeleton } from '../components/SkeletonLoader';
import api from '../services/api';
import socketService from '../services/socket';
import { FiSend, FiSearch, FiMoreVertical, FiX, FiTrash2, FiBell, FiBellOff, FiUserX, FiArchive, FiAlertCircle, FiSmile, FiCornerUpLeft, FiShare2, FiUser, FiChevronDown, FiBookmark, FiZap, FiEdit3, FiPhone, FiVideo, FiPhoneCall, FiMic, FiFile, FiPaperclip, FiImage, FiCamera, FiUsers } from 'react-icons/fi';
import { MdDeleteOutline, MdBlock } from 'react-icons/md';
import { MdOutlineCamera } from 'react-icons/md';
import { LuSwitchCamera } from 'react-icons/lu';
import { BsCheck, BsCheckAll, BsPinAngleFill, BsPinAngle } from 'react-icons/bs';
import soundNotification from '../utils/soundNotifications';
import soundManager from '../utils/soundManager';
import IncomingCallModal from '../components/IncomingCallModal';
import ActiveCallScreen from '../components/ActiveCallScreen';
import CallHistoryModal from '../components/CallHistoryModal';
import VoiceRecorder from '../components/VoiceRecorder';
import VoiceMessagePlayer from '../components/VoiceMessagePlayer';
import FileMessage from '../components/FileMessage';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupInfoPanel from '../components/GroupInfoPanel';
import webrtcService from '../services/webrtc';
// Translation support - Import useTranslation hook from react-i18next
// This enables multi-language support for the chat interface
import { useTranslation } from 'react-i18next';
import '../styles/camera.css';
import BlogImageEditor from '../components/BlogImageEditor';
import { ClipLoader } from 'react-spinners';
import { compressImage } from '../utils/imageCompression';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showQuickChatModal, setShowQuickChatModal] = useState(false);
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [userStatuses, setUserStatuses] = useState({});
  const [selectedUserStatuses, setSelectedUserStatuses] = useState([]);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [statusProgress, setStatusProgress] = useState(0);
  const [viewedStatuses, setViewedStatuses] = useState(() => {
    const saved = localStorage.getItem('viewedStatuses');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [modalStatusIndex, setModalStatusIndex] = useState(0);
  const [modalProgress, setModalProgress] = useState(0);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [imageCaption, setImageCaption] = useState('');
  const [facingMode, setFacingMode] = useState('user');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState(null);
  const [editedImageData, setEditedImageData] = useState(null);
  const [imageEditState, setImageEditState] = useState(null);
  const imageEditorRef = useRef(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groups, setGroups] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const pendingOfferRef = useRef(null);
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
  const selectedChatRef = useRef(null);
  const mutedUsersRef = useRef(new Set());

  // Keep refs in sync with state
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    mutedUsersRef.current = mutedUsers;
  }, [mutedUsers]);

  useEffect(() => {
    if (!user) return;
    
    socket.current = socketService.connect(user._id);
    webrtcService.setSocket(socket.current);
      
      // Set callback for remote stream
      webrtcService.setOnRemoteStream((stream) => {
        console.log('📹 Remote stream received in ChatNew');
        setActiveCall(prev => prev ? { ...prev, remoteStream: stream } : prev);
      });

      // Notify backend that user is on /chat route
      console.log('🔔 Sending route:change to /chat');
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

      const messageReceiveHandler = (message) => {
        console.log('📨 Message received from:', message.sender._id);
        
        // Use ref to get current value
        const currentChat = selectedChatRef.current;
        const currentMuted = mutedUsersRef.current;
        
        console.log('Current selectedChat (from ref):', currentChat?._id);
        
        const isChatOpen = currentChat && message.sender._id === currentChat._id;
        console.log('Is chat open?', isChatOpen);

        if (isChatOpen) {
          console.log('✅ ADDING MESSAGE TO ACTIVE CHAT');
          
          // Add message to chat
          setMessages(prev => {
            if (prev.some(m => m._id === message._id)) {
              console.log('⚠️ Duplicate message, skipping');
              return prev;
            }
            console.log('✅ Message added to state');
            return [...prev, message];
          });
          
          // Auto-scroll
          setTimeout(() => {
            if (messagesContainerRef.current) {
              const container = messagesContainerRef.current;
              const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
              if (isAtBottom) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }, 100);
          
          // Play sound if not muted
          if (!currentMuted.has(message.sender._id)) {
            console.log('🔊 PLAYING SOUND: receive-msg.mp3');
            soundManager.play('receiveMsg');
          } else {
            console.log('🔇 User is muted, no sound');
          }
          
          // Mark as read
          socket.current.emit('messages:mark-read', { senderId: message.sender._id });
          api.put(`/messages/mark-read/${message.sender._id}`).catch(err => console.error(err));
        } else {
          console.log('❌ Chat not open, not adding message');
        }

        // Always refresh conversation list
        loadConversations();
      };
      
      // Remove any existing listener before adding new one
      socket.current.off('message:receive', messageReceiveHandler);
      socket.current.on('message:receive', messageReceiveHandler);

      socket.current.on('message:sent', (message) => {
        setMessages(prev => [...prev, message]);
        soundManager.play('sendMsg');
        
        // Auto-scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
        loadConversations();
      });

      socket.current.on('message:receive:group', (message) => {
        console.log('📨 Group message received:', message);
        
        const currentChat = selectedChatRef.current;
        const isChatOpen = currentChat && currentChat.isGroup && message.group === currentChat._id;
        
        if (isChatOpen) {
          setMessages(prev => {
            if (prev.some(m => m._id === message._id)) {
              return prev;
            }
            return [...prev, message];
          });
          
          setTimeout(() => {
            if (messagesContainerRef.current) {
              const container = messagesContainerRef.current;
              const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
              if (isAtBottom) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }, 100);
          
          soundManager.play('receiveMsg');
        }
      });

      socket.current.on('message:sent:group', (message) => {
        console.log('✅ Group message sent:', message);
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });
        soundManager.play('sendMsg');
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
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
        console.log('⌨️ Typing status received:', { userId, typing });
        
        // Use ref to get current value
        const currentChat = selectedChatRef.current;
        console.log('Current selectedChat (from ref):', currentChat?._id);
        
        // Only update if it's from the current chat
        if (currentChat && userId === currentChat._id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            if (typing) {
              console.log('✅ Adding user to typing set:', userId);
              newSet.add(userId);
            } else {
              console.log('✅ Removing user from typing set:', userId);
              newSet.delete(userId);
            }
            console.log('Typing users set:', Array.from(newSet));
            return newSet;
          });
        } else {
          console.log('⚠️ Typing status from different chat, ignoring');
        }
      });

      socket.current.on('message:reaction', ({ messageId, reactions }) => {
        setMessages(prev => {
          const updated = prev.map(msg =>
            msg._id === messageId ? { ...msg, reactions } : msg
          );
          return [...updated]; // Force new array reference for immediate re-render
        });
        setShowReactionPicker(null);
      });

      socket.current.on('message:pinned', ({ messageId, pinned }) => {
        if (pinned) {
          loadPinnedMessages();
        } else {
          setPinnedMessages(prev => prev.filter(m => m._id !== messageId));
        }
      });

      socket.current.on('message:deleted', ({ messageId }) => {
        setMessages(prev => prev.map(m => 
          m._id === messageId 
            ? { 
                ...m, 
                content: 'This message was deleted', 
                deletedForEveryone: true, 
                type: 'text', 
                fileUrl: null,
                fileName: null,
                fileSize: null,
                mimeType: null,
                caption: null,
                voiceUrl: null,
                voiceDuration: null
              }
            : m
        ));
      });

      // WebRTC call listeners
      socket.current.on('call:incoming', ({ callerId, caller, callType, callLogId }) => {
        console.log('📞 ChatNew: Incoming call received:', { callerId, caller, callType, callLogId });
        if (window.location.pathname === '/chat') {
          setIncomingCall({ callerId, caller, callType, callLogId });
          soundManager.play('incomingCall');
        }
      });

      socket.current.on('call:accepted', async ({ receiverId }) => {
        console.log('✅ Call accepted by receiver');
        soundManager.stop('callRing');
        // Receiver accepted - start timer
        setActiveCall(prev => {
          if (prev) {
            return { ...prev, startTime: Date.now(), callAccepted: true };
          }
          return prev;
        });
      });

      socket.current.on('call:rejected', async () => {
        soundManager.stop('callRing');
        soundManager.play('endCall');
        await webrtcService.endCall();
        setActiveCall(null);
        showAlertModal('Call Rejected', 'The user rejected your call');
      });

      socket.current.on('call:ended', async () => {
        console.log('📞 Call ended by remote user');
        soundManager.stop('callRing');
        soundManager.play('endCall');
        await webrtcService.endCall();
        setActiveCall(null);
        setIncomingCall(null);
        setIsCallMinimized(false);
        setIsAudioEnabled(true);
        setIsVideoEnabled(true);
        setIsScreenSharing(false);
        setIsRecording(false);
      });

      socket.current.on('call:offer', async ({ callerId, offer }) => {
        console.log('📞 Received call:offer from:', callerId);
        // Store offer - don't process until user accepts
        pendingOfferRef.current = { callerId, offer };
        console.log('✅ Offer stored, waiting for user to accept');
      });

      socket.current.on('call:answer', async ({ answer }) => {
        console.log('📞 Received call:answer');
        await webrtcService.handleAnswer(answer);
        console.log('✅ Answer processed');
      });

      socket.current.on('call:ice-candidate', async ({ candidate }) => {
        await webrtcService.handleIceCandidate(candidate);
      });

      loadConversations();
      loadGroups();
      loadBlockedUsers();
      loadMutedUsers();

      // Check if warning banner was dismissed
      const warningDismissed = localStorage.getItem('chatWarningDismissed');
      if (!warningDismissed) {
        setShowWarningBanner(true);
      }
    
      return () => {
      if (activeCall) {
        socket.current?.emit('call:end', { userId: activeCall.userId });
        webrtcService.endCall();
      }
      
      // Clean up all socket listeners
      if (socket.current) {
        socket.current.off('message:receive');
        socket.current.off('message:sent');
        socket.current.off('message:receive:group');
        socket.current.off('message:sent:group');
        socket.current.off('message:status');
        socket.current.off('typing:status');
        socket.current.off('message:reaction');
        socket.current.off('message:pinned');
        socket.current.off('call:incoming');
        socket.current.off('call:accepted');
        socket.current.off('call:rejected');
        socket.current.off('call:ended');
        socket.current.off('call:offer');
        socket.current.off('call:answer');
        socket.current.off('call:ice-candidate');
        socket.current.off('users:online');
        socket.current.off('user:status');
      }
      
      console.log('Leaving /chat');
      socketService.updateRoute(null);
    };
  }, [user]);

  useEffect(() => {
    if (!loading && location.state?.selectedUser) {
      setSelectedChat(location.state.selectedUser);
    }
    // Handle incoming call from global modal
    if (!loading && location.state?.incomingCall) {
      setIncomingCall(location.state.incomingCall);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [loading, location.state]);
  
  // Listen for global call end events
  useEffect(() => {
    const handleGlobalCallEnd = async () => {
      console.log('📞 ChatNew: Received global call end event');
      await webrtcService.endCall();
      setActiveCall(null);
      setIncomingCall(null);
      setIsCallMinimized(false);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
      setIsScreenSharing(false);
      setIsRecording(false);
    };
    
    window.addEventListener('callEnded', handleGlobalCallEnd);
    return () => window.removeEventListener('callEnded', handleGlobalCallEnd);
  }, []);

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
      if (pinDropdownRef.current && !pinDropdownRef.current.contains(event.target)) {
        setShowPinDropdown(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat._id, selectedChat.isGroup);
      if (!selectedChat.isGroup) {
        loadPinnedMessages();
        // Load full user details if description is missing
        if (!selectedChat.description) {
          loadUserDetails(selectedChat._id);
        }
      }
    }
    // Close image editor when switching chats
    if (showImageEditor) {
      setShowImageEditor(false);
      setImageToEdit(null);
      setImageCaption('');
      setEditedImageData(null);
      setImageEditState(null);
    }
  }, [selectedChat]);

  // Auto-refresh conversations list only (not messages)
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Persist viewed statuses
  useEffect(() => {
    localStorage.setItem('viewedStatuses', JSON.stringify([...viewedStatuses]));
  }, [viewedStatuses]);
  
  // Status slideshow with progress bar (header preview)
  useEffect(() => {
    if (!selectedUserStatuses.length || showStatusModal) return;
    
    const progressInterval = setInterval(() => {
      setStatusProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (100 / 30);
      });
    }, 100);
    
    const slideInterval = setInterval(() => {
      setCurrentStatusIndex(prev => (prev + 1) % selectedUserStatuses.length);
      setStatusProgress(0);
    }, 3000);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(slideInterval);
    };
  }, [selectedUserStatuses.length, showStatusModal]);
  
  // Status modal auto-advance
  useEffect(() => {
    if (!showStatusModal || !selectedUserStatuses.length) return;
    
    const progressInterval = setInterval(() => {
      setModalProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (100 / 30);
      });
    }, 100);
    
    const slideInterval = setInterval(() => {
      setModalStatusIndex(prev => {
        const nextIndex = prev + 1;
        if (nextIndex >= selectedUserStatuses.length) {
          setShowStatusModal(false);
          setViewedStatuses(s => new Set([...s, selectedChat._id]));
          return 0;
        }
        setModalProgress(0);
        return nextIndex;
      });
    }, 3000);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(slideInterval);
    };
  }, [showStatusModal, selectedUserStatuses.length, selectedChat]);
  
  // Fetch statuses for all users in conversations
  useEffect(() => {
    if (conversations.length > 0) {
      const fetchStatuses = async () => {
        try {
          const userIds = conversations.map(c => c.user._id);
          const { data } = await api.post('/users/statuses/check', { userIds });
          setUserStatuses(data.statusMap || {});
        } catch (error) {
          console.error('Failed to fetch user statuses:', error);
        }
      };
      fetchStatuses();
    }
  }, [conversations]);

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

  const loadGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
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

  const loadMessages = async (chatId, isGroup = false) => {
    try {
      const endpoint = isGroup ? `/messages/group/${chatId}` : `/messages/${chatId}`;
      const { data } = await api.get(endpoint);
      setMessages(data.messages);

      if (!isGroup) {
        // Mark all messages from this user as read
        await api.put(`/messages/mark-read/${chatId}`);
        // Notify sender via socket for real-time status update
        socket.current.emit('messages:mark-read', { senderId: chatId });
        // Refresh conversation list to update unread count
        loadConversations();
      }
      
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    if (selectedChat.isGroup) {
      // Send group message via socket
      socket.current.emit('message:send:group', {
        groupId: selectedChat._id,
        content: newMessage.trim(),
        type: 'text'
      });
    } else {
      // Send individual message via socket
      socket.current.emit('message:send', {
        receiverId: selectedChat._id,
        content: newMessage.trim(),
        type: 'text',
        replyTo: replyingTo?._id || null
      });
    }

    setNewMessage('');
    setReplyingTo(null);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      if (!selectedChat.isGroup) {
        socket.current.emit('typing:stop', selectedChat._id);
      }
    }

    // Scroll to bottom when user sends message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setIsAtBottom(true);
      setNewMessageCount(0);
    }, 100);
  };

  const handleSendVoiceMessage = async (audioBlob, duration) => {
    if (!selectedChat) return;

    try {
      const formData = new FormData();
      formData.append('voice', audioBlob, 'voice-message.webm');
      formData.append('receiverId', selectedChat._id);
      formData.append('duration', duration);

      const { data } = await api.post('/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessages(prev => [...prev, data.message]);
      setShowVoiceRecorder(false);
      soundManager.play('sendMsg');

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setIsAtBottom(true);
      }, 100);
      
      loadConversations();
    } catch (error) {
      console.error('Failed to send voice message:', error);
      showAlertModal('Error', 'Failed to send voice message');
      setShowVoiceRecorder(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    if (file.size > 50 * 1024 * 1024) {
      showAlertModal('Error', 'File size must be less than 50MB');
      return;
    }

    setShowAttachMenu(false);

    // Open image editor for images
    if (file.type.startsWith('image/')) {
      try {
        const compressedFile = await compressImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImageToEdit(e.target.result);
          setSelectedFile(compressedFile);
          setShowImageEditor(true);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Image compression failed:', error);
        showAlertModal('Error', 'Failed to process image');
      }
    } else {
      setSelectedFile(file);
      setFilePreview({ type: 'document', name: file.name, size: file.size, mimeType: file.type });
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile || !selectedChat) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('receiverId', selectedChat._id);
      if (imageCaption.trim()) {
        formData.append('caption', imageCaption.trim());
      }

      const { data } = await api.post('/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessages(prev => [...prev, data.message]);
      soundManager.play('sendMsg');

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setIsAtBottom(true);
      }, 100);
      
      loadConversations();
      setFilePreview(null);
      setSelectedFile(null);
      setImageCaption('');
      setEditedImageData(null);
      setImageEditState(null);
    } catch (error) {
      console.error('Failed to send file:', error);
      showAlertModal('Error', 'Failed to send file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleCancelFile = () => {
    setFilePreview(null);
    setSelectedFile(null);
    setImageCaption('');
    setEditedImageData(null);
    setImageEditState(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const openCamera = async () => {
    setShowAttachMenu(false);
    setCameraLoading(true);
    
    // Check if running on HTTPS or localhost
    const isSecureContext = window.isSecureContext;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext && !isLocalhost) {
      setCameraLoading(false);
      showAlertModal(
        'Camera Access Denied',
        'Camera requires HTTPS connection. Please use HTTPS or localhost to access camera features.'
      );
      return;
    }
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraLoading(false);
        showAlertModal(
          'Camera Not Supported',
          'Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Safari.'
        );
        return;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      
      const constraints = {
        video: { facingMode: facingMode },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      setHasFlash(capabilities.torch || false);
      setSupportsZoom(capabilities.zoom || false);
      
      setCameraStream(stream);
      setShowCameraModal(true);
      setImageCaption('');
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraLoading(false);
        }
      }, 100);
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraLoading(false);
      
      let errorMessage = 'Unable to access camera.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on your device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested settings.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security restrictions. Please use HTTPS or localhost.';
      }
      
      showAlertModal('Camera Error', errorMessage);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    // Open editor directly
    setImageToEdit(imageUrl);
    setShowImageEditor(true);
    setShowCameraModal(false);
  };
  

  
  const retakePhoto = () => {
    setShowImageEditor(false);
    setImageToEdit(null);
    setImageCaption('');
    // Reopen camera
    setTimeout(() => {
      openCamera();
    }, 100);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setImageCaption('');
    setFlashEnabled(false);
  };
  
  const cycleCamera = async () => {
    if (availableCameras.length <= 1) return;
    
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: availableCameras[nextIndex].deviceId } },
        audio: false
      });
      
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setHasFlash(capabilities.torch || false);
      setSupportsZoom(capabilities.zoom || false);
      
      if (flashEnabled && !capabilities.torch) {
        setFlashEnabled(false);
      }
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  };
  
  const toggleFlash = async () => {
    if (!cameraStream || !hasFlash) return;
    
    const track = cameraStream.getVideoTracks()[0];
    const newFlashState = !flashEnabled;
    
    try {
      await track.applyConstraints({
        advanced: [{ torch: newFlashState }]
      });
      setFlashEnabled(newFlashState);
    } catch (error) {
      console.error('Flash toggle error:', error);
    }
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

  const handleDeleteMessage = (message) => {
    setDeletingMessage(message);
    setShowDeleteModal(true);
    setShowMessageMenu(null);
  };

  const canDeleteForEveryone = (message) => {
    return message.sender._id === user._id;
  };

  const deleteMessageForMe = async () => {
    if (!deletingMessage) return;
    try {
      await api.delete(`/messages/${deletingMessage._id}`, {
        data: { deleteFor: 'me' }
      });
      setMessages(prev => prev.filter(m => m._id !== deletingMessage._id));
      setShowDeleteModal(false);
      setDeletingMessage(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
      showAlertModal('Error', 'Failed to delete message');
    }
  };

  const deleteMessageForEveryone = async () => {
    if (!deletingMessage || !canDeleteForEveryone(deletingMessage)) return;
    try {
      await api.delete(`/messages/${deletingMessage._id}`, {
        data: { deleteFor: 'everyone' }
      });
      socket.current.emit('message:deleted', { 
        messageId: deletingMessage._id, 
        receiverId: selectedChat._id 
      });
      setMessages(prev => prev.map(m => 
        m._id === deletingMessage._id 
          ? { 
              ...m, 
              content: 'This message was deleted', 
              deletedForEveryone: true, 
              type: 'text', 
              fileUrl: null, 
              fileName: null,
              fileSize: null,
              mimeType: null,
              caption: null,
              voiceUrl: null,
              voiceDuration: null
            }
          : m
      ));
      setShowDeleteModal(false);
      setDeletingMessage(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
      showAlertModal('Error', 'Failed to delete message');
    }
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
    soundManager.play('sendMsg');
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

  // Call handlers
  const initiateCall = async (callType) => {
    if (!selectedChat) return;
    try {
      // Create call log first
      const { data } = await api.post('/calls/log', {
        receiverId: selectedChat._id,
        type: callType
      });
      
      const stream = await webrtcService.startCall(callType === 'video');
      
      console.log('📞 Emitting call:initiate to:', selectedChat._id);
      socket.current.emit('call:initiate', {
        receiverId: selectedChat._id,
        type: callType,
        callLogId: data.callLog._id
      });
      
      // Create and send offer
      await webrtcService.createOffer(selectedChat._id);
      console.log('✅ Call initiated with offer sent');
      
      // Start call ring sound
      soundManager.play('callRing');
      
      setActiveCall({
        userId: selectedChat._id,
        userName: getUserDisplayName(selectedChat),
        userAvatar: getUserAvatar(selectedChat),
        callType,
        stream,
        remoteStream: null,
        callLogId: data.callLog._id,
        callAccepted: false,
        startTime: null
      });
      setIsVideoEnabled(callType === 'video');
    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      let errorMsg = 'Failed to start call.';
      if (error.name === 'NotReadableError') {
        errorMsg = 'Camera/microphone is already in use by another application or browser tab. Please close other apps using the camera/mic and try again.';
      } else if (error.name === 'NotAllowedError') {
        errorMsg = 'Camera/microphone access denied. Please allow permissions in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'No camera/microphone found. Please connect a device and try again.';
      }
      showAlertModal('Cannot Start Call', errorMsg);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      console.log('📞 Accepting call...');
      
      // Stop incoming call sound
      soundManager.stop('incomingCall');
      
      // End any existing call first to free up camera/mic
      if (activeCall) {
        console.log('⚠️ Ending existing call before accepting new one');
        await webrtcService.endCall();
        setActiveCall(null);
        console.log('✅ Existing call cleaned up');
      }
      
      console.log('📞 Requesting media devices...');
      const stream = await webrtcService.startCall(incomingCall.callType === 'video');
      console.log('✅ Media stream obtained');
      
      // Set active call BEFORE processing offer so UI shows immediately
      const startTime = Date.now();
      setActiveCall({
        userId: incomingCall.callerId,
        userName: getUserDisplayName(incomingCall.caller),
        userAvatar: getUserAvatar(incomingCall.caller),
        callType: incomingCall.callType,
        stream,
        remoteStream: null,
        callLogId: incomingCall.callLogId,
        callAccepted: true,
        startTime
      });
      setIsVideoEnabled(incomingCall.callType === 'video');
      setIncomingCall(null);
      
      // NOW process the pending offer after we have media
      if (pendingOfferRef.current) {
        console.log('📞 Processing pending offer...');
        await webrtcService.handleOffer(pendingOfferRef.current.offer);
        const answer = await webrtcService.createAnswer(pendingOfferRef.current.callerId);
        console.log('✅ Answer sent to caller');
        pendingOfferRef.current = null;
      }
      
      socket.current.emit('call:accept', {
        callerId: incomingCall.callerId
      });
      console.log('✅ Emitted call:accept to caller');
      console.log('✅ Call accepted, timer started at:', startTime);
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      let errorMsg = 'Failed to accept call.';
      if (error.name === 'NotReadableError') {
        errorMsg = 'Camera/microphone is already in use by another application or browser tab. Please close other apps using the camera/mic and try again.';
      } else if (error.name === 'NotAllowedError') {
        errorMsg = 'Camera/microphone access denied. Please allow permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'No camera/microphone found. Please connect a device and try again.';
      }
      showAlertModal('Cannot Accept Call', errorMsg);
      // Reject the call
      socket.current.emit('call:reject', { callerId: incomingCall.callerId });
      setIncomingCall(null);
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    console.log('📞 Rejecting call from:', incomingCall.callerId);
    soundManager.stop('incomingCall');
    soundManager.play('endCall');
    socket.current.emit('call:reject', { callerId: incomingCall.callerId });
    pendingOfferRef.current = null;
    setIncomingCall(null);
    
    if (incomingCall.callLogId) {
      api.put(`/calls/log/${incomingCall.callLogId}`, {
        status: 'rejected',
        duration: 0
      }).catch(err => console.error('Failed to update call log:', err));
    }
  };

  const endCall = async () => {
    if (!activeCall) return;
    
    console.log('📞 Ending call, notifying remote user:', activeCall.userId);
    soundManager.stop('callRing');
    soundManager.stop('incomingCall');
    soundManager.play('endCall');
    socket.current.emit('call:end', { userId: activeCall.userId });
    await webrtcService.endCall();
    
    if (activeCall.callLogId && activeCall.callAccepted && activeCall.startTime) {
      await api.put(`/calls/log/${activeCall.callLogId}`, {
        status: 'completed',
        duration: Math.floor((Date.now() - activeCall.startTime) / 1000)
      });
    } else if (activeCall.callLogId) {
      await api.put(`/calls/log/${activeCall.callLogId}`, {
        status: 'missed',
        duration: 0
      });
    }
    
    setActiveCall(null);
    setIncomingCall(null);
    setIsCallMinimized(false);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
    setIsRecording(false);
  };

  const toggleAudio = () => {
    webrtcService.toggleAudio();
    setIsAudioEnabled(prev => !prev);
  };

  const toggleVideo = async () => {
    try {
      await webrtcService.toggleVideo();
      setIsVideoEnabled(prev => !prev);
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await webrtcService.stopScreenShare();
      } else {
        await webrtcService.startScreenShare();
      }
      setIsScreenSharing(prev => !prev);
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
    }
  };

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        await webrtcService.stopRecording();
      } else {
        await webrtcService.startRecording();
      }
      setIsRecording(prev => !prev);
    } catch (error) {
      console.error('Failed to toggle recording:', error);
    }
  };

  const loadCallHistory = async () => {
    if (!selectedChat) return;
    try {
      const { data } = await api.get(`/calls/history/${selectedChat._id}`);
      setCallLogs(data.callLogs || []);
      setShowCallHistory(true);
    } catch (error) {
      console.error('Failed to load call history:', error);
    }
  };

  const handleDeleteCallLog = (logId) => {
    setCallLogs(prev => prev.filter(log => log._id !== logId));
  };

  const handleCallBack = (log) => {
    initiateCall(log.type);
    setShowCallHistory(false);
  };

  if (loading) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Status Modal */}
      {showStatusModal && selectedUserStatuses.length > 0 && (
        <div className="fixed inset-0 bg-black z-[70] flex items-center justify-center">
          <div className="relative w-full max-w-md h-full flex flex-col">
            {/* Progress bars */}
            <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
              {selectedUserStatuses.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{
                      width: idx === modalStatusIndex ? `${modalProgress}%` : idx < modalStatusIndex ? '100%' : '0%'
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => {
                setShowStatusModal(false);
                setViewedStatuses(s => new Set([...s, selectedChat._id]));
              }}
              className="absolute top-4 right-4 z-20 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <FiX className="w-6 h-6" />
            </button>
            
            {/* Status image */}
            <div className="flex-1 flex items-center justify-center">
              <img
                src={selectedUserStatuses[modalStatusIndex]?.image}
                alt="Status"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            {/* Navigation */}
            <div className="absolute inset-0 flex">
              <button
                onClick={() => {
                  if (modalStatusIndex > 0) {
                    setModalStatusIndex(modalStatusIndex - 1);
                    setModalProgress(0);
                  }
                }}
                className="flex-1 cursor-pointer"
                style={{ background: 'transparent' }}
              />
              <button
                onClick={() => {
                  if (modalStatusIndex < selectedUserStatuses.length - 1) {
                    setModalStatusIndex(modalStatusIndex + 1);
                    setModalProgress(0);
                  } else {
                    setShowStatusModal(false);
                    setViewedStatuses(s => new Set([...s, selectedChat._id]));
                  }
                }}
                className="flex-1 cursor-pointer"
                style={{ background: 'transparent' }}
              />
            </div>
          </div>
        </div>
      )}
      
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

      {/* Delete Message Modal */}
      {showDeleteModal && deletingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-xs w-full">
            <div className="p-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('Delete message?')}</h3>
              <div className="space-y-2">
                <button
                  onClick={deleteMessageForMe}
                  className="w-full px-4 py-2.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                >
                  {t('Delete for me')}
                </button>
                {canDeleteForEveryone(deletingMessage) && (
                  <button
                    onClick={deleteMessageForEveryone}
                    className="w-full px-4 py-2.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                  >
                    {t('Delete for everyone')}
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingMessage(null);
                }}
                className="w-full mt-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('Cancel')}
              </button>
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
      <div className={`w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('Messaging')}</h1>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="New Group"
            >
              <FiUsers className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('Search messages')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-none rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          ) : conversations.length === 0 && groups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>{t('No conversations yet')}</p>
              <p className="text-sm mt-2">{t('Search for users to start chatting')}</p>
            </div>
          ) : (
            <>
            {/* Groups */}
            {groups.map(group => (
              <div
                key={`grp-${group._id}`}
                className={`flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 relative group cursor-pointer ${selectedChat?._id === group._id && selectedChat?.isGroup ? 'bg-blue-50 dark:bg-gray-700' : ''}`}
                onClick={() => {
                  setSelectedChat({ ...group, isGroup: true });
                }}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="relative">
                    <img
                      src={group.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=0D8ABC&color=fff`}
                      alt={group.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-2">
                        <FiUsers className="w-4 h-4 text-gray-500" />
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{group.name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {group.members.length} members
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Individual Conversations */}
            {conversations.map(conv => (
              <div
                key={conv.user._id}
                className={`flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 relative group cursor-pointer ${selectedChat?._id === conv.user._id ? 'bg-blue-50 dark:bg-gray-700' : ''
                  }`}
                onClick={async () => {
                  // Clear unread count immediately for better UX
                  setConversations(prev => prev.map(c =>
                    c.user._id === conv.user._id ? { ...c, unreadCount: 0 } : c
                  ));
                  console.log('Conversation user selected:', conv.user);
                  setSelectedChat(conv.user);
                  
                  // Fetch user's statuses
                  (async () => {
                    try {
                      const { data } = await api.get(`/users/profile/${conv.user._id}`);
                      console.log('Fetched user profile:', data);
                      const activeStatuses = data.user.statuses?.filter(s => new Date() < new Date(s.expiresAt)) || [];
                      console.log('Active statuses:', activeStatuses);
                      setSelectedUserStatuses(activeStatuses);
                      setCurrentStatusIndex(0);
                      setStatusProgress(0);
                    } catch (error) {
                      console.error('Failed to fetch user statuses:', error);
                      setSelectedUserStatuses([]);
                    }
                  })();
                }}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="relative">
                    <div
                      className="rounded-full"
                      style={{
                        padding: userStatuses[conv.user._id] && !viewedStatuses.has(conv.user._id) ? '3px' : '0',
                        background: userStatuses[conv.user._id] && !viewedStatuses.has(conv.user._id) ? 'linear-gradient(45deg, #4caf50, #81c784)' : 'transparent'
                      }}
                    >
                      <img
                        src={getUserAvatar(conv.user)}
                        alt={getUserDisplayName(conv.user)}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    {isOnline(conv.user._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{getUserDisplayName(conv.user)}</p>
                        {blockedUsers.has(conv.user._id) && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{t('Blocked')}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{formatDate(conv.lastMessage.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {mutedUsers.has(conv.user._id) && (
                        <FiBellOff className="text-gray-400 text-xs" />
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">{conv.lastMessage.content}</p>
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
            ))}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-gray-800 relative max-w-full overflow-hidden ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {/* Dismissible Warning Banner */}
        {showWarningBanner && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
              <FiAlertCircle className="text-lg flex-shrink-0" />
              <p className="text-sm">
                <strong>{t('Important')}:</strong> {t('All messages are automatically deleted after 30 days for privacy and storage management')}
              </p>
            </div>
            <button
              onClick={dismissWarningBanner}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 ml-4"
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
              {/* Glowing border for active chat header */}
              {!selectedChat.isGroup && userStatuses[selectedChat._id] && !viewedStatuses.has(selectedChat._id) && (
                <div className="absolute -inset-1 z-0 pointer-events-none rounded-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-green-500 to-green-400 animate-pulse rounded-lg" style={{ animationDuration: '2s' }} />
                </div>
              )}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative z-10">
                <div className="flex items-center gap-3 relative z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChat(null);
                      setSelectedUserStatuses([]);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full md:hidden flex-shrink-0"
                  >
                    <FiX className="w-5 h-5 text-gray-600" />
                  </button>
                  <div 
                    className="relative flex-shrink-0 cursor-pointer"
                    onClick={() => {
                      if (selectedChat.isGroup) {
                        setShowGroupInfo(true);
                      } else {
                        setShowUserPanel(!showUserPanel);
                      }
                    }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        padding: !selectedChat.isGroup && userStatuses[selectedChat._id] && !viewedStatuses.has(selectedChat._id) ? '3px' : '0',
                        background: !selectedChat.isGroup && userStatuses[selectedChat._id] && !viewedStatuses.has(selectedChat._id) ? 'linear-gradient(45deg, #4caf50, #81c784)' : 'transparent'
                      }}
                    >
                      <img
                        src={selectedChat.isGroup ? (selectedChat.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name)}&background=0D8ABC&color=fff`) : getUserAvatar(selectedChat)}
                        alt={selectedChat.isGroup ? selectedChat.name : getUserDisplayName(selectedChat)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </div>
                    {!selectedChat.isGroup && isOnline(selectedChat._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (selectedChat.isGroup) {
                        setShowGroupInfo(true);
                      } else {
                        setShowUserPanel(!showUserPanel);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {selectedChat.isGroup && <FiUsers className="w-4 h-4 text-gray-500" />}
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedChat.isGroup ? selectedChat.name : getUserDisplayName(selectedChat)}
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {selectedChat.isGroup ? (
                        (() => {
                          const onlineMembers = selectedChat.members.filter(m => {
                            const memberId = typeof m === 'string' ? m : m._id;
                            return memberId !== user._id && isOnline(memberId);
                          });
                          if (onlineMembers.length > 0) {
                            return onlineMembers.map(m => getUserDisplayName(m)).join(', ');
                          }
                          return `${selectedChat.members.length} members`;
                        })()
                      ) : (isOnline(selectedChat._id) ? t('Active now') : getLastSeenText(selectedChat.lastSeen))}
                    </p>
                  </div>
                  {!selectedChat.isGroup && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => initiateCall('audio')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <FiPhone className="w-5 h-5 text-gray-600" />
                    </button>
                    <button onClick={() => initiateCall('video')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <FiVideo className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  )}
                </div>
              </div>

              {/* User Details Panel - Popup Overlay */}
              {showUserPanel && (
                <div 
                  ref={userPanelRef}
                  className="absolute top-full left-0 w-full md:w-1/2 border border-gray-200 rounded-b-lg shadow-2xl z-50 animate-slideDown overflow-hidden"
                  style={{
                    backgroundImage: selectedUserStatuses.length > 0 && selectedUserStatuses[currentStatusIndex]?.image
                      ? `url(${selectedUserStatuses[currentStatusIndex].image})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div 
                    className="absolute inset-0 bg-white dark:bg-gray-900 bg-opacity-70 dark:bg-opacity-70 backdrop-blur-sm cursor-pointer" 
                    onClick={() => {
                      if (selectedUserStatuses.length > 0) {
                        setModalStatusIndex(0);
                        setModalProgress(0);
                        setShowStatusModal(true);
                        setShowUserPanel(false);
                      }
                    }}
                  />
                  {/* Progress bars for status slideshow in user panel */}
                  {selectedUserStatuses.length > 0 && (
                    <div className="absolute top-2 left-2 right-2 z-20 flex gap-1 pointer-events-none">
                      {selectedUserStatuses.map((_, idx) => (
                        <div key={idx} className="flex-1 h-1 bg-gray-300 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-100"
                            style={{
                              width: idx === currentStatusIndex ? `${statusProgress}%` : idx < currentStatusIndex ? '100%' : '0%'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Profile Section */}
                  <div className="p-5 relative z-10" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-3 cursor-pointer" onClick={() => setShowImageModal(true)}>
                        <img
                          src={getUserAvatar(selectedChat)}
                          alt={getUserDisplayName(selectedChat)}
                          className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-700 hover:opacity-80 transition-opacity"
                        />
                        {isOnline(selectedChat._id) && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{getUserDisplayName(selectedChat)}</h3>
                      {selectedUserStatuses.length > 0 && (
                        <button
                          onClick={() => {
                            setModalStatusIndex(0);
                            setModalProgress(0);
                            setShowStatusModal(true);
                            setShowUserPanel(false);
                          }}
                          className={`text-sm mt-1 font-medium ${
                            !viewedStatuses.has(selectedChat._id)
                              ? 'bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-shimmer'
                              : 'text-gray-600'
                          }`}
                          style={{
                            backgroundSize: !viewedStatuses.has(selectedChat._id) ? '200% auto' : 'auto'
                          }}
                        >
                          {t('View Status')}
                        </button>
                      )}
                      <div className="mt-3 w-full">
                        <p className="text-xs text-gray-400 mb-1">{t('About')}</p>
                        <p className="text-sm text-gray-600">
                          {selectedChat.bio || selectedChat.description || 'Connect, chat, and share moments with friends using our secure messaging platform.'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 mt-5">
                      <button
                        onClick={() => {
                          navigate(`/user/${selectedChat._id}`);
                          setShowUserPanel(false);
                        }}
                        className="col-span-2 px-4 py-2.5 text-sm hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 transition-colors border border-blue-200 text-blue-600"
                      >
                        <FiUser className="w-4 h-4" /> <span>{t('View Profile')}</span>
                      </button>
                      <button
                        onClick={() => {
                          loadCallHistory();
                          setShowUserPanel(false);
                        }}
                        className="col-span-2 px-4 py-2.5 text-sm hover:bg-green-50 rounded-lg flex items-center justify-center gap-2 transition-colors border border-green-200 text-green-600"
                      >
                        <FiPhoneCall className="w-4 h-4" /> <span>{t('Call History')}</span>
                      </button>
                      <button
                        onClick={() => {
                          handleMuteUser(selectedChat._id);
                          setShowUserPanel(false);
                        }}
                        className="px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                      >
                        {mutedUsers.has(selectedChat._id) ? (
                          <><FiBell className="w-4 h-4" /> <span>{t('Unmute')}</span></>
                        ) : (
                          <><FiBellOff className="w-4 h-4" /> <span>{t('Mute')}</span></>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          handleClearChat();
                          setShowUserPanel(false);
                        }}
                        className="px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                      >
                        <FiArchive className="w-4 h-4" /> <span>{t('Clear')}</span>
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteConversation(selectedChat._id);
                          setShowUserPanel(false);
                        }}
                        className="px-4 py-2.5 text-sm hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 text-red-600 transition-colors border border-red-200"
                      >
                        <FiTrash2 className="w-4 h-4" /> <span>{t('Delete')}</span>
                      </button>
                      {blockedUsers.has(selectedChat._id) ? (
                        <button
                          onClick={() => {
                            handleUnblockUser(selectedChat._id);
                            setShowUserPanel(false);
                          }}
                          className="px-4 py-2.5 text-sm hover:bg-green-50 rounded-lg flex items-center justify-center gap-2 text-green-600 transition-colors border border-green-200"
                        >
                          <FiUserX className="w-4 h-4" /> <span>{t('Unblock')}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
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
            {!selectedChat.isGroup && pinnedMessages.length > 0 && (
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
            <div 
              ref={messagesContainerRef} 
              onScroll={handleScroll} 
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-50 dark:bg-gray-900 max-w-full relative"
              style={{
                backgroundImage: 'url(/image/chat_background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 pointer-events-none" style={{ zIndex: 0 }} />
              <div className="relative" style={{ zIndex: 10 }}>
              {/* System Message - Auto-delete Warning */}
              <div className="flex justify-center my-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-3 max-w-md shadow-sm">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">{t('System Message')}</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">
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
                        <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group ${isLastInGroup ? 'mb-[2px]' : 'mb-[2px]'} max-w-full`}>
                      <div className={`flex items-end max-w-[85%] sm:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'} relative`}>
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
                        <div className="mx-2 flex flex-col items-end gap-1">
                          <div className="flex items-end gap-1">
                            {/* Reactions on LEFT for own messages */}
                            {isOwn && msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex items-center gap-1 mb-1">
                                {userReaction && (
                                  <button
                                    onClick={() => handleRemoveReaction(msg._id)}
                                    className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs hover:bg-gray-100 shadow-sm"
                                    title="Remove"
                                  >
                                    {userReaction.emoji}
                                  </button>
                                )}
                                {otherReactions.length > 0 && (
                                  <div className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                                    {otherReactions.map((r, i) => (
                                      <span key={i}>{r.emoji}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex flex-col">
                              <div className={`${isOwn ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-200 text-gray-900'} ${borderRadiusClass} px-4 py-2 shadow-sm`}>
                                {/* Reply Quote */}
                                {msg.replyTo && (
                                  <div
                                    onClick={() => scrollToMessage(msg.replyTo._id)}
                                    className={`${isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-300'} rounded-2xl p-2 mb-2 cursor-pointer hover:opacity-80 border-l-4 ${isOwn ? 'border-white border-opacity-50' : 'border-gray-500'} flex items-center gap-2`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-semibold ${isOwn ? 'text-white text-opacity-90' : 'text-gray-700'}`}>
                                        {getUserDisplayName(msg.replyTo.sender)}
                                      </p>
                                      <p className={`text-xs ${isOwn ? 'text-white text-opacity-80' : 'text-gray-600'} truncate`}>
                                        {msg.replyTo.type === 'image' ? '📷 Photo' : msg.replyTo.content.length > 50 ? msg.replyTo.content.substring(0, 50) + '...' : msg.replyTo.content}
                                      </p>
                                    </div>
                                    {msg.replyTo.type === 'image' && msg.replyTo.fileUrl && (
                                      <img
                                        src={msg.replyTo.fileUrl}
                                        alt="Reply"
                                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                                      />
                                    )}
                                  </div>
                                )}
                                {msg.type === 'voice' ? (
                                  <VoiceMessagePlayer
                                    audioUrl={msg.voiceUrl}
                                    duration={msg.voiceDuration}
                                    isOwn={isOwn}
                                  />
                                ) : msg.type === 'image' || msg.type === 'document' ? (
                                  <FileMessage
                                    fileUrl={msg.fileUrl}
                                    fileName={msg.fileName}
                                    fileSize={msg.fileSize}
                                    mimeType={msg.mimeType}
                                    caption={msg.caption}
                                    isOwn={isOwn}
                                  />
                                ) : msg.deletedForEveryone ? (
                                  <p className={`text-sm italic flex items-center gap-2 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                    <MdBlock className="w-4 h-4" />
                                    This message was deleted
                                  </p>
                                ) : (
                                  <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                                )}
                              </div>
                              {/* Timestamp BELOW message */}
                              <div className={`flex items-center gap-1 text-[0.65rem] mt-0.5 ${isOwn ? 'justify-end text-gray-500' : 'justify-start text-gray-500'}`}>
                                <span>{formatTime(msg.createdAt)}</span>
                                {isOwn && (
                                  msg.read ? (
                                    <BsCheckAll className="text-xs text-green-500" title="Read" />
                                  ) : msg.delivered ? (
                                    <BsCheckAll className="text-xs" title="Delivered" />
                                  ) : (
                                    <BsCheck className="text-xs" title="Sent" />
                                  )
                                )}
                              </div>
                            </div>
                            
                            {/* Reactions on RIGHT for other's messages */}
                            {!isOwn && msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex items-center gap-1 mb-1">
                                {userReaction && (
                                  <button
                                    onClick={() => handleRemoveReaction(msg._id)}
                                    className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs hover:bg-gray-100 shadow-sm"
                                    title="Remove"
                                  >
                                    {userReaction.emoji}
                                  </button>
                                )}
                                {otherReactions.length > 0 && (
                                  <div className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                                    {otherReactions.map((r, i) => (
                                      <span key={i}>{r.emoji}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>



                        </div>

                        {/* Message Menu Button - opposite side of message */}
                        <button
                          onClick={() => setShowMessageMenu(showMessageMenu === msg._id ? null : msg._id)}
                          className={`absolute ${isOwn ? 'left-0 -translate-x-8' : 'right-0 translate-x-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-full p-1.5 hover:bg-gray-50 shadow-sm`}
                          title="More"
                        >
                          <FiMoreVertical className="w-4 h-4 text-gray-600" />
                        </button>

                        {/* Message Menu - appears on opposite side, aligned with 3-dot button */}
                        {showMessageMenu === msg._id && !msg.deletedForEveryone && (
                          <div ref={messageMenuRef} className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 flex gap-1`}>
                            <button
                              onClick={() => {
                                setShowReactionPicker(msg._id);
                                setShowMessageMenu(null);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title={t('React')}
                            >
                              <FiSmile className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                              onClick={() => handleReply(msg)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title={t('Reply')}
                            >
                              <FiCornerUpLeft className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                              onClick={() => handleForward(msg)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title={t('Forward')}
                            >
                              <FiShare2 className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                              onClick={() => openPinModal(msg)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title={t('Pin')}
                            >
                              <BsPinAngleFill className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('Delete')}
                            >
                              <MdDeleteOutline className="w-5 h-5 text-red-600" />
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

            {/* Image Editor */}
            {showImageEditor && (
              <BlogImageEditor
                imageUrl={imageToEdit}
                caption={imageCaption}
                onCaptionChange={setImageCaption}
                initialState={imageEditState}
                onSave={(editedImageData, editState, captionText) => {
                  setEditedImageData(editedImageData);
                  setImageEditState(editState);
                  if (captionText) {
                    setImageCaption(captionText);
                  }
                  fetch(editedImageData)
                    .then(res => res.blob())
                    .then(blob => {
                      const file = new File([blob], `edited-${Date.now()}.jpg`, { type: 'image/jpeg' });
                      setSelectedFile(file);
                      setFilePreview({ 
                        type: 'image', 
                        url: editedImageData, 
                        name: file.name, 
                        size: file.size
                      });
                      setShowImageEditor(false);
                    });
                }}
                onCancel={() => {
                  setShowImageEditor(false);
                  setImageToEdit(null);
                  setImageCaption('');
                  setEditedImageData(null);
                  setImageEditState(null);
                }}
              />
            )}

            {/* Camera Modal */}
            {showCameraModal && (
              <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
                <div className="relative w-full h-full md:w-auto md:h-auto md:max-w-4xl md:max-h-[90vh] bg-gray-900 md:rounded-2xl overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold text-base md:text-lg">Take Photo</h3>
                      <button
                        onClick={closeCamera}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
                      >
                        <FiX className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Video Preview */}
                  <div className="relative w-full h-[90vh] md:h-[70vh] md:aspect-video bg-black">
                    {cameraLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                        <div className="text-center">
                          <ClipLoader color="#3b82f6" size={50} />
                          <p className="text-white text-sm mt-4">Initializing camera...</p>
                        </div>
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  {/* Controls */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                      {/* Flash Toggle */}
                      {hasFlash && (
                        <button
                          onClick={toggleFlash}
                          className={`p-3 rounded-full transition-colors ${
                            flashEnabled ? 'bg-yellow-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                          title="Flash"
                        >
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Capture Button */}
                      <button
                        onClick={capturePhoto}
                        className="relative group mx-auto"
                      >
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <MdOutlineCamera className="w-8 h-8 md:w-10 md:h-10 text-gray-900" />
                        </div>
                      </button>
                      
                      {/* Camera Cycle Button */}
                      {availableCameras.length > 1 && (
                        <button
                          onClick={cycleCamera}
                          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                          title="Switch Camera"
                        >
                          <LuSwitchCamera className="w-6 h-6 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Preview Modal */}
            {filePreview && (
              <div className="sticky bottom-0 p-4 border-t border-gray-200 bg-white">
                <div className="space-y-3">
                  {/* Image Preview */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCancelFile}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <FiX className="w-6 h-6 text-gray-600" />
                    </button>
                    
                    <div 
                      className="flex-1 flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        if (filePreview.type === 'image') {
                          setImageToEdit(editedImageData || filePreview.url);
                          setShowImageEditor(true);
                        }
                      }}
                    >
                      {filePreview.type === 'image' ? (
                        <img src={filePreview.url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-2xl">
                          📄
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{filePreview.name}</p>
                        <p className="text-xs text-gray-500">
                          {(filePreview.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {filePreview.type === 'image' && (
                          <p className="text-xs text-blue-600 mt-1">Click to edit</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleSendFile}
                      disabled={uploadingFile}
                      className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                      {uploadingFile ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiSend className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                  
                  {/* Caption Input */}
                  {filePreview.type === 'image' && (
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      maxLength={200}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Voice Recorder */}
            {showVoiceRecorder && (
              <VoiceRecorder
                onSend={handleSendVoiceMessage}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            )}

            {/* Message Input - Fixed to bottom */}
            {!showVoiceRecorder && !filePreview && !showImageEditor && (
            <div className="sticky bottom-0 p-2 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative z-50">
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
                <div className="mb-2 bg-gray-100 rounded-lg p-3 flex items-start justify-between gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FiCornerUpLeft className="w-4 h-4 text-gray-600" />
                        <p className="text-xs font-medium text-gray-700">
                          {t('Replying to')} {getUserDisplayName(replyingTo.sender)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {replyingTo.type === 'image' ? '📷 Photo' : replyingTo.content.length > 60 ? replyingTo.content.substring(0, 60) + '...' : replyingTo.content}
                      </p>
                    </div>
                    {replyingTo.type === 'image' && replyingTo.fileUrl && (
                      <img
                        src={replyingTo.fileUrl}
                        alt="Reply preview"
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 sm:gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="relative" ref={attachMenuRef}>
                  <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={uploadingFile}
                    className="flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                    title="Attach"
                  >
                    {uploadingFile ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiPaperclip className="w-5 h-5" />
                    )}
                  </button>

                  {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[160px] animate-slideUp z-50">
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <FiImage className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">Photos</span>
                      </button>
                      <button
                        onClick={openCamera}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <FiCamera className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Camera</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <FiFile className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-medium text-gray-700">Document</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Voice message"
                >
                  <FiMic className="w-5 h-5" />
                </button>
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
                  className="flex-1 w-0 px-2 py-1.5 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm overflow-hidden bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
            )}
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

      {/* Call Modals */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {activeCall && (
        <ActiveCallScreen
          remoteUser={{ 
            fullName: activeCall.userName,
            profileImage: activeCall.userAvatar
          }}
          callType={activeCall.callType}
          isMinimized={isCallMinimized}
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          startTime={activeCall.startTime}
          callAccepted={activeCall.callAccepted}
          onToggleMinimize={() => setIsCallMinimized(!isCallMinimized)}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onStartRecording={toggleRecording}
          onStopRecording={toggleRecording}
          onEndCall={endCall}
          localStream={activeCall.stream}
          remoteStream={activeCall.remoteStream}
        />
      )}

      {showCallHistory && (
        <CallHistoryModal
          callLogs={callLogs}
          onClose={() => setShowCallHistory(false)}
          onCallBack={handleCallBack}
          getUserDisplayName={getUserDisplayName}
          getUserAvatar={getUserAvatar}
          currentUserId={user._id}
          onDeleteLog={handleDeleteCallLog}
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(group) => {
            console.log('Group created:', group);
            setGroups(prev => [group, ...prev]);
          }}
        />
      )}

      {/* Group Info Panel */}
      {showGroupInfo && selectedChat?.isGroup && (
        <GroupInfoPanel
          group={selectedChat}
          currentUserId={user._id}
          onClose={() => setShowGroupInfo(false)}
          onUpdate={(updatedGroup) => {
            setSelectedChat({ ...updatedGroup, isGroup: true });
            setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
          }}
          onLeave={() => {
            setShowGroupInfo(false);
            setSelectedChat(null);
            setGroups(prev => prev.filter(g => g._id !== selectedChat._id));
            loadGroups();
          }}
        />
      )}
    </div>
  );
};

export default ChatNew;
