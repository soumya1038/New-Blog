import axios from 'axios';

const API_URL = 'http://localhost:5000/api/messages';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
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
