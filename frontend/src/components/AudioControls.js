import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaTasks } from 'react-icons/fa';
import { WiStars } from 'react-icons/wi';
import { BarLoader } from 'react-spinners';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

const AudioControls = ({ text, content, blogId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const sentencesRef = useRef([]);
  const currentIndexRef = useRef(0);
  const synthRef = useRef(window.speechSynthesis);
  const volumeRef = useRef(1);

  const isMuted = volume === 0;

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (blogId) {
      const cached = localStorage.getItem(`blog_summary_${blogId}`);
      if (cached) {
        setSummary(cached);
      }
    }
  }, [blogId]);

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speakText = () => {
    const textToSpeak = showSummary ? summary : text;
    const cleanText = textToSpeak.replace(/[#*_`~\[\]()]/g, '').replace(/\n+/g, '. ');
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    sentencesRef.current = sentences;
    currentIndexRef.current = 0;
    speakNext();
  };

  const speakNext = () => {
    if (currentIndexRef.current < sentencesRef.current.length) {
      const sentence = sentencesRef.current[currentIndexRef.current].trim();
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = volumeRef.current;
      
      utterance.onstart = () => {
        setCurrentSentenceIndex(currentIndexRef.current);
      };
      
      utterance.onend = () => {
        currentIndexRef.current++;
        if (currentIndexRef.current < sentencesRef.current.length) {
          speakNext();
        } else {
          setIsPlaying(false);
          setCurrentSentenceIndex(-1);
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
      synthRef.current.cancel();
      setIsPlaying(true);
      setIsPaused(false);
      speakText();
    }
  };

  const handleMuteToggle = () => {
    setVolume(volume === 0 ? 1 : 0);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleToggleSummary = async () => {
    // Stop current audio
    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(-1);
    }

    if (showSummary) {
      setShowSummary(false);
      return;
    }

    if (summary) {
      setShowSummary(true);
      return;
    }

    setLoadingSummary(true);
    try {
      const { data } = await api.post('/ai/summarize', { content });
      setSummary(data.summary);
      if (blogId) {
        localStorage.setItem(`blog_summary_${blogId}`, data.summary);
      }
      setShowSummary(true);
    } catch (error) {
      console.error('Summarization error:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const renderContentWithHighlight = () => {
    const displayContent = showSummary ? summary : content;
    if (!displayContent) return null;
    
    const highlightClass = showSummary 
      ? 'bg-purple-200/60 dark:bg-purple-500/30'
      : 'bg-yellow-200/60 dark:bg-yellow-500/30';
    
    if (currentSentenceIndex === -1 || !sentencesRef.current[currentSentenceIndex]) {
      return (
        <div className="prose max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-800 dark:prose-ul:text-gray-200 prose-ol:text-gray-800 dark:prose-ol:text-gray-200">
          <ReactMarkdown>{displayContent}</ReactMarkdown>
        </div>
      );
    }
    
    const currentSentence = sentencesRef.current[currentSentenceIndex].trim();
    const parts = [];
    let remainingContent = displayContent;
    let foundMatch = false;
    
    const lines = displayContent.split('\n');
    lines.forEach((line, lineIdx) => {
      if (!foundMatch && line.includes(currentSentence)) {
        const idx = line.indexOf(currentSentence);
        const before = line.substring(0, idx);
        const after = line.substring(idx + currentSentence.length);
        
        parts.push(
          <div key={`line-${lineIdx}`} className="prose max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-800 dark:prose-ul:text-gray-200 prose-ol:text-gray-800 dark:prose-ol:text-gray-200">
            {before && <ReactMarkdown>{before}</ReactMarkdown>}
            <span className={`${highlightClass} px-1 rounded transition-colors duration-200`}>
              {currentSentence}
            </span>
            {after && <ReactMarkdown>{after}</ReactMarkdown>}
          </div>
        );
        foundMatch = true;
      } else {
        parts.push(
          <div key={`line-${lineIdx}`} className="prose max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-800 dark:prose-ul:text-gray-200 prose-ol:text-gray-800 dark:prose-ol:text-gray-200">
            <ReactMarkdown>{line}</ReactMarkdown>
          </div>
        );
      }
    });
    
    return <>{parts}</>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 sm:gap-3 bg-gray-100 dark:bg-gray-800 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg shadow-sm">
        <button
          onClick={handlePlayPause}
          className="bg-blue-600 text-white p-2 sm:p-3 rounded-full hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          title={isPlaying && !isPaused ? 'Pause' : 'Play'}
        >
          {isPlaying && !isPaused ? <FaPause size={12} className="sm:w-3.5 sm:h-3.5" /> : <FaPlay size={12} className="sm:w-3.5 sm:h-3.5" />}
        </button>
        
        <button
          onClick={handleMuteToggle}
          className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 sm:p-2 flex-shrink-0"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <FaVolumeMute size={16} className="sm:w-[18px] sm:h-[18px]" /> : <FaVolumeUp size={16} className="sm:w-[18px] sm:h-[18px]" />}
        </button>
        
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${volume * 100}%, #D1D5DB ${volume * 100}%, #D1D5DB 100%)`
            }}
            title="Volume"
          />
          <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 w-7 sm:w-10 text-right font-medium flex-shrink-0">{Math.round(volume * 100)}%</span>
        </div>

        <button
          onClick={handleToggleSummary}
          disabled={loadingSummary}
          className="flex items-center gap-1 px-1.5 sm:px-3 py-1.5 sm:py-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title={showSummary ? 'Show Original' : 'Show Summary'}
        >
          {showSummary ? (
            <FaTasks size={16} className="sm:w-[18px] sm:h-[18px] bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
          ) : (
            <WiStars size={24} className="sm:w-7 sm:h-7 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
          )}
          <span className="text-[10px] sm:text-sm font-medium hidden xs:inline bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {showSummary ? 'Original' : 'Summary'}
          </span>
        </button>
      </div>

      {loadingSummary && (
        <div className="flex flex-col items-center gap-2 py-4">
          <BarLoader color="#3B82F6" width="100%" height={4} />
          <p className="text-sm text-gray-600 dark:text-gray-400">Generating summary...</p>
        </div>
      )}
      
      {!loadingSummary && content && renderContentWithHighlight()}
    </div>
  );
};

export default AudioControls;
