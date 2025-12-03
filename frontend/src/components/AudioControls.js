import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

const AudioControls = ({ text, content }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const [highlightedText, setHighlightedText] = useState('');
  const utterancesRef = useRef([]);
  const currentIndexRef = useRef(0);
  const currentUtteranceRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const isMuted = volume === 0;

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (currentUtteranceRef.current && isPlaying) {
      currentUtteranceRef.current.volume = volume;
    }
  }, [volume, isPlaying]);

  const speakText = () => {
    const cleanText = text.replace(/[#*_`~\[\]()]/g, '').replace(/\n+/g, '. ');
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    utterancesRef.current = sentences;
    currentIndexRef.current = 0;
    speakNext();
  };

  const speakNext = () => {
    if (currentIndexRef.current < utterancesRef.current.length) {
      const sentence = utterancesRef.current[currentIndexRef.current].trim();
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = volume;
      currentUtteranceRef.current = utterance;
      
      utterance.onstart = () => {
        setHighlightedText(sentence);
      };
      
      utterance.onend = () => {
        currentIndexRef.current++;
        if (currentIndexRef.current < utterancesRef.current.length) {
          speakNext();
        } else {
          setIsPlaying(false);
          setHighlightedText('');
          currentUtteranceRef.current = null;
        }
      };
      
      synthRef.current.speak(utterance);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying && !isPaused) {
      synthRef.current.pause();
      setIsPaused(true);
    } else if (isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    } else {
      setIsPlaying(true);
      setIsPaused(false);
      speakText();
    }
  };

  const handleMuteToggle = () => {
    const newVolume = volume === 0 ? 1 : 0;
    setVolume(newVolume);
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.volume = newVolume;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.volume = newVolume;
    }
  };

  const renderContentWithHighlight = () => {
    if (!content) return null;
    
    if (!highlightedText) {
      return (
        <div className="prose max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      );
    }
    
    const parts = content.split(highlightedText);
    if (parts.length === 1) {
      return (
        <div className="prose max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      );
    }
    
    return (
      <div className="prose max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown>{parts[0]}</ReactMarkdown>
        <span className="bg-black/20 dark:bg-white/20 px-1 rounded">
          <ReactMarkdown>{highlightedText}</ReactMarkdown>
        </span>
        <ReactMarkdown>{parts[1]}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
        <button
          onClick={handlePlayPause}
          className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition"
        >
          {isPlaying && !isPaused ? <FaPause size={12} /> : <FaPlay size={12} />}
        </button>
        
        <button
          onClick={handleMuteToggle}
          className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          {isMuted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
        </button>
        
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-[38px] h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${volume * 100}%, #D1D5DB ${volume * 100}%, #D1D5DB 100%)`
            }}
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 w-8">{Math.round(volume * 100)}%</span>
        </div>
      </div>
      
      {content && renderContentWithHighlight()}
    </div>
  );
};

export default AudioControls;
