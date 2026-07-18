import axios from 'axios';
import { getAuthToken } from '../utils/authSession';
import { buildApiUrl } from '../utils/apiBaseUrl';

const API_URL = buildApiUrl('/api/messages');

const getAuthHeader = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const sendMessage = async (receiverId, content) => {
  const response = await axios.post(API_URL, { receiverId, content }, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const getConversations = async () => {
  const response = await axios.get(`${API_URL}/conversations`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const getMessages = async (userId) => {
  const response = await axios.get(`${API_URL}/${userId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const deleteMessage = async (messageId) => {
  const response = await axios.delete(`${API_URL}/${messageId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await axios.get(`${API_URL}/unread-count`, {
    headers: getAuthHeader()
  });
  return response.data;
};
