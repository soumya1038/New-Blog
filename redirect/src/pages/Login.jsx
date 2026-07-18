import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TbBrandAmongUs } from 'react-icons/tb';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiBaseUrl';
import GuestUsernameModal from '../components/GuestUsernameModal';
import GuestInfoModal from '../components/GuestInfoModal';
import { requestSocialAuthUrl } from '../utils/socialAuth';
import TwoFactorVerificationModal from '../components/TwoFactorVerificationModal';
import TelegramLoginButton from '../components/TelegramLoginButton';
import { consumeRedirectAfterLogin } from '../utils/authRedirects';

const API = API_BASE_URL;

// ── Brand tokens ──────────────────────────────────────────────────────────────
const LIGHT = {
  bg:'#F6F0E4', card:'#FEFCF4', cardBorder:'#D8CC98',
  brand:'#C9A227', brandHover:'#B8931F',
  brandGlow:'rgba(201,162,39,0.22)', brandDim:'#E8D8B0', brandDimBg:'#F4EDD0',
  text:'#1C1A0C', muted:'#6A5C38', dim:'#9A8A60',
  inputBg:'#EDE7D0', inputBorder:'#CEC090',
  success:'#4A8C5C', error:'#C04040', divider:'#DDD0A0',
};
const DARK = {
  bg:'#111408', card:'#1C2010', cardBorder:'#3A4424',
  brand:'#6B7A3A', brandHover:'#7F8F46',
  brandGlow:'rgba(107,122,58,0.28)', brandDim:'#4E5A2A', brandDimBg:'#2A3014',
  text:'#E8E4CC', muted:'#8A9060', dim:'#5A6038',
  inputBg:'#181C0A', inputBorder:'#3A4224',
  success:'#52B47A', error:'#D95050', divider:'#252C12',
};

const STR_COLORS = ['', '#C04040', '#C9A227', '#4A8C5C'];
const STR_LABELS = ['', 'Weak', 'Medium', 'Strong'];
function getPasswordStrength(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 6) s++;
  if (pwd.length >= 10) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  if (s <= 2) return 1;
  if (s <= 3) return 2;
  return 3;
}

// ── TimerBadge ────────────────────────────────────────────────────────────────
function TimerBadge({ seconds, C }) {
  const low = seconds <= 30;
  const m = Math.floor(seconds/60), s = (seconds%60).toString().padStart(2,'0');
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,
      background:low?`${C.error}15`:C.inputBg,border:`1px solid ${low?C.error:C.inputBorder}`,transition:'all 0.3s'}}>
      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke={low?C.error:C.muted} strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
      </svg>
      <span style={{fontSize:12,fontWeight:700,fontFamily:'monospace',color:low?C.error:C.muted}}>{m}:{s}</span>
    </div>
  );
}

// ── StepIcon ──────────────────────────────────────────────────────────────────
function StepIcon({ name, brand, size=36 }) {
  const s = size;
  const icons = {
    wave:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <path d="M12 22 Q10 16 13 13 Q14 11 16 12 L17 10 Q18 8 20 9 L20 11 Q21 9 23 10 L23 13 Q24 11 26 12 Q28 14 26 17 L25 22 Q24 26 20 27 L16 27 Q12 26 12 22Z"
          fill={brand} opacity="0.8" style={{transformOrigin:'18px 18px',animation:'waveHand 1.8s ease-in-out infinite'}}/>
      </svg>
    ),
    check:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <circle cx="18" cy="18" r="11" stroke={brand} strokeWidth="1.5" opacity="0.4"/>
        <path d="M11 18 L16 23 L25 13" stroke={brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
          style={{strokeDasharray:24,strokeDashoffset:24,animation:'drawCheck 0.7s ease 0.15s forwards'}}/>
      </svg>
    ),
    shield:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <path d="M18 7 L28 11 L28 19 Q28 26 18 30 Q8 26 8 19 L8 11 Z"
          fill={brand} opacity="0.2" stroke={brand} strokeWidth="1.4" strokeLinejoin="round"/>
        <circle cx="18" cy="18" r="4" fill={brand} opacity="0.7" style={{animation:'shieldGlow 1.8s ease-in-out infinite'}}/>
        <path d="M15 18 L17 20 L21 15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none"
          style={{strokeDasharray:12,strokeDashoffset:12,animation:'drawCheck 0.5s ease 0.3s forwards'}}/>
      </svg>
    ),
    key:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <g style={{transformOrigin:'18px 18px',animation:'keyRotate 2.5s ease-in-out infinite'}}>
          <circle cx="14" cy="16" r="5.5" stroke={brand} strokeWidth="2" fill="none"/>
          <line x1="18" y1="17" x2="26" y2="17" stroke={brand} strokeWidth="2" strokeLinecap="round"/>
          <line x1="22" y1="17" x2="22" y2="20" stroke={brand} strokeWidth="2" strokeLinecap="round"/>
          <line x1="25" y1="17" x2="25" y2="19" stroke={brand} strokeWidth="2" strokeLinecap="round"/>
        </g>
      </svg>
    ),
    inbox:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <rect x="7" y="20" width="22" height="9" rx="2" fill={brand} opacity="0.2" stroke={brand} strokeWidth="1.4"/>
        <rect x="12" y="10" width="12" height="14" rx="1.5" fill={brand} opacity="0.7"
          style={{animation:'letterSlide 1.4s ease-in-out infinite'}}/>
        <line x1="14.5" y1="14" x2="21.5" y2="14" stroke="#fff" strokeWidth="1" strokeLinecap="round"/>
        <line x1="14.5" y1="17" x2="21.5" y2="17" stroke="#fff" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
    lock:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <rect x="10" y="18" width="16" height="11" rx="2.5" fill={brand} opacity="0.75"/>
        <circle cx="18" cy="22.5" r="2" fill="#fff" opacity="0.85"/>
        <rect x="17" y="23.5" width="2" height="3" rx="1" fill="#fff" opacity="0.85"/>
        <path d="M13 18 L13 13 Q13 8 18 8 Q23 8 23 13 L23 18"
          stroke={brand} strokeWidth="2" strokeLinecap="round" fill="none"
          style={{animation:'shackleClose 1.6s ease-in-out infinite'}}/>
      </svg>
    ),
  };
  return icons[name] || icons.shield;
}

// ── AnimatedBg ────────────────────────────────────────────────────────────────
function AnimatedBg({ C }) {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0}}>
      <div style={{position:'absolute',width:420,height:420,borderRadius:'50%',
        background:`radial-gradient(circle,${C.brandGlow} 0%,transparent 70%)`,
        top:'-100px',right:'-100px',animation:'orbFloat 8s ease-in-out infinite'}}/>
      <div style={{position:'absolute',width:320,height:320,borderRadius:'50%',
        background:`radial-gradient(circle,${C.brandGlow} 0%,transparent 70%)`,
        bottom:'-70px',left:'-70px',animation:'orbFloat 10s ease-in-out infinite reverse'}}/>
      <svg width="100%" height="100%" viewBox="0 0 900 700" preserveAspectRatio="xMidYMid slice"
        style={{position:'absolute',inset:0,opacity:0.055}}>
        <path d="M0 120 Q180 55 360 140 T720 95 T900 125" stroke={C.brand} strokeWidth="1.8" fill="none"
          style={{strokeDasharray:1300,strokeDashoffset:1300,animation:'drawLine 4.5s ease forwards 0.4s'}}/>
        <path d="M0 280 Q200 205 400 288 T800 244 T900 265" stroke={C.brand} strokeWidth="1.2" fill="none"
          style={{strokeDasharray:1300,strokeDashoffset:1300,animation:'drawLine 4.5s ease forwards 0.9s'}}/>
        <path d="M0 440 Q160 365 340 448 T700 405 T900 425" stroke={C.brand} strokeWidth="1" fill="none"
          style={{strokeDasharray:1300,strokeDashoffset:1300,animation:'drawLine 4.5s ease forwards 1.4s'}}/>
        <circle cx="825" cy="78" r="62" stroke={C.brand} strokeWidth="0.9" fill="none" opacity="0.6"/>
        <text x="16" y="430" fontFamily="Georgia,serif" fontSize="270" fill={C.brand}
          style={{animation:'glyphPulse 7s ease-in-out infinite'}}>✍</text>
        {[[115,75],[345,195],[595,345],[195,495],[745,440],[495,115]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="3" fill={C.brand} opacity="0.35"
            style={{animation:`dotPulse 3.5s ease-in-out infinite ${i*0.45}s`}}/>
        ))}
      </svg>
      {[...Array(7)].map((_,i)=>(
        <div key={i} style={{position:'absolute',width:3+(i%4)*2.5,height:3+(i%4)*2.5,
          borderRadius:'50%',background:C.brand,opacity:0.10+(i%4)*0.04,
          left:`${8+i*12}%`,top:`${12+(i*19)%72}%`,
          animation:`particleFloat ${5.5+i*1.1}s ease-in-out infinite ${i*0.7}s`}}/>
      ))}
    </div>
  );
}

// ── OTPInput ──────────────────────────────────────────────────────────────────
function OTPInput({ value, onChange, C, hasError }) {
  const refs = Array.from({length:6},()=>useRef(null));
  const digits = (value+'      ').slice(0,6).split('');
  const handleKey = (i,e) => {
    if(e.key==='Backspace'){onChange(value.slice(0,-1));if(i>0)refs[i-1].current?.focus();}
    else if(/^\d$/.test(e.key)){const n=(value+e.key).slice(0,6);onChange(n);if(i<5)refs[i+1].current?.focus();}
  };
  return (
    <div style={{display:'flex',gap:9,justifyContent:'center',marginBottom:6,
      animation:hasError?'shake 0.45s cubic-bezier(.36,.07,.19,.97)':'none'}}>
      {digits.map((d,i)=>(
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={d.trim()} onKeyDown={e=>handleKey(i,e)} onChange={()=>{}}
          onClick={()=>refs[i].current?.focus()}
          style={{width:44,height:54,textAlign:'center',fontSize:22,fontWeight:700,fontFamily:'monospace',
            background:C.inputBg,color:C.text,
            border:`1.5px solid ${hasError?C.error:d.trim()?C.brand:C.inputBorder}`,
            borderRadius:10,outline:'none',transition:'border-color 0.25s,box-shadow 0.2s',
            boxShadow:hasError?`0 0 0 3px ${C.error}22`:d.trim()?`0 0 0 3px ${C.brandGlow}`:'none'}}/>
      ))}
    </div>
  );
}

// ── Checkbox "I'm not a robot" CAPTCHA ───────────────────────────────────────
function CheckboxCaptcha({ verified, onVerify, checking, error, C, t }) {
  return (
    <div style={{marginBottom:4}}>
      <div onClick={!verified&&!checking?onVerify:undefined}
        style={{display:'flex',alignItems:'center',gap:14,padding:'15px 18px',
          background:C.inputBg,borderRadius:13,
          border:`1.5px solid ${verified?C.success:error?C.error:C.inputBorder}`,
          cursor:verified||checking?'default':'pointer',
          transition:'border-color 0.3s,background 0.35s',userSelect:'none'}}>
        {/* Checkbox */}
        <div style={{width:24,height:24,borderRadius:7,flexShrink:0,
          border:`2px solid ${verified?C.success:checking?C.brand:C.inputBorder}`,
          background:verified?C.success:'transparent',
          display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.3s'}}>
          {checking&&(
            <div style={{width:13,height:13,border:`2px solid ${C.brand}`,borderTopColor:'transparent',
              borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
          )}
          {verified&&(
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
              <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
            </svg>
          )}
        </div>
        {/* Label */}
        <span style={{color:verified?C.success:C.text,fontSize:15,fontWeight:verified?600:400,
          transition:'color 0.3s',flex:1}}>
          {verified?t("Verified — you're human!"):checking?t('Verifying…'):t("I'm not a robot")}
        </span>
        {/* reCAPTCHA badge */}
        <div style={{textAlign:'center',flexShrink:0}}>
          <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" fill={C.brand} opacity="0.1" stroke={C.brand} strokeWidth="1"/>
            <path d="M20 44 C20 44 22 24 32 20 C42 16 46 32 44 44"
              stroke={C.brand} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <circle cx="32" cy="30" r="5" fill={C.brand} opacity="0.2"/>
          </svg>
          <div style={{fontSize:9,color:C.dim,letterSpacing:0.2}}>reCAPTCHA</div>
        </div>
      </div>
    </div>
  );
}

// ── SocialBtn (monochrome) ────────────────────────────────────────────────────
function SocialBtn({ label, icon, C, onClick, disabled = false, loading = false }) {
  const [hov,setHov] = useState(false);
  const active = hov && !disabled && !loading;
  return (
    <button type="button" aria-label={label} aria-busy={loading || undefined} title={label} onClick={onClick} disabled={disabled || loading}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:46,height:46,borderRadius:11,
        border:`1px solid ${active?C.brand:C.inputBorder}`,
        background:active?C.brandDimBg:C.inputBg,
        cursor:disabled||loading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',
        opacity:disabled&&!loading?0.58:1,
        transition:'all 0.22s',transform:active?'translateY(-2px)':'none',
        boxShadow:active?`0 4px 12px ${C.brandGlow}`:'none'}}>
      {loading ? (
        <div style={{width:18,height:18,border:`2px solid ${C.inputBorder}`,borderTopColor:C.brand,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      ) : (
        <svg width="19" height="19" viewBox={icon.vb} fill="none">
          {icon.paths.map((p,i)=>(
            <path key={i} d={p} fill={active?C.brand:C.muted} style={{transition:'fill 0.22s'}}/>
          ))}
        </svg>
      )}
    </button>
  );
}

// ── Social icons data ─────────────────────────────────────────────────────────
const SOCIAL_ICONS = [
  {label:'Google',icon:{vb:'0 0 24 24',paths:['M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z','M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z','M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z','M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z']}},
  {label:'Facebook',icon:{vb:'0 0 24 24',paths:['M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z']}},
  {label:'Twitter / X',icon:{vb:'0 0 24 24',paths:['M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z']}},
  {label:'LinkedIn',icon:{vb:'0 0 24 24',paths:['M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z']}},
];

// ════════════════════════════════════════════════════════════════════════════
// LOGIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const Login = () => {
  const { t } = useTranslation();
  const { login, user, completeLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  // Use the shared theme state so auth pages always match the navbar.
  const { isDark } = useTheme();
  const dark = isDark;
  const C = dark ? DARK : LIGHT;

  // Progressive step: 0=username, 1=password, 2=captcha
  const [loginStep, setLoginStep] = useState(0);
  const [animKey, setAnimKey]     = useState(0);

  // Login fields
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError]           = useState('');
  const [focused, setFocused]       = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [socialAuthLoading, setSocialAuthLoading] = useState('');

  // Checkbox CAPTCHA state (replaces math CAPTCHA for login)
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaChecking, setCaptchaChecking] = useState(false);

  // Failed attempts / lockout
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked]             = useState(false);
  const [lockoutTime, setLockoutTime]       = useState(0);

  // Flash message (social login)
  const flashMsg = '';

  // Guest modals
  const [showGuestModal, setShowGuestModal]         = useState(false);
  const [showGuestInfoModal, setShowGuestInfoModal] = useState(false);
  const [guestUsername, setGuestUsername]           = useState('');

  // Forgot password — uses modals exactly as in original Login.js
  const [showForgotModal, setShowForgotModal]         = useState(false);
  const [forgotUsername, setForgotUsername]           = useState('');
  const [forgotEmail, setForgotEmail]                 = useState('');
  const [forgotError, setForgotError]                 = useState('');
  const [sendingCode, setSendingCode]                 = useState(false);
  const [showVerifyModal, setShowVerifyModal]         = useState(false);
  const [verifyCode, setVerifyCode]                   = useState('');
  const [verifyError, setVerifyError]                 = useState('');
  const [verifyTimer, setVerifyTimer]                 = useState(120);
  const [isVerifying, setIsVerifying]                 = useState(false);
  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
  const [newPassword, setNewPassword]                 = useState('');
  const [confirmPassword, setConfirmPassword]         = useState('');
  const [showNewPassword, setShowNewPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError]             = useState('');
  const [sendingChangeCode, setSendingChangeCode]     = useState(false);
  const [passwordTimer, setPasswordTimer]             = useState(120);
  const [showFinalCodeModal, setShowFinalCodeModal]   = useState(false);
  const [finalCode, setFinalCode]                     = useState('');
  const [finalError, setFinalError]                   = useState('');
  const [finalTimer, setFinalTimer]                   = useState(120);
  const [isConfirming, setIsConfirming]               = useState(false);
  const [showSuccessModal, setShowSuccessModal]       = useState(false);
  const [forgotTwoFactorPrompt, setForgotTwoFactorPrompt] = useState(null);

  const inputRef = useRef(null);
  const fmtTime  = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  // ── Lockout check on mount + purge legacy saved credentials ───────────────
  useEffect(() => {
    const lockoutEnd = localStorage.getItem('loginLockoutEnd');
    if (lockoutEnd) {
      const remaining = parseInt(lockoutEnd) - Date.now();
      if (remaining > 0) { setIsLocked(true); setLockoutTime(Math.ceil(remaining/1000)); }
      else localStorage.removeItem('loginLockoutEnd');
    }
    localStorage.removeItem('credentials');
  }, []);

  // ── Lockout countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLocked || lockoutTime <= 0) return;
    const timer = setInterval(() => {
      setLockoutTime(prev => {
        if (prev <= 1) {
          setIsLocked(false); setFailedAttempts(0);
          localStorage.removeItem('loginLockoutEnd'); return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked, lockoutTime]);

  // ── Redirect if already logged in ─────────────────────────────────────────
  useEffect(() => {
    if (user) {
      const inFlow = isLoggingIn || sessionStorage.getItem('loginInProgress');
      if (!inFlow) navigate('/home');
    }
  }, [user, isLoggingIn, navigate]);

  useEffect(() => {
    if (isLoggingIn) sessionStorage.setItem('loginInProgress','true');
  }, [isLoggingIn]);

  // ── Auto-focus on step change ─────────────────────────────────────────────
  useEffect(() => {
    if (loginStep < 2) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [loginStep]);

  // ── Forgot password timers ────────────────────────────────────────────────
  useEffect(() => {
    if (showVerifyModal && verifyTimer > 0) {
      const t = setInterval(() => setVerifyTimer(p => p-1), 1000);
      return () => clearInterval(t);
    }
  }, [showVerifyModal, verifyTimer]);

  useEffect(() => {
    if (showNewPasswordModal && passwordTimer > 0) {
      const t = setInterval(() => setPasswordTimer(p => p-1), 1000);
      return () => clearInterval(t);
    }
  }, [showNewPasswordModal, passwordTimer]);

  useEffect(() => {
    if (showFinalCodeModal && finalTimer > 0) {
      const t = setInterval(() => setFinalTimer(p => p-1), 1000);
      return () => clearInterval(t);
    }
  }, [showFinalCodeModal, finalTimer]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCaptchaClick = () => {
    if (captchaVerified || captchaChecking) return;
    setCaptchaChecking(true);
    setTimeout(() => { setCaptchaChecking(false); setCaptchaVerified(true); setError(''); }, 1300);
  };

  const handleSubmit = async () => {
    if (isLocked) { setError(t(`Too many failed attempts. Please wait ${fmtTime(lockoutTime)}`)); return; }
    if (!captchaVerified) { setError(t('Please verify you are human first')); return; }
    setIsLoggingIn(true);
    try {
      await login(username, password, rememberMe);
      setFailedAttempts(0); localStorage.removeItem('loginLockoutEnd');
      setIsLoggingIn(false);
      sessionStorage.setItem('showLoginIntro','true');
      const redirect = consumeRedirectAfterLogin();
      if (redirect) { navigate(redirect); }
      else navigate('/home');
    } catch (err) {
      const na = failedAttempts + 1;
      setFailedAttempts(na);
      // Reset captcha on failure so user must re-verify
      setCaptchaVerified(false); setCaptchaChecking(false);
      if (na >= 5) {
        setIsLocked(true); setLockoutTime(120);
        localStorage.setItem('loginLockoutEnd', (Date.now()+120000).toString());
        setError(t('Too many failed attempts. Account locked for 2 minutes.'));
      } else {
        // Show server message or clear "Invalid username or password"
        const msg = err.response?.data?.message || t('Invalid username or password');
        setError(`${msg}. ${t('Attempt')} ${na}/5`);
      }
      setIsLoggingIn(false);
    }
  };

  // Social OAuth handlers
  const handleSocialLoginRedirect = async (provider) => {
    if (socialAuthLoading) return;
    setError('');
    setSocialAuthLoading(provider);
    sessionStorage.removeItem('socialConnectIntent');
    try {
      const authUrl = await requestSocialAuthUrl(provider, { rememberMe });
      window.location.assign(authUrl);
    } catch (err) {
      setSocialAuthLoading('');
      setError(t(err?.message || 'Social sign-in is temporarily unavailable. Please try again.'));
    }
  };

  const handleGoogleLoginRedirect = () => {
    handleSocialLoginRedirect('google');
  };

  const handleFacebookLoginRedirect = () => {
    handleSocialLoginRedirect('facebook');
  };

  const handleTwitterLoginRedirect = () => {
    handleSocialLoginRedirect('twitter');
  };

  const handleLinkedInLoginRedirect = () => {
    handleSocialLoginRedirect('linkedin');
  };

  useEffect(() => {
    if (!socialAuthLoading) return undefined;

    let resetTimer;
    const resetOnReturn = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        setSocialAuthLoading('');
      }, 300);
    };

    window.addEventListener('focus', resetOnReturn);
    window.addEventListener('pageshow', resetOnReturn);
    document.addEventListener('visibilitychange', resetOnReturn);

    return () => {
      window.clearTimeout(resetTimer);
      window.removeEventListener('focus', resetOnReturn);
      window.removeEventListener('pageshow', resetOnReturn);
      document.removeEventListener('visibilitychange', resetOnReturn);
    };
  }, [socialAuthLoading]);

  // Forgot password handlers (identical to Login.js)
  const handleForgotPassword = async (e) => {
    e.preventDefault(); setForgotError(''); setSendingCode(true);
    try {
      await axios.post(`${API}/api/auth/forgot-password/request`, { username:forgotUsername, email:forgotEmail });
      setShowForgotModal(false); setShowVerifyModal(true); setVerifyTimer(120);
    } catch(err){ setForgotError(err.response?.data?.message || t('Failed to send verification code')); }
    finally{ setSendingCode(false); }
  };

  const handleResendVerifyCode = async () => {
    setVerifyError(''); setSendingCode(true);
    try {
      await axios.post(`${API}/api/auth/forgot-password/request`, { username:forgotUsername, email:forgotEmail });
      setVerifyTimer(120);
    } catch(err){ setVerifyError(err.response?.data?.message || t('Failed to resend code')); }
    finally{ setSendingCode(false); }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault(); setVerifyError(''); setIsVerifying(true);
    try {
      await axios.post(`${API}/api/auth/forgot-password/verify`, { username:forgotUsername, email:forgotEmail, code:verifyCode });
      setShowVerifyModal(false); setShowNewPasswordModal(true); setPasswordTimer(120);
    } catch(err){ setVerifyError(err.response?.data?.message || t('Invalid verification code')); }
    finally{ setIsVerifying(false); }
  };

  const handleRequestPasswordChange = async (e) => {
    e.preventDefault(); setPasswordError('');
    if (newPassword !== confirmPassword) { setPasswordError(t('Passwords do not match')); return; }
    if (newPassword.length < 6) { setPasswordError(t('Password must be at least 6 characters')); return; }
    setSendingChangeCode(true);
    try {
      await axios.post(`${API}/api/auth/forgot-password/change`, { username:forgotUsername, email:forgotEmail, newPassword });
      setShowNewPasswordModal(false); setShowFinalCodeModal(true); setFinalTimer(120);
    } catch(err){ setPasswordError(err.response?.data?.message || t('Failed to send confirmation code')); }
    finally{ setSendingChangeCode(false); }
  };

  const handleResendFinalCode = async () => {
    setFinalError(''); setSendingChangeCode(true);
    try {
      await axios.post(`${API}/api/auth/forgot-password/change`, { username:forgotUsername, email:forgotEmail, newPassword });
      setFinalTimer(120);
    } catch(err){ setFinalError(err.response?.data?.message || t('Failed to resend code')); }
    finally{ setSendingChangeCode(false); }
  };

  const requestForgotTwoFactorChallenge = useCallback(async ({ method }) => {
    const { data } = await axios.post(`${API}/api/auth/forgot-password/2fa/challenge`, {
      username: forgotUsername,
      email: forgotEmail,
      method,
    });
    return data;
  }, [forgotEmail, forgotUsername]);

  const verifyForgotTwoFactorChallenge = useCallback(async ({ challengeId, code }) => {
    const { data } = await axios.post(`${API}/api/auth/forgot-password/2fa/verify`, {
      username: forgotUsername,
      email: forgotEmail,
      challengeId,
      code,
    });
    return data;
  }, [forgotEmail, forgotUsername]);

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault(); setFinalError(''); setIsConfirming(true);
    try {
      await axios.post(`${API}/api/auth/forgot-password/confirm`, { username:forgotUsername, email:forgotEmail, code:finalCode });
      setShowFinalCodeModal(false); setShowSuccessModal(true);
    } catch(err){
      if (err.response?.data?.requiresTwoFactor) {
        setForgotTwoFactorPrompt({
          action: err.response.data.action,
          actionLabel: err.response.data.actionLabel,
          twoFactor: err.response.data.twoFactor,
        });
      } else {
        setFinalError(err.response?.data?.message || t('Invalid confirmation code'));
      }
    }
    finally{ setIsConfirming(false); }
  };

  const handleForgotTwoFactorVerified = async (token) => {
    setForgotTwoFactorPrompt(null);
    setIsConfirming(true);
    setFinalError('');
    try {
      await axios.post(`${API}/api/auth/forgot-password/confirm`, {
        username: forgotUsername,
        email: forgotEmail,
        code: finalCode,
        twoFactorToken: token,
      });
      setShowFinalCodeModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setFinalError(err.response?.data?.message || t('Invalid confirmation code'));
      setShowFinalCodeModal(true);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setForgotUsername(''); setForgotEmail(''); setVerifyCode('');
    setNewPassword(''); setConfirmPassword(''); setFinalCode('');
    setError(''); navigate('/login');
  };

  const handleGuestEntryClick = () => {
    setError('');
    setShowGuestModal(true);
  };

  const handleGuestContinue = (u) => { setGuestUsername(u); setShowGuestModal(false); setShowGuestInfoModal(true); };
  const handleGuestLogin = async () => {
    try {
      const { data } = await axios.post(`${API}/api/auth/guest-login`, { username:guestUsername });
      completeLogin(data, false);
      sessionStorage.setItem('showLoginIntro','true');
      setShowGuestInfoModal(false); navigate('/home', { replace: true });
    } catch(err){
      setError(err.response?.data?.message || t('Guest login failed'));
      setShowGuestInfoModal(false);
    }
  };

  const advanceStep = () => { setAnimKey(k=>k+1); setLoginStep(s=>s+1); setError(''); };
  const handleBack  = () => {
    if (loginStep === 0) return;
    setAnimKey(k=>k+1); setLoginStep(s=>s-1); setError('');
    if (loginStep === 2) { setCaptchaVerified(false); setCaptchaChecking(false); }
  };

  const handleNext = () => {
    setError('');
    if (loginStep === 0) {
      if (!username.trim() || username.trim().length < 3) { setError(t('Username must be at least 3 characters')); return; }
      advanceStep();
    } else if (loginStep === 1) {
      if (!password || password.length < 6) { setError(t('Password must be at least 6 characters')); return; }
      advanceStep();
    } else {
      handleSubmit();
    }
  };

  // Step config
  const stepsConfig = [
    {icon:'wave',  title:t('Welcome back!'),   sub:t("What's your username?")},
    {icon:'check', title:t('Looking good!'),    sub:t('Now enter your password')},
    {icon:'shield',title:t('One last thing'),   sub:t("Quick check — then you're in!")},
  ];
  const cur        = stepsConfig[loginStep];
  const pct        = loginStep / (stepsConfig.length - 1);
  const ctaLoading = isLoggingIn;
  const ctaDisabled = ctaLoading || isLocked || (loginStep===2 && !captchaVerified);
  const newPasswordStrength = getPasswordStrength(newPassword);

  const inputStyle = (field) => ({
    width:'100%', padding:'14px 18px',
    background:C.inputBg,
    border:`1.5px solid ${focused===field?C.brand:C.inputBorder}`,
    borderRadius:13, color:C.text, fontSize:16,
    fontFamily:"Georgia,'Times New Roman',serif",
    outline:'none', boxSizing:'border-box',
    boxShadow:focused===field?`0 0 0 3px ${C.brandGlow}`:'none',
    transition:'border-color 0.2s,box-shadow 0.2s',
  });

  // ── Modal shared styles ───────────────────────────────────────────────────
  const modalOverlay = {
    position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16,
  };
  const modalCard = {
    background:C.card,borderRadius:18,padding:'28px 32px',maxWidth:420,width:'100%',
    border:`1px solid ${C.cardBorder}`,
    boxShadow:`0 24px 60px rgba(0,0,0,0.35)`,animation:'stepIn 0.3s ease',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Flash message */}
      {flashMsg&&(
        <div style={{position:'fixed',top:16,right:16,zIndex:300,padding:'12px 20px',
          borderRadius:10,background:C.brand,color:'#fff',fontSize:14,fontWeight:600,
          boxShadow:`0 4px 16px ${C.brandGlow}`,animation:'stepIn 0.3s ease'}}>
          {flashMsg}
        </div>
      )}

      {/* Page — no custom header; Navbar renders via App.js */}
      <div className="auth-flow-page" style={{minHeight:'100dvh',background:C.bg,display:'flex',flexDirection:'column',
        paddingTop:0,transition:'background 0.35s'}}>
        <AnimatedBg C={C}/>

        <main style={{flex:1,position:'relative',zIndex:1,display:'flex',alignItems:'center',
          justifyContent:'center',padding:'20px 16px'}}>
          <div style={{width:'100%',maxWidth:460,background:C.card,borderRadius:22,
            border:`1px solid ${C.cardBorder}`,
            boxShadow:dark?`0 32px 80px rgba(0,0,0,0.65),0 0 0 1px ${C.cardBorder}`:`0 20px 60px rgba(140,110,40,0.15),0 0 0 1px ${C.cardBorder}`,
            overflow:'hidden',transition:'background 0.35s,box-shadow 0.35s'}}>

            {/* Progress bar */}
            <div style={{height:3,background:C.inputBg}}>
              <div style={{height:'100%',width:`${pct*100}%`,
                background:`linear-gradient(90deg,${C.brandHover},${C.brand})`,
                transition:'width 0.6s cubic-bezier(.4,0,.2,1)'}}/>
            </div>

            {/* Card body */}
            <div key={animKey} style={{padding:'30px 36px 26px',animation:'stepIn 0.38s cubic-bezier(.4,0,.2,1)'}}>

              {/* Back + dots */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
                <button onClick={handleBack} disabled={loginStep===0}
                  style={{background:'none',border:'none',cursor:loginStep===0?'default':'pointer',
                    color:loginStep===0?'transparent':C.muted,
                    fontSize:13,display:'flex',alignItems:'center',gap:5,padding:0,transition:'color 0.2s'}}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M19 12H5M12 5l-7 7 7 7"/>
                  </svg>
                  {t('Back')}
                </button>
                <div style={{display:'flex',gap:5,alignItems:'center'}}>
                  {stepsConfig.map((_,i)=>(
                    <div key={i} style={{height:6,borderRadius:3,
                      background:i<=loginStep?C.brand:C.inputBorder,
                      width:i===loginStep?22:8,opacity:i<loginStep?0.45:1,
                      transition:'all 0.35s cubic-bezier(.4,0,.2,1)'}}/>
                  ))}
                </div>
                <div style={{minWidth:44}}/>
              </div>

              {/* Animated icon + title */}
              <div style={{marginBottom:22}}>
                <div style={{marginBottom:12}}>
                  <StepIcon name={cur.icon} brand={C.brand} size={36}/>
                </div>
                <h1 style={{margin:'0 0 6px',fontSize:26,fontWeight:700,color:C.text,
                  fontFamily:"'Palatino Linotype',Palatino,serif",lineHeight:1.25}}>
                  {cur.title}
                </h1>
                <p style={{margin:0,color:C.muted,fontSize:14,lineHeight:1.6}}>{cur.sub}</p>
              </div>

              {/* ── Step 0: Username ── */}
              {loginStep===0&&(
                <div style={{marginBottom:4}}>
                  <input ref={inputRef} type="text" placeholder={t('Enter your username')}
                    value={username} onChange={e=>{setUsername(e.target.value);setError('');}}
                    onKeyDown={e=>e.key==='Enter'&&handleNext()}
                    onFocus={()=>setFocused('username')} onBlur={()=>setFocused(null)}
                    minLength={3} style={inputStyle('username')}/>
                  <p style={{fontSize:12,color:C.dim,margin:'6px 0 0'}}>{t('Minimum 3 characters')}</p>
                </div>
              )}

              {/* ── Step 1: Password (no strength meter — login) ── */}
              {loginStep===1&&(
                <div style={{marginBottom:4}}>
                  <div style={{position:'relative'}}>
                    <input ref={inputRef} type={showPassword?'text':'password'}
                      placeholder={t('Your secret password')} value={password}
                      onChange={e=>{setPassword(e.target.value);setError('');}}
                      onKeyDown={e=>e.key==='Enter'&&handleNext()}
                      onFocus={()=>setFocused('password')} onBlur={()=>setFocused(null)}
                      style={{...inputStyle('password'),paddingRight:50}}/>
                    {password&&(
                      <button onClick={()=>setShowPassword(s=>!s)}
                        style={{position:'absolute',right:15,top:'50%',transform:'translateY(-50%)',
                          background:'none',border:'none',cursor:'pointer',color:C.muted,
                          padding:0,display:'flex',alignItems:'center'}}>
                        {showPassword
                          ?<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M1.5 12S5.25 4.5 12 4.5 22.5 12 22.5 12 18.75 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
                          :<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M3 3l18 18M10.477 10.485A3 3 0 0013.5 13.5M6.356 6.356C4.26 7.86 2.5 10 2.5 12c0 0 3.5 7.5 9.5 7.5a9.15 9.15 0 004.642-1.26M9.9 4.72A9.14 9.14 0 0112 4.5c6 0 9.5 7.5 9.5 7.5a14.2 14.2 0 01-2.358 3.14"/></svg>
                        }
                      </button>
                    )}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',gap:12,marginTop:8,flexWrap:'wrap'}}>
                    <Link
                      to="/help/article/secure-a-compromised-account"
                      style={{fontSize:12,color:C.muted,fontWeight:600,textDecoration:'none'}}
                    >
                      {t('Account security help')}
                    </Link>
                    <button
                      type="button"
                      onClick={()=>setShowForgotModal(true)}
                      style={{fontSize:12,color:C.brand,cursor:'pointer',fontWeight:600,border:0,padding:0,background:'transparent'}}
                    >
                      {t('Forgot Password?')}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Checkbox CAPTCHA + lockout + remember me ── */}
              {loginStep===2&&(
                <div style={{marginBottom:4}}>
                  <CheckboxCaptcha
                    verified={captchaVerified} onVerify={handleCaptchaClick}
                    checking={captchaChecking} error={!!error} C={C} t={t}/>
                  {isLocked&&(
                    <div style={{padding:'12px 16px',borderRadius:10,marginTop:8,
                      background:`${C.error}12`,border:`1px solid ${C.error}33`,textAlign:'center'}}>
                      <p style={{color:C.error,fontWeight:700,fontSize:13,margin:'0 0 4px'}}>{t('Account Locked')}</p>
                      <p style={{color:C.error,fontSize:12,margin:0}}>{t('Please wait')} {fmtTime(lockoutTime)}</p>
                    </div>
                  )}
                  <div onClick={()=>setRememberMe(r=>!r)}
                    style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                      userSelect:'none',marginTop:12}}>
                    <div style={{width:20,height:20,borderRadius:5,flexShrink:0,
                      border:`2px solid ${rememberMe?C.brand:C.inputBorder}`,
                      background:rememberMe?C.brand:C.inputBg,
                      display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}>
                      {rememberMe&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span style={{fontSize:14,color:C.muted}}>{t('Remember Me')}</span>
                  </div>
                </div>
              )}

              {/* Error */}
              <div style={{minHeight:20,marginTop:8}}>
                {error&&(
                  <p style={{color:C.error,fontSize:13,margin:0,display:'flex',alignItems:'center',gap:6,
                    animation:'shake 0.35s cubic-bezier(.36,.07,.19,.97)'}}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/>
                    </svg>
                    <span>{error}</span>
                    {/suspend/i.test(error) ? (
                      <Link
                        to="/help/article/appeal-an-enforcement-or-seller-decision"
                        style={{color:C.error,fontWeight:700,textDecoration:'underline'}}
                      >
                        {t('Appeal help')}
                      </Link>
                    ) : null}
                  </p>
                )}
              </div>

              {/* CTA button */}
              <button onClick={handleNext} disabled={ctaDisabled}
                style={{width:'100%',marginTop:16,marginBottom:16,padding:'15px',
                  borderRadius:13,border:'none',
                  background:ctaDisabled?C.inputBorder:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
                  color:ctaDisabled?C.dim:'#fff',
                  fontSize:16,fontWeight:700,fontFamily:"'Palatino Linotype',Palatino,serif",
                  cursor:ctaDisabled?'not-allowed':'pointer',
                  boxShadow:ctaDisabled?'none':`0 8px 24px ${C.brandGlow}`,
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  letterSpacing:0.6,transition:'all 0.25s'}}
                onMouseEnter={e=>{if(!ctaDisabled)e.currentTarget.style.filter='brightness(1.08)';}}
                onMouseLeave={e=>{e.currentTarget.style.filter='none';}}>
                {ctaLoading
                  ?<><div style={{width:18,height:18,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>{t('Signing in…')}</>
                  :isLocked?`${t('Locked')} (${fmtTime(lockoutTime)})`
                  :loginStep===2?`${t('Sign In')}  →`
                  :`${t('Continue')}  →`
                }
              </button>

              {/* Switch to register */}
              <p style={{textAlign:'center',color:C.muted,fontSize:13,margin:'0 0 18px'}}>
                {t("Don't have an account?")}{' '}
                <Link to="/register" style={{color:C.brand,fontWeight:700,textDecoration:'none'}}>{t('Sign Up')}</Link>
              </p>

              {/* Social + guest — step 0 only */}
              {loginStep===0&&(
                <>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                    <div style={{flex:1,height:1,background:C.divider}}/>
                    <span style={{fontSize:12,color:C.dim,whiteSpace:'nowrap'}}>{t('or continue with')}</span>
                    <div style={{flex:1,height:1,background:C.divider}}/>
                  </div>
                  <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:14}}>
                    {/* Google — real OAuth */}
                    <SocialBtn label="Google" icon={SOCIAL_ICONS[0].icon} C={C} onClick={handleGoogleLoginRedirect} disabled={!!socialAuthLoading} loading={socialAuthLoading==='google'}/>
                    {/* Facebook — real OAuth */}
                    <SocialBtn label="Facebook" icon={SOCIAL_ICONS[1].icon} C={C} onClick={handleFacebookLoginRedirect} disabled={!!socialAuthLoading} loading={socialAuthLoading==='facebook'}/>
                    {/* Twitter — real OAuth */}
                    <SocialBtn label="Twitter / X" icon={SOCIAL_ICONS[2].icon} C={C} onClick={handleTwitterLoginRedirect} disabled={!!socialAuthLoading} loading={socialAuthLoading==='twitter'}/>
                    {/* LinkedIn real OAuth */}
                    <SocialBtn label="LinkedIn" icon={SOCIAL_ICONS[3].icon} C={C} onClick={handleLinkedInLoginRedirect} disabled={!!socialAuthLoading} loading={socialAuthLoading==='linkedin'}/>
                    <TelegramLoginButton rememberMe={rememberMe} onError={setError}/>
                  </div>
                  <button onClick={handleGuestEntryClick}
                    style={{width:'100%',padding:'13px',borderRadius:13,
                      border:`1.5px solid ${C.brand}`,background:'transparent',color:C.brand,
                      fontSize:14,fontWeight:600,fontFamily:"'Palatino Linotype',Palatino,serif",
                      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                      transition:'all 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.brandDimBg}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <TbBrandAmongUs size={20}/>
                    {t('Continue as Guest')}
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Forgot Password Modal – Step 1 ── */}
      {showForgotModal&&(
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{fontSize:20,fontWeight:700,color:C.brand,margin:'0 0 8px'}}>{t('Forgot Password')}</h3>
            <p style={{color:C.muted,fontSize:14,margin:'0 0 18px'}}>{t('Enter your account details to verify your identity')}</p>
            {forgotError&&<div style={{background:`${C.error}12`,border:`1px solid ${C.error}33`,color:C.error,padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13}}>{forgotError}</div>}
            <form onSubmit={handleForgotPassword}>
              <input type="text" value={forgotUsername} onChange={e=>setForgotUsername(e.target.value)}
                placeholder={t('Username')} required minLength={3}
                style={{...inputStyle('fu'),marginBottom:12,display:'block'}}
                onFocus={()=>setFocused('fu')} onBlur={()=>setFocused(null)}/>
              <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)}
                placeholder={t('Email Address')} required
                style={{...inputStyle('fe'),marginBottom:18,display:'block'}}
                onFocus={()=>setFocused('fe')} onBlur={()=>setFocused(null)}/>
              <div style={{display:'flex',gap:10}}>
                <button type="submit" disabled={sendingCode}
                  style={{flex:1,padding:'12px',borderRadius:10,border:'none',
                    background:sendingCode?C.inputBorder:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
                    color:sendingCode?C.dim:'#fff',fontWeight:700,fontSize:14,cursor:sendingCode?'not-allowed':'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {sendingCode?<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>{t('Sending…')}</>:t("Verify that It's you")}
                </button>
                <button type="button" onClick={()=>{setShowForgotModal(false);setForgotUsername('');setForgotEmail('');setForgotError('');}}
                  style={{flex:1,padding:'12px',borderRadius:10,border:`1px solid ${C.inputBorder}`,
                    background:'transparent',color:C.muted,fontWeight:600,fontSize:14,cursor:'pointer'}}>
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Forgot Password Modal – Step 2: Verify Code ── */}
      {showVerifyModal&&(
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <h3 style={{fontSize:20,fontWeight:700,color:C.brand,margin:0}}>{t('Enter Verification Code')}</h3>
              <TimerBadge seconds={verifyTimer} C={C}/>
            </div>
            <p style={{color:C.muted,fontSize:14,margin:'0 0 16px'}}>{t('A 6-digit code has been sent to your email.')}</p>
            {verifyError&&<div style={{background:`${C.error}12`,border:`1px solid ${C.error}33`,color:C.error,padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13}}>{verifyError}</div>}
            <form onSubmit={handleVerifyCode}>
              <OTPInput value={verifyCode} onChange={v=>{setVerifyCode(v);setVerifyError('');}} C={C} hasError={false}/>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                {verifyTimer>0
                  ?<button type="submit" disabled={isVerifying||verifyCode.length<6}
                    style={{flex:1,padding:'12px',borderRadius:10,border:'none',
                      background:isVerifying||verifyCode.length<6?C.inputBorder:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
                      color:isVerifying||verifyCode.length<6?C.dim:'#fff',fontWeight:700,fontSize:14,
                      cursor:isVerifying||verifyCode.length<6?'not-allowed':'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    {isVerifying?<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>{t('Verifying…')}</>:t('Verify')}
                  </button>
                  :<button type="button" onClick={handleResendVerifyCode} disabled={sendingCode}
                    style={{flex:1,padding:'12px',borderRadius:10,border:'none',
                      background:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
                      color:'#fff',fontWeight:700,fontSize:14,cursor:sendingCode?'not-allowed':'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    {sendingCode?t('Resending…'):t('Resend')}
                  </button>
                }
                <button type="button" onClick={()=>{setShowVerifyModal(false);setVerifyCode('');setVerifyError('');}}
                  style={{flex:1,padding:'12px',borderRadius:10,border:`1px solid ${C.inputBorder}`,
                    background:'transparent',color:C.muted,fontWeight:600,fontSize:14,cursor:'pointer'}}>
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Forgot Password Modal – Step 3: New Password ── */}
      {showNewPasswordModal&&(
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <h3 style={{fontSize:20,fontWeight:700,color:C.brand,margin:0}}>{t('Create New Password')}</h3>
              <TimerBadge seconds={passwordTimer} C={C}/>
            </div>
            {passwordError&&<div style={{background:`${C.error}12`,border:`1px solid ${C.error}33`,color:C.error,padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13}}>{passwordError}</div>}
            <form onSubmit={handleRequestPasswordChange}>
              {/* New password */}
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:13,color:C.muted,marginBottom:6}}>{t('New Password')}</label>
                <div style={{position:'relative'}}>
                  <input type={showNewPassword?'text':'password'} value={newPassword} required minLength={6}
                    onChange={e=>setNewPassword(e.target.value)}
                    onFocus={()=>setFocused('np')} onBlur={()=>setFocused(null)}
                    style={{...inputStyle('np'),paddingRight:50}}/>
                  {newPassword&&<button type="button" onClick={()=>setShowNewPassword(s=>!s)}
                    style={{position:'absolute',right:15,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.muted,padding:0,display:'flex',alignItems:'center'}}>
                    {showNewPassword?<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M1.5 12S5.25 4.5 12 4.5 22.5 12 22.5 12 18.75 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M3 3l18 18M10.477 10.485A3 3 0 0013.5 13.5M6.356 6.356C4.26 7.86 2.5 10 2.5 12c0 0 3.5 7.5 9.5 7.5a9.15 9.15 0 004.642-1.26"/></svg>}
                  </button>}
                </div>
                {newPassword&&(
                  <div style={{marginTop:10}}>
                    <div style={{display:'flex',gap:5,marginBottom:5}}>
                      {[1,2,3].map(i=>(
                        <div key={i} style={{flex:1,height:4,borderRadius:2,
                          background:newPasswordStrength>=i?STR_COLORS[newPasswordStrength]:C.inputBorder,
                          transition:'background 0.3s'}}/>
                      ))}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                      <span style={{fontSize:12,color:STR_COLORS[newPasswordStrength],fontWeight:600}}>
                        {STR_LABELS[newPasswordStrength]}
                      </span>
                      <span style={{fontSize:11,color:C.dim}}>
                        {t('Use uppercase, numbers & symbols')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Confirm password */}
              <div style={{marginBottom:20}}>
                <label style={{display:'block',fontSize:13,color:C.muted,marginBottom:6}}>{t('Confirm Password')}</label>
                <div style={{position:'relative'}}>
                  <input type={showConfirmPassword?'text':'password'} value={confirmPassword} required minLength={6}
                    onChange={e=>setConfirmPassword(e.target.value)}
                    onFocus={()=>setFocused('cp')} onBlur={()=>setFocused(null)}
                    style={{...inputStyle('cp'),paddingRight:50}}/>
                  {confirmPassword&&<button type="button" onClick={()=>setShowConfirmPassword(s=>!s)}
                    style={{position:'absolute',right:15,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.muted,padding:0,display:'flex',alignItems:'center'}}>
                    {showConfirmPassword?<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M1.5 12S5.25 4.5 12 4.5 22.5 12 22.5 12 18.75 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>:<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M3 3l18 18M10.477 10.485A3 3 0 0013.5 13.5M6.356 6.356C4.26 7.86 2.5 10 2.5 12c0 0 3.5 7.5 9.5 7.5a9.15 9.15 0 004.642-1.26"/></svg>}
                  </button>}
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button type="submit" disabled={sendingChangeCode}
                  style={{flex:1,padding:'12px',borderRadius:10,border:'none',
                    background:sendingChangeCode?C.inputBorder:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
                    color:sendingChangeCode?C.dim:'#fff',fontWeight:700,fontSize:14,
                    cursor:sendingChangeCode?'not-allowed':'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {sendingChangeCode?<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>{t('Sending…')}</>:t('Change Password')}
                </button>
                <button type="button" onClick={()=>{setShowNewPasswordModal(false);setNewPassword('');setConfirmPassword('');setPasswordError('');}}
                  style={{flex:1,padding:'12px',borderRadius:10,border:`1px solid ${C.inputBorder}`,
                    background:'transparent',color:C.muted,fontWeight:600,fontSize:14,cursor:'pointer'}}>
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Forgot Password Modal – Step 4: Final Code ── */}
      {showFinalCodeModal&&(
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <h3 style={{fontSize:20,fontWeight:700,color:C.brand,margin:0}}>{t('Enter Confirmation Code')}</h3>
              <TimerBadge seconds={finalTimer} C={C}/>
            </div>
            <p style={{color:C.muted,fontSize:14,margin:'0 0 16px'}}>{t('A final confirmation code has been sent to your email.')}</p>
            {finalError&&<div style={{background:`${C.error}12`,border:`1px solid ${C.error}33`,color:C.error,padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13}}>{finalError}</div>}
            <form onSubmit={handleConfirmPasswordChange}>
              <OTPInput value={finalCode} onChange={v=>{setFinalCode(v);setFinalError('');}} C={C} hasError={false}/>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                {finalTimer>0
                  ?<button type="submit" disabled={isConfirming||finalCode.length<6}
                    style={{flex:1,padding:'12px',borderRadius:10,border:'none',
                      background:isConfirming||finalCode.length<6?C.inputBorder:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
                      color:isConfirming||finalCode.length<6?C.dim:'#fff',fontWeight:700,fontSize:14,
                      cursor:isConfirming||finalCode.length<6?'not-allowed':'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    {isConfirming?<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>{t('Confirming…')}</>:t('Confirm')}
                  </button>
                  :<button type="button" onClick={handleResendFinalCode} disabled={sendingChangeCode}
                    style={{flex:1,padding:'12px',borderRadius:10,border:'none',
                      background:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
                      color:'#fff',fontWeight:700,fontSize:14,cursor:sendingChangeCode?'not-allowed':'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    {sendingChangeCode?t('Resending…'):t('Resend')}
                  </button>
                }
                <button type="button" onClick={()=>{setShowFinalCodeModal(false);setFinalCode('');setFinalError('');}}
                  style={{flex:1,padding:'12px',borderRadius:10,border:`1px solid ${C.inputBorder}`,
                    background:'transparent',color:C.muted,fontWeight:600,fontSize:14,cursor:'pointer'}}>
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {showSuccessModal&&(
        <div style={modalOverlay}>
          <div style={{...modalCard,textAlign:'center'}}>
            <div style={{width:72,height:72,borderRadius:'50%',background:`${C.success}15`,
              border:`2px solid ${C.success}`,display:'flex',alignItems:'center',justifyContent:'center',
              margin:'0 auto 20px',animation:'popIn 0.55s cubic-bezier(.34,1.56,.64,1)'}}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke={C.success} strokeWidth={2.2}>
                <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 style={{fontSize:24,fontWeight:700,color:C.success,margin:'0 0 10px'}}>{t('Success!')}</h3>
            <p style={{color:C.muted,fontSize:14,margin:'0 0 24px',lineHeight:1.6}}>
              {t('Password changed successfully! Please login with your new password.')}
            </p>
            <button onClick={handleSuccessClose}
              style={{width:'100%',padding:'13px',borderRadius:12,border:'none',
                background:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
                color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',
                boxShadow:`0 6px 18px ${C.brandGlow}`}}>
              {t('Go to Login')}
            </button>
          </div>
        </div>
      )}

      <TwoFactorVerificationModal
        open={Boolean(forgotTwoFactorPrompt)}
        action={forgotTwoFactorPrompt?.action}
        actionLabel={forgotTwoFactorPrompt?.actionLabel}
        twoFactor={forgotTwoFactorPrompt?.twoFactor}
        requestChallenge={requestForgotTwoFactorChallenge}
        verifyChallenge={verifyForgotTwoFactorChallenge}
        onVerified={handleForgotTwoFactorVerified}
        onClose={() => setForgotTwoFactorPrompt(null)}
      />

      {/* Guest modals */}
      {showGuestModal&&<GuestUsernameModal onClose={()=>setShowGuestModal(false)} onContinue={handleGuestContinue}/>}
      {showGuestInfoModal&&<GuestInfoModal onContinue={handleGuestLogin} onClose={()=>setShowGuestInfoModal(false)}/>}

    </>
  );
};

export default Login;

