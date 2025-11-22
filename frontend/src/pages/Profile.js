import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaCamera, FaKey, FaTrash, FaEye, FaEyeSlash, FaCopy, FaPlus, FaEdit, FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaGithub, FaLinkedin, FaGlobe, FaArrowLeft, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaArrowRight, FaTimes } from 'react-icons/fa';
import AIBioGenerator from '../components/AIBioGenerator';
import Avatar from '../components/Avatar';
import { ScaleLoader, SyncLoader, BeatLoader, PulseLoader, HashLoader } from 'react-spinners';

const Profile = () => {
  const { t } = useTranslation();
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: '', email: '', phone: '', dateOfBirth: '', address: '', bio: '', description: '', signature: '',
    socialMedia: []
  });
  const [apiKeys, setApiKeys] = useState([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [showPasswordCodeModal, setShowPasswordCodeModal] = useState(false);
  const [passwordCode, setPasswordCode] = useState('');
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState({});
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialForm, setSocialForm] = useState({ name: '', url: '', editIndex: -1 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteCodeModal, setShowDeleteCodeModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [sendingDeleteCode, setSendingDeleteCode] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDeleting, setImageDeleting] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showViewStatusModal, setShowViewStatusModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFullScreenStatus, setShowFullScreenStatus] = useState(null);
  const [statusForm, setStatusForm] = useState({ text: '', image: null, imagePreview: null });
  const [statusLoading, setStatusLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [styledLetters, setStyledLetters] = useState([]);
  const [generatingImage, setGeneratingImage] = useState(false);
  const canvasRef = React.useRef(null);
  const [selectedGradientIndex, setSelectedGradientIndex] = useState(0);
  const [deletingStatusId, setDeletingStatusId] = useState(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [sendingForgotCode, setSendingForgotCode] = useState(false);
  const [showForgotCodeModal, setShowForgotCodeModal] = useState(false);
  const [forgotCode, setForgotCode] = useState('');
  const [forgotCodeError, setForgotCodeError] = useState('');
  const [showContactSection, setShowContactSection] = useState(false);
  const [contactForm, setContactForm] = useState({ issue: '', advice: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [showForgotSection, setShowForgotSection] = useState(false);
  const [showSocialSection, setShowSocialSection] = useState(false);

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

  const getSvgPattern = (index) => {
    const patterns = [
      `data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='3' fill='white' opacity='0.5'/%3E%3Ccircle cx='40' cy='25' r='4' fill='white' opacity='0.4'/%3E%3Ccircle cx='25' cy='45' r='2' fill='white' opacity='0.6'/%3E%3Ccircle cx='50' cy='50' r='3' fill='white' opacity='0.5'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 30, 50 50 T 100 50' stroke='white' stroke-width='2' fill='none' opacity='0.4'/%3E%3Cpath d='M0 70 Q 25 50, 50 70 T 100 70' stroke='white' stroke-width='2' fill='none' opacity='0.35'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='10,10 20,30 0,30' fill='white' opacity='0.4'/%3E%3Cpolygon points='50,20 65,45 35,45' fill='white' opacity='0.35'/%3E%3Cpolygon points='60,60 75,80 45,80' fill='white' opacity='0.45'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='15' cy='15' r='8' fill='none' stroke='white' stroke-width='2' opacity='0.4'/%3E%3Ccircle cx='55' cy='25' r='10' fill='none' stroke='white' stroke-width='2' opacity='0.35'/%3E%3Ccircle cx='30' cy='60' r='6' fill='none' stroke='white' stroke-width='2' opacity='0.45'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='20' x2='100' y2='20' stroke='white' stroke-width='2' stroke-dasharray='5,5' opacity='0.4'/%3E%3Cline x1='0' y1='50' x2='100' y2='50' stroke='white' stroke-width='2' stroke-dasharray='8,4' opacity='0.35'/%3E%3Cline x1='0' y1='80' x2='100' y2='80' stroke='white' stroke-width='2' stroke-dasharray='3,7' opacity='0.4'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cellipse cx='20' cy='30' rx='15' ry='10' fill='white' opacity='0.35'/%3E%3Cellipse cx='70' cy='20' rx='12' ry='18' fill='white' opacity='0.4'/%3E%3Cellipse cx='50' cy='70' rx='20' ry='12' fill='white' opacity='0.38'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='15' width='8' height='3' fill='white' opacity='0.5' transform='rotate(45 14 16.5)'/%3E%3Crect x='50' y='25' width='6' height='3' fill='white' opacity='0.4' transform='rotate(-30 53 26.5)'/%3E%3Crect x='30' y='55' width='7' height='3' fill='white' opacity='0.45' transform='rotate(60 33.5 56.5)'/%3E%3Crect x='65' y='65' width='5' height='3' fill='white' opacity='0.4' transform='rotate(-45 67.5 66.5)'/%3E%3C/svg%3E`,
      `data:image/svg+xml,%3Csvg width='50' height='50' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='25' x2='50' y2='25' stroke='white' stroke-width='1' opacity='0.35'/%3E%3Cline x1='25' y1='0' x2='25' y2='50' stroke='white' stroke-width='1' opacity='0.35'/%3E%3C/svg%3E`,
    ];
    return patterns[index % patterns.length];
  };

  const getStatusBackground = (image, index) => {
    if (image) return image;
    const baseGradient = gradients[index % gradients.length];
    const pattern1 = getSvgPattern(index);
    const pattern2 = getSvgPattern((index + 3) % 8);
    const pattern3 = getSvgPattern((index + 5) % 8);
    return `url("${pattern1}"), url("${pattern2}"), url("${pattern3}"), ${baseGradient}`;
  };

  const styleStatusText = (text) => {
    const fonts = ['Georgia', 'Times New Roman', 'Courier New', 'Arial', 'Verdana'];
    const colors = ['#FFFFFF', '#FFE66D', '#4ECDC4', '#FF6B6B', '#A8E6CF', '#FF8B94', '#FFD93D', '#6BCF7F'];
    
    return text.split(' ').map(word => 
      word.split('').map((char, i) => ({
        char: Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase(),
        font: fonts[Math.floor(Math.random() * fonts.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() > 0.7 ? 6 : (Math.random() > 0.5 ? 4 : 2),
        offsetY: (Math.random() - 0.5) * 20,
        rotation: (Math.random() - 0.5) * 12
      }))
    );
  };

  const regenerateTextStyle = () => {
    if (statusForm.text.trim()) {
      setStyledLetters(styleStatusText(statusForm.text));
    }
  };

  const regenerateBackground = () => {
    setSelectedGradientIndex(Math.floor(Math.random() * gradients.length));
  };

  useEffect(() => {
    if (statusForm.text.trim()) {
      setStyledLetters(styleStatusText(statusForm.text));
    } else {
      setStyledLetters([]);
    }
  }, [statusForm.text]);

  const generateCompositeImage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // Draw background
    if (statusForm.imagePreview) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = statusForm.imagePreview;
      });
      ctx.drawImage(img, 0, 0, width, height);
    } else {
      // Draw gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      const selectedGradient = gradients[selectedGradientIndex];
      const colors = selectedGradient.match(/#[0-9a-f]{6}/gi);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Draw SVG patterns
      const pattern1 = getSvgPattern(selectedGradientIndex);
      const pattern2 = getSvgPattern((selectedGradientIndex + 3) % 8);
      const pattern3 = getSvgPattern((selectedGradientIndex + 5) % 8);
      
      for (const patternSvg of [pattern1, pattern2, pattern3]) {
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = patternSvg;
        });
        const pattern = ctx.createPattern(img, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillRect(0, 0, width, height);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // Draw styled text
    if (styledLetters.length > 0) {
      const centerX = width / 2;
      const centerY = height / 2;
      let currentX = 0;
      let currentY = 0;
      const lineHeight = 200;
      const wordSpacing = 80;
      const letterSpacing = 10;

      const lines = [];
      let currentLine = [];
      let lineWidth = 0;

      styledLetters.forEach((word) => {
        const wordWidth = word.reduce((sum, letter) => sum + (letter.size * 40) + letterSpacing, 0) + wordSpacing;
        if (lineWidth + wordWidth > width * 0.8 && currentLine.length > 0) {
          lines.push({ words: currentLine, width: lineWidth });
          currentLine = [word];
          lineWidth = wordWidth;
        } else {
          currentLine.push(word);
          lineWidth += wordWidth;
        }
      });
      if (currentLine.length > 0) {
        lines.push({ words: currentLine, width: lineWidth });
      }

      const totalHeight = lines.length * lineHeight;
      let startY = centerY - totalHeight / 2;

      lines.forEach((line, lineIdx) => {
        let startX = centerX - line.width / 2;
        currentY = startY + lineIdx * lineHeight;

        line.words.forEach((word) => {
          word.forEach((letter) => {
            ctx.save();
            ctx.font = `bold ${letter.size * 40}px ${letter.font}`;
            ctx.fillStyle = letter.color;
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            
            const x = startX + currentX;
            const y = currentY + letter.offsetY;
            
            ctx.translate(x, y);
            ctx.rotate((letter.rotation * Math.PI) / 180);
            
            // 3D shadow effect
            for (let i = 6; i > 0; i--) {
              ctx.fillStyle = `rgba(0,0,0,${0.8 - i * 0.1})`;
              ctx.fillText(letter.char, i, i);
            }
            
            ctx.strokeText(letter.char, 0, 0);
            ctx.fillStyle = letter.color;
            ctx.fillText(letter.char, 0, 0);
            
            ctx.restore();
            
            currentX += letter.size * 40 + letterSpacing;
          });
          currentX += wordSpacing;
        });
        currentX = 0;
      });
    }

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    return new File([blob], 'status-image.jpg', { type: 'image/jpeg' });
  };

  const fetchUserBlogs = async () => {
    try {
      const { data } = await api.get(`/blogs?author=${user._id}&limit=5`);
      setBlogs(data.blogs);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    }
  };

  const fetchUserShorts = async () => {
    try {
      const { data } = await api.get(`/blogs/short/all?author=${user._id}`);
      setShorts(data.blogs.slice(0, 5));
    } catch (error) {
      console.error('Error fetching shorts:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/users/profile');
      const userProfile = data.user;
      // Set and save default description if empty
      if (!userProfile.description) {
        const defaultDescription = 'Passionate blogger on Modern Blog platform. Join me on my writing journey!';
        userProfile.description = defaultDescription;
        // Save default description to database
        await api.put('/users/profile', { description: defaultDescription });
      }
      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const { data } = await api.get('/users/api-keys');
      setApiKeys(data.apiKeys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const formatPostDate = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now - postDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return postDate.toLocaleDateString('en-US', options);
  };

  const fetchStatuses = async () => {
    try {
      const { data } = await api.get('/users/statuses');
      setStatuses(data.statuses || []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  useEffect(() => {
    if (showViewStatusModal && statuses.length === 0) {
      setShowViewStatusModal(false);
    }
  }, [statuses, showViewStatusModal]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchApiKeys(), fetchUserBlogs(), fetchUserShorts(), fetchStatuses()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const showModal = (type, title, message, onConfirm = null) => {
    setModal({ show: true, type, title, message, onConfirm });
    if (type === 'success' && !onConfirm) {
      setTimeout(() => setModal({ show: false, type: '', title: '', message: '', onConfirm: null }), 3000);
    }
  };

  const closeModal = () => {
    setModal({ show: false, type: '', title: '', message: '', onConfirm: null });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/users/profile', profile);
      showModal('success', 'Success', 'Profile updated successfully!');
    } catch (error) {
      showModal('error', 'Error', 'Failed to update profile');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    setImageUploading(true);
    try {
      const { data } = await api.post('/users/profile/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser({ ...user, profileImage: data.profileImage });
      showModal('success', 'Success', 'Profile image updated!');
    } catch (error) {
      showModal('error', 'Error', 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    showModal('confirm', 'Remove Image', 'Are you sure you want to remove your profile image?', async () => {
      setImageDeleting(true);
      try {
        await api.delete('/users/profile/image');
        setUser({ ...user, profileImage: '' });
        showModal('success', 'Success', 'Profile image removed!');
      } catch (error) {
        showModal('error', 'Error', 'Failed to remove image');
      } finally {
        setImageDeleting(false);
      }
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSendingPasswordCode(true);
    try {
      await api.post('/users/password/request', passwords);
      setShowPasswordForm(false);
      setShowPasswordCodeModal(true);
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed to send confirmation code');
    } finally {
      setSendingPasswordCode(false);
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/password/confirm', { code: passwordCode });
      showModal('success', 'Success', 'Password changed successfully!');
      setShowPasswordCodeModal(false);
      setPasswordCode('');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Invalid or expired code');
    }
  };

  const generateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showModal('error', 'Error', 'Please enter a name for the API key');
      return;
    }
    try {
      const { data } = await api.post('/users/api-keys', { name: newKeyName });
      showModal('success', 'Success', 'API key generated successfully!');
      setNewKeyName('');
      setShowApiKeyForm(false);
      fetchApiKeys();
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed to generate API key');
    }
  };

  const revokeApiKey = (keyId, keyName) => {
    showModal('confirm', 'Confirm Revoke', `Revoke API key "${keyName}"? This action cannot be undone.`, async () => {
      try {
        await api.delete(`/users/api-keys/${keyId}`);
        showModal('success', 'Success', 'API key revoked successfully');
        fetchApiKeys();
      } catch (error) {
        showModal('error', 'Error', 'Failed to revoke API key');
      }
    });
  };

  const toggleKeyVisibility = (keyId) => {
    setVisibleKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showModal('success', 'Success', 'API key copied to clipboard!');
  };

  const getSocialIcon = (name) => {
    if (!name) return <FaGlobe className="text-gray-600" />;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('facebook')) return <FaFacebook className="text-blue-600" />;
    if (lowerName.includes('twitter')) return <FaTwitter className="text-blue-400" />;
    if (lowerName.includes('instagram')) return <FaInstagram className="text-pink-600" />;
    if (lowerName.includes('youtube')) return <FaYoutube className="text-red-600" />;
    if (lowerName.includes('github')) return <FaGithub className="text-gray-800" />;
    if (lowerName.includes('linkedin')) return <FaLinkedin className="text-blue-700" />;
    return <FaGlobe className="text-gray-600" />;
  };

  const openSocialModal = (index = -1) => {
    if (index >= 0) {
      setSocialForm({ ...profile.socialMedia[index], editIndex: index });
    } else {
      setSocialForm({ name: '', url: '', editIndex: -1 });
    }
    setShowSocialModal(true);
  };

  const saveSocialMedia = async () => {
    if (!socialForm.url.trim()) {
      showModal('error', 'Error', 'URL is required');
      return;
    }
    
    const updatedSocial = [...profile.socialMedia];
    const newItem = { name: socialForm.name.trim(), url: socialForm.url.trim() };
    
    if (socialForm.editIndex >= 0) {
      updatedSocial[socialForm.editIndex] = newItem;
    } else {
      updatedSocial.push(newItem);
    }
    
    try {
      await api.put('/users/profile', { ...profile, socialMedia: updatedSocial });
      setProfile({ ...profile, socialMedia: updatedSocial });
      setShowSocialModal(false);
      setSocialForm({ name: '', url: '', editIndex: -1 });
      showModal('success', 'Success', 'Social media link saved!');
    } catch (error) {
      showModal('error', 'Error', 'Failed to save social media link');
    }
  };

  const deleteSocialMedia = (index) => {
    showModal('confirm', 'Confirm Delete', 'Delete this social media link?', async () => {
      const updatedSocial = profile.socialMedia.filter((_, i) => i !== index);
      
      try {
        await api.put('/users/profile', { ...profile, socialMedia: updatedSocial });
        setProfile({ ...profile, socialMedia: updatedSocial });
        showModal('success', 'Success', 'Social media link deleted!');
      } catch (error) {
        showModal('error', 'Error', 'Failed to delete social media link');
      }
    });
  };

  const getContributionData = () => {
    const weeks = [];
    const months = [];
    const startDate = new Date(heatmapYear, 0, 1);
    const endDate = new Date(heatmapYear, 11, 31);
    const allContent = [...blogs, ...shorts];
    
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
    const allContent = [...blogs, ...shorts];
    if (allContent.length === 0) return [new Date().getFullYear()];
    const years = new Set();
    allContent.forEach(item => {
      years.add(new Date(item.createdAt).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getHeatmapColor = (count, isInYear) => {
    if (!isInYear) return 'bg-transparent';
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-400';
    if (count >= 3) return 'bg-green-600';
    return 'bg-gray-100';
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      showModal('error', 'Error', 'Please enter your password');
      return;
    }
    
    setSendingDeleteCode(true);
    try {
      await api.post('/users/account/delete-request', { password: deletePassword });
      setShowDeleteModal(false);
      setShowDeleteCodeModal(true);
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed to send confirmation code');
    } finally {
      setSendingDeleteCode(false);
    }
  };

  const handleConfirmDeleteAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/account/delete-confirm', { code: deleteCode });
      showModal('success', 'Success', 'Account deleted successfully');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Invalid or expired code');
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      showModal('error', 'Error', 'Username must be at least 3 characters');
      return;
    }
    setUsernameLoading(true);
    try {
      const { data } = await api.put('/users/username', { username: newUsername.trim() });
      setUser({ ...user, username: data.user.username });
      setShowUsernameModal(false);
      setNewUsername('');
      showModal('success', 'Success', 'Username updated successfully!');
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed to update username');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!statusForm.text.trim() && !statusForm.image) {
      showModal('error', 'Error', 'Please provide text or image');
      return;
    }
    setStatusLoading(true);
    try {
      let finalImage = statusForm.image;
      
      // Generate composite image if text exists
      if (statusForm.text.trim()) {
        setLoadingStep('Generating image...');
        finalImage = await generateCompositeImage();
      }
      
      setLoadingStep('Uploading...');
      const formData = new FormData();
      if (statusForm.text.trim()) formData.append('text', statusForm.text.trim());
      if (finalImage) formData.append('statusImage', finalImage);
      if (statusForm.imagePreview && !statusForm.image) formData.append('backgroundImage', statusForm.imagePreview);
      formData.append('gradientIndex', selectedGradientIndex);

      setLoadingStep('Saving status...');
      if (editingStatusId) {
        const { data } = await api.put(`/users/statuses/${editingStatusId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setStatuses(data.statuses);
        setShowStatusModal(false);
        setStatusForm({ text: '', image: null, imagePreview: null });
        setEditingStatusId(null);
        setStyledLetters([]);
        showModal('success', 'Success', 'Status updated successfully!');
      } else {
        const { data } = await api.post('/users/statuses', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setStatuses(data.statuses);
        setShowStatusModal(false);
        setStatusForm({ text: '', image: null, imagePreview: null });
        setStyledLetters([]);
        showModal('success', 'Success', 'Status created successfully! It will expire in 24 hours.');
      }
    } catch (error) {
      showModal('error', 'Error', error.response?.data?.message || 'Failed to save status');
    } finally {
      setStatusLoading(false);
      setLoadingStep('');
    }
  };

  const handleEditStatus = (status) => {
    setEditingStatusId(status._id);
    setStatusForm({ 
      text: status.text || '', 
      image: null, 
      imagePreview: status.backgroundImage || null
    });
    if (status.gradientIndex !== undefined) {
      setSelectedGradientIndex(status.gradientIndex);
    }
    setShowStatusModal(true);
  };

  const handleDeleteStatus = async (statusId) => {
    showModal('confirm', 'Delete Status', 'Are you sure you want to delete this status?', async () => {
      setDeletingStatusId(statusId);
      try {
        const { data } = await api.delete(`/users/statuses/${statusId}`);
        setStatuses(data.statuses);
        showModal('success', 'Success', 'Status deleted successfully!');
      } catch (error) {
        console.error('Delete error:', error);
        showModal('error', 'Error', error.response?.data?.message || 'Failed to delete status');
      } finally {
        setDeletingStatusId(null);
      }
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStatusForm({ ...statusForm, image: file, imagePreview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="h-6 w-20 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse"></div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse"></div>
              <div>
                <div className="h-6 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <div className="grid md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
              <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="border-t pt-6 mb-6">
              <div className="h-6 w-24 bg-gray-200 rounded mb-4 animate-pulse"></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 font-semibold"
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">{t('My Profile')}</h1>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <Avatar user={user} size="lg" />
              {(imageUploading || imageDeleting) && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <ScaleLoader color="#fff" height={20} width={3} />
                </div>
              )}
              {user?.profileImage && !imageUploading && !imageDeleting && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-0 right-0 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition"
                  title="Remove image"
                >
                  <FaTimes size={12} />
                </button>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                <FaCamera />
                <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" disabled={imageUploading || imageDeleting} />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user?.username}</h2>
                <button
                  onClick={() => {
                    setNewUsername(user?.username || '');
                    setShowUsernameModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Edit username"
                >
                  <FaEdit size={18} />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">{t('Member since')} {new Date(user?.createdAt).toLocaleDateString()}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingStatusId(null);
                    setStatusForm({ text: '', image: null, imagePreview: null });
                    setShowStatusModal(true);
                  }}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <FaEdit size={12} /> {t('Set Status')}
                </button>
                {statuses.length > 0 && (
                  <button
                    onClick={() => setShowViewStatusModal(true)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium"
                  >
                    <FaEye size={12} /> {t('View')}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4 mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder={t('Full Name')}
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder={t('Email Address')}
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder={t('Phone')}
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={profile.dateOfBirth?.split('T')[0] || ''}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-700">Bio</label>
                <AIBioGenerator onGenerate={(bio) => setProfile({ ...profile, bio })} />
              </div>
              <textarea
                placeholder={t('Bio')}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('Description')}</label>
              <div className="relative">
                <textarea
                  placeholder={t('Brief description (max 200 characters)')}
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value.substring(0, 200) })}
                  className="w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  maxLength={200}
                />
                <button
                  type="button"
                  onClick={async () => {
                    setGeneratingDescription(true);
                    try {
                      const { data } = await api.post('/ai/generate-description', {
                        fullName: profile.fullName,
                        email: profile.email,
                        phone: profile.phone,
                        bio: profile.bio,
                        existingDescription: profile.description
                      });
                      setProfile({ ...profile, description: data.description });
                    } catch (error) {
                      showModal('error', 'Error', error.response?.data?.message || 'Failed to generate description');
                    } finally {
                      setGeneratingDescription(false);
                    }
                  }}
                  disabled={generatingDescription}
                  className="absolute right-2 top-2 text-purple-600 hover:text-purple-800 disabled:text-gray-400 p-1"
                  title={t('Generate with AI')}
                >
                  {generatingDescription ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-right">
                {profile.description.length}/200 {t('characters')}
              </div>
            </div>
            
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              {t('Update Profile')}
            </button>
          </form>
          
          {/* Posts Section */}
          <div className="border-t pt-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('Posts')} ({blogs.length})</h3>
              {blogs.length > 0 && (
                <button
                  onClick={() => navigate(`/user/${user._id}`)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold"
                >
                  {t('View All')} <FaArrowRight size={12} />
                </button>
              )}
            </div>
            
            {blogs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {blogs.map(blog => (
                  <div
                    key={blog._id}
                    onClick={() => navigate(`/blog/${blog._id}`)}
                    className="bg-gray-50 p-3 rounded-lg border hover:border-blue-500 hover:shadow-md transition cursor-pointer"
                  >
                    <h4 className="font-semibold text-sm text-gray-800 truncate mb-1" title={blog.title}>
                      {blog.title}
                    </h4>
                    <p className="text-xs text-gray-500">{formatPostDate(blog.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('No posts yet')}</p>
            )}
          </div>

          {/* Shorts Section */}
          <div className="border-t pt-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('Shorts')} ({shorts.length})</h3>
              {shorts.length > 0 && (
                <button
                  onClick={() => navigate(`/user/${user._id}`)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-semibold"
                >
                  {t('View All')} <FaArrowRight size={12} />
                </button>
              )}
            </div>
            
            {shorts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {shorts.map(short => (
                  <div
                    key={short._id}
                    onClick={() => navigate(`/short-blogs/${short._id}`)}
                    className="bg-gray-50 p-3 rounded-lg border hover:border-purple-500 hover:shadow-md transition cursor-pointer"
                  >
                    <h4 className="font-semibold text-sm text-gray-800 truncate mb-1" title={short.title}>
                      {short.title}
                    </h4>
                    <p className="text-xs text-gray-500">{formatPostDate(short.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('No shorts yet')}</p>
            )}
          </div>
          
          {/* GitHub-style Contribution Heatmap */}
          {blogs.length > 0 && (
            <div className="border-t pt-6 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">{t('Your Post Activity')}</h3>
                <select
                  value={heatmapYear}
                  onChange={(e) => setHeatmapYear(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getAvailableYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto overflow-y-hidden pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="inline-flex gap-0.5 min-w-max">
                  <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0">
                    <div className="h-2.5"></div>
                    <div className="w-6 h-2.5 text-[9px] text-gray-500 flex items-center">Mon</div>
                    <div className="w-6 h-2.5"></div>
                    <div className="w-6 h-2.5 text-[9px] text-gray-500 flex items-center">Wed</div>
                    <div className="w-6 h-2.5"></div>
                    <div className="w-6 h-2.5 text-[9px] text-gray-500 flex items-center">Fri</div>
                    <div className="w-6 h-2.5"></div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="relative h-3 mb-0.5">
                      {getContributionData().months.map((m, idx) => (
                        <div
                          key={idx}
                          className="text-[9px] text-gray-500 absolute"
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
                              className={`w-2.5 h-2.5 rounded-sm ${getHeatmapColor(day.count, day.isInYear)} ${
                                day.isInYear && day.count > 0 ? 'hover:ring-1 hover:ring-blue-400 cursor-pointer' : ''
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
              <p className="text-[10px] text-gray-500 mt-2 md:hidden">← Scroll horizontally to see full year →</p>
              <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-600">
                <span>Less</span>
                <div className="flex gap-0.5">
                  <div className="w-2.5 h-2.5 bg-gray-100 rounded-sm"></div>
                  <div className="w-2.5 h-2.5 bg-green-200 rounded-sm"></div>
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-sm"></div>
                  <div className="w-2.5 h-2.5 bg-green-600 rounded-sm"></div>
                </div>
                <span>More</span>
              </div>
            </div>
          )}
          
          <div className="border-t pt-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('Social Media Links')}</h3>
              <button
                onClick={() => setShowSocialSection(!showSocialSection)}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                title={showSocialSection ? t('Close') : t('Add social media')}
              >
                {showSocialSection ? <FaTimes /> : <FaPlus />}
              </button>
            </div>
            
            {showSocialSection && (
              <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{socialForm.editIndex >= 0 ? t('Edit Social Media Link') : t('Add Social Media Link')}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('Name (Optional)')}</label>
                    <input
                      type="text"
                      value={socialForm.name}
                      onChange={(e) => setSocialForm({ ...socialForm, name: e.target.value })}
                      placeholder="e.g., Facebook, Twitter"
                      className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('URL (Required)')}</label>
                    <input
                      type="url"
                      value={socialForm.url}
                      onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveSocialMedia}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      {t('Save')}
                    </button>
                    <button
                      onClick={() => {
                        setShowSocialSection(false);
                        setSocialForm({ name: '', url: '', editIndex: -1 });
                      }}
                      className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      {t('Cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {profile.socialMedia?.map((social, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
                  <div className="text-2xl">{getSocialIcon(social.name || social.url)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{social.name || 'Social Link'}</p>
                    <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                      {social.url}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSocialForm({ ...profile.socialMedia[index], editIndex: index }); setShowSocialSection(true); }} className="text-blue-600 hover:text-blue-800">
                      <FaEdit size={14} />
                    </button>
                    <button onClick={() => deleteSocialMedia(index)} className="text-red-600 hover:text-red-800">
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {(!profile.socialMedia || profile.socialMedia.length === 0) && (
                <p className="text-gray-500 text-sm col-span-2">{t('No social media links added yet')}</p>
              )}
            </div>
          </div>
          
          <div className="border-t pt-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                <FaKey /> {t('Change Password')}
              </button>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <button
                onClick={() => setShowForgotSection(!showForgotSection)}
                className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
              >
                <FaKey /> {t('Forgot Password')}
              </button>
            </div>
            
            {showForgotSection && (
              <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Reset Password')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('Enter your new password')}</p>
                {forgotPasswordError && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-2 rounded-lg mb-3 text-sm">{forgotPasswordError}</div>}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setForgotPasswordError('');
                  if (forgotNewPassword !== forgotConfirmPassword) {
                    setForgotPasswordError('Passwords do not match');
                    return;
                  }
                  if (forgotNewPassword.length < 6) {
                    setForgotPasswordError('Password must be at least 6 characters');
                    return;
                  }
                  setSendingForgotCode(true);
                  try {
                    await api.post('/auth/forgot-password/change-authenticated', { newPassword: forgotNewPassword });
                    setShowForgotSection(false);
                    setShowForgotCodeModal(true);
                  } catch (error) {
                    setForgotPasswordError(error.response?.data?.message || 'Failed to send confirmation code');
                  } finally {
                    setSendingForgotCode(false);
                  }
                }}>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-semibold">{t('New Password')}</label>
                      <div className="relative">
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          required
                          minLength={6}
                        />
                        {forgotNewPassword && (
                          <button
                            type="button"
                            onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            {showForgotNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-1 text-sm font-semibold">{t('Confirm Password')}</label>
                      <div className="relative">
                        <input
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          required
                          minLength={6}
                        />
                        {forgotConfirmPassword && (
                          <button
                            type="button"
                            onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            {showForgotConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                        disabled={sendingForgotCode}
                      >
                        {sendingForgotCode ? <SyncLoader color="#fff" size={8} /> : t('Reset Password')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotSection(false);
                          setForgotNewPassword('');
                          setForgotConfirmPassword('');
                          setForgotPasswordError('');
                        }}
                        className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
            
            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder={t('Current Password')}
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder={t('New Password')}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2" disabled={sendingPasswordCode}>
                  {sendingPasswordCode ? <SyncLoader color="#fff" size={8} /> : t('Change Password')}
                </button>
              </form>
            )}
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">{t('Developer Section')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('Generate API keys to access your blog data programmatically')}</p>
            
            <button 
              onClick={() => setShowApiKeyForm(!showApiKeyForm)} 
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 mb-4"
            >
              {showApiKeyForm ? t('Cancel') : t('Generate New API Key')}
            </button>
            
            {showApiKeyForm && (
              <form onSubmit={generateApiKey} className="bg-blue-50 p-4 rounded-lg mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('API Key Name')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Enter a descriptive name"
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                    {t('Generate')}
                  </button>
                </div>
              </form>
            )}
            
            <div className="space-y-3">
              {apiKeys.map(key => (
                <div key={key._id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{key.name}</h4>
                      <p className="text-xs text-gray-500">{t('Created')}: {new Date(key.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => revokeApiKey(key._id, key.name)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
                    >
                      <FaTrash size={12} /> {t('Revoke')}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border">
                    <code className="flex-1 text-sm font-mono overflow-x-auto">
                      {visibleKeys[key._id] ? key.key : '•'.repeat(40)}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(key._id)}
                      className="text-gray-600 hover:text-gray-800 p-1"
                      title={visibleKeys[key._id] ? t('Hide') : t('Show')}
                    >
                      {visibleKeys[key._id] ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(key.key)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title={t('Copy to clipboard')}
                    >
                      <FaCopy />
                    </button>
                  </div>
                </div>
              ))}
              {apiKeys.length === 0 && (
                <p className="text-gray-500 text-center py-4">{t('No API keys generated yet')}</p>
              )}
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Contact Us')}</h3>
              <button
                onClick={() => setShowContactSection(!showContactSection)}
                className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600"
              >
                {showContactSection ? t('Close') : t('Contact Support')}
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('Need help or have suggestions? Send us a message!')}</p>
            
            {showContactSection && (
              <div className="bg-green-50 dark:bg-gray-700 p-4 rounded-lg">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!contactForm.issue.trim()) {
                    showModal('error', 'Error', 'Please describe your issue');
                    return;
                  }
                  setContactLoading(true);
                  try {
                    await api.post('/users/contact', {
                      issue: contactForm.issue,
                      advice: contactForm.advice,
                      userEmail: user.email,
                      username: user.username
                    });
                    setShowContactSection(false);
                    setContactForm({ issue: '', advice: '' });
                    showModal('success', 'Success', 'Message sent successfully! We\'ll get back to you soon.');
                  } catch (error) {
                    showModal('error', 'Error', error.response?.data?.message || 'Failed to send message');
                  } finally {
                    setContactLoading(false);
                  }
                }}>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-1 font-semibold text-sm">{t('Your Issue / Problem')} *</label>
                      <textarea
                        value={contactForm.issue}
                        onChange={(e) => setContactForm({ ...contactForm, issue: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows="3"
                        placeholder="Describe the problem you're facing..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-1 font-semibold text-sm">{t('Advice / Suggestions')}</label>
                      <textarea
                        value={contactForm.advice}
                        onChange={(e) => setContactForm({ ...contactForm, advice: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows="2"
                        placeholder="Any suggestions or advice for us..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={contactLoading}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                      >
                        {contactLoading ? <HashLoader color="#fff" size={20} /> : t('Send')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowContactSection(false);
                          setContactForm({ issue: '', advice: '' });
                        }}
                        disabled={contactLoading}
                        className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 font-semibold"
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">{t('Danger Zone')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('Once you delete your account, there is no going back. All your data will be permanently deleted.')}</p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <FaTrash /> {t('Delete Account')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Universal Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {modal.type === 'success' && (
                  <FaCheckCircle className="text-green-500 text-3xl" />
                )}
                {modal.type === 'error' && (
                  <FaTimesCircle className="text-red-500 text-3xl" />
                )}
                {modal.type === 'confirm' && (
                  <FaExclamationCircle className="text-yellow-500 text-3xl" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${
                  modal.type === 'success' ? 'text-green-700' :
                  modal.type === 'error' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>
                  {modal.title}
                </h3>
                <p className="text-gray-700">{modal.message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => {
                      modal.onConfirm();
                      closeModal();
                    }}
                    className="flex-1 bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 font-semibold"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={closeModal}
                  className={`w-full px-6 py-2 rounded-lg font-semibold ${
                    modal.type === 'success' ? 'bg-green-500 hover:bg-green-600' :
                    'bg-red-500 hover:bg-red-600'
                  } text-white`}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      

      
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Delete Account')}</h3>
            <p className="text-gray-700 mb-4">
              {t('This action will permanently delete:')}
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
              <li>{t('Your profile and personal information')}</li>
              <li>{t('All your blog posts')}</li>
              <li>{t('All your notifications')}</li>
              <li>{t('All your API keys')}</li>
              <li>{t('Your profile image')}</li>
            </ul>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Note:</strong> Your comments will remain visible to preserve discussions, but will show as "Deleted User".
            </p>
            <p className="text-red-600 font-semibold mb-4">{t('This action cannot be undone!')}</p>
            
            <form onSubmit={handleDeleteAccount}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('Enter your password to confirm')}</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={t('Your password')}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                required
              />
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  disabled={sendingDeleteCode}
                >
                  {sendingDeleteCode ? <SyncLoader color="#fff" size={8} /> : t('Delete My Account')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-blue-600 mb-4">{t('Enter Confirmation Code')}</h3>
            <p className="text-gray-700 mb-4">{t('A 6-digit code has been sent to your email.')}</p>
            <form onSubmit={handleConfirmPasswordChange}>
              <input
                type="text"
                value={passwordCode}
                onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-2xl tracking-widest"
                maxLength={6}
                required
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">{t('Confirm')}</button>
                <button type="button" onClick={() => { setShowPasswordCodeModal(false); setPasswordCode(''); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Username Edit Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">{t('Edit Username')}</h3>
            <form onSubmit={handleUpdateUsername}>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                minLength={3}
                required
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  disabled={usernameLoading}
                >
                  {usernameLoading ? <BeatLoader color="#fff" size={8} /> : t('Change Username')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUsernameModal(false);
                    setNewUsername('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set/Edit Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">{editingStatusId ? t('Edit Status') : t('Set Status')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('Status will expire in 24 hours. Provide text or image (or both).')}</p>
            <form onSubmit={handleSaveStatus}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('Text (Optional)')}</label>
                  <textarea
                    value={statusForm.text}
                    onChange={(e) => setStatusForm({ ...statusForm, text: e.target.value })}
                    placeholder="What's on your mind?"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('Image (Optional)')}</label>
                  <input
                    type="file"
                    onChange={handleImageChange}
                    accept="image/*"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {statusForm.imagePreview && (
                    <div className="mt-2">
                      <img src={statusForm.imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    if (!statusForm.imagePreview) {
                      setSelectedGradientIndex(Math.floor(Math.random() * gradients.length));
                    }
                    setShowPreviewModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                  disabled={!statusForm.text.trim() && !statusForm.imagePreview}
                >
                  {t('Preview')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition"
                  disabled={statusLoading}
                >
                  {statusLoading ? (
                    <>
                      <PulseLoader color="#fff" size={6} />
                      <span className="ml-2">{loadingStep || 'Saving...'}</span>
                    </>
                  ) : (
                    t('Save Status')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusForm({ text: '', image: null, imagePreview: null });
                    setEditingStatusId(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
                >
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4">
          <div className="relative w-full max-w-md h-full flex items-center justify-center">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-60 rounded-full p-3 z-10 shadow-lg"
            >
              <FaTimes size={20} />
            </button>
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {statusForm.text.trim() && (
                <button
                  onClick={regenerateTextStyle}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-lg flex items-center gap-2"
                  title="Regenerate text styling"
                >
                  🔄 {t('Regenerate Text')}
                </button>
              )}
              {!statusForm.imagePreview && (
                <button
                  onClick={regenerateBackground}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition shadow-lg flex items-center gap-2"
                  title="Regenerate background"
                >
                  🎨 {t('Regenerate Background')}
                </button>
              )}
              <button
                onClick={async (e) => {
                  setShowPreviewModal(false);
                  await handleSaveStatus(e);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"
                disabled={statusLoading}
              >
                {statusLoading ? (
                  <>
                    <PulseLoader color="#fff" size={6} />
                    <span className="ml-2">{loadingStep || 'Saving...'}</span>
                  </>
                ) : (
                  <>{t('Save Status')}</>
                )}
              </button>
            </div>
            <div className="w-full max-h-[85vh] overflow-y-auto scrollbar-hide">
              <div
                className="w-full aspect-[9/16] rounded-2xl shadow-2xl flex items-center justify-center relative"
                style={{
                  backgroundImage: statusForm.imagePreview 
                    ? `url(${statusForm.imagePreview})` 
                    : getStatusBackground(null, selectedGradientIndex),
                  backgroundSize: statusForm.imagePreview ? 'cover' : 'auto, 120px, 80px, cover',
                  backgroundPosition: statusForm.imagePreview ? 'center' : 'center, top right, bottom left, center'
                }}
              >
                {statusForm.text && styledLetters.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 max-w-[90%]">
                      {styledLetters.map((word, wordIdx) => (
                        <div key={wordIdx} className="flex items-center gap-0.5">
                          {word.map((letter, letterIdx) => (
                            <span
                              key={letterIdx}
                              className="font-bold inline-block"
                              style={{
                                fontFamily: letter.font,
                                color: letter.color,
                                fontSize: `${letter.size}rem`,
                                transform: `translateY(${letter.offsetY}px) rotate(${letter.rotation}deg)`,
                                WebkitTextStroke: '1px rgba(255,255,255,0.3)',
                                textShadow: `
                                  1px 1px 0 rgba(0,0,0,0.8),
                                  2px 2px 0 rgba(0,0,0,0.7),
                                  3px 3px 0 rgba(0,0,0,0.6),
                                  4px 4px 0 rgba(0,0,0,0.5),
                                  5px 5px 10px rgba(0,0,0,0.9)
                                `
                              }}
                            >
                              {letter.char}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Statuses Modal */}
      {showViewStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl p-6 w-full max-h-[85vh] overflow-hidden shadow-2xl ${
            statuses.length === 1 ? 'max-w-sm' : 'max-w-6xl'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{t('Your Statuses')}</h3>
              <button
                onClick={() => setShowViewStatusModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FaTimes size={24} />
              </button>
            </div>
            
            <div className={`max-h-[70vh] ${
              statuses.length === 1 
                ? 'flex justify-center' 
                : 'overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
            }`}>
              <div className={`flex gap-6 ${
                statuses.length === 1 ? '' : 'flex-col lg:flex-row lg:pb-4'
              }`}>
                {statuses.map((status) => (
                  <div
                    key={status._id}
                    className="relative flex-shrink-0 w-full sm:w-64 lg:w-56 aspect-[9/16] rounded-xl cursor-pointer group shadow-lg hover:shadow-xl transition overflow-hidden"
                    onClick={() => setShowFullScreenStatus(status)}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: status.backgroundImage ? `url(${status.backgroundImage})` : getStatusBackground(null, statuses.indexOf(status)),
                        backgroundSize: status.backgroundImage ? 'cover' : 'auto, 120px, 80px, cover',
                        backgroundPosition: status.backgroundImage ? 'center' : 'center, top right, bottom left, center'
                      }}
                    />
                    
                    {deletingStatusId === status._id && (
                      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20">
                        <PulseLoader color="#fff" size={15} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowViewStatusModal(false);
                          handleEditStatus(status);
                        }}
                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-lg"
                      >
                        <FaEdit size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStatus(status._id);
                        }}
                        className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                    
                    {status.text && (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 max-w-[90%]">
                          {styleStatusText(status.text).map((word, wordIdx) => (
                            <div key={wordIdx} className="flex items-center gap-0.5">
                              {word.map((letter, letterIdx) => (
                                <span
                                  key={letterIdx}
                                  className="font-bold inline-block"
                                  style={{
                                    fontFamily: letter.font,
                                    color: letter.color,
                                    fontSize: `${letter.size * 0.6}rem`,
                                    transform: `translateY(${letter.offsetY}px) rotate(${letter.rotation}deg)`,
                                    WebkitTextStroke: '0.5px rgba(255,255,255,0.3)',
                                    textShadow: `
                                      1px 1px 0 rgba(0,0,0,0.8),
                                      2px 2px 0 rgba(0,0,0,0.7),
                                      3px 3px 0 rgba(0,0,0,0.6),
                                      4px 4px 10px rgba(0,0,0,0.9)
                                    `
                                  }}
                                >
                                  {letter.char}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs text-white drop-shadow-lg bg-black bg-opacity-50 px-2 py-1 rounded text-center">
                        {new Date(status.expiresAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Status Modal */}
      {showFullScreenStatus && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowFullScreenStatus(null)}
        >
          <div className="relative w-full max-w-sm max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFullScreenStatus(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2 z-10"
            >
              <FaTimes size={20} />
            </button>
            <img
              src={showFullScreenStatus.image}
              alt="Status"
              className="w-full aspect-[9/16] rounded-lg object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-sm text-white drop-shadow-lg bg-black bg-opacity-50 px-3 py-2 rounded text-center">
                {t('Expires')}: {new Date(showFullScreenStatus.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Forgot Password Code Modal - Step 2 */}
      {showForgotCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-purple-600 mb-4">{t('Enter Confirmation Code')}</h3>
            <p className="text-gray-700 mb-4">{t('A 6-digit code has been sent to your email.')}</p>
            {forgotCodeError && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{forgotCodeError}</div>}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setForgotCodeError('');
              try {
                await api.post('/auth/forgot-password/confirm-authenticated', { code: forgotCode });
                setShowForgotCodeModal(false);
                setForgotCode('');
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                showModal('success', 'Success', 'Password reset successfully!');
              } catch (error) {
                setForgotCodeError(error.response?.data?.message || 'Invalid or expired code');
              }
            }}>
              <input
                type="text"
                value={forgotCode}
                onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 text-center text-2xl tracking-widest"
                maxLength={6}
                required
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">{t('Confirm')}</button>
                <button type="button" onClick={() => { setShowForgotCodeModal(false); setForgotCode(''); setForgotCodeError(''); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {showDeleteCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('Enter Confirmation Code')}</h3>
            <p className="text-gray-700 mb-2">{t('A 6-digit code has been sent to your email.')}</p>
            <p className="text-red-600 font-semibold mb-4">⚠️ {t('This action is permanent!')}</p>
            <form onSubmit={handleConfirmDeleteAccount}>
              <input
                type="text"
                value={deleteCode}
                onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 text-center text-2xl tracking-widest"
                maxLength={6}
                required
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">{t('Delete Account')}</button>
                <button type="button" onClick={() => { setShowDeleteCodeModal(false); setDeleteCode(''); }} className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
