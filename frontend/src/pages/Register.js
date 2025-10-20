import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';

const Register = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailValidationMsg, setEmailValidationMsg] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Email validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Check email domain (frontend validation)
  const checkEmailDomain = (email) => {
    if (!email) return '';
    if (!isValidEmail(email)) return 'Invalid email format';
    
    const domain = email.split('@')[1]?.toLowerCase();
    const allowedDomains = [
      'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
      'yahoo.com', 'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me'
    ];
    
    if (allowedDomains.includes(domain)) {
      return 'valid';
    }
    return 'Please use Gmail, Outlook, Yahoo, or other major email providers';
  };

  // Real-time email validation
  useEffect(() => {
    if (email) {
      const validation = checkEmailDomain(email);
      setEmailValidationMsg(validation);
    } else {
      setEmailValidationMsg('');
    }
  }, [email]);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength: 33, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength: 66, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSendCode = async () => {
    if (emailValidationMsg !== 'valid') {
      setError('Please enter a valid email address from a major provider');
      return;
    }
    setError('');
    setSuccess('');
    setIsSendingCode(true);
    try {
      await api.post('/auth/send-verification-code', { email });
      setIsCodeSent(true);
      setSuccess('Verification code sent to your email!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send code');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setError('');
    setSuccess('');
    setIsVerifyingCode(true);
    try {
      await api.post('/auth/verify-code', { email, code: verificationCode });
      setIsEmailVerified(true);
      setSuccess('Email verified successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isEmailVerified) {
      setError('Please verify your email first');
      return;
    }

    try {
      await register(username, email, password, rememberMe);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">{t('Create Account')}</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">{t('Username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={3}
            />
            <p className="text-sm text-gray-500 mt-1">{t('Minimum 3 characters')}</p>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">{t('Email Address')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setIsCodeSent(false);
                setIsEmailVerified(false);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isEmailVerified}
            />
            {email && emailValidationMsg && (
              <div className="mt-1">
                {emailValidationMsg === 'valid' && !isEmailVerified ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <FaCheckCircle className="text-green-500" />
                      <span className="text-sm text-green-600">Valid email</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode}
                      className="text-sm text-blue-600 hover:underline font-semibold disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSendingCode ? (
                        <>
                          <span className="flex gap-1">
                            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
                          </span>
                          Sending...
                        </>
                      ) : (
                        isCodeSent ? 'Resend Code' : 'Verify Email'
                      )}
                    </button>
                  </div>
                ) : emailValidationMsg !== 'valid' ? (
                  <div className="flex items-center gap-1">
                    <FaTimesCircle className="text-red-500" />
                    <span className="text-sm text-red-600">{emailValidationMsg}</span>
                  </div>
                ) : null}
                {isEmailVerified && (
                  <div className="flex items-center gap-1">
                    <FaCheckCircle className="text-green-500" />
                    <span className="text-sm text-green-600 font-semibold">✓ Verified</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {isCodeSent && !isEmailVerified && (
            <div>
              <label className="block text-gray-700 mb-2">Verification Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={isVerifyingCode || verificationCode.length !== 6}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isVerifyingCode ? (
                    <>
                      <span className="flex gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
                      </span>
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to your email</p>
            </div>
          )}
          
          <div>
            <label className="block text-gray-700 mb-2">{t('Password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                required
                minLength={6}
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <VscEyeClosed size={20} /> : <VscEye size={20} />}
                </button>
              )}
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Password Strength:</span>
                  <span className={`text-sm font-semibold ${passwordStrength.color.replace('bg-', 'text-')}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.strength}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Use uppercase, lowercase, numbers & symbols for a strong password</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2"
            />
            <label className="text-gray-700">{t('Remember Me')}</label>
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            {t('Sign Up')}
          </button>
        </form>
        
        <p className="text-center mt-4 text-gray-600">
          {t('Already have an account?')} <Link to="/login" className="text-blue-600 hover:underline">{t('Login')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
