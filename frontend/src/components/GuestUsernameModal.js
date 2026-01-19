import React, { useState, useEffect } from 'react';
import { TbBrandAmongUs } from 'react-icons/tb';
import { FaCheck, FaTimes, FaRedo } from 'react-icons/fa';
import api from '../services/api';
import { ClipLoader } from 'react-spinners';

const GuestUsernameModal = ({ onClose, onContinue }) => {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState('');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setCaptchaInput('');
    setError('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (!username) {
      setStatus(null);
      setMessage('');
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const { data } = await api.get(`/auth/check-guest-username/${username}`);
        if (data.available) {
          setStatus('available');
          setMessage('Username available');
        } else {
          setStatus('taken');
          setMessage(data.message);
        }
      } catch (error) {
        setStatus('invalid');
        setMessage('Error checking username');
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleContinue = () => {
    if (captchaInput !== captcha) {
      setError('Incorrect captcha. Please try again.');
      generateCaptcha();
      return;
    }
    if (status === 'available' && username) {
      onContinue(username);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <TbBrandAmongUs className="text-6xl text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Continue as Guest</h2>
        <p className="text-gray-600 text-center mb-6">Choose a username to get started</p>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Enter Username</label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="username_123"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={20}
            />
            <div className="absolute right-3 top-3">
              {checking && <ClipLoader size={20} color="#9333ea" />}
              {!checking && status === 'available' && <FaCheck className="text-green-500 text-xl" />}
              {!checking && (status === 'taken' || status === 'invalid') && <FaTimes className="text-red-500 text-xl" />}
            </div>
          </div>
          {message && (
            <p className={`text-sm mt-2 ${status === 'available' ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">Only letters, numbers, and underscores allowed</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Verify you're human</label>
          <div className="bg-gray-100 px-4 py-3 rounded-lg border-2 border-gray-300 font-mono text-2xl font-bold text-center mb-2 select-none tracking-widest">
            {captcha}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Enter text above"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={6}
            />
            <button
              type="button"
              onClick={generateCaptcha}
              className="text-purple-600 hover:text-purple-800 p-2"
              title="Refresh captcha"
            >
              <FaRedo size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleContinue}
            disabled={status !== 'available' || !username || !captchaInput}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              status === 'available' && username && captchaInput
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestUsernameModal;
