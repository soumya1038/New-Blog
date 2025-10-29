import React, { useEffect, useState, useRef } from 'react';

const IntroVideoModal = ({ onClose }) => {
  const [canSkip, setCanSkip] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const videoRef = useRef(null);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Wait for video to be ready before playing
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          // Wait a bit for video to load
          await new Promise(resolve => setTimeout(resolve, 200));
          await videoRef.current.play();
          console.log('✅ Video playing');
        } catch (err) {
          console.error('❌ Video autoplay failed:', err);
          // If autoplay fails, enable skip immediately
          setCanSkip(true);
          setCountdown(0);
        }
      }
    };

    playVideo();

    // Enable skip button after 3 seconds
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.body.style.overflow = 'unset';
      clearInterval(timer);
      // Stop video when unmounting
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  const handleVideoEnd = () => {
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleSkip = () => {
    if (canSkip) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        onEnded={handleVideoEnd}
        className="w-full h-full object-contain"
        playsInline
        preload="auto"
      >
        <source src="/Intro.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        disabled={!canSkip}
        className={`absolute top-4 right-4 px-6 py-2 rounded-full font-semibold transition-all duration-300 backdrop-blur-sm ${
          canSkip 
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white cursor-pointer' 
            : 'bg-gray-500 bg-opacity-20 text-gray-400 cursor-not-allowed'
        }`}
      >
        {canSkip ? 'Skip' : `Skip (${countdown}s)`}
      </button>

      {/* Video info */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
        <p className="text-sm opacity-75">Welcome to New Blog</p>
      </div>
    </div>
  );
};

export default IntroVideoModal;
