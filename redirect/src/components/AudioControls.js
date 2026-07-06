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
      ? 'blog-audio-highlight is-summary'
      : 'blog-audio-highlight';
    
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
            <span className={highlightClass}>
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
    <div className="blog-audio-controls">
      <div className="blog-audio-controls-bar">
        <button
          onClick={handlePlayPause}
          className="blog-audio-play-button"
          title={isPlaying && !isPaused ? 'Pause' : 'Play'}
        >
          {isPlaying && !isPaused ? <FaPause /> : <FaPlay />}
        </button>
        
        <button
          onClick={handleMuteToggle}
          className="blog-audio-icon-button"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        
        <div className="blog-audio-volume">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="blog-audio-range"
            style={{
              background: `linear-gradient(to right, var(--blog-detail-accent) 0%, var(--blog-detail-accent) ${volume * 100}%, color-mix(in srgb, var(--blog-muted) 24%, transparent) ${volume * 100}%, color-mix(in srgb, var(--blog-muted) 24%, transparent) 100%)`
            }}
            title="Volume"
          />
          <span className="blog-audio-volume-value">{Math.round(volume * 100)}%</span>
        </div>

        <button
          onClick={handleToggleSummary}
          disabled={loadingSummary}
          className="blog-audio-summary-button"
          title={showSummary ? 'Show Original' : 'Show Summary'}
        >
          {showSummary ? (
            <FaTasks />
          ) : (
            <WiStars />
          )}
          <span>
            {showSummary ? 'Original' : 'Summary'}
          </span>
        </button>
      </div>

      {loadingSummary && (
        <div className="blog-audio-loading">
          <BarLoader color="var(--blog-detail-accent)" width="100%" height={4} />
          <p>Generating summary...</p>
        </div>
      )}
      
      {!loadingSummary && content && renderContentWithHighlight()}
    </div>
  );
};

export default AudioControls;
