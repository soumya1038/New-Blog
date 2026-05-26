import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';
import { FaCheckCircle, FaRedo } from 'react-icons/fa';
import { FaGoogle, FaFacebook, FaTwitter, FaGithub, FaLinkedin } from 'react-icons/fa';
import { TbBrandAmongUs } from 'react-icons/tb';
import { SyncLoader, ScaleLoader } from 'react-spinners';
import axios from 'axios';
import GuestUsernameModal from '../components/GuestUsernameModal';
import GuestInfoModal from '../components/GuestInfoModal';

const getTwitterRedirectUri = () => {
  const configured = String(process.env.REACT_APP_TWITTER_REDIRECT_URI || '').trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch (error) {
      console.warn('Invalid REACT_APP_TWITTER_REDIRECT_URI, falling back to current origin.');
    }
  }
  return `${window.location.origin}/auth/twitter/callback`;
};

const Login = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingChangeCode, setSendingChangeCode] = useState(false);
  const [showFinalCodeModal, setShowFinalCodeModal] = useState(false);
  const [finalCode, setFinalCode] = useState('');
  const [finalError, setFinalError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Guest login states
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showGuestInfoModal, setShowGuestInfoModal] = useState(false);
  const [guestUsername, setGuestUsername] = useState('');
  
  // Flash message state
  const [flashMessage, setFlashMessage] = useState('');
  
  // Timer states for forgot password flow
  const [verifyTimer, setVerifyTimer] = useState(120);
  const [passwordTimer, setPasswordTimer] = useState(120);
  const [finalTimer, setFinalTimer] = useState(120);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Math CAPTCHA states
  const [mathQuestion, setMathQuestion] = useState({ num1: 0, num2: 0, operator: '+', answer: 0 });
  const [mathAnswer, setMathAnswer] = useState('');
  const [isMathVerified, setIsMathVerified] = useState(false);
  const [mathTimer, setMathTimer] = useState(60);
  
  // Failed login attempts
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Generate math question
  const generateMathQuestion = () => {
    const num1 = Math.floor(Math.random() * 15) + 1;
    const num2 = Math.floor(Math.random() * 15) + 1;
    const operators = ['+', '-'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const answer = operator === '+' ? num1 + num2 : num1 - num2;
    setMathQuestion({ num1, num2, operator, answer });
    setMathAnswer('');
    setIsMathVerified(false);
    setMathTimer(60);
  };

  // Verify math answer
  const handleMathVerify = () => {
    if (parseInt(mathAnswer) === mathQuestion.answer) {
      setIsMathVerified(true);
      setError('');
      // Restart timer from 60 seconds to prevent indefinite window open
      setMathTimer(60);
    } else {
      setError('Incorrect answer. Please try again.');
      setIsMathVerified(false);
      // Generate new question on wrong answer
      generateMathQuestion();
    }
  };

  useEffect(() => {
    generateMathQuestion();
    
    // Check if there's an existing lockout
    const lockoutEnd = localStorage.getItem('loginLockoutEnd');
    if (lockoutEnd) {
      const remaining = parseInt(lockoutEnd) - Date.now();
      if (remaining > 0) {
        setIsLocked(true);
        setLockoutTime(Math.ceil(remaining / 1000));
      } else {
        localStorage.removeItem('loginLockoutEnd');
      }
    }
  }, []);
  
  // Math timer countdown
  useEffect(() => {
    if (mathTimer > 0) {
      const timer = setInterval(() => {
        setMathTimer(prev => {
          if (prev <= 1) {
            generateMathQuestion();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mathTimer]);
  
  // Lockout countdown timer
  useEffect(() => {
    if (isLocked && lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            localStorage.removeItem('loginLockoutEnd');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLocked, lockoutTime]);

  useEffect(() => {
    if (user) {
      const isInLoginFlow = isLoggingIn || sessionStorage.getItem('loginInProgress');
      if (!isInLoginFlow) {
        navigate('/');
        return;
      }
    }
    
    // Load saved credentials
    const saved = localStorage.getItem('credentials');
    if (saved) {
      const { username: u, password: p } = JSON.parse(saved);
      setUsername(u);
      setPassword(p);
      setRememberMe(true);
    }
  }, [user, isLoggingIn, navigate]);
  
  useEffect(() => {
    if (isLoggingIn) {
      sessionStorage.setItem('loginInProgress', 'true');
    }
  }, [isLoggingIn]);
  
  // Verify code timer
  useEffect(() => {
    if (showVerifyModal && verifyTimer > 0) {
      const timer = setInterval(() => {
        setVerifyTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showVerifyModal, verifyTimer]);
  
  // Password change timer
  useEffect(() => {
    if (showNewPasswordModal && passwordTimer > 0) {
      const timer = setInterval(() => {
        setPasswordTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showNewPasswordModal, passwordTimer]);
  
  // Final code timer
  useEffect(() => {
    if (showFinalCodeModal && finalTimer > 0) {
      const timer = setInterval(() => {
        setFinalTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showFinalCodeModal, finalTimer]);

  const handleSocialLogin = (provider) => {
    setFlashMessage(`${provider} login is under development`);
    setTimeout(() => setFlashMessage(''), 3000);
  };

  const handleGoogleLoginRedirect = () => {
    const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const oauthStartUrl = `${apiBase}/api/auth/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;
    sessionStorage.removeItem('socialConnectIntent');
    window.location.href = oauthStartUrl;
  };

  const handleFacebookLoginRedirect = () => {
    const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const redirectUri = `${window.location.origin}/auth/facebook/callback`;
    const oauthStartUrl = `${apiBase}/api/auth/facebook/start?redirect_uri=${encodeURIComponent(redirectUri)}`;
    sessionStorage.removeItem('socialConnectIntent');
    window.location.href = oauthStartUrl;
  };

  const handleTwitterLoginRedirect = () => {
    const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const redirectUri = getTwitterRedirectUri();
    const oauthStartUrl = `${apiBase}/api/auth/twitter/start?redirect_uri=${encodeURIComponent(redirectUri)}&r=${Date.now()}`;
    sessionStorage.removeItem('socialConnectIntent');
    window.location.href = oauthStartUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isLocked) {
      setError(`Too many failed attempts. Please wait ${Math.floor(lockoutTime / 60)}:${(lockoutTime % 60).toString().padStart(2, '0')}`);
      return;
    }
    
    if (!isMathVerified) {
      setError('Please verify you are human first');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      await login(username, password, rememberMe);
      setFailedAttempts(0);
      localStorage.removeItem('loginLockoutEnd');
      setIsLoggingIn(false);
      
      sessionStorage.setItem('showLoginIntro', 'true');
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else {
        navigate('/');
      }
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      generateMathQuestion();
      setIsMathVerified(false);
      
      if (newAttempts >= 5) {
        setIsLocked(true);
        setLockoutTime(120);
        const lockoutEnd = Date.now() + (120 * 1000);
        localStorage.setItem('loginLockoutEnd', lockoutEnd.toString());
        setError('Too many failed attempts. Account locked for 2 minutes.');
      } else {
        setError(`${err.response?.data?.message || 'Login failed'}. Attempt ${newAttempts}/5`);
      }
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setSendingCode(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/forgot-password/request`, { username: forgotUsername, email: forgotEmail });
      setShowForgotModal(false);
      setShowVerifyModal(true);
      setVerifyTimer(120);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };
  
  const handleResendVerifyCode = async () => {
    setVerifyError('');
    setSendingCode(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/forgot-password/request`, { username: forgotUsername, email: forgotEmail });
      setVerifyTimer(120);
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setIsVerifying(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/forgot-password/verify`, { username: forgotUsername, email: forgotEmail, code: verifyCode });
      setShowVerifyModal(false);
      setShowNewPasswordModal(true);
      setPasswordTimer(120);
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRequestPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setSendingChangeCode(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/forgot-password/change`, { username: forgotUsername, email: forgotEmail, newPassword });
      setShowNewPasswordModal(false);
      setShowFinalCodeModal(true);
      setFinalTimer(120);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to send confirmation code');
    } finally {
      setSendingChangeCode(false);
    }
  };
  
  const handleResendFinalCode = async () => {
    setFinalError('');
    setSendingChangeCode(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/forgot-password/change`, { username: forgotUsername, email: forgotEmail, newPassword });
      setFinalTimer(120);
    } catch (err) {
      setFinalError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setSendingChangeCode(false);
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    setFinalError('');
    setIsConfirming(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/forgot-password/confirm`, { username: forgotUsername, email: forgotEmail, code: finalCode });
      setShowFinalCodeModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setFinalError(err.response?.data?.message || 'Invalid confirmation code');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setForgotUsername('');
    setForgotEmail('');
    setVerifyCode('');
    setNewPassword('');
    setConfirmPassword('');
    setFinalCode('');
    setError('');
    navigate('/login');
  };

  const handleGuestContinue = (username) => {
    setGuestUsername(username);
    setShowGuestModal(false);
    setShowGuestInfoModal(true);
  };

  const handleGuestLogin = async () => {
    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/guest-login`, { username: guestUsername });
      localStorage.setItem('token', data.token);
      localStorage.setItem('rememberMe', 'true');
      setShowGuestInfoModal(false);
      window.location.href = '/';
    } catch (error) {
      setError(error.response?.data?.message || 'Guest login failed');
      setShowGuestInfoModal(false);
    }
  };

  return (
    <>
      {/* Flash Message */}
      {flashMessage && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn">
          {flashMessage}
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background-primary)' }}>
      <div className="p-8 rounded-2xl shadow-xl w-full max-w-md" style={{ background: 'var(--surface-card)' }}>
        <h2 className="text-3xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>{t('Welcome Back')}</h2>
        
        {error && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2" style={{ color: 'var(--text-secondary)' }}>{t('Username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'var(--background-secondary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              required
              minLength={3}
            />
          </div>
          
          <div>
            <label className="block mb-2" style={{ color: 'var(--text-secondary)' }}>{t('Password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                style={{ background: 'var(--background-secondary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                required
                minLength={6}
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {showPassword ? <VscEyeClosed size={20} /> : <VscEye size={20} />}
                </button>
              )}
            </div>
          </div>

          {/* Math CAPTCHA */}
          <div className="bg-blue-50 dark:bg-gray-700 border-2 border-blue-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm">{t("Verify you're human")}</label>
              <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                mathTimer <= 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>
                0:{mathTimer.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border-2 border-blue-300 dark:border-gray-600 font-mono text-base sm:text-lg font-bold text-gray-800 dark:text-white text-center">
                {mathQuestion.num1} {mathQuestion.operator} {mathQuestion.num2} = ?
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <input
                  type="number"
                  value={mathAnswer}
                  onChange={(e) => setMathAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isMathVerified && handleMathVerify()}
                  className="w-20 sm:flex-1 px-2 sm:px-3 py-2 border-2 border-blue-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="?"
                  disabled={isMathVerified}
                />
                {!isMathVerified ? (
                  <button
                    type="button"
                    onClick={handleMathVerify}
                    className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm whitespace-nowrap flex-shrink-0"
                  >
                    {t('Check')}
                  </button>
                ) : (
                  <FaCheckCircle className="text-green-500 flex-shrink-0" size={24} />
                )}
                <button
                  type="button"
                  onClick={generateMathQuestion}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1.5 sm:p-2 flex-shrink-0"
                  title="Refresh question"
                >
                  <FaRedo size={16} />
                </button>
              </div>
            </div>
            {isMathVerified && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold flex items-center gap-1"><FaCheckCircle className="text-green-500" /> <span>{t('Verified!')}</span></p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-gray-700 dark:text-gray-300 cursor-pointer">{t('Remember Me')}</label>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              {t('Forgot Password?')}
            </button>
          </div>
          
          {isLocked && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-center">
              <p className="font-semibold">{t('Account Locked')}</p>
              <p className="text-sm">{t('Please wait')} {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, '0')}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLocked || isLoggingIn}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <ScaleLoader color="#ffffff" height={20} />
                <span>{t('Logging in...')}</span>
              </>
            ) : isLocked ? (
              `${t('Locked')} (${Math.floor(lockoutTime / 60)}:${(lockoutTime % 60).toString().padStart(2, '0')})`
            ) : (
              t('Login')
            )}
          </button>
        </form>
        
        <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
          {t("Don't have an account?")} <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">{t('Sign Up')}</Link>
        </p>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 space-y-3">
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={handleGoogleLoginRedirect}
              className="p-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              title="Continue with Google"
            >
              <FaGoogle className="text-red-500" size={24} />
            </button>
            <button
              type="button"
              onClick={handleFacebookLoginRedirect}
              className="p-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              title="Continue with Facebook"
            >
              <FaFacebook className="text-blue-600" size={24} />
            </button>
            <button
              type="button"
              onClick={handleTwitterLoginRedirect}
              className="p-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              title="Continue with Twitter"
            >
              <FaTwitter className="text-blue-400" size={24} />
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('GitHub')}
              className="p-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              title="Continue with GitHub"
            >
              <FaGithub className="text-gray-800 dark:text-gray-200" size={24} />
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('LinkedIn')}
              className="p-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              title="Continue with LinkedIn"
            >
              <FaLinkedin className="text-blue-700" size={24} />
            </button>
          </div>
          <button
            onClick={() => setShowGuestModal(true)}
            className="w-full flex items-center justify-center gap-3 bg-purple-600 dark:bg-purple-500 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition font-semibold"
          >
            <TbBrandAmongUs size={20} />
            {t('Continue as Guest')}
          </button>
        </div>
      </div>

      {/* Forgot Password Modal - Step 1: Enter Username and Email */}
      {showForgotModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">{t('Forgot Password')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{t('Enter your account details to verify your identity')}</p>
            {forgotError && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">{forgotError}</div>}
            <form onSubmit={handleForgotPassword}>
              <input
                type="text"
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value)}
                placeholder={t('Username')}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                minLength={3}
              />
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder={t('Email Address')}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  disabled={sendingCode}
                >
                  {sendingCode ? <SyncLoader color="#fff" size={8} /> : t("Verify that It's you")}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setForgotUsername(''); setForgotEmail(''); setForgotError(''); }}
                  className="flex-1 theme-soft-button px-6 py-2 rounded-lg"
                >
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Code Modal - Step 2 */}
      {showVerifyModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{t('Enter Verification Code')}</h3>
              <span className={`text-sm font-mono font-bold px-3 py-1 rounded ${verifyTimer <= 30 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                {Math.floor(verifyTimer / 60)}:{(verifyTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{t('A 6-digit code has been sent to your email.')}</p>
            {verifyError && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">{verifyError}</div>}
            <form onSubmit={handleVerifyCode}>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-2xl tracking-widest bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                maxLength={6}
                required
              />
              <div className="flex gap-3">
                {verifyTimer > 0 ? (
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isVerifying ? <SyncLoader color="#fff" size={8} /> : t('Verify')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerifyCode}
                    disabled={sendingCode}
                    className="flex-1 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sendingCode ? <SyncLoader color="#fff" size={8} /> : t('Resend')}
                  </button>
                )}
                <button type="button" onClick={() => { setShowVerifyModal(false); setVerifyCode(''); setVerifyError(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Password Modal - Step 3 */}
      {showNewPasswordModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{t('Create New Password')}</h3>
              <span className={`text-sm font-mono font-bold px-3 py-1 rounded ${passwordTimer <= 30 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                {Math.floor(passwordTimer / 60)}:{(passwordTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>
            {passwordError && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">{passwordError}</div>}
            <form onSubmit={handleRequestPasswordChange}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('New Password')}</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    minLength={6}
                  />
                  {newPassword && (
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {showNewPassword ? <VscEyeClosed size={20} /> : <VscEye size={20} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('Confirm Password')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    minLength={6}
                  />
                  {confirmPassword && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {showConfirmPassword ? <VscEyeClosed size={20} /> : <VscEye size={20} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  disabled={sendingChangeCode}
                >
                  {sendingChangeCode ? <SyncLoader color="#fff" size={8} /> : t('Change Password')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewPasswordModal(false); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }}
                  className="flex-1 theme-soft-button px-6 py-2 rounded-lg"
                >
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Final Confirmation Code Modal - Step 4 */}
      {showFinalCodeModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{t('Enter Confirmation Code')}</h3>
              <span className={`text-sm font-mono font-bold px-3 py-1 rounded ${finalTimer <= 30 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                {Math.floor(finalTimer / 60)}:{(finalTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{t('A final confirmation code has been sent to your email.')}</p>
            {finalError && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">{finalError}</div>}
            <form onSubmit={handleConfirmPasswordChange}>
              <input
                type="text"
                value={finalCode}
                onChange={(e) => setFinalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-2xl tracking-widest bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                maxLength={6}
                required
              />
              <div className="flex gap-3">
                {finalTimer > 0 ? (
                  <button
                    type="submit"
                    disabled={isConfirming}
                    className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isConfirming ? <SyncLoader color="#fff" size={8} /> : t('Confirm')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendFinalCode}
                    disabled={sendingChangeCode}
                    className="flex-1 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sendingChangeCode ? <SyncLoader color="#fff" size={8} /> : t('Resend')}
                  </button>
                )}
                <button type="button" onClick={() => { setShowFinalCodeModal(false); setFinalCode(''); setFinalError(''); }} className="flex-1 theme-soft-button px-6 py-2 rounded-lg">{t('Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-lg p-6 max-w-md w-full text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">{t('Success!')}</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{t('Password changed successfully! Please login with your new password.')}</p>
            <button
              onClick={handleSuccessClose}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              {t('Go to Login')}
            </button>
          </div>
        </div>
      )}
      
      {/* Guest Username Modal */}
      {showGuestModal && (
        <GuestUsernameModal
          onClose={() => setShowGuestModal(false)}
          onContinue={handleGuestContinue}
        />
      )}
      
      {/* Guest Info Modal */}
      {showGuestInfoModal && (
        <GuestInfoModal
          onContinue={handleGuestLogin}
          onClose={() => setShowGuestInfoModal(false)}
        />
      )}
    </div>
    </>
  );
};

export default Login;

