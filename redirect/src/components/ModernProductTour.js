import React, { useState, useEffect, useContext, useRef } from 'react';
import { FaTimes, FaArrowRight, FaArrowLeft, FaCheck, FaLightbulb, FaMobile, FaDesktop } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const ModernProductTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const { user } = useContext(AuthContext);

  const steps = [
    {
      target: '.navbar',
      title: '🚀 Welcome!',
      content: 'Let\'s take a quick tour of the key features.',
      mobileContent: 'Swipe or tap Next to explore!',
      position: 'bottom',
      highlight: true
    },
    {
      target: '.create-blog-btn',
      title: '✍️ Create Content',
      content: 'Write blogs with our powerful Markdown editor.',
      mobileContent: 'Tap here to start writing!',
      position: 'bottom',
      highlight: true
    },
    {
      target: '.search-bar',
      title: '🔍 Search',
      content: 'Find blogs, topics, and writers.',
      mobileContent: 'Search for content you love!',
      position: 'bottom',
      highlight: true
    },
    {
      target: '.notifications-btn',
      title: '🔔 Notifications',
      content: 'Stay updated with likes, comments, and followers.',
      mobileContent: 'Get instant updates!',
      position: 'bottom',
      highlight: true
    },
    {
      target: '.profile-menu',
      title: '👤 Profile',
      content: 'Manage your account and view your content.',
      mobileContent: 'Access your profile here!',
      position: 'bottom',
      highlight: true
    }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      updateTooltipPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    updateTooltipPosition();
    const target = document.querySelector(steps[currentStep]?.target);
    
    if (target) {
      // Smooth scroll with offset for mobile
      const offset = isMobile ? 100 : 150;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      target.classList.add('tour-highlight');
    }

    return () => {
      if (target) {
        target.classList.remove('tour-highlight');
      }
    };
  }, [currentStep, isMobile]);

  const updateTooltipPosition = () => {
    const step = steps[currentStep];
    const target = document.querySelector(step?.target);
    const tooltip = tooltipRef.current;

    if (!target || !tooltip) return;

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 20;
    const arrowSize = 12;

    let top, left;

    if (isMobile) {
      // Mobile: Always show at bottom center
      top = window.innerHeight - tooltipRect.height - padding;
      left = padding;
    } else {
      // Desktop: Smart positioning
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (step.position === 'bottom' && spaceBelow > tooltipRect.height + padding) {
        top = rect.bottom + arrowSize + padding;
      } else if (spaceAbove > tooltipRect.height + padding) {
        top = rect.top - tooltipRect.height - arrowSize - padding;
      } else {
        top = rect.bottom + arrowSize + padding;
      }

      // Center horizontally relative to target
      left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

      // Keep within viewport
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
    }

    setTooltipPosition({ top, left });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('tourCompleted', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('tourCompleted', 'true');
    onComplete();
  };

  const step = steps[currentStep];
  const target = document.querySelector(step?.target);
  const rect = target?.getBoundingClientRect();

  if (!rect) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-[9999] transition-opacity duration-300"
        onClick={isMobile ? null : handleSkip}
      />

      {/* Spotlight */}
      {step.highlight && (
        <div
          className="fixed z-[10000] pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 0 9999px rgba(0, 0, 0, 0.4)',
            borderRadius: isMobile ? '16px' : '12px',
          }}
        >
          <div className="absolute inset-0 rounded-xl animate-pulse-ring" />
        </div>
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`fixed z-[10001] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transition-all duration-300 ${
          isMobile ? 'left-4 right-4 bottom-4' : 'max-w-sm'
        }`}
        style={isMobile ? {} : { top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Mobile drag indicator */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                <FaLightbulb className="text-white" size={isMobile ? 16 : 20} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                {step.title}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-1"
              aria-label="Close tour"
            >
              <FaTimes size={isMobile ? 16 : 18} />
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mb-4 leading-relaxed">
            {isMobile && step.mobileContent ? step.mobileContent : step.content}
          </p>

          {/* Device indicator */}
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
            {isMobile ? <FaMobile /> : <FaDesktop />}
            <span>{isMobile ? 'Mobile View' : 'Desktop View'}</span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep 
                    ? 'w-8 bg-gradient-to-r from-blue-600 to-purple-600' 
                    : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${
                currentStep === 0
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FaArrowLeft size={12} /> Back
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition text-sm font-medium flex items-center gap-2 shadow-lg"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <FaCheck size={12} /> Finish
                  </>
                ) : (
                  <>
                    Next <FaArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step counter */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>

    </>
  );
};

export default ModernProductTour;
