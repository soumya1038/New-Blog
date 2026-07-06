import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import axios from 'axios';
import { TbBrandAmongUs } from 'react-icons/tb';
import GuestUsernameModal from '../components/GuestUsernameModal';
import GuestInfoModal from '../components/GuestInfoModal';
import { requestSocialAuthUrl } from '../utils/socialAuth';

const API = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// ── Brand tokens ──────────────────────────────────────────────────────────────
const LIGHT = {
  bg:'#F6F0E4', card:'#FEFCF4', cardBorder:'#D8CC98',
  brand:'#C9A227', brandHover:'#B8931F',
  brandGlow:'rgba(201,162,39,0.22)', brandDim:'#E8D8B0', brandDimBg:'#F4EDD0',
  text:'#1C1A0C', muted:'#6A5C38', dim:'#9A8A60',
  inputBg:'#EDE7D0', inputBorder:'#CEC090',
  success:'#4A8C5C', successBg:'#EBF5EE',
  error:'#C04040', errorBg:'#FAEBEB',
  divider:'#DDD0A0',
};
const DARK = {
  bg:'#111408', card:'#1C2010', cardBorder:'#3A4424',
  brand:'#6B7A3A', brandHover:'#7F8F46',
  brandGlow:'rgba(107,122,58,0.28)', brandDim:'#4E5A2A', brandDimBg:'#2A3014',
  text:'#E8E4CC', muted:'#8A9060', dim:'#5A6038',
  inputBg:'#181C0A', inputBorder:'#3A4224',
  success:'#52B47A', successBg:'#0E2018',
  error:'#D95050', errorBg:'#2A1010',
  divider:'#252C12',
};

// ── Email domain allowlist (from Register.js) ─────────────────────────────────
const ALLOWED_DOMAINS = [
  'gmail.com','googlemail.com','outlook.com','hotmail.com','live.com',
  'yahoo.com','icloud.com','me.com','aol.com','protonmail.com','proton.me',
];

function checkEmailDomain(email) {
  if (!email) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'invalid';
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain) ? 'valid' : 'domain';
}

function makeUsernameSuggestions(value) {
  const base = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 14) || 'lekhon';

  const suffixes = [
    Math.floor(100 + Math.random() * 900),
    `${new Date().getFullYear()}`,
    'writes',
    'blog',
  ];

  return suffixes
    .map((suffix) => `${base}_${suffix}`.slice(0, 20))
    .filter((item, index, arr) => item.length >= 3 && arr.indexOf(item) === index);
}

// ── Password strength (from Register.js) ─────────────────────────────────────
const STR_COLORS = ['','#C04040','#C9A227','#4A8C5C'];
const STR_LABELS = ['','Weak','Medium','Strong'];
function getPasswordStrength(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 6)  s++;
  if (pwd.length >= 10) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  if (s <= 2) return 1;
  if (s <= 3) return 2;
  return 3;
}

// ── Text CAPTCHA generator ────────────────────────────────────────────────────
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateCaptchaText() {
  return Array.from({length:6}, ()=>CAPTCHA_CHARS[Math.floor(Math.random()*CAPTCHA_CHARS.length)]).join('');
}

// ── Step icons ────────────────────────────────────────────────────────────────
function StepIcon({ name, brand, size=36 }) {
  const s = size;
  const icons = {
    quill:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <path d="M24 6 Q30 10 26 18 L18 28 L14 24 Q22 16 24 6Z" fill={brand} opacity="0.85"
          style={{animation:'quillAppear 0.6s cubic-bezier(.34,1.56,.64,1) both'}}/>
        <path d="M18 28 L14 24 L16 26Z" fill={brand}/>
        <path d="M16 27 Q13 31 10 30" stroke={brand} strokeWidth="1.8" strokeLinecap="round" fill="none"
          style={{strokeDasharray:10,strokeDashoffset:10,animation:'drawStroke 0.8s ease 0.5s forwards'}}/>
      </svg>
    ),
    envelope:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <rect x="7" y="13" width="22" height="14" rx="2" fill={brand} opacity="0.2" stroke={brand} strokeWidth="1.4"/>
        <path d="M7 13 L18 21 L29 13" stroke={brand} strokeWidth="1.5" strokeLinejoin="round" fill="none"
          style={{transformOrigin:'18px 13px',animation:'flapOpen 1.2s ease-in-out infinite'}}/>
        <g style={{animation:'sparkleIn 0.5s ease 0.7s both'}}>
          <line x1="27" y1="8" x2="27" y2="11" stroke={brand} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="25.5" y1="9.5" x2="28.5" y2="9.5" stroke={brand} strokeWidth="1.5" strokeLinecap="round"/>
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
    stars:(
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" fill={brand} opacity="0.12" style={{animation:'iconPulse 2.5s ease-in-out infinite'}}/>
        <path d="M10 22 L11.2 18.6 L8 16.5 L11.6 16.5 L13 13 L14.4 16.5 L18 16.5 L14.8 18.6 L16 22 L13 20Z"
          fill={brand} opacity="0.9" style={{animation:'starPop 0.4s cubic-bezier(.34,1.56,.64,1) 0s both'}}/>
        <path d="M18 20 L19.5 15.5 L15 13 L20 13 L21.5 8.5 L23 13 L28 13 L23.5 15.5 L25 20 L21.5 17.5Z"
          fill={brand} style={{animation:'starPop 0.4s cubic-bezier(.34,1.56,.64,1) 0.2s both'}}/>
        <path d="M26 26 L26.8 23.8 L24.5 22.5 L27 22.5 L27.8 20.3 L28.6 22.5 L31 22.5 L28.8 23.8 L29.6 26 L27.8 24.8Z"
          fill={brand} opacity="0.7" style={{animation:'starPop 0.4s cubic-bezier(.34,1.56,.64,1) 0.4s both'}}/>
      </svg>
    ),
  };
  return icons[name] || icons.quill;
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
      <div style={{position:'absolute',width:220,height:220,borderRadius:'50%',
        background:`radial-gradient(circle,${C.brandGlow} 0%,transparent 70%)`,
        top:'40%',left:'50%',animation:'orbFloat 13s ease-in-out infinite 2s'}}/>
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
        {[[115,75],[345,195],[595,345],[195,495],[745,440],[495,115],[700,250],[150,330]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="3" fill={C.brand} opacity="0.35"
            style={{animation:`dotPulse 3.5s ease-in-out infinite ${i*0.45}s`}}/>
        ))}
      </svg>
      {[...Array(9)].map((_,i)=>(
        <div key={i} style={{position:'absolute',width:3+(i%4)*2.5,height:3+(i%4)*2.5,
          borderRadius:'50%',background:C.brand,opacity:0.10+(i%4)*0.04,
          left:`${8+i*10.5}%`,top:`${12+(i*19)%72}%`,
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
          style={{width:44,height:54,textAlign:'center',fontSize:22,fontWeight:700,
            fontFamily:'monospace',background:C.inputBg,color:C.text,
            border:`1.5px solid ${hasError?C.error:d.trim()?C.brand:C.inputBorder}`,
            borderRadius:10,outline:'none',transition:'border-color 0.25s,box-shadow 0.2s',
            boxShadow:hasError?`0 0 0 3px ${C.error}22`:d.trim()?`0 0 0 3px ${C.brandGlow}`:'none'}}/>
      ))}
    </div>
  );
}

// ── SocialBtn (monochrome) ────────────────────────────────────────────────────
const SOCIAL_ICONS = [
  {label:'Google',icon:{vb:'0 0 24 24',paths:['M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z','M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z','M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z','M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z']}},
  {label:'Facebook',icon:{vb:'0 0 24 24',paths:['M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z']}},
  {label:'Twitter / X',icon:{vb:'0 0 24 24',paths:['M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z']}},
  {label:'LinkedIn',icon:{vb:'0 0 24 24',paths:['M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z']}},
];

function SocialBtn({ label, icon, C, onClick, disabled = false, loading = false }) {
  const [hov,setHov]=useState(false);
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

// ── TextCaptchaWidget (SVG distorted text) ────────────────────────────────────
function TextCaptchaWidget({ verified, onVerify, C, t }) {
  const [code,setCode]     = useState(()=>generateCaptchaText());
  const [input,setInput]   = useState('');
  const [status,setStatus] = useState('idle');
  const [shake,setShake]   = useState(false);
  const [seed,setSeed]     = useState(0);
  const [captchaTimer,setCaptchaTimer] = useState(60);
  const inputRef = useRef(null);

  useEffect(()=>{ if(!verified) setTimeout(()=>inputRef.current?.focus(),80); },[code,verified]);

  const regenerate = () => {
    setCode(generateCaptchaText()); setInput(''); setStatus('idle');
    setCaptchaTimer(60);
    setSeed(s=>s+1); setTimeout(()=>inputRef.current?.focus(),80);
  };

  useEffect(() => {
    if (verified) return undefined;
    if (captchaTimer <= 0) {
      setCode(generateCaptchaText());
      setInput('');
      setStatus('idle');
      setCaptchaTimer(60);
      setSeed(s=>s+1);
      setTimeout(()=>inputRef.current?.focus(),80);
      return undefined;
    }
    const timer = setInterval(() => setCaptchaTimer((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [captchaTimer, verified]);
  const triggerShake = () => { setShake(true); setTimeout(()=>setShake(false),450); };
  const submit = () => {
    if(!input.trim()){triggerShake();return;}
    setStatus('checking');
    setTimeout(()=>{
      if(input.trim()===code){ setStatus('done'); setTimeout(()=>onVerify(),500); }
      else { setStatus('wrong'); triggerShake(); setTimeout(()=>{ setInput(''); setStatus('idle'); regenerate(); },900); }
    },700);
  };

  const noiseLines = Array.from({length:5},(_,i)=>{ const r=(seed*31+i*17)%100; return {x1:r%60+5,y1:(r*3)%36+2,x2:(r*2+30)%90+5,y2:(r*5+10)%36+2}; });
  const noiseDots  = Array.from({length:12},(_,i)=>{ const r=(seed*13+i*29)%100; return {cx:r%90+5,cy:(r*7)%36+2,r:0.8+(i%3)*0.4}; });
  const chars   = code.split('');
  const offsets = chars.map((_,i)=>{ const r=(seed*7+i*11)%10; return {dy:(r%7)-3,rot:(r%11)-5}; });

  if(verified) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px 20px',
      borderRadius:12,background:`${C.success}18`,border:`1.5px solid ${C.success}55`,
      animation:'verifiedSlideUp 0.45s cubic-bezier(.34,1.56,.64,1)'}}>
      <div style={{width:26,height:26,borderRadius:'50%',background:C.success,display:'flex',
        alignItems:'center',justifyContent:'center',
        animation:'tickPop 0.4s cubic-bezier(.34,1.56,.64,1) 0.1s both'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
          <path strokeLinecap="round" d="M5 13l4 4L19 7"
            style={{strokeDasharray:24,strokeDashoffset:24,animation:'drawVerifyCheck 0.4s ease 0.2s forwards'}}/>
        </svg>
      </div>
      <span style={{fontSize:15,fontWeight:700,color:C.success,
        fontFamily:"'Palatino Linotype',Palatino,serif",letterSpacing:0.3}}>
        {t('Verified')}
      </span>
    </div>
  );

  return (
    <div style={{marginBottom:4}}>
      <div style={{borderRadius:14,overflow:'hidden',marginBottom:12,
        border:`1.5px solid ${status==='wrong'?C.error:status==='done'?C.success:C.cardBorder}`,
        background:C.inputBg,transition:'border-color 0.3s'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'9px 14px',background:C.brandDimBg,borderBottom:`1px solid ${C.cardBorder}`}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={C.brand} strokeWidth={2}>
              <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <span style={{fontSize:11,fontWeight:700,color:C.brand,letterSpacing:0.5}}>
              {t('TYPE THE TEXT BELOW')}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <span style={{fontSize:11,fontWeight:700,fontFamily:'monospace',
              color:captchaTimer<=10?C.error:C.muted}}>
              0:{captchaTimer.toString().padStart(2,'0')}
            </span>
            <button type="button" onClick={regenerate} title={t('Get a new code')}
              style={{background:'none',border:'none',cursor:'pointer',color:C.muted,padding:2,
                display:'flex',alignItems:'center',gap:4,fontSize:11,transition:'color 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.color=C.brand}
              onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {t('New')}
            </button>
          </div>
        </div>
        {/* SVG canvas */}
        <div style={{padding:'14px 14px 10px',display:'flex',justifyContent:'center'}}>
          <svg width="240" height="52" viewBox="0 0 240 52"
            style={{borderRadius:8,background:C.card,display:'block',userSelect:'none'}}>
            {noiseLines.map((l,i)=>(<line key={i} x1={l.x1*2.4} y1={l.y1*1.3} x2={l.x2*2.4} y2={l.y2*1.3}
              stroke={C.brand} strokeWidth="0.7" opacity="0.18" strokeLinecap="round"/>))}
            {noiseDots.map((d,i)=>(<circle key={i} cx={d.cx*2.5} cy={d.cy*1.3} r={d.r} fill={C.muted} opacity="0.22"/>))}
            {chars.map((ch,i)=>{
              const x=26+i*33; const {dy,rot}=offsets[i];
              return (<text key={i} x={x} y={30+dy} textAnchor="middle"
                fontFamily="'Courier New',Courier,monospace" fontSize={i%2===0?22:20}
                fontWeight="bold" fill={C.brand}
                transform={`rotate(${rot},${x},${30+dy})`}
                style={{userSelect:'none'}}>{ch}</text>);
            })}
            <line x1="10" y1={22+(seed%8)} x2="230" y2={30-(seed%6)}
              stroke={C.muted} strokeWidth="1.2" opacity="0.25" strokeLinecap="round"/>
          </svg>
        </div>
        {status==='wrong'&&(
          <div style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',
            background:`${C.error}14`,borderTop:`1px solid ${C.error}33`,animation:'popIn 0.25s ease'}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={C.error} strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/>
            </svg>
            <span style={{fontSize:12,color:C.error,fontWeight:600}}>
              {t('Incorrect — generating a new code…')}
            </span>
          </div>
        )}
      </div>
      {/* Input row */}
      <div style={{display:'flex',gap:10,alignItems:'stretch'}}>
        <input ref={inputRef} type="text" placeholder={t('Type the code above…')}
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&submit()} maxLength={6}
          disabled={status==='checking'||status==='done'}
          style={{flex:1,padding:'12px 14px',background:C.inputBg,
            border:`1.5px solid ${status==='wrong'?C.error:status==='done'?C.success:C.inputBorder}`,
            borderRadius:11,color:C.text,fontSize:16,
            fontFamily:"'Courier New',Courier,monospace",
            fontWeight:700,letterSpacing:2,outline:'none',boxSizing:'border-box',
            animation:shake?'shake 0.45s cubic-bezier(.36,.07,.19,.97)':'none',
            transition:'border-color 0.25s'}}/>
        <button type="button" onClick={submit} disabled={!input.trim()||status!=='idle'}
          style={{padding:'0 20px',borderRadius:11,border:'none',
            background:!input.trim()||status!=='idle'?C.inputBorder:`linear-gradient(135deg,${C.brandHover},${C.brand})`,
            color:!input.trim()||status!=='idle'?C.dim:'#fff',
            fontSize:14,fontWeight:700,fontFamily:"'Palatino Linotype',Palatino,serif",
            cursor:!input.trim()||status!=='idle'?'not-allowed':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:7,
            boxShadow:input.trim()&&status==='idle'?`0 4px 14px ${C.brandGlow}`:'none',
            transition:'all 0.2s',whiteSpace:'nowrap'}}
          onMouseEnter={e=>{ if(input.trim()&&status==='idle')e.currentTarget.style.filter='brightness(1.08)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.filter='none'; }}>
          {status==='checking'
            ?<div style={{width:15,height:15,border:'2px solid rgba(255,255,255,0.35)',
                borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
            :<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
               <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
             </svg>
          }
          {status==='checking'?'…':t('Check')}
        </button>
      </div>
      <p style={{fontSize:11,color:C.dim,margin:'8px 0 0',textAlign:'center'}}>
        {t("Case-sensitive · 6 characters · Can't read it?")}{' '}
        <span onClick={regenerate} style={{color:C.brand,cursor:'pointer',fontWeight:600}}>
          {t('Get a new one')}
        </span>
      </p>
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────
// Order: Username → Email → Email Verify → Password → CAPTCHA
const buildSteps = (t) => [
  {id:'username', icon:'quill',   title:t("Let's get started!"), sub:t('What should we call you on Lekhon?')},
  {id:'email',    icon:'envelope',title:t('Great choice!'),       sub:t('Where should we send your verification?')},
  {id:'emailVerify',icon:'inbox', title:t('Check your inbox'),    sub:t('We sent a 6-digit code to your email.')},
  {id:'password', icon:'lock',    title:t('Secure your space'),   sub:t('Create a strong password for your account')},
  {id:'captcha',  icon:'stars',   title:t('Almost there!'),       sub:t("One quick check and you're part of Lekhon!")},
];

// ════════════════════════════════════════════════════════════════════════════
// REGISTER COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const Register = () => {
  const { t } = useTranslation();
  const { register, user, completeLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  // Use the shared theme state so auth pages always match the navbar.
  const { isDark } = useTheme();
  const dark = isDark;
  const C = dark ? DARK : LIGHT;

  const [step, setStep]       = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const steps = buildSteps(t);

  // ── Form state ────────────────────────────────────────────────────────────
  const [username, setUsername]   = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [email, setEmail]         = useState('');
  const [emailValidMsg, setEmailValidMsg] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified]   = useState(false);
  const [isSendingCode, setIsSendingCode]         = useState(false);
  const [isVerifyingCode, setIsVerifyingCode]     = useState(false);
  const [, setIsCodeSent]               = useState(false);
  const [otpError, setOtpError]                   = useState(false);
  // Email verification countdown — 120s (added per user request)
  const [emailTimer, setEmailTimer]               = useState(120);
  const [emailTimerActive, setEmailTimerActive]   = useState(false);

  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]   = useState(false); // matches Register.js default
  const [error, setError]             = useState('');
  const [focused, setFocused]         = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [socialAuthLoading, setSocialAuthLoading] = useState('');

  // CAPTCHA
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Guest
  const [showGuestModal, setShowGuestModal]         = useState(false);
  const [showGuestInfoModal, setShowGuestInfoModal] = useState(false);
  const [guestUsername, setGuestUsername]           = useState('');
  const flashMessage = '';

  const inputRef = useRef(null);

  // ── Redirect if already logged in ────────────────────────────────────────
  useEffect(() => {
    if (user) {
      const inFlow = isRegistering || sessionStorage.getItem('registerInProgress');
      if (!inFlow) navigate('/home');
    }
  }, [user, isRegistering, navigate]);

  useEffect(() => {
    if (isRegistering) sessionStorage.setItem('registerInProgress','true');
    else sessionStorage.removeItem('registerInProgress');
  }, [isRegistering]);

  // ── Auto-focus ────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(()=>inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [step]);

  // ── Real-time email domain validation ────────────────────────────────────
  useEffect(() => {
    if (email) setEmailValidMsg(checkEmailDomain(email));
    else setEmailValidMsg('');
  }, [email]);

  // ── Email verification countdown ─────────────────────────────────────────
  useEffect(() => {
    if (!emailTimerActive || emailTimer <= 0) return;
    const timer = setInterval(() => setEmailTimer(p => p <= 1 ? (clearInterval(timer), 0) : p-1), 1000);
    return () => clearInterval(timer);
  }, [emailTimerActive, emailTimer]);

  const fmtTimer = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const checkUsernameAvailability = async (candidate = username.trim()) => {
    const cleanUsername = candidate.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      setUsernameSuggestions([]);
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setUsernameStatus('taken');
      setUsernameMessage(t('Only letters, numbers, and underscores allowed'));
      setUsernameSuggestions(makeUsernameSuggestions(cleanUsername));
      return false;
    }

    setUsernameStatus('checking');
    setUsernameMessage(t('Checking username availability...'));
    try {
      const { data } = await api.get(`/auth/check-guest-username/${encodeURIComponent(cleanUsername)}`);
      if (data?.available) {
        setUsernameStatus('available');
        setUsernameMessage(t('Username is available'));
        setUsernameSuggestions([]);
        return true;
      }
      setUsernameStatus('taken');
      setUsernameMessage(data?.message || t('Username already taken'));
      setUsernameSuggestions(makeUsernameSuggestions(cleanUsername));
      return false;
    } catch (err) {
      setUsernameStatus('error');
      setUsernameMessage(t('Could not check username right now. We will verify it when you submit.'));
      setUsernameSuggestions([]);
      return true;
    }
  };

  useEffect(() => {
    const cleanUsername = username.trim();
    setUsernameSuggestions([]);

    if (!cleanUsername || cleanUsername.length < 3) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return undefined;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setUsernameStatus('taken');
      setUsernameMessage(t('Only letters, numbers, and underscores allowed'));
      setUsernameSuggestions(makeUsernameSuggestions(cleanUsername));
      return undefined;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    setUsernameMessage(t('Checking username availability...'));

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-guest-username/${encodeURIComponent(cleanUsername)}`);
        if (cancelled) return;

        if (data?.available) {
          setUsernameStatus('available');
          setUsernameMessage(t('Username is available'));
          setUsernameSuggestions([]);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(data?.message || t('Username already taken'));
          setUsernameSuggestions(makeUsernameSuggestions(cleanUsername));
        }
      } catch (err) {
        if (cancelled) return;
        setUsernameStatus('error');
        setUsernameMessage(t('Could not check username right now. We will verify it when you submit.'));
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, t]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const advance = () => { setAnimKey(k=>k+1); setStep(s=>s+1); setError(''); };
  const goBack  = () => {
    if (step===0) return;
    setAnimKey(k=>k+1); setStep(s=>s-1); setError('');
    if (step===2) setOtpError(false);
  };

  const handleSendCode = async () => {
    if (emailValidMsg !== 'valid') { setError(t('Please enter a valid email from a major provider')); return; }
    setError(''); setIsSendingCode(true);
    try {
      await api.post('/auth/send-verification-code', { email });
      setIsCodeSent(true); setEmailTimer(120); setEmailTimerActive(true);
      advance();
    } catch(err) {
      setError(err.response?.data?.message || t('Failed to send code'));
    } finally { setIsSendingCode(false); }
  };

  const handleResendCode = async () => {
    setError(''); setIsSendingCode(true);
    try {
      await api.post('/auth/send-verification-code', { email });
      setVerificationCode(''); setOtpError(false);
      setEmailTimer(120); setEmailTimerActive(true);
    } catch(err) {
      setError(err.response?.data?.message || t('Failed to resend code'));
    } finally { setIsSendingCode(false); }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) { setError(t('Enter all 6 digits first')); return; }
    setError(''); setIsVerifyingCode(true);
    try {
      await api.post('/auth/verify-code', { email, code: verificationCode });
      setIsEmailVerified(true); setEmailTimerActive(false); setOtpError(false);
      advance(); // → password step
    } catch(err) {
      setOtpError(true); setVerificationCode('');
      setError(err.response?.data?.message || t("That code doesn't match — please try again or resend"));
      setTimeout(() => setOtpError(false), 1800);
    } finally { setIsVerifyingCode(false); }
  };

  const handleSubmit = async () => {
    if (!isEmailVerified) { setError(t('Please verify your email first')); return; }
    if (!captchaVerified) { setError(t('Please complete the text verification')); return; }
    setIsRegistering(true); setError('');
    try {
      const backendCaptchaQuestion = { num1: 1, num2: 1, operator: '+' };
      await register(username.trim(), email.trim(), password, rememberMe, '2', backendCaptchaQuestion);
      navigate('/login');
    } catch(err) {
      setError(err.response?.data?.message || t('Registration failed'));
    } finally { setIsRegistering(false); }
  };

  // Social OAuth handlers
  const handleSocialLoginRedirect = async (provider) => {
    if (socialAuthLoading) return;
    setError('');
    setSocialAuthLoading(provider);
    sessionStorage.removeItem('socialConnectIntent');
    try {
      const authUrl = await requestSocialAuthUrl(provider);
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

  const handleGuestEntryClick = () => {
    setError('');
    setShowGuestModal(true);
  };

  const handleGuestContinue = (u) => { setGuestUsername(u); setShowGuestModal(false); setShowGuestInfoModal(true); };
  const handleGuestLogin = async () => {
    try {
      const { data } = await axios.post(`${API}/api/auth/guest-login`, { username: guestUsername });
      completeLogin(data, true);
      setShowGuestInfoModal(false); navigate('/home', { replace: true });
    } catch(err) {
      setError(err.response?.data?.message || t('Guest login failed'));
      setShowGuestInfoModal(false);
    }
  };

  const handleNext = async () => {
    setError('');
    const cur = steps[step];
    if (cur.id==='username') {
      const cleanUsername = username.trim();
      if (!cleanUsername||cleanUsername.length<3){setError(t('Username must be at least 3 characters'));return;}
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)){setError(t('Only letters, numbers, and underscores allowed'));return;}
      if (usernameStatus === 'checking') { setError(t('Please wait while we check this username')); return; }
      if (usernameStatus !== 'available') {
        const isAvailable = await checkUsernameAvailability(cleanUsername);
        if (!isAvailable) return;
      }
      advance();
    } else if (cur.id==='email') {
      await handleSendCode();
    } else if (cur.id==='emailVerify') {
      await handleVerifyCode();
    } else if (cur.id==='password') {
      if (!password||password.length<6){setError(t('Password must be at least 6 characters'));return;}
      advance();
    } else if (cur.id==='captcha') {
      await handleSubmit();
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const cur      = steps[step];
  const pct      = step / (steps.length - 1);
  const pwdStr   = getPasswordStrength(password);
  const ctaLoading  = isSendingCode || isVerifyingCode || isRegistering || (cur.id==='username' && usernameStatus==='checking');
  const ctaDisabled = ctaLoading
    || (cur.id==='emailVerify' && !isEmailVerified && emailTimer===0)
    || (cur.id==='captcha' && !captchaVerified);

  const ctaLabel = () => {
    if (cur.id==='username' && usernameStatus==='checking') return t('Checking...');
    if (isRegistering)   return t('Creating account…');
    if (isSendingCode)   return t('Sending…');
    if (isVerifyingCode) return t('Verifying…');
    if (cur.id==='email')        return `${t('Send Code')}  →`;
    if (cur.id==='emailVerify')  return `${t('Verify Code')}  →`;
    if (cur.id==='captcha')      return `${t('Create Account')}  →`;
    return `${t('Continue')}  →`;
  };

  const inputStyle = (field) => ({
    width:'100%', padding:'14px 18px',
    background:C.inputBg,
    border:`1.5px solid ${field==='username' && usernameStatus==='taken'?C.error:focused===field?C.brand:C.inputBorder}`,
    borderRadius:13, color:C.text, fontSize:16,
    fontFamily:"Georgia,'Times New Roman',serif",
    outline:'none', boxSizing:'border-box',
    boxShadow:field==='username' && usernameStatus==='taken'?`0 0 0 3px ${C.error}22`:focused===field?`0 0 0 3px ${C.brandGlow}`:'none',
    transition:'border-color 0.2s,box-shadow 0.2s',
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {flashMessage&&(
        <div style={{position:'fixed',top:16,right:16,zIndex:300,padding:'12px 20px',
          borderRadius:10,background:C.brand,color:'#fff',fontSize:14,fontWeight:600,
          boxShadow:`0 4px 16px ${C.brandGlow}`,animation:'stepIn 0.3s ease'}}>
          {flashMessage}
        </div>
      )}

      {/* No custom header — Navbar renders via App.js */}
      <div style={{minHeight:'100dvh',background:C.bg,display:'flex',flexDirection:'column',
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
                <button onClick={goBack} disabled={step===0}
                  style={{background:'none',border:'none',cursor:step===0?'default':'pointer',
                    color:step===0?'transparent':C.muted,
                    fontSize:13,display:'flex',alignItems:'center',gap:5,padding:0,transition:'color 0.2s'}}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M19 12H5M12 5l-7 7 7 7"/>
                  </svg>
                  {t('Back')}
                </button>
                <div style={{display:'flex',gap:5,alignItems:'center'}}>
                  {steps.map((_,i)=>(
                    <div key={i} style={{height:6,borderRadius:3,
                      background:i<=step?C.brand:C.inputBorder,
                      width:i===step?22:8,opacity:i<step?0.45:1,
                      transition:'all 0.35s cubic-bezier(.4,0,.2,1)'}}/>
                  ))}
                </div>
                <div style={{minWidth:44}}/>
              </div>

              {/* Icon + title + timer badge for emailVerify */}
              <div style={{marginBottom:22}}>
                <div style={{marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <StepIcon name={cur.icon} brand={C.brand} size={36}/>
                  {cur.id==='emailVerify'&&emailTimerActive&&emailTimer>0&&(
                    <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',
                      borderRadius:20,background:emailTimer<=30?`${C.error}15`:C.inputBg,
                      border:`1px solid ${emailTimer<=30?C.error:C.inputBorder}`,transition:'all 0.3s'}}>
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24"
                        stroke={emailTimer<=30?C.error:C.muted} strokeWidth={2}>
                        <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
                      </svg>
                      <span style={{fontSize:12,fontWeight:700,fontFamily:'monospace',
                        color:emailTimer<=30?C.error:C.muted}}>{fmtTimer(emailTimer)}</span>
                    </div>
                  )}
                  {cur.id==='emailVerify'&&emailTimer===0&&(
                    <span style={{fontSize:12,color:C.error,fontWeight:600}}>{t('Code expired')}</span>
                  )}
                </div>
                <h1 style={{margin:'0 0 6px',fontSize:26,fontWeight:700,color:C.text,
                  fontFamily:"'Palatino Linotype',Palatino,serif",lineHeight:1.25}}>{cur.title}</h1>
                <p style={{margin:0,color:C.muted,fontSize:14,lineHeight:1.6}}>{cur.sub}</p>

                {/* Verified badge once OTP is confirmed */}
                {cur.id==='emailVerify'&&isEmailVerified&&(
                  <div style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:10,
                    padding:'5px 12px',borderRadius:20,background:`${C.success}18`,
                    border:`1px solid ${C.success}44`,animation:'popIn 0.4s cubic-bezier(.34,1.56,.64,1)'}}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={C.success} strokeWidth={2.5}>
                      <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span style={{fontSize:12,color:C.success,fontWeight:700}}>{t('Email verified!')}</span>
                  </div>
                )}
              </div>

              {/* ── Step 0: Username ── */}
              {cur.id==='username'&&(
                <div style={{marginBottom:4}}>
                  <input ref={inputRef} type="text" placeholder={t('Pick a unique username')}
                    value={username} onChange={e=>{setUsername(e.target.value);setError('');}}
                    onKeyDown={e=>e.key==='Enter'&&handleNext()}
                    onFocus={()=>setFocused('username')} onBlur={()=>setFocused(null)}
                    maxLength={20} minLength={3} style={inputStyle('username')}/>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                    <span style={{fontSize:12,color:C.dim}}>{t('Minimum 3 characters')}</span>
                    <span style={{fontSize:12,color:username.length>=3?C.success:C.dim}}>{username.length}/20</span>
                  </div>
                  {username.trim().length >= 3 && usernameMessage && (
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
                      {usernameStatus==='checking'
                        ? <div style={{width:12,height:12,border:`2px solid ${C.inputBorder}`,borderTopColor:C.brand,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
                        : <svg width="13" height="13" fill="none" viewBox="0 0 24 24"
                            stroke={usernameStatus==='available'?C.success:usernameStatus==='taken'?C.error:C.muted}
                            strokeWidth={2}>
                            {usernameStatus==='available'
                              ? <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
                              : <><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/></>}
                          </svg>
                      }
                      <span style={{fontSize:12,color:usernameStatus==='available'?C.success:usernameStatus==='taken'?C.error:C.muted}}>
                        {usernameMessage}
                      </span>
                    </div>
                  )}
                  {usernameSuggestions.length > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:9}}>
                      {usernameSuggestions.map((suggestion) => (
                        <button key={suggestion} type="button"
                          onClick={() => {
                            setUsername(suggestion);
                            setUsernameStatus('checking');
                            setUsernameMessage(t('Checking username availability...'));
                            setUsernameSuggestions([]);
                            setError('');
                          }}
                          style={{border:`1px solid ${C.cardBorder}`,background:C.brandDimBg,color:C.brand,
                            borderRadius:999,padding:'5px 10px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 1: Email + domain validation ── */}
              {cur.id==='email'&&(
                <div style={{marginBottom:4}}>
                  <input ref={inputRef} type="email" placeholder={t('your@email.com')}
                    value={email}
                    onChange={e=>{setEmail(e.target.value);setIsCodeSent(false);setIsEmailVerified(false);setError('');}}
                    onKeyDown={e=>e.key==='Enter'&&handleNext()}
                    onFocus={()=>setFocused('email')} onBlur={()=>setFocused(null)}
                    style={inputStyle('email')}/>
                  {email&&emailValidMsg&&(
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:6}}>
                      {emailValidMsg==='valid'
                        ?<><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={C.success} strokeWidth={2}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>
                           <span style={{fontSize:12,color:C.success}}>{t('Looks good!')}</span></>
                        :<><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={C.error} strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4M12 16h.01"/></svg>
                           <span style={{fontSize:12,color:C.error}}>
                             {emailValidMsg==='domain'
                               ?t('Please use Gmail, Outlook, Yahoo, or other major providers')
                               :t('Invalid email format')}
                           </span></>
                      }
                    </div>
                  )}
                  {!email&&<p style={{fontSize:12,color:C.dim,margin:'6px 0 0'}}>{t('Your email stays private — no spam, ever')}</p>}
                </div>
              )}

              {/* ── Step 2: OTP verify (collapse on success) ── */}
              {cur.id==='emailVerify'&&!isEmailVerified&&(
                <div style={{marginBottom:4}}>
                  {/* Email chip */}
                  <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center',
                    padding:'9px 16px',background:C.brandDimBg,borderRadius:30,
                    border:`1px solid ${C.cardBorder}`,width:'fit-content',margin:'0 auto 20px'}}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={C.brand} strokeWidth={2}>
                      <path strokeLinecap="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <span style={{fontSize:13,color:C.brand,fontWeight:600}}>{email}</span>
                  </div>
                  <OTPInput value={verificationCode}
                    onChange={v=>{setVerificationCode(v);setError('');setOtpError(false);}}
                    C={C} hasError={otpError}/>
                  {/* Resend */}
                  <div style={{textAlign:'center',marginTop:10}}>
                    {emailTimer>0
                      ?<span style={{fontSize:12,color:C.dim}}>
                         {t('Resend in')} <strong style={{color:C.muted}}>{fmtTimer(emailTimer)}</strong>
                       </span>
                      :<span style={{fontSize:12,color:C.muted}}>
                         {t("Didn't receive it?")}{' '}
                         <span onClick={handleResendCode}
                           style={{color:C.brand,cursor:'pointer',fontWeight:700}}>
                           {isSendingCode?t('Resending…'):t('Resend code')}
                         </span>
                       </span>
                    }
                  </div>
                  {/* Reassurance */}
                  <div style={{marginTop:14,padding:'11px 14px',borderRadius:10,
                    background:C.inputBg,border:`1px solid ${C.inputBorder}`,
                    display:'flex',gap:10,alignItems:'flex-start'}}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={C.brand} strokeWidth={2}
                      style={{flexShrink:0,marginTop:1}}>
                      <path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.6}}>
                      {t('Check spam too. Code expires in')}{' '}
                      <strong style={{color:C.text}}>2 {t('minutes')}</strong> — {t('no rush!')}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 3: Password + strength meter ── */}
              {cur.id==='password'&&(
                <div style={{marginBottom:4}}>
                  <div style={{position:'relative'}}>
                    <input ref={inputRef}
                      type={showPassword?'text':'password'}
                      placeholder={t('Choose a password')}
                      value={password}
                      onChange={e=>{setPassword(e.target.value);setError('');}}
                      onKeyDown={e=>e.key==='Enter'&&handleNext()}
                      onFocus={()=>setFocused('password')} onBlur={()=>setFocused(null)}
                      minLength={6}
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
                  {/* Strength meter (register only) */}
                  {password&&(
                    <div style={{marginTop:10}}>
                      <div style={{display:'flex',gap:5,marginBottom:5}}>
                        {[1,2,3].map(i=>(
                          <div key={i} style={{flex:1,height:4,borderRadius:2,
                            background:pwdStr>=i?STR_COLORS[pwdStr]:C.inputBorder,
                            transition:'background 0.3s'}}/>
                        ))}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:12,color:STR_COLORS[pwdStr],fontWeight:600}}>
                          {STR_LABELS[pwdStr]}
                        </span>
                        <span style={{fontSize:11,color:C.dim}}>
                          {t('Use uppercase, numbers & symbols')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Text CAPTCHA + remember me ── */}
              {cur.id==='captcha'&&(
                <div style={{marginBottom:4}}>
                  <TextCaptchaWidget verified={captchaVerified}
                    onVerify={()=>{ setCaptchaVerified(true); setError(''); }} C={C} t={t}/>
                  <div onClick={()=>setRememberMe(r=>!r)}
                    style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                      userSelect:'none',marginTop:12}}>
                    <div style={{width:20,height:20,borderRadius:5,flexShrink:0,
                      border:`2px solid ${rememberMe?C.brand:C.inputBorder}`,
                      background:rememberMe?C.brand:C.inputBg,
                      display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}>
                      {rememberMe&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                        <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
                      </svg>}
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
                    {error}
                  </p>
                )}
              </div>

              {/* CTA */}
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
                  ?<><div style={{width:18,height:18,border:'2px solid rgba(255,255,255,0.35)',
                      borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>{ctaLabel()}</>
                  :ctaLabel()
                }
              </button>

              {/* Switch to login */}
              <p style={{textAlign:'center',color:C.muted,fontSize:13,margin:'0 0 18px'}}>
                {t('Already have an account?')}{' '}
                <Link to="/login" style={{color:C.brand,fontWeight:700,textDecoration:'none'}}>{t('Log In')}</Link>
              </p>

              {/* Social + guest — step 0 only */}
              {step===0&&(
                <>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                    <div style={{flex:1,height:1,background:C.divider}}/>
                    <span style={{fontSize:12,color:C.dim,whiteSpace:'nowrap'}}>{t('or continue with')}</span>
                    <div style={{flex:1,height:1,background:C.divider}}/>
                  </div>
                  <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:14}}>
                    {/* Google — real OAuth */}
                    <SocialBtn label="Google"     icon={SOCIAL_ICONS[0].icon} C={C} onClick={handleGoogleLoginRedirect} disabled={!!socialAuthLoading} loading={socialAuthLoading==='google'}/>
                    {/* Facebook — real OAuth */}
                    <SocialBtn label="Facebook"   icon={SOCIAL_ICONS[1].icon} C={C} onClick={handleFacebookLoginRedirect} disabled={!!socialAuthLoading} loading={socialAuthLoading==='facebook'}/>
                    {/* Twitter — real OAuth */}
                    <SocialBtn label="Twitter / X" icon={SOCIAL_ICONS[2].icon} C={C} onClick={handleTwitterLoginRedirect} disabled={!!socialAuthLoading} loading={socialAuthLoading==='twitter'}/>
                    {/* LinkedIn real OAuth */}
                    <SocialBtn label="LinkedIn"   icon={SOCIAL_ICONS[3].icon} C={C} onClick={handleLinkedInLoginRedirect} disabled={!!socialAuthLoading} loading={socialAuthLoading==='linkedin'}/>
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

      {showGuestModal&&<GuestUsernameModal onClose={()=>setShowGuestModal(false)} onContinue={handleGuestContinue}/>}
      {showGuestInfoModal&&<GuestInfoModal onContinue={handleGuestLogin} onClose={()=>setShowGuestInfoModal(false)}/>}

      <style>{`
        @keyframes stepIn         {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn          {from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}}
        @keyframes spin           {to{transform:rotate(360deg)}}
        @keyframes shake          {0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        @keyframes orbFloat       {0%,100%{transform:translateY(0)}50%{transform:translateY(-22px)}}
        @keyframes particleFloat  {0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-18px) scale(1.15)}}
        @keyframes glyphPulse     {0%,100%{opacity:0.28}50%{opacity:0.40}}
        @keyframes dotPulse       {0%,100%{opacity:0.35;transform:scale(1)}50%{opacity:0.6;transform:scale(1.4)}}
        @keyframes drawLine       {to{stroke-dashoffset:0}}
        @keyframes iconPulse      {0%,100%{transform:scale(1);opacity:0.12}50%{transform:scale(1.12);opacity:0.2}}
        @keyframes quillAppear    {from{opacity:0;transform:rotate(-20deg) scale(0.7)}to{opacity:0.85;transform:rotate(0) scale(1)}}
        @keyframes drawStroke     {to{stroke-dashoffset:0}}
        @keyframes flapOpen       {0%,100%{transform:rotateX(0deg)}40%,60%{transform:rotateX(-35deg)}}
        @keyframes sparkleIn      {from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
        @keyframes letterSlide    {0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes shackleClose   {0%{transform:translateY(-4px)}40%,100%{transform:translateY(0)}}
        @keyframes starPop        {from{opacity:0;transform:scale(0) rotate(-20deg)}to{opacity:1;transform:scale(1) rotate(0)}}
        @keyframes verifiedSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tickPop        {from{transform:scale(0)}to{transform:scale(1)}}
        @keyframes drawVerifyCheck{to{stroke-dashoffset:0}}
        *{box-sizing:border-box}
        input:-webkit-autofill,input:-webkit-autofill:focus{transition:background-color 600000s 0s,color 600000s 0s}
        @media(max-width:480px){main>div{border-radius:18px!important}main>div>div:last-child{padding:24px 20px 20px!important}}
      `}</style>
    </>
  );
};

export default Register;

