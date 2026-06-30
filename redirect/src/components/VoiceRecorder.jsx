import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiSend } from 'react-icons/fi';
import soundManager from '../utils/soundManager';

const VoiceRecorder = ({ onSend, onCancel, isSending = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [sendReady, setSendReady] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const sendReadyTimerRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      if (sendReadyTimerRef.current) {
        clearTimeout(sendReadyTimerRef.current);
        sendReadyTimerRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current) {
        const stream = mediaRecorderRef.current.stream;
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setSendReady(false);
        if (sendReadyTimerRef.current) {
          clearTimeout(sendReadyTimerRef.current);
        }
        sendReadyTimerRef.current = setTimeout(() => {
          setSendReady(true);
          sendReadyTimerRef.current = null;
        }, 450);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      soundManager.play('startRecord');

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      onCancel();
    }
  };

  const stopRecording = () => {
    // Stop timer FIRST
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      soundManager.play('endRecord');
    }
  };

  const handleSend = () => {
    if (audioBlob && sendReady && !isSending) {
      onSend(audioBlob, duration);
    }
  };

  const handleCancel = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      const stream = mediaRecorderRef.current.stream;
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    onCancel();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="shrink-0 flex items-center gap-2 sm:gap-3 px-2 pt-2 sm:px-3 sm:pt-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        onClick={handleCancel}
        disabled={isSending}
        className="p-1.5 sm:p-2 hover:bg-red-100 rounded-full transition-colors flex-shrink-0"
        title="Cancel"
      >
        <FiX className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
      </button>

      <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
          {isRecording ? 'Recording' : 'Recorded'} {formatDuration(duration)}
        </span>
        {isRecording && (
          <div className="hidden sm:flex flex-1 items-center gap-1 overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {isRecording ? (
        <button
          onClick={stopRecording}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium text-sm flex-shrink-0"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!audioBlob || !sendReady || isSending}
          className="p-1.5 sm:p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          title={isSending ? 'Sending voice message' : (sendReady ? 'Send voice message' : 'Preparing voice message')}
        >
          {isSending ? (
            <span className="block w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
          ) : (
            <FiSend className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>
      )}
    </div>
  );
};

export default VoiceRecorder;
