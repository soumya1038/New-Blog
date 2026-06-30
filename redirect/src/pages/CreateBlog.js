import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import ReactMarkdown from 'react-markdown';
import toast, { Toaster } from 'react-hot-toast';
import AIBlogGenerator from '../components/AIBlogGenerator';
import AIContentTools from '../components/AIContentTools';
import UnauthorizedModal from '../components/UnauthorizedModal';
import TemplatePreview from '../components/TemplatePreview';
import ContentProductTagsEditor from '../components/ContentProductTagsEditor';
import {
  getArticleTemplateById,
  DEFAULT_ARTICLE_TEMPLATE_ID,
  CUSTOM_ARTICLE_TEMPLATE_ID,
  createDefaultCustomTemplate,
  normalizeCustomTemplate,
  recommendArticleTemplate
} from '../utils/articleTemplates';
import { FaArrowLeft, FaExternalLinkAlt, FaPlus, FaTimes } from 'react-icons/fa';
import { MdOutlineSwitchAccessShortcutAdd, MdOutlinePublish, MdStorefront } from 'react-icons/md';
import { IoIosCheckmarkCircle, IoIosCloseCircleOutline } from 'react-icons/io';
import { IoColorPaletteOutline } from 'react-icons/io5';
import { TbBrandBlogger } from 'react-icons/tb';
import { CiMicrophoneOn, CiSaveDown2 } from 'react-icons/ci';
import { BsFillCalendarRangeFill } from 'react-icons/bs';
import { BsPatchPlus } from 'react-icons/bs';
import { PiMonitorPlayDuotone } from 'react-icons/pi';
import { HiStop } from 'react-icons/hi';
import { GridLoader } from 'react-spinners';
import { RotatingLines } from 'react-loader-spinner';
import soundManager from '../utils/soundManager';

const VOICE_FLOW_STATE = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing'
};

const WHISPER_PROXY_ROUTES = {
  health: '/voice/whisper/health',
  wake: '/voice/whisper/wake',
  transcribe: '/voice/whisper/transcribe'
};

const toSocketBase = (httpBase) => httpBase.replace(/^http/i, 'ws').replace(/\/$/, '');

const resolveWhisperProxyWsUrl = () => {
  const override = (process.env.REACT_APP_WHISPER_PROXY_WS_URL || '').trim();
  if (override) return override;

  const configuredApiUrl = (process.env.REACT_APP_API_URL || '').trim();
  if (configuredApiUrl) return `${toSocketBase(configuredApiUrl)}/api/voice/whisper/ws`;

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/api/voice/whisper/ws`;
  }

  return '';
};
const MEDIA_RECORDER_CANDIDATE_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg'
];

const CreateBlog = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState('General');
  const [coverImage, setCoverImage] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [galleryItems, setGalleryItems] = useState([]);
  const [metaDescription, setMetaDescription] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveSuccess, setAutoSaveSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isShortMode, setIsShortMode] = useState(false);
  const [isArticleMode, setIsArticleMode] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [videoUrls, setVideoUrls] = useState(['']);
  const [isDark, setIsDark] = useState(false);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [selectedArticleTemplateId, setSelectedArticleTemplateId] = useState(DEFAULT_ARTICLE_TEMPLATE_ID);
  const [customArticleTemplate, setCustomArticleTemplate] = useState(createDefaultCustomTemplate());
  const [contentOrigin, setContentOrigin] = useState('manual');
  const [voiceFlowState, setVoiceFlowState] = useState(VOICE_FLOW_STATE.IDLE);
  const [voiceRetryAttempt, setVoiceRetryAttempt] = useState(0);
  const [voiceRetryMaxAttempts, setVoiceRetryMaxAttempts] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceToolbarHost, setVoiceToolbarHost] = useState(null);
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [externalProductLinks, setExternalProductLinks] = useState([]);
  const [externalProductDraft, setExternalProductDraft] = useState({
    title: '',
    url: '',
    platform: '',
    priceLabel: '',
    thumbnail: '',
  });
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const whisperProxyWsUrl = useMemo(() => resolveWhisperProxyWsUrl(), []);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const autoSaveTimerRef = useRef(null);
  const simpleMDERef = useRef(null);
  const editorWrapperRef = useRef(null);
  const voiceToolbarHostRef = useRef(null);
  const shortModeTextareaRef = useRef(null);
  const voiceFlowStateRef = useRef(VOICE_FLOW_STATE.IDLE);
  const voiceSessionIdRef = useRef(0);
  const voiceCancelledRef = useRef(false);
  const voiceTransitionLockRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const whisperSocketRef = useRef(null);
  const recorderChunksRef = useRef([]);
  const finalSegmentsRef = useRef([]);
  const latestPartialRef = useRef('');
  const voiceReconnectAttemptsRef = useRef(0);
  const voiceAnalyserContextRef = useRef(null);
  const voiceAnalyserRef = useRef(null);
  const voiceSourceNodeRef = useRef(null);
  const voiceLevelRafRef = useRef(null);
  const MAX_GALLERY_IMAGES = 8;
  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  const FORCED_TEMPLATE_THEME_MODE = 'auto';

  const isBlobUrl = (url = '') => typeof url === 'string' && url.startsWith('blob:');

  const getPersistedGalleryPayload = () => {
    const persisted = galleryItems.filter((item) => !item.local && item.url && !isBlobUrl(item.url));
    return {
      galleryImages: persisted.map((item) => item.url),
      galleryImagePublicIds: persisted.map((item) => item.publicId || '')
    };
  };

  const uploadGalleryItems = async () => {
    const uploaded = [];

    for (const item of galleryItems) {
      if (item.local && item.file) {
        const formData = new FormData();
        formData.append('image', item.file);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploaded.push({ url: imageData.url, publicId: imageData.public_id || '' });
        continue;
      }

      if (item.url && !isBlobUrl(item.url)) {
        uploaded.push({ url: item.url, publicId: item.publicId || '' });
      }
    }

    return {
      galleryImages: uploaded.map((entry) => entry.url),
      galleryImagePublicIds: uploaded.map((entry) => entry.publicId)
    };
  };

  useEffect(() => {
    voiceFlowStateRef.current = voiceFlowState;
  }, [voiceFlowState]);

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const getVoiceErrorMessage = (errorLike) => {
    const raw = (typeof errorLike === 'string' ? errorLike : errorLike?.message || '').trim();
    const normalized = raw.toLowerCase();

    if (normalized.includes('notallowederror') || normalized.includes('permission denied')) {
      return 'Microphone permission denied. Please allow microphone access in browser settings.';
    }
    if (normalized.includes('notfounderror') || normalized.includes('no microphone')) {
      return 'No microphone detected. Please connect a microphone and retry.';
    }
    if (normalized.includes('unauthorized')) {
      return 'Session expired. Please refresh and try again.';
    }
    if (normalized.includes('audio_too_large')) {
      return 'Audio too large. Please record a shorter segment.';
    }
    if (normalized.includes('empty_audio')) {
      return 'No audio captured. Check your microphone.';
    }
    if (normalized.includes('transcription_failed')) {
      return 'Transcription failed. Please retry.';
    }
    if (
      normalized.includes('service_sleeping')
      || normalized.includes('voice_proxy_failed')
      || normalized.includes('upstream_gateway')
      || normalized.includes('server_busy')
      || normalized.includes('503')
    ) {
      return 'Voice engine is waking up. Please retry in a few seconds.';
    }
    if (normalized.includes('ws_session_error') || normalized.includes('websocket') || normalized.includes('connection dropped')) {
      return 'Connection dropped during dictation.';
    }
    if (normalized.includes('focused element does not support text insertion') || normalized.includes('no active element')) {
      return 'Please click target input and try again.';
    }
    if (normalized.includes('securityerror')) {
      return 'Microphone is blocked for this page. Please use HTTPS or localhost.';
    }
    if (normalized.includes('invalidstateerror')) {
      return 'Recorder was interrupted. Please try again.';
    }
    return raw || 'Voice dictation failed. Please retry.';
  };

  const stopVoiceLevelMonitor = (resetLevel = true) => {
    if (voiceLevelRafRef.current) {
      cancelAnimationFrame(voiceLevelRafRef.current);
      voiceLevelRafRef.current = null;
    }
    if (voiceSourceNodeRef.current) {
      try {
        voiceSourceNodeRef.current.disconnect();
      } catch (error) {
        console.error('Voice source disconnect failed:', error);
      }
      voiceSourceNodeRef.current = null;
    }
    if (voiceAnalyserRef.current) {
      try {
        voiceAnalyserRef.current.disconnect();
      } catch (error) {
        console.error('Voice analyser disconnect failed:', error);
      }
      voiceAnalyserRef.current = null;
    }
    if (voiceAnalyserContextRef.current) {
      voiceAnalyserContextRef.current.close().catch(() => {});
      voiceAnalyserContextRef.current = null;
    }
    if (resetLevel) {
      setVoiceLevel(0);
    }
  };

  const stopVoiceStream = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onerror = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error('Media recorder stop failed:', error);
        }
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const closeWhisperSocket = () => {
    if (!whisperSocketRef.current) return;
    try {
      whisperSocketRef.current.onopen = null;
      whisperSocketRef.current.onclose = null;
      whisperSocketRef.current.onerror = null;
      whisperSocketRef.current.onmessage = null;
      if (whisperSocketRef.current.readyState === WebSocket.OPEN || whisperSocketRef.current.readyState === WebSocket.CONNECTING) {
        whisperSocketRef.current.close();
      }
    } catch (error) {
      console.error('Whisper socket close failed:', error);
    } finally {
      whisperSocketRef.current = null;
    }
  };

  const resetVoiceBuffers = () => {
    recorderChunksRef.current = [];
    finalSegmentsRef.current = [];
    latestPartialRef.current = '';
    voiceReconnectAttemptsRef.current = 0;
  };

  const cleanupVoiceFlow = () => {
    voiceSessionIdRef.current += 1;
    stopVoiceStream();
    closeWhisperSocket();
    stopVoiceLevelMonitor();
    resetVoiceBuffers();
    setVoiceRetryAttempt(0);
    setVoiceRetryMaxAttempts(0);
    setVoiceFlowState(VOICE_FLOW_STATE.IDLE);
    voiceCancelledRef.current = false;
    voiceTransitionLockRef.current = false;
  };

  const extractTranscript = () => {
    const finalText = finalSegmentsRef.current.join(' ').trim();
    if (finalText) return finalText;
    return latestPartialRef.current.trim();
  };

  const insertTranscriptAtSelection = (text) => {
    const cleaned = (text || '').trim();
    if (!cleaned) return false;

    const finalText = cleaned.endsWith(' ') ? cleaned : `${cleaned} `;

    if (!isShortMode && simpleMDERef.current?.codemirror) {
      const editor = simpleMDERef.current.codemirror;
      editor.focus();
      editor.replaceSelection(finalText);
      setContent(editor.getValue());
      return true;
    }

    if (isShortMode && shortModeTextareaRef.current) {
      const input = shortModeTextareaRef.current;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const next = input.value.slice(0, start) + finalText + input.value.slice(end);
      const cursorPosition = start + finalText.length;
      setContent(next);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(cursorPosition, cursorPosition);
      });
      return true;
    }

    throw new Error('Focused element does not support text insertion.');
  };

  const startVoiceLevelMonitor = (stream) => {
    stopVoiceLevelMonitor();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const analyserContext = new AudioContextClass();
      const source = analyserContext.createMediaStreamSource(stream);
      const analyser = analyserContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      voiceAnalyserContextRef.current = analyserContext;
      voiceAnalyserRef.current = analyser;
      voiceSourceNodeRef.current = source;

      const tick = () => {
        if (!voiceAnalyserRef.current) return;

        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const nextLevel = Math.max(0.02, Math.min(1, rms * 4.2));
        setVoiceLevel((previous) => (Math.abs(previous - nextLevel) > 0.02 ? nextLevel : previous));
        voiceLevelRafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (error) {
      console.error('Unable to start voice level monitor:', error);
    }
  };

  const warmWhisperFlow = async (timeoutMs = 30000) => {
    if (!whisperProxyWsUrl) return false;

    try {
      await api.post(`${WHISPER_PROXY_ROUTES.wake}?wait=false`);
    } catch (error) {
      console.error('Whisper wake failed:', error);
    }

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const { data } = await api.get(WHISPER_PROXY_ROUTES.health);
        const loaded = Boolean(data?.model?.loaded ?? data?.data?.model?.loaded);
        if (loaded) {
          return true;
        }
      } catch (error) {
        console.error('Whisper health check failed:', error);
      }
      await pause(2000);
    }

    return false;
  };

  const connectWhisperSocket = (sessionId) => new Promise((resolve, reject) => {
    const ws = new WebSocket(whisperProxyWsUrl);
    let settled = false;

    const fail = (reason) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch (error) {
        console.error('Socket close after failure failed:', error);
      }
      reject(reason);
    };

    const timeoutRef = setTimeout(() => {
      fail(new Error('ws_session_error'));
    }, 12000);

    ws.onopen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutRef);
      whisperSocketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload?.ok === false) {
            const mapped = payload?.error?.code || payload?.error?.message || 'transcription_failed';
            toast.error(getVoiceErrorMessage(mapped));
            return;
          }

          const text = payload?.data?.text?.trim?.() || '';
          if (!text) return;

          if (payload?.is_partial) {
            latestPartialRef.current = text;
          } else {
            if (!finalSegmentsRef.current.length || finalSegmentsRef.current[finalSegmentsRef.current.length - 1] !== text) {
              finalSegmentsRef.current.push(text);
            }
            latestPartialRef.current = '';
          }
        } catch (error) {
          toast.error('Received invalid transcription payload.');
        }
      };

      ws.onclose = () => {
        if (voiceSessionIdRef.current !== sessionId || voiceCancelledRef.current) return;
        if (voiceFlowStateRef.current !== VOICE_FLOW_STATE.RECORDING) return;

        if (voiceReconnectAttemptsRef.current >= 1) {
          return;
        }

        voiceReconnectAttemptsRef.current += 1;
        connectWhisperSocket(sessionId)
          .catch(() => {});
      };

      ws.onerror = () => {};

      resolve(ws);
    };

    ws.onerror = () => {
      clearTimeout(timeoutRef);
      fail(new Error('ws_session_error'));
    };
  });

  const transcribeViaUpload = async (blob) => {
    if (!blob || blob.size === 0) return '';

    const createFormData = () => {
      const formData = new FormData();
      formData.append('model_name', 'tiny.en');
      formData.append('files', blob, blob.type?.includes('mp4') ? 'audio.m4a' : 'audio.webm');
      return formData;
    };

    let lastErrorCode = 'transcription_failed';
    const maxAttempts = 4;
    const estimatedMinutes = Math.max(0.5, blob.size / (1024 * 1024 * 1.2));
    const adaptiveTimeoutMs = Math.min(180000, Math.max(45000, Math.floor(estimatedMinutes * 60000)));
    setVoiceRetryMaxAttempts(maxAttempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        setVoiceRetryAttempt(attempt);
        const response = await api.post(WHISPER_PROXY_ROUTES.transcribe, createFormData(), {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: adaptiveTimeoutMs + (attempt - 1) * 10000
        });

        const payload = response.data;
        if (payload?.ok === false) {
          lastErrorCode = payload?.error?.code || payload?.error?.message || 'transcription_failed';
          const retryableCode = ['service_sleeping', 'server_busy', 'voice_proxy_failed', 'upstream_gateway'].includes(lastErrorCode);

          if (attempt < maxAttempts && retryableCode) {
            await warmWhisperFlow(12000);
            await pause(1200 * attempt);
            continue;
          }
          throw new Error(lastErrorCode);
        }

        const transcript = (payload?.result?.text || payload?.data?.text || '').trim();
        setVoiceRetryAttempt(0);
        setVoiceRetryMaxAttempts(0);
        return transcript;
      } catch (error) {
        lastErrorCode = (
          error?.response?.data?.error?.code
          || error?.response?.data?.error?.message
          || error?.response?.data?.message
          || error?.message
          || 'transcription_failed'
        );
        if (error?.response?.status === 503) {
          lastErrorCode = 'service_sleeping';
        }

        const retryableCode = ['service_sleeping', 'server_busy', 'voice_proxy_failed', 'upstream_gateway'].includes(lastErrorCode);
        const retryableStatus = [502, 503, 504].includes(error?.response?.status || 0);

        if (attempt < maxAttempts && (retryableCode || retryableStatus)) {
          await warmWhisperFlow(12000);
          await pause(1200 * attempt);
          continue;
        }
      }
    }

    throw new Error(lastErrorCode);
  };

  const startVoiceRecording = async () => {
    if (voiceTransitionLockRef.current || voiceFlowStateRef.current !== VOICE_FLOW_STATE.IDLE) return;

    if (previewMode) {
      toast.error('Switch to write mode before using voice dictation.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Audio recording is not supported in this browser.');
      return;
    }

    voiceTransitionLockRef.current = true;
    voiceCancelledRef.current = false;
    resetVoiceBuffers();
    setVoiceRetryAttempt(0);
    setVoiceRetryMaxAttempts(0);
    setVoiceFlowState(VOICE_FLOW_STATE.PREPARING);

    const sessionId = Date.now();
    voiceSessionIdRef.current = sessionId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (voiceCancelledRef.current || voiceSessionIdRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        cleanupVoiceFlow();
        return;
      }

      mediaStreamRef.current = stream;
      startVoiceLevelMonitor(stream);

      if (voiceSessionIdRef.current !== sessionId || voiceFlowStateRef.current !== VOICE_FLOW_STATE.PREPARING) {
        cleanupVoiceFlow();
        return;
      }

      const supportedMimeType = MEDIA_RECORDER_CANDIDATE_TYPES.find((candidate) => (
        typeof MediaRecorder.isTypeSupported === 'function' ? MediaRecorder.isTypeSupported(candidate) : false
      ));

      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0) return;
        recorderChunksRef.current.push(event.data);

        const activeSocket = whisperSocketRef.current;
        if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return;

        try {
          const chunk = await event.data.arrayBuffer();
          activeSocket.send(chunk);
        } catch (error) {
          console.error('Failed to stream audio chunk:', error);
        }
      };

      recorder.onerror = () => {};

      recorder.start(250);
      setVoiceFlowState(VOICE_FLOW_STATE.RECORDING);
      setVoiceReady(true);
      soundManager.play('startVoiceRecording');

      if (whisperProxyWsUrl) {
        warmWhisperFlow(8000)
          .then((ready) => {
            setVoiceReady(ready);
            if (!ready || voiceSessionIdRef.current !== sessionId || voiceFlowStateRef.current !== VOICE_FLOW_STATE.RECORDING) {
              return null;
            }
            return connectWhisperSocket(sessionId);
          })
          .catch((error) => {
            console.error('Voice streaming setup failed; upload transcription will be used.', error);
          });
      }
    } catch (error) {
      toast.error(getVoiceErrorMessage(error));
      cleanupVoiceFlow();
    } finally {
      voiceTransitionLockRef.current = false;
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceFlowStateRef.current === VOICE_FLOW_STATE.IDLE) return;
    voiceCancelledRef.current = true;
    cleanupVoiceFlow();
  };

  const stopVoiceRecording = async () => {
    if (voiceTransitionLockRef.current || voiceFlowStateRef.current !== VOICE_FLOW_STATE.RECORDING) return;

    voiceTransitionLockRef.current = true;
    voiceCancelledRef.current = true;
    setVoiceFlowState(VOICE_FLOW_STATE.TRANSCRIBING);
    soundManager.play('stopVoiceRecording');
    setVoiceRetryAttempt(0);
    setVoiceRetryMaxAttempts(0);
    stopVoiceLevelMonitor();

    try {
      const recorder = mediaRecorderRef.current;
      const audioBlob = await new Promise((resolve) => {
        if (!recorder || recorder.state === 'inactive') {
          resolve(recorderChunksRef.current.length ? new Blob(recorderChunksRef.current, { type: 'audio/webm' }) : null);
          return;
        }

        const complete = () => {
          resolve(recorderChunksRef.current.length ? new Blob(recorderChunksRef.current, { type: recorder.mimeType || 'audio/webm' }) : null);
        };

        recorder.addEventListener('stop', complete, { once: true });
        try {
          recorder.stop();
        } catch (error) {
          complete();
        }
      });

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      await pause(350);
      closeWhisperSocket();

      let transcript = extractTranscript();

      if (!transcript && audioBlob) {
        transcript = await transcribeViaUpload(audioBlob);
      }

      if (!transcript) {
        throw new Error('empty_audio');
      }

      const pasted = insertTranscriptAtSelection(transcript);
      if (!pasted) {
        throw new Error('Focused element does not support text insertion.');
      }

    } catch (error) {
      toast.error(getVoiceErrorMessage(error));
    } finally {
      cleanupVoiceFlow();
    }
  };

  useEffect(() => {
    if (isShortMode && voiceFlowStateRef.current !== VOICE_FLOW_STATE.IDLE) {
      cancelVoiceRecording();
    }
  }, [isShortMode]);

  useEffect(() => {
    let rafId = 0;

    const clearVoiceToolbarHost = () => {
      if (voiceToolbarHostRef.current?.parentNode) {
        voiceToolbarHostRef.current.parentNode.removeChild(voiceToolbarHostRef.current);
      }
      voiceToolbarHostRef.current = null;
      setVoiceToolbarHost(null);
    };

    if (previewMode || isShortMode) {
      clearVoiceToolbarHost();
      return () => {};
    }

    const mountHost = () => {
      const wrapper = editorWrapperRef.current;
      if (!wrapper) {
        rafId = requestAnimationFrame(mountHost);
        return;
      }

      const toolbar = wrapper.querySelector('.editor-toolbar');
      if (!toolbar) {
        rafId = requestAnimationFrame(mountHost);
        return;
      }

      let host = toolbar.querySelector('.voice-toolbar-host');
      if (!host) {
        host = document.createElement('span');
        host.className = 'voice-toolbar-host';
        host.style.display = 'inline-flex';
        host.style.alignItems = 'center';
        host.style.gap = '6px';
        host.style.float = 'right';
        host.style.marginLeft = '8px';
        host.style.position = 'relative';
        host.style.zIndex = '6';
        toolbar.appendChild(host);
      }

      voiceToolbarHostRef.current = host;
      setVoiceToolbarHost(host);
    };

    rafId = requestAnimationFrame(mountHost);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      clearVoiceToolbarHost();
    };
  }, [previewMode, isShortMode, isArticleMode, isDark]);

  useEffect(() => {
    let active = true;

    if (!whisperProxyWsUrl) {
      setVoiceReady(false);
      return () => {};
    }

    const bootVoiceEngine = async () => {
      const ready = await warmWhisperFlow(45000);
      if (active) {
        setVoiceReady(ready);
      }
    };

    bootVoiceEngine();
    return () => {
      active = false;
    };
  }, [whisperProxyWsUrl]);

  useEffect(() => () => {
    voiceCancelledRef.current = true;
    voiceSessionIdRef.current += 1;
    stopVoiceStream();
    closeWhisperSocket();
    stopVoiceLevelMonitor(false);
    resetVoiceBuffers();
  }, []);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (location.state?.repostContent) {
      setContent(location.state.repostContent);
      setTitle(location.state.repostTitle || '');
      if (location.state.repostTags) {
        setTags(location.state.repostTags.split(',').map(t => t.trim()).filter(t => t));
      }
      if (location.state.repostMetaDescription) {
        setMetaDescription(location.state.repostMetaDescription);
      }
      if (location.state.repostCategory) {
        setCategory(location.state.repostCategory);
      }
      if (location.state.repostCoverImage) {
        setCoverImage(location.state.repostCoverImage);
      }
      if (location.state.isShortMode) {
        setIsShortMode(true);
      }
      toast.success('Blog content loaded for repost!');
    }
  }, [location.state]);

  // Track unsaved changes
  useEffect(() => {
    if (title || content || tags.length > 0 || coverImage || galleryItems.length > 0 || metaDescription || (isArticleMode && selectedArticleTemplateId)) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, tags, coverImage, galleryItems, metaDescription, isArticleMode, selectedArticleTemplateId, customArticleTemplate]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!title.trim() || !content.trim()) return;

    autoSaveTimerRef.current = setInterval(() => {
      autoSaveDraft();
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [title, content, tags, isArticleMode, isShortMode, selectedArticleTemplateId, customArticleTemplate, category, coverImage, galleryItems, metaDescription, videoUrls, user]);

  const autoSaveDraft = async () => {
    if (!title.trim() || !content.trim() || !user) return;

    setAutoSaving(true);
    try {
      const filteredVideoUrls = videoUrls.filter(url => url.trim());
      const persistedGallery = getPersistedGalleryPayload();
      const endpointBase = isArticleMode ? '/articles' : (isShortMode ? '/shorts' : '/blogs');

      const payload = {
        title,
        content,
        tags: tags.join(', '),
        category,
        coverImage,
        videoUrls: JSON.stringify(filteredVideoUrls),
        metaDescription,
        isDraft: true,
        ...(isShortMode ? {} : productAttachmentPayload()),
        ...(isArticleMode ? {
          templateId: selectedArticleTemplateId,
          customTemplate: selectedArticleTemplateId === CUSTOM_ARTICLE_TEMPLATE_ID ? customArticleTemplate : null,
          templateThemeMode: FORCED_TEMPLATE_THEME_MODE,
          galleryImages: JSON.stringify(persistedGallery.galleryImages),
          galleryImagePublicIds: JSON.stringify(persistedGallery.galleryImagePublicIds)
        } : {})
      };

      if (draftId) {
        await api.put(`${endpointBase}/${draftId}`, payload);
      } else {
        const { data: existingDrafts } = await api.get(`${endpointBase}?draft=true`);
        const existingDraft = isArticleMode
          ? existingDrafts.articles?.find(d => d.title === title)
          : (isShortMode ? existingDrafts.shorts?.find(d => d.title === title) : existingDrafts.blogs?.find(d => d.title === title));

        if (existingDraft) {
          await api.put(`${endpointBase}/${existingDraft._id}`, payload);
          setDraftId(existingDraft._id);
        } else {
          const { data } = await api.post(endpointBase, payload);
          setDraftId(isArticleMode ? data.article._id : (isShortMode ? data.short._id : data.blog._id));
        }
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setAutoSaving(false);
      setAutoSaveSuccess(true);
      setTimeout(() => setAutoSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Auto-save failed:', err);
      setAutoSaving(false);
    }
  };

  const productAttachmentPayload = () => ({
    linkedProduct: linkedProducts[0]?._id || null,
    linkedProducts: linkedProducts.map(product => product._id).filter(Boolean),
    externalProductLinks: JSON.stringify(externalProductLinks),
    isPromoPost: linkedProducts.length > 0 || externalProductLinks.length > 0,
  });

  const addLinkedProduct = (product) => {
    setLinkedProducts(current => (
      current.some(item => item._id === product._id) ? current : [...current, product]
    ));
    setProductSearch('');
    setProductResults([]);
    setShowProductSearch(false);
  };

  const removeLinkedProduct = (productId) => {
    setLinkedProducts(current => current.filter(product => product._id !== productId));
  };

  const addExternalProductLink = () => {
    const title = externalProductDraft.title.trim();
    const url = externalProductDraft.url.trim();
    if (!title || !url) {
      toast.error('External product title and URL are required');
      return;
    }
    setExternalProductLinks(current => [
      ...current,
      {
        title,
        url,
        platform: externalProductDraft.platform.trim() || 'External',
        priceLabel: externalProductDraft.priceLabel.trim(),
        thumbnail: externalProductDraft.thumbnail.trim(),
      },
    ]);
    setExternalProductDraft({ title: '', url: '', platform: '', priceLabel: '', thumbnail: '' });
  };

  const searchMyProducts = async (query) => {
    if (!query.trim()) {
      setProductResults([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const { data } = await api.get('/marketplace', { params: { search: query, limit: 20 } });
      const selectedIds = new Set(linkedProducts.map(product => product._id));
      const filtered = (data.products || []).filter(product => !selectedIds.has(product._id));
      setProductResults(filtered);
    } catch {}
    setSearchingProducts(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!user) {
      setShowUnauthorizedModal(true);
      return;
    }

    // Validation
    if (title.length > 100) {
      toast.error('Title must be less than 100 characters');
      return;
    }
    if (!content.trim()) {
      toast.error('Content cannot be empty');
      return;
    }

    // Validate scheduled date
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Please select both date and time for scheduling');
        return;
      }
      const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduleDateTime <= new Date()) {
        toast.error('Scheduled date must be in the future');
        return;
      }
    }

    setLoading(true);
    try {
      let uploadedImageUrl = coverImage || '';
      let cloudinaryPublicId = '';

      // Upload image if selected
      if (coverImageFile) {
        const formData = new FormData();
        formData.append('image', coverImageFile);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrl = imageData.url;
        cloudinaryPublicId = imageData.public_id;
      }
      const galleryUploadPayload = isArticleMode
        ? await uploadGalleryItems()
        : { galleryImages: [], galleryImagePublicIds: [] };

      const wordCount = content.split(/\s+/).filter(w => w).length;
      const scheduledPublishDate = isScheduled ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null;
      const filteredVideoUrls = videoUrls.filter(url => url.trim());
      
      // Article Mode - only create article
      if (isArticleMode) {
        const templateResolution = resolveArticleTemplateForSubmission();
        const templateIdForSubmit = templateResolution.templateId;
        const customTemplateForSubmit =
          templateIdForSubmit === CUSTOM_ARTICLE_TEMPLATE_ID ? customArticleTemplate : null;

        const { data } = await api.post('/articles', { 
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage: uploadedImageUrl,
          cloudinaryPublicId,
          videoUrls: JSON.stringify(filteredVideoUrls),
          metaDescription,
          isDraft: false,
          isScheduled,
          scheduledPublishDate,
          templateId: templateIdForSubmit,
          customTemplate: customTemplateForSubmit,
          templateThemeMode: FORCED_TEMPLATE_THEME_MODE,
          galleryImages: JSON.stringify(galleryUploadPayload.galleryImages),
          galleryImagePublicIds: JSON.stringify(galleryUploadPayload.galleryImagePublicIds),
          ...productAttachmentPayload()
        });
        
        // console.log('Article created:', data);
        setHasUnsavedChanges(false);
        if (templateResolution.usedRecommendation && templateResolution.recommendation?.templateName) {
          toast.success(`Auto-selected suggested template: ${templateResolution.recommendation.templateName}`);
          setSelectedArticleTemplateId(templateIdForSubmit);
        }
        toast.success(isScheduled ? 'Article scheduled successfully!' : 'Article published successfully!');
        const articleId = data.article?.slug || data.article?._id;
        // console.log('Navigating to:', `/article/${articleId}`);
        setTimeout(() => navigate(isScheduled ? '/drafts' : `/article/${articleId}`), 1000);
        return;
      }
      
      // Regular Blog mode
      if (!isShortMode) {
        if (wordCount <= 100) {
          // Create BOTH blog and short (2 separate documents)
          // Blog owns the cloudinary image
          const { data: blogData } = await api.post('/blogs', { 
            title, 
            content, 
            tags: tags.join(', '),
            category,
            coverImage: uploadedImageUrl,
            cloudinaryPublicId,
            videoUrls: JSON.stringify(filteredVideoUrls),
            metaDescription,
            isDraft: false,
            isScheduled,
            scheduledPublishDate,
            ...productAttachmentPayload()
          });
          
          // Create short in Short table
          await api.post('/shorts', { 
            title, 
            content, 
            tags: tags.join(', '),
            category,
            coverImage: uploadedImageUrl,
            videoUrls: JSON.stringify(filteredVideoUrls),
            metaDescription,
            isDraft: false,
            isScheduled,
            scheduledPublishDate
          });
          
          setHasUnsavedChanges(false);
          toast.success(isScheduled ? 'Scheduled successfully!' : 'Published as blog and short successfully!');
          setTimeout(() => navigate(isScheduled ? '/drafts' : `/blog/${blogData.blog.slug || blogData.blog._id}`), 1000);
        } else {
          // Create only BLOG
          const { data } = await api.post('/blogs', {
            title, 
            content, 
            tags: tags.join(', '),
            category,
            coverImage: uploadedImageUrl,
            cloudinaryPublicId,
            videoUrls: JSON.stringify(filteredVideoUrls),
            metaDescription,
            isDraft: false,
            isScheduled,
            scheduledPublishDate,
            ...productAttachmentPayload()
          });
          
          setHasUnsavedChanges(false);
          toast.success(isScheduled ? 'Blog scheduled successfully!' : 'Blog published successfully!');
          setTimeout(() => navigate(isScheduled ? '/drafts' : `/blog/${data.blog.slug || data.blog._id}`), 1000);
        }
      } else {
        // Short Blog mode - only create SHORT
        const { data } = await api.post('/shorts', {
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage: uploadedImageUrl,
          cloudinaryPublicId,
          videoUrls: JSON.stringify(filteredVideoUrls),
          metaDescription,
          isDraft: false,
          isScheduled,
          scheduledPublishDate
        });
        
        setHasUnsavedChanges(false);
        toast.success(isScheduled ? 'Short scheduled successfully!' : 'Short blog published successfully!');
        setTimeout(() => navigate(isScheduled ? '/drafts' : `/shorts/${data.short._id}`), 1000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create blog');
      setError(err.response?.data?.message || 'Failed to create blog');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!user) {
      setShowUnauthorizedModal(true);
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title before saving draft');
      return;
    }
    setLoading(true);
    try {
      let uploadedImageUrl = coverImage || '';
      let cloudinaryPublicId = '';
      const filteredVideoUrls = videoUrls.filter(url => url.trim());

      // Upload image if selected
      if (coverImageFile) {
        const formData = new FormData();
        formData.append('image', coverImageFile);
        const { data: imageData } = await api.post('/blogs/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrl = imageData.url;
        cloudinaryPublicId = imageData.public_id;
      }

      const galleryUploadPayload = isArticleMode
        ? await uploadGalleryItems()
        : { galleryImages: [], galleryImagePublicIds: [] };

      if (draftId) {
        // Update existing draft
        const endpoint = isArticleMode ? `/articles/${draftId}` : (isShortMode ? `/shorts/${draftId}` : `/blogs/${draftId}`);
        await api.put(endpoint, {
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage: uploadedImageUrl || coverImage,
          cloudinaryPublicId: cloudinaryPublicId || undefined,
          videoUrls: JSON.stringify(filteredVideoUrls),
          metaDescription,
          isDraft: true,
          ...(isShortMode ? {} : productAttachmentPayload()),
          ...(isArticleMode ? {
            templateId: selectedArticleTemplateId,
          customTemplate: selectedArticleTemplateId === CUSTOM_ARTICLE_TEMPLATE_ID ? customArticleTemplate : null,
          templateThemeMode: FORCED_TEMPLATE_THEME_MODE,
            galleryImages: JSON.stringify(galleryUploadPayload.galleryImages),
            galleryImagePublicIds: JSON.stringify(galleryUploadPayload.galleryImagePublicIds)
          } : {})
        });
      } else {
        // Check if draft with same title exists
        const endpoint = isArticleMode ? '/articles?draft=true' : (isShortMode ? '/shorts?draft=true' : '/blogs?draft=true');
        const { data: existingDrafts } = await api.get(endpoint);
        const existingDraft = isArticleMode 
          ? existingDrafts.articles?.find(d => d.title === title)
          : (isShortMode ? existingDrafts.shorts?.find(d => d.title === title) : existingDrafts.blogs?.find(d => d.title === title));
        
        if (existingDraft) {
          // Delete old draft and create new one
          const deleteEndpoint = isArticleMode ? `/articles/${existingDraft._id}` : (isShortMode ? `/shorts/${existingDraft._id}` : `/blogs/${existingDraft._id}`);
          await api.delete(deleteEndpoint);
        }
        
        // Create new draft
        const createEndpoint = isArticleMode ? '/articles' : (isShortMode ? '/shorts' : '/blogs');
        const { data } = await api.post(createEndpoint, {
          title, 
          content, 
          tags: tags.join(', '),
          category,
          coverImage: uploadedImageUrl,
          cloudinaryPublicId,
          videoUrls: JSON.stringify(filteredVideoUrls),
          metaDescription,
          isDraft: true,
          ...(isShortMode ? {} : productAttachmentPayload()),
          ...(isArticleMode ? {
            templateId: selectedArticleTemplateId,
          customTemplate: selectedArticleTemplateId === CUSTOM_ARTICLE_TEMPLATE_ID ? customArticleTemplate : null,
          templateThemeMode: FORCED_TEMPLATE_THEME_MODE,
            galleryImages: JSON.stringify(galleryUploadPayload.galleryImages),
            galleryImagePublicIds: JSON.stringify(galleryUploadPayload.galleryImagePublicIds)
          } : {})
        });
        setDraftId(isArticleMode ? data.article._id : (isShortMode ? data.short._id : data.blog._id));
      }
      
      // Clear file after upload
      if (coverImageFile) {
        setCoverImageFile(null);
      }
      
      setHasUnsavedChanges(false);
      toast.success('Draft saved successfully!');
      setTimeout(() => navigate('/drafts'), 1000);
    } catch (err) {
      console.error('Save draft error:', err);
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error(err.response?.data?.message || 'Failed to save draft');
        setError(err.response?.data?.message || 'Failed to save draft');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = (aiContent, aiMetaDescription) => {
    setContent(aiContent);
    setContentOrigin('ai');
    if (aiMetaDescription) {
      setMetaDescription(aiMetaDescription);
    }
    toast.success('AI content generated!');
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelModal(true);
    } else {
      navigate('/home');
    }
  };

  const confirmCancel = () => {
    setShowCancelModal(false);
    navigate('/home');
  };

  const handleTitlesGenerated = (titles) => {
    if (titles.length > 0) {
      setTitle(titles[0]);
      toast.success('Title generated! Check other suggestions in console.');
      // console.log('Other title suggestions:', titles.slisce(1));
    }
  };

  const handleTagsGenerated = (aiTags) => {
    const newTags = aiTags.split(',').map(t => t.trim()).filter(t => t);
    setTags(newTags);
    toast.success('Tags generated!');
  };

  const handleContentImproved = (improvedContent) => {
    setContent(improvedContent);
    setContentOrigin('ai');
    toast.success('Content improved!');
  };

  const addTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setCoverImageFile(file);
    setCoverImage(URL.createObjectURL(file));
    toast.success('Image selected! Will upload on publish.');
  };

  const handleRemoveImage = () => {
    if (coverImageFile && isBlobUrl(coverImage)) {
      URL.revokeObjectURL(coverImage);
    }
    setCoverImage('');
    setCoverImageFile(null);
    toast.success('Image removed.');
  };

  const handleGalleryImagesUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const availableSlots = Math.max(0, MAX_GALLERY_IMAGES - galleryItems.length);
    if (availableSlots === 0) {
      toast.error('You can upload up to ' + MAX_GALLERY_IMAGES + ' gallery images.');
      event.target.value = '';
      return;
    }

    const validFiles = [];
    let oversizedCount = 0;

    files.forEach((file) => {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        oversizedCount += 1;
      } else {
        validFiles.push(file);
      }
    });

    const selected = validFiles.slice(0, availableSlots);
    const nextItems = selected.map((file, index) => ({
      id: 'gallery-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 8),
      url: URL.createObjectURL(file),
      file,
      local: true,
      publicId: ''
    }));

    setGalleryItems((prev) => [...prev, ...nextItems]);

    if (oversizedCount > 0) {
      toast.error(oversizedCount + ' image(s) were larger than 5MB and skipped.');
    }

    if (validFiles.length > availableSlots) {
      toast.error('Only ' + availableSlots + ' additional gallery image(s) could be added.');
    }

    if (nextItems.length > 0) {
      toast.success(nextItems.length + ' gallery image(s) added.');
    }

    event.target.value = '';
  };

  const handleRemoveGalleryImage = (itemId) => {
    setGalleryItems((prev) => {
      const target = prev.find((item) => item.id === itemId);
      if (target?.local && isBlobUrl(target.url)) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((item) => item.id !== itemId);
    });
  };

  const templateSuggestionInput = useMemo(
    () => ({
      title,
      content,
      tags,
      category,
      coverImage,
      metaDescription,
      videoUrls: videoUrls.filter((url) => url.trim()),
      galleryImages: galleryItems.map((item) => item.url).filter(Boolean),
      author: user,
      createdAt: new Date().toISOString(),
      contentOrigin
    }),
    [
      title,
      content,
      tags,
      category,
      coverImage,
      metaDescription,
      videoUrls,
      galleryItems,
      user,
      contentOrigin
    ]
  );

  const templateRecommendation = useMemo(
    () => (isArticleMode ? recommendArticleTemplate(templateSuggestionInput) : null),
    [isArticleMode, templateSuggestionInput]
  );

  const resolveArticleTemplateForSubmission = () => {
    if (!isArticleMode) {
      return {
        templateId: selectedArticleTemplateId,
        usedRecommendation: false,
        recommendation: templateRecommendation
      };
    }

    if (!templateRecommendation || !templateRecommendation.templateId) {
      return {
        templateId: selectedArticleTemplateId || DEFAULT_ARTICLE_TEMPLATE_ID,
        usedRecommendation: false,
        recommendation: null
      };
    }

    const selectedTemplate = selectedArticleTemplateId || DEFAULT_ARTICLE_TEMPLATE_ID;
    const shouldAutoApply = selectedTemplate === DEFAULT_ARTICLE_TEMPLATE_ID;

    return {
      templateId: shouldAutoApply ? templateRecommendation.templateId : selectedTemplate,
      usedRecommendation: shouldAutoApply && templateRecommendation.templateId !== selectedTemplate,
      recommendation: templateRecommendation
    };
  };

  const handleOpenTemplatePreview = () => {
    if (templateRecommendation?.templateName) {
      toast.success(`Suggested template: ${templateRecommendation.templateName}`);
    }
    setShowTemplatePreview(true);
  };

  const wordCount = content.split(/\s+/).filter(w => w).length;
  const readingTime = Math.ceil(wordCount / 200);

  const mdeOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: t('Write your blog content in Markdown...'),
    minHeight: '300px',
    autofocus: false,
    status: false,
    theme: isDark ? 'dark' : 'default'
  }), [t, isDark]);

  const renderVoiceToolbarControls = () => {
    if (!voiceToolbarHost || isShortMode || previewMode) {
      return null;
    }

    const voiceAccentColor = isDark ? '#f8fafc' : 'var(--brand-primary)';
    const showRetryCounter = (
      voiceFlowState === VOICE_FLOW_STATE.TRANSCRIBING
      && voiceRetryMaxAttempts > 1
      && voiceRetryAttempt > 0
    );

    return createPortal(
      <div className="voice-toolbar-controls">
        {(voiceFlowState === VOICE_FLOW_STATE.PREPARING || voiceFlowState === VOICE_FLOW_STATE.RECORDING) && (
          <button
            type="button"
            onClick={cancelVoiceRecording}
            className="voice-tool-btn voice-tool-btn-danger"
            title="Cancel voice dictation"
            aria-label="Cancel voice dictation"
          >
            <FaTimes className="h-3 w-3" />
          </button>
        )}

        {voiceFlowState === VOICE_FLOW_STATE.IDLE && (
          <button
            type="button"
            onClick={startVoiceRecording}
            className="voice-tool-btn voice-tool-btn-mic"
            title={voiceReady ? 'Start voice dictation' : 'Start voice dictation'}
          >
            <CiMicrophoneOn className="h-4 w-4" />
          </button>
        )}

        {voiceFlowState === VOICE_FLOW_STATE.PREPARING && (
          <div className="voice-tool-loader" role="status" aria-live="polite">
            <RotatingLines
              visible
              width="14"
              strokeColor={voiceAccentColor}
              strokeWidth="4"
              animationDuration="0.75"
              ariaLabel="Preparing voice engine"
            />
          </div>
        )}

        {voiceFlowState === VOICE_FLOW_STATE.RECORDING && (
          <>
            <div className="voice-tool-bars" aria-hidden>
              {[0.55, 0.82, 0.68, 1, 0.72, 0.95, 0.62].map((multiplier, index) => (
                <span
                  key={'voice-toolbar-bar-' + index}
                  className="voice-tool-bar"
                  style={{
                    height: `${Math.max(6, Math.round((6 + voiceLevel * 18) * multiplier))}px`,
                    background: voiceAccentColor,
                    transition: 'height 70ms linear'
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="voice-tool-btn voice-tool-btn-stop"
              title="Stop recording"
            >
              <HiStop className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {voiceFlowState === VOICE_FLOW_STATE.TRANSCRIBING && (
          <div className="voice-tool-transcribing">
            <RotatingLines
              visible
              width="14"
              strokeColor={voiceAccentColor}
              strokeWidth="4"
              animationDuration="0.75"
              ariaLabel="Transcribing audio"
            />
            {showRetryCounter && (
              <span
                className="voice-tool-attempt"
                aria-label={`Transcription attempt ${voiceRetryAttempt} of ${voiceRetryMaxAttempts}`}
              >
                {voiceRetryAttempt}/{voiceRetryMaxAttempts}
              </span>
            )}
          </div>
        )}
      </div>,
      voiceToolbarHost
    );
  };

  return (
    <div className="min-h-screen py-8 relative overflow-hidden" style={{ background: isDark ? 'var(--background-primary)' : 'linear-gradient(180deg, var(--background-primary) 0%, var(--background-secondary) 100%)' }}>
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ background: isDark ? 'rgba(107,122,58,0.55)' : 'rgba(201,162,39,0.28)' }}></div>
        <div className="absolute top-40 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" style={{ background: isDark ? 'rgba(201,166,90,0.38)' : 'rgba(232,216,176,0.52)' }}></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" style={{ background: isDark ? 'rgba(178,84,79,0.28)' : 'rgba(201,162,39,0.18)' }}></div>
      </div>
      
      <Toaster />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-4 font-semibold transition-colors" style={{ color: 'var(--brand-primary)' }}
        >
          <FaArrowLeft /> {t('Back')}
        </button>
        <div className="backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-8 border" style={{ background: isDark ? 'rgba(24,32,24,0.84)' : 'rgba(255,255,255,0.9)', borderColor: 'var(--border-default)' }}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                {isArticleMode ? t('Create Article') : (isShortMode ? t('Create Short Blog') : t('Create New Blog'))}
              </h1>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsArticleMode(false);
                    setIsShortMode(false);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    !isShortMode && !isArticleMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <TbBrandBlogger className="w-5 h-5" /> {t('Blog')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!user?.isVerified) {
                      toast.error('Only verified users can create articles. Please verify your account.');
                      return;
                    }
                    setIsArticleMode(true);
                    setIsShortMode(false);
                  }}
                  disabled={!user?.isVerified}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    isArticleMode
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : !user?.isVerified
                      ? 'bg-[var(--surface-card)] text-[var(--text-muted)] border border-[var(--border-default)] cursor-not-allowed opacity-60'
                      : 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm hover:bg-[var(--surface-elevated)]'
                  }`}
                  title={!user?.isVerified ? 'Only verified users can create articles' : ''}
                >
                  <img src={isArticleMode ? '/image/article_logo_light.png' : (isDark ? '/image/article_logo_light.png' : '/image/article_logo_dark.png')} alt="Article" className="w-5 h-5" /> {t('Article')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsArticleMode(false);
                    setIsShortMode(true);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    isShortMode
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <MdOutlineSwitchAccessShortcutAdd className="w-5 h-5" /> {t('Short')}
                </button>
              </div>
            </div>
            {lastSaved && (
              <span className="text-xs text-[var(--text-muted)]">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {error && <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 p-3 rounded-lg mb-4">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6 create-edit-form">
            <div>
              <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                required
                placeholder={isArticleMode ? t('Enter article title...') : (isShortMode ? t('Enter short blog title...') : t('Enter blog title...'))}
                maxLength={100}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">{title.length}/100 {t('characters')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Category')}</label>
                <select
                  value={showCustomCategory ? 'Others' : category}
                  onChange={(e) => {
                    if (e.target.value === 'Others') {
                      setShowCustomCategory(true);
                      setCategory('');
                    } else {
                      setShowCustomCategory(false);
                      setCategory(e.target.value);
                      setCustomCategory('');
                    }
                  }}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                >
                  <option value="General">{t('General')}</option>
                  <option value="Technology">{t('Technology')}</option>
                  <option value="Lifestyle">{t('Lifestyle')}</option>
                  <option value="Travel">{t('Travel')}</option>
                  <option value="Food">{t('Food')}</option>
                  <option value="Health">{t('Health')}</option>
                  <option value="Business">{t('Business')}</option>
                  <option value="Education">{t('Education')}</option>
                  <option value="Entertainment">{t('Entertainment')}</option>
                  <option value="Sports">{t('Sports')}</option>
                  <option value="Science">{t('Science')}</option>
                  <option value="Fashion">{t('Fashion')}</option>
                  <option value="Finance">{t('Finance')}</option>
                  <option value="Gaming">{t('Gaming')}</option>
                  <option value="Music">{t('Music')}</option>
                  <option value="Art">{t('Art')}</option>
                  <option value="Photography">{t('Photography')}</option>
                  <option value="DIY">{t('DIY')}</option>
                  <option value="Parenting">{t('Parenting')}</option>
                  <option value="Pets">{t('Pets')}</option>
                  <option value="Others">{t('Others')}</option>
                </select>
                {showCustomCategory && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      setCategory(e.target.value);
                    }}
                    placeholder={t('Enter custom category...')}
                    className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] mt-2"
                  />
                )}
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Cover Image')}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                {uploadingImage && <p className="text-xs mt-1" style={{ color: 'var(--brand-primary)' }}>{t('Uploading...')}</p>}
                {coverImage && (
                  <div className="mt-2 relative">
                    <img src={coverImage} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isArticleMode && (
              <div>
                <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Gallery Images')}</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryImagesUpload}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">{t('Upload up to 8 gallery images. These images are used inside article templates.')}</p>

                {galleryItems.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {galleryItems.map((item) => (
                      <div key={item.id} className="relative rounded-lg overflow-hidden border border-[var(--border-default)] bg-[var(--surface-elevated)]">
                        <img
                          src={item.url}
                          alt="Gallery image"
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(item.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                          aria-label="Remove gallery image"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[var(--text-secondary)] mb-2 font-semibold flex items-center gap-2">
                <PiMonitorPlayDuotone className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                <span>{t('Video URLs')}</span>
                <span className="text-xs text-[var(--text-muted)] font-normal">({t('Optional')})</span>
              </label>
              {videoUrls.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...videoUrls];
                      newUrls[index] = e.target.value;
                      setVideoUrls(newUrls);
                    }}
                    className="flex-1 px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  />
                  {videoUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVideoUrls(videoUrls.filter((_, i) => i !== index))}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    >
                      <IoIosCloseCircleOutline className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              {videoUrls.length < 5 && (
                <button
                  type="button"
                  onClick={() => setVideoUrls([...videoUrls, ''])}
                  className="p-2 rounded-lg transition" style={{ background: 'var(--tag-bg)', color: 'var(--brand-primary)' }}
                >
                  <BsPatchPlus className="w-5 h-5" />
                </button>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-2">{t('Supports YouTube, Vimeo, and direct video links (max 5 videos)')}</p>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('SEO Meta Description')}</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                placeholder={t('Brief description for search engines (max 160 characters)')}
                maxLength={160}
                rows={2}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">{metaDescription.length}/160 {t('characters')}</p>
            </div>
            
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <label className="block text-[var(--text-secondary)] font-semibold">{t('Content')}</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="px-3 py-1 text-sm bg-[var(--background-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--surface-elevated)] rounded-lg transition"
                  >
                    {previewMode ? t('Write') : t('Preview')}
                  </button>
                  {isArticleMode && (
                    <button
                      type="button"
                      onClick={handleOpenTemplatePreview}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition font-semibold shadow-lg" style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
                    >
                      <IoColorPaletteOutline className="w-4 h-4" />
                      Template Preview
                    </button>
                  )}
                  <AIBlogGenerator 
                    title={title} 
                    tags={tags.join(', ')}
                    category={category}
                    existingContent={content}
                    onGenerate={handleAIGenerate}
                    onMetaGenerate={setMetaDescription}
                    isShortMode={isShortMode}
                    isArticleMode={isArticleMode}
                    onUnauthorized={() => setShowUnauthorizedModal(true)}
                  />
                </div>
              </div>

              {isArticleMode && (
                <div className="mt-2 flex flex-col gap-2 text-xs text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="flex items-center gap-2">
                      <IoColorPaletteOutline className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                      Layout selected:
                      <span className="font-semibold">{getArticleTemplateById(selectedArticleTemplateId).name}</span>
                    </p>
                    {templateRecommendation?.templateName && (
                      <p className="flex items-center gap-2 text-[11px] sm:text-xs">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                        Suggested:
                        <span className="font-semibold text-emerald-400">{templateRecommendation.templateName}</span>
                        <span className="text-[var(--text-muted)]">({templateRecommendation.reason})</span>
                      </p>
                    )}
                  </div>
                  <p className="rounded-lg border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: 'var(--border-default)', background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>Theme sync: Navbar mode</p>
                </div>
              )}
              
              {previewMode ? (
                <div className="border border-[var(--border-default)] rounded-lg p-4 min-h-[300px] prose dark:prose-invert max-w-none bg-[var(--surface-card)] text-[var(--text-primary)]">
                  <ReactMarkdown>{content || `*${t('No content to preview')}*`}</ReactMarkdown>
                </div>
              ) : isShortMode ? (
                <textarea
                  ref={shortModeTextareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  placeholder={t('Write your short blog (max 100 words)...')}
                  rows={6}
                  maxLength={700}
                />
              ) : (
                <div ref={editorWrapperRef}>
                  {isArticleMode ? (
                    <SimpleMDE
                      key="simplemde-article"
                      value={content}
                      onChange={(value) => setContent(value)}
                      getMdeInstance={(instance) => { simpleMDERef.current = instance; }}
                      options={mdeOptions}
                    />
                  ) : (
                    <SimpleMDE
                      key="simplemde-editor"
                      value={content}
                      onChange={(value) => setContent(value)}
                      getMdeInstance={(instance) => { simpleMDERef.current = instance; }}
                      options={mdeOptions}
                    />
                  )}
                  {renderVoiceToolbarControls()}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-2">
                <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                  {t('Word Count')}: {wordCount} {isShortMode && wordCount > 100 && <span className="text-red-500">({t('Max 100 words')})</span>} | {t('Reading Time')}: {readingTime} {t('min read')}
                </p>
                <AIContentTools
                  content={content}
                  isShortMode={isShortMode}
                  isArticleMode={isArticleMode}
                  onTitlesGenerated={handleTitlesGenerated}
                  onTagsGenerated={handleTagsGenerated}
                  onContentImproved={handleContentImproved}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[var(--text-secondary)] mb-2 font-semibold">{t('Tags')}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-sm flex items-center gap-2" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:opacity-80 transition"
                    >
                      <FaTimes size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                placeholder={t('Type tag and press Enter or comma')}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('Press Enter or comma to add tags')}</p>
            </div>
            
            {/* Schedule Publication Section */}
            <div className="border-t border-[var(--border-default)] pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BsFillCalendarRangeFill className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                  <label className="block text-[var(--text-secondary)] font-semibold">{t('Schedule Publication')}</label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--surface-elevated)] dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--brand-soft)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-default)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-primary)] dark:peer-checked:bg-[#D9A56A]"></div>
                </label>
              </div>
              
              {isScheduled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-2 text-sm">{t('Publish Date')}</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      required={isScheduled}
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-2 text-sm">{t('Publish Time')}</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      required={isScheduled}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {!isShortMode && (
              <ContentProductTagsEditor
                linkedProducts={linkedProducts}
                setLinkedProducts={setLinkedProducts}
                externalProductLinks={externalProductLinks}
                setExternalProductLinks={setExternalProductLinks}
              />
            )}

            {false && !isShortMode && (
              <div className="border border-[var(--border-color)] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <MdStorefront className="text-violet-500" size={16} />
                    Product Tags
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowProductSearch(value => !value)}
                    className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:underline"
                  >
                    {showProductSearch ? <FaTimes size={10} /> : <FaPlus size={10} />}
                    {showProductSearch ? 'Close' : 'Add product'}
                  </button>
                </div>

                {showProductSearch && (
                  <div className="space-y-2">
                    <input
                      value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); searchMyProducts(e.target.value); }}
                      placeholder="Search marketplace products..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    {searchingProducts && <p className="text-xs text-[var(--text-muted)]">Searching...</p>}
                    {productResults.map(p => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => addLinkedProduct(p)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border-color)] hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors text-left"
                      >
                        <img src={p.thumbnail || ''} alt="" className="w-10 h-10 rounded-lg object-cover bg-[var(--bg-secondary)] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.title}</p>
                          <p className="text-xs text-[var(--text-muted)]">Rs. {p.price?.toLocaleString('en-IN')}</p>
                        </div>
                      </button>
                    ))}
                    {productSearch && productResults.length === 0 && !searchingProducts && (
                      <p className="text-xs text-[var(--text-muted)]">No products match "{productSearch}"</p>
                    )}
                  </div>
                )}

                {linkedProducts.length > 0 && (
                  <div className="space-y-2">
                    {linkedProducts.map(product => (
                      <div key={product._id} className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                        <img src={product.thumbnail || ''} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{product.title}</p>
                          <p className="text-xs text-violet-600 dark:text-violet-400">Marketplace product</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLinkedProduct(product._id)}
                          className="text-[var(--text-muted)] hover:text-red-500"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    value={externalProductDraft.title}
                    onChange={e => setExternalProductDraft(draft => ({ ...draft, title: e.target.value }))}
                    placeholder="External product title"
                    className="px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <input
                    value={externalProductDraft.url}
                    onChange={e => setExternalProductDraft(draft => ({ ...draft, url: e.target.value }))}
                    placeholder="External or affiliate URL"
                    className="px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <input
                    value={externalProductDraft.platform}
                    onChange={e => setExternalProductDraft(draft => ({ ...draft, platform: e.target.value }))}
                    placeholder="Platform"
                    className="px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <div className="flex gap-2">
                    <input
                      value={externalProductDraft.priceLabel}
                      onChange={e => setExternalProductDraft(draft => ({ ...draft, priceLabel: e.target.value }))}
                      placeholder="Price label"
                      className="flex-1 px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={addExternalProductLink}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
                    >
                      <FaExternalLinkAlt size={11} /> Add
                    </button>
                  </div>
                </div>

                {externalProductLinks.length > 0 && (
                  <div className="space-y-2">
                    {externalProductLinks.map((link, index) => (
                      <div key={`${link.url}-${index}`} className="flex items-center gap-3 p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                        <FaExternalLinkAlt className="text-orange-500 shrink-0" size={16} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{link.title}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">{link.platform || 'External'} - {link.url}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExternalProductLinks(current => current.filter((_, itemIndex) => itemIndex !== index))}
                          className="text-[var(--text-muted)] hover:text-red-500"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
                >
                  <MdOutlinePublish className="w-5 h-5" />
                  {loading ? t('Publishing...') : (isScheduled ? t('Schedule') : t('Publish'))}
                </button>
                
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={loading}
                  className="theme-soft-button px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CiSaveDown2 className="w-5 h-5" />
                  {loading ? t('Saving...') : t('Save Draft')}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="theme-soft-button px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('Cancel')}
                </button>
              </div>

              {/* Auto-save Indicator */}
              {(autoSaving || autoSaveSuccess) && (
                <div className="flex items-center gap-2">
                  {autoSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" style={{ color: 'var(--brand-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs text-[var(--text-secondary)]">{t('Saving...')}</span>
                    </>
                  ) : (
                    <IoIosCheckmarkCircle className="text-green-500 text-xl" />
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* GridLoader for Publishing */}
      {loading && (
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center">
          <div className="text-center">
            <GridLoader color="#3B82F6" size={20} />
            <p className="mt-6 text-white text-lg font-semibold">
              {t('Saving...')}
            </p>
            {(coverImageFile || galleryItems.some((item) => item.local)) && (
              <p className="mt-2 text-[var(--text-secondary)] text-sm">{t('Uploading...')}</p>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl p-6 max-w-md w-full border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t('Unsaved Changes')}</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              {t('You have unsaved changes. Are you sure you want to leave? All your progress will be lost.')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmCancel}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                {t('Yes, Leave')}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 theme-soft-button py-3 rounded-lg font-semibold transition"
              >
                {t('Stay')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unauthorized Modal */}
      <UnauthorizedModal
        isOpen={showUnauthorizedModal}
        onClose={() => setShowUnauthorizedModal(false)}
        message="Please login or create an account to create content on Lekhon"
      />

      {/* Template Preview Modal */}
      {showTemplatePreview && (
        <TemplatePreview
          article={{
            title,
            content,
            author: user,
            coverImage,
            metaDescription,
            tags,
            category,
            videoUrls: videoUrls.filter(url => url.trim()),
            galleryImages: galleryItems.map((item) => item.url),
            templateThemeMode: FORCED_TEMPLATE_THEME_MODE,
            createdAt: new Date().toISOString()
          }}
          selectedTemplateId={selectedArticleTemplateId}
          customTemplate={customArticleTemplate}
          suggestedTemplateId={templateRecommendation?.templateId}
          suggestedReason={templateRecommendation?.reason}
          onApplyTemplate={(templateId, appliedCustomTemplate) => {
            setSelectedArticleTemplateId(templateId);
            if (templateId === CUSTOM_ARTICLE_TEMPLATE_ID) {
              setCustomArticleTemplate(normalizeCustomTemplate(appliedCustomTemplate || customArticleTemplate));
            }
            toast.success(`Template selected: ${getArticleTemplateById(templateId).name}`);
            setShowTemplatePreview(false);
          }}
          onClose={() => setShowTemplatePreview(false)}
        />
      )}

    </div>
  );
};

export default CreateBlog;
