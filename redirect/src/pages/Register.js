import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaCheckCircle, FaTimesCircle, FaRedo } from 'react-icons/fa';
import { FaGoogle, FaFacebook, FaTwitter, FaGithub, FaLinkedin } from 'react-icons/fa';
import { TbBrandAmongUs } from 'react-icons/tb';
import { ScaleLoader } from 'react-spinners';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';
import GuestUsernameModal from '../components/GuestUsernameModal';
import GuestInfoModal from '../components/GuestInfoModal';
import axios from 'axios';

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

const getFacebookRedirectUri = () => {
  const configured = String(process.env.REACT_APP_FACEBOOK_REDIRECT_URI || '').trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch (error) {
      console.warn('Invalid REACT_APP_FACEBOOK_REDIRECT_URI, falling back to current origin.');
    }
  }
  return `${window.location.origin}/auth/facebook/callback`;
};

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
  const [isRegistering, setIsRegistering] = useState(false);

  // Guest login states
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showGuestInfoModal, setShowGuestInfoModal] = useState(false);
  const [guestUsername, setGuestUsername] = useState('');

  // Flash message state
  const [flashMessage, setFlashMessage] = useState('');

  // Math CAPTCHA states
  const [mathQuestion, setMathQuestion] = useState({ num1: 0, num2: 0, operator: '+', answer: 0 });
  const [mathAnswer, setMathAnswer] = useState('');
  const [isMathVerified, setIsMathVerified] = useState(false);
  const [mathTimer, setMathTimer] = useState(60);

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

  useEffect(() => {
    generateMathQuestion();
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

  useEffect(() => {
    // Redirect if already logged in (not during registration)
    if (user) {
      const isInRegisterFlow = isRegistering || sessionStorage.getItem('registerInProgress');
      if (!isInRegisterFlow) {
        navigate('/');
      }
    }
  }, [user, isRegistering, navigate]);

  useEffect(() => {
    // Mark registration flow
    if (isRegistering) {
      sessionStorage.setItem('registerInProgress', 'true');
    } else {
      sessionStorage.removeItem('registerInProgress');
    }
  }, [isRegistering]);

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
    const redirectUri = getFacebookRedirectUri();
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

    setIsRegistering(true);
    try {
      await register(username, email, password, rememberMe, mathAnswer, mathQuestion);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
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

      <div className="min-h-screen theme-page-bg flex items-center justify-center px-4">
        <div className="theme-modal-card p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-3xl font-bold text-center mb-6 text-[var(--text-primary)]">{t('Create Account')}</h2>

          {error && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4">{error}</div>}
          {success && <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg mb-4">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('Username')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                minLength={3}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Minimum 3 characters')}</p>
            </div>

            {/* Math CAPTCHA */}
            <div className="bg-blue-50 dark:bg-gray-700 border-2 border-blue-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm">{t("Verify you're human")}</label>
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${mathTimer <= 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
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
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold flex items-center gap-1"><FaCheckCircle className="text-green-500" /> <span>{t('Verified!')} {t('You can now continue.')}</span></p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('Email Address')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsCodeSent(false);
                  setIsEmailVerified(false);
                }}
                className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                disabled={!isMathVerified || isEmailVerified}
              />
              {email && emailValidationMsg && (
                <div className="mt-1">
                  {emailValidationMsg === 'valid' && !isEmailVerified ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <FaCheckCircle className="text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">Valid email</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={isSendingCode}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSendingCode ? (
                          <>
                            <span className="flex gap-1">
                              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
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
                      <span className="text-sm text-red-600 dark:text-red-400">{emailValidationMsg}</span>
                    </div>
                  ) : null}
                  {isEmailVerified && (
                    <div className="flex items-center gap-1">
                      <FaCheckCircle className="text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400 font-semibold flex items-center gap-1"><FaCheckCircle className="text-green-500" /> Verified</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isCodeSent && !isEmailVerified && (
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Verification Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                        </span>
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the 6-digit code sent to your email</p>
              </div>
            )}

            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2">{t('Password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  minLength={6}
                  disabled={!isMathVerified || !isEmailVerified}
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
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Password Strength:</span>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use uppercase, lowercase, numbers & symbols for a strong password</p>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMeRegister"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2 cursor-pointer"
              />
              <label htmlFor="rememberMeRegister" className="text-gray-700 dark:text-gray-300 cursor-pointer">{t('Remember Me')}</label>
            </div>

            <button
              type="submit"
              disabled={!isMathVerified || !isEmailVerified || isRegistering}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRegistering ? (
                <>
                  <ScaleLoader color="#ffffff" height={20} />
                  <span>{t('Creating account...')}</span>
                </>
              ) : (
                t('Sign Up')
              )}
            </button>
          </form>

          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
            {t('Already have an account?')} <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">{t('Login')}</Link>
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

export default Register;

