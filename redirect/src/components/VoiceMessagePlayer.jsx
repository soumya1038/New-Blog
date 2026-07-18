import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';
import api from '../services/api';
import { buildApiUrl } from '../utils/apiBaseUrl';
import { getSafeHttpUrl } from '../utils/safeMediaUrls';

const VoiceMessagePlayer = ({ messageId, audioUrl, duration, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const audioRef = useRef(null);

  const resolveDirectUrl = useCallback(() => {
    const candidate = audioUrl?.startsWith('http')
      ? audioUrl
      : audioUrl
        ? buildApiUrl(audioUrl)
        : '';
    return getSafeHttpUrl(candidate);
  }, [audioUrl]);

  const requestAccessUrl = useCallback(async () => {
    if (resolvedUrl) return resolvedUrl;
    const directUrl = resolveDirectUrl();
    if (!messageId) {
      if (directUrl) setResolvedUrl(directUrl);
      return directUrl;
    }

    setIsLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/files/messages/${messageId}/access`);
      const safeUrl = getSafeHttpUrl(data?.url);
      if (!safeUrl) throw new Error('Invalid media URL');
      setResolvedUrl(safeUrl);
      return safeUrl;
    } catch (error) {
      setLoadError(true);
      return '';
    } finally {
      setIsLoading(false);
    }
  }, [messageId, resolveDirectUrl, resolvedUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setLoadError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      const url = await requestAccessUrl();
      if (!url) return;
      if (audio.src !== url) {
        audio.src = url;
        audio.load();
      }
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      setLoadError(true);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    const safeSeconds = Number(seconds) || 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className={`flex items-center gap-2 ${isOwn ? 'text-white' : 'text-gray-900'}`}>
      <audio ref={audioRef} preload="none" />
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading || loadError}
        title={loadError ? 'Voice message unavailable' : isPlaying ? 'Pause' : 'Play'}
        className={`p-2 rounded-full transition-colors disabled:opacity-60 ${
          isOwn
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30'
            : 'bg-gray-300 hover:bg-gray-400'
        }`}
      >
        {isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-[120px]">
        <div className={`h-1 rounded-full ${isOwn ? 'bg-white bg-opacity-30' : 'bg-gray-300'} relative overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all ${isOwn ? 'bg-white' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="text-xs font-medium min-w-[35px]">
        {isLoading ? '...' : formatTime(isPlaying ? currentTime : duration)}
      </span>
    </div>
  );
};

export default VoiceMessagePlayer;
