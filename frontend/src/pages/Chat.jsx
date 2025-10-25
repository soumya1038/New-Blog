import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container, Paper, Box, Typography, List, ListItem, ListItemAvatar,
  ListItemText, Avatar, TextField, IconButton, Badge, CircularProgress,
  Menu, MenuItem
} from '@mui/material';
import { Send as SendIcon, ArrowBack as ArrowBackIcon, MoreVert as MoreVertIcon, Done as DoneIcon, DoneAll as DoneAllIcon } from '@mui/icons-material';
import { getConversations, getMessages, sendMessage, deleteMessage } from '../services/messageService';
import api from '../services/api';

const Chat = () => {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});
  const [selectedUserStatuses, setSelectedUserStatuses] = useState([]);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [statusProgress, setStatusProgress] = useState(0);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-refresh conversations every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh messages every 2 seconds when chat is open
  useEffect(() => {
    if (!selectedUser?._id) return;
    
    const interval = setInterval(async () => {
      try {
        const data = await getMessages(selectedUser._id);
        setMessages(data.messages);
      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [selectedUser?._id]);
  
  // Status slideshow with progress bar
  useEffect(() => {
    if (!selectedUserStatuses.length) return;
    
    const progressInterval = setInterval(() => {
      setStatusProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (100 / 30); // 3 seconds = 30 intervals of 100ms
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
  }, [selectedUserStatuses.length]);

  // Handle location state (when coming from notification)
  useEffect(() => {
    if (!loading && location.state?.selectedUser) {
      setSelectedUser(location.state.selectedUser);
      loadMessages(location.state.selectedUser._id);
    }
  }, [loading, location.state]);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data.conversations);
      
      // Fetch statuses for all users in conversations
      const userIds = data.conversations.map(c => c.user._id);
      await fetchUserStatuses(userIds);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserStatuses = async (userIds) => {
    if (!userIds || userIds.length === 0) return;
    try {
      const { data } = await api.post('/users/statuses/check', { userIds });
      setUserStatuses(data.statusMap || {});
    } catch (error) {
      console.error('Failed to fetch user statuses:', error);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const data = await getMessages(userId);
      setMessages(data.messages);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    loadMessages(user._id);
    
    // Clear unread count
    setConversations(prev => prev.map(c => 
      c.user._id === user._id ? { ...c, unreadCount: 0 } : c
    ));
    
    // Fetch user's statuses
    try {
      const { data } = await api.get(`/users/profile/${user._id}`);
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
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    try {
      await sendMessage(selectedUser._id, messageContent);
      await loadMessages(selectedUser._id);
      await loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleMessageMenuOpen = (event, message) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMessageMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    
    try {
      await deleteMessage(selectedMessage._id);
      setMessages(messages.filter(m => m._id !== selectedMessage._id));
      handleMessageMenuClose();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message');
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ height: '70vh', display: 'flex' }}>
        {/* Conversations List */}
        <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Messages</Typography>
          </Box>
          <List>
            {conversations.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No conversations yet</Typography>
              </Box>
            ) : (
              conversations.map((conv) => (
                <ListItem
                  key={conv.user._id}
                  button
                  selected={selectedUser?._id === conv.user._id}
                  onClick={() => handleSelectUser(conv.user)}
                >
                  <ListItemAvatar>
                    <Badge 
                      badgeContent={conv.unreadCount} 
                      color="primary"
                      overlap="circular"
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          display: 'inline-block',
                          padding: userStatuses[conv.user._id] ? '3px' : '0',
                          background: userStatuses[conv.user._id] ? 'linear-gradient(45deg, #4caf50, #81c784)' : 'transparent',
                          borderRadius: '50%'
                        }}
                      >
                        <Avatar 
                          src={conv.user.profileImage} 
                          alt={conv.user.username}
                        >
                          {conv.user.username?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                      </Box>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={conv.user?.username || conv.user?.name || 'Unknown User'}
                    secondary={conv.lastMessage?.content ? conv.lastMessage.content.substring(0, 30) + '...' : 'No messages yet'}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <Box 
                sx={{ 
                  p: 2, 
                  borderBottom: 1, 
                  borderColor: 'divider', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  position: 'relative',
                  minHeight: '80px',
                  cursor: selectedUserStatuses.length > 0 ? 'pointer' : 'default',
                  backgroundImage: selectedUserStatuses.length > 0 && selectedUserStatuses[currentStatusIndex]?.image
                    ? `url(${selectedUserStatuses[currentStatusIndex].image})` 
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  '&::before': selectedUserStatuses.length > 0 ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: 'rgba(255, 255, 255, 0.75)',
                    zIndex: 0
                  } : {}
                }}
                onClick={() => {
                  console.log('Header clicked, statuses:', selectedUserStatuses);
                  if (selectedUserStatuses.length > 0 && selectedUserStatuses[currentStatusIndex]?.image) {
                    window.open(selectedUserStatuses[currentStatusIndex].image, '_blank');
                  }
                }}
              >
                {/* Progress Bar */}
                {selectedUserStatuses.length > 0 && (
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, px: 1, pt: 0.5 }}>
                      {selectedUserStatuses.map((_, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            flex: 1,
                            height: 3,
                            bgcolor: 'rgba(0,0,0,0.2)',
                            borderRadius: 1,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              bgcolor: '#4caf50',
                              width: idx === currentStatusIndex ? `${statusProgress}%` : idx < currentStatusIndex ? '100%' : '0%',
                              transition: 'width 0.1s linear'
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                <IconButton onClick={(e) => { e.stopPropagation(); setSelectedUser(null); }} sx={{ display: { sm: 'none' }, zIndex: 1 }}>
                  <ArrowBackIcon />
                </IconButton>
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-block',
                    padding: userStatuses[selectedUser._id] ? '3px' : '0',
                    background: userStatuses[selectedUser._id] ? 'linear-gradient(45deg, #4caf50, #81c784)' : 'transparent',
                    borderRadius: '50%',
                    zIndex: 1
                  }}
                >
                  <Avatar 
                    src={selectedUser.profileImage} 
                    alt={selectedUser.username || selectedUser.name}
                  >
                    {(selectedUser.username || selectedUser.name || 'U')[0].toUpperCase()}
                  </Avatar>
                </Box>
                <Typography variant="h6" sx={{ zIndex: 1 }}>{selectedUser.username || selectedUser.name || 'User'}</Typography>
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 1, bgcolor: '#f5f5f5' }}>
                {messages.map((msg) => {
                  const isOwnMessage = msg.sender?._id === currentUser?._id;
                  return (
                    <Box
                      key={msg._id}
                      sx={{
                        display: 'flex',
                        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                        mb: 1,
                        px: 1
                      }}
                    >
                      {!isOwnMessage && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', maxWidth: '75%' }}>
                          <Avatar
                            src={msg.sender?.profileImage}
                            alt={msg.sender?.username || msg.sender?.name}
                            sx={{ width: 28, height: 28, mr: 1, mb: 0.5 }}
                          >
                            {(msg.sender?.username || msg.sender?.name || 'U')?.[0]?.toUpperCase()}
                          </Avatar>
                          <Box
                            sx={{
                              bgcolor: 'white',
                              p: 1.5,
                              borderRadius: '0 18px 18px 18px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', mb: 0.5 }}>
                              {msg.content}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                              {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      
                      {isOwnMessage && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', maxWidth: '75%', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMessageMenuOpen(e, msg)}
                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                          <Box
                            sx={{
                              bgcolor: '#0084ff',
                              color: 'white',
                              p: 1.5,
                              borderRadius: '18px 0 18px 18px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', mb: 0.5 }}>
                              {msg.content}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                                {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                              {msg.read ? (
                                <DoneAllIcon sx={{ fontSize: 14, opacity: 0.8, color: '#4fc3f7' }} />
                              ) : msg.delivered ? (
                                <DoneAllIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                              ) : (
                                <DoneIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Menu */}
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMessageMenuClose}>
                <MenuItem onClick={handleDeleteMessage}>Delete Message</MenuItem>
              </Menu>

              {/* Message Input */}
              <Box sx={{ p: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  multiline
                  maxRows={3}
                  variant="outlined"
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px', bgcolor: '#f5f5f5' } }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  sx={{
                    bgcolor: '#0084ff',
                    color: 'white',
                    '&:hover': { bgcolor: '#0066cc' },
                    '&:disabled': { bgcolor: 'grey.300' }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">Select a conversation to start messaging</Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Chat;
