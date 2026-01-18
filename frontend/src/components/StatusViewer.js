import React, { useState, useEffect } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const StatusViewer = ({ statuses, onClose, userName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const currentStatus = statuses[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {statuses.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100"
              style={{ width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white z-10 hover:opacity-80"
      >
        <FaTimes size={24} />
      </button>

      {/* User info */}
      <div className="absolute top-12 left-4 text-white z-10">
        <p className="font-semibold">{userName}</p>
        <p className="text-xs opacity-80">
          {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 text-white z-10 hover:opacity-80"
        >
          <FaChevronLeft size={32} />
        </button>
      )}
      {currentIndex < statuses.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 text-white z-10 hover:opacity-80"
        >
          <FaChevronRight size={32} />
        </button>
      )}

      {/* Status content */}
      <div className="max-w-md w-full h-full flex items-center justify-center p-4">
        {currentStatus.image ? (
          <img
            src={currentStatus.image}
            alt="Status"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 w-full h-full rounded-lg flex items-center justify-center p-8">
            <p className="text-white text-2xl text-center">{currentStatus.text}</p>
          </div>
        )}
        {currentStatus.text && currentStatus.image && (
          <div className="absolute bottom-20 left-0 right-0 text-center">
            <p className="text-white text-lg px-4 py-2 bg-black/50 rounded-lg inline-block">
              {currentStatus.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusViewer;
