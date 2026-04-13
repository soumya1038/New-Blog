import React, { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';

const VoiceMessagePlayer = ({ audioUrl, duration, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  
  // Ensure full URL for audio
  const fullAudioUrl = audioUrl?.startsWith('http') 
    ? audioUrl 
    : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${audioUrl}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = (e) => {
      console.error('Audio playback error:', e);
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
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2 ${isOwn ? 'text-white' : 'text-gray-900'}`}>
      <audio ref={audioRef} src={fullAudioUrl} />
      
      <button
        onClick={togglePlay}
        className={`p-2 rounded-full transition-colors ${
          isOwn 
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30' 
            : 'bg-gray-300 hover:bg-gray-400'
        }`}
      >
        {isPlaying ? (
          <FiPause className="w-4 h-4" />
        ) : (
          <FiPlay className="w-4 h-4 ml-0.5" />
        )}
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
        {formatTime(isPlaying ? currentTime : duration)}
      </span>
    </div>
  );
};

export default VoiceMessagePlayer;
