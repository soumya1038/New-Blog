import React, { useState, useEffect, useContext } from 'react';
import { FaTimes, FaArrowRight, FaArrowLeft, FaRocket, FaPen, FaSearch, FaBell, FaUser, FaCheckCircle } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const ProductTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useContext(AuthContext);

  const steps = [
    {
      target: '.navbar',
      title: 'Welcome to Lekhon!',
      content: 'Your creative writing platform awaits. Let\'s take a quick tour to get you started.',
      icon: <FaRocket className="text-3xl" />,
      position: 'center',
      color: 'from-purple-500 to-pink-500'
    },
    {
      target: '.create-blog-btn',
      title: 'Create Amazing Content',
      content: 'Start writing blogs, articles, or quick shorts with our powerful Markdown editor.',
      icon: <FaPen className="text-3xl" />,
      position: 'bottom',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      target: '.search-bar',
      title: 'Discover & Explore',
      content: 'Find inspiring content from writers around the world. Search by topics, tags, or authors.',
      icon: <FaSearch className="text-3xl" />,
      position: 'bottom',
      color: 'from-green-500 to-teal-500'
    },
    {
      target: '.notifications-btn',
      title: 'Stay Connected',
      content: 'Never miss an update! Get notified about likes, comments, followers, and more.',
      icon: <FaBell className="text-3xl" />,
      position: 'bottom',
      color: 'from-orange-500 to-red-500'
    },
    {
      target: '.profile-menu',
      title: 'Your Personal Space',
      content: 'Manage your profile, view analytics, and customize your writing experience.',
      icon: <FaUser className="text-3xl" />,
      position: 'bottom',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  useEffect(() => {
    const target = document.querySelector(steps[currentStep]?.target);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [currentStep]);

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

  const getTooltipPosition = () => {
    if (!rect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001
      };
    }

    const isMobile = window.innerWidth < 640;
    
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: '20px',
        left: '10px',
        right: '10px',
        zIndex: 10001
      };
    }

    return {
      position: 'fixed',
      top: rect.bottom + 20,
      left: Math.max(20, Math.min(rect.left, window.innerWidth - 420)),
      zIndex: 10001
    };
  };

  const getSpotlightStyle = () => {
    if (!rect || step.position === 'center') return null;

    return {
      top: rect.top - 8,
      left: rect.left - 8,
      width: rect.width + 16,
      height: rect.height + 16,
    };
  };

  const spotlightStyle = getSpotlightStyle();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-all duration-300" onClick={handleSkip} />

      {/* Spotlight */}
      {spotlightStyle && (
        <div
          className="fixed z-[10000] pointer-events-none rounded-2xl transition-all duration-500 ease-out"
          style={{
            ...spotlightStyle,
            boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.8), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
            animation: 'spotlight-pulse 2s ease-in-out infinite'
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className="product-tour-tooltip bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[10001] animate-slideUp max-w-md w-full"
        style={getTooltipPosition()}
      >
        {/* Header with Gradient */}
        <div className={`bg-gradient-to-r ${step.color} p-6 rounded-t-2xl text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 opacity-10 text-9xl -mt-8 -mr-8">
            {step.icon}
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-xs text-white/80">Step {currentStep + 1} of {steps.length}</p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-white/80 hover:text-white transition-all hover:rotate-90 duration-300"
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-6">
            {step.content}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep 
                    ? 'w-8 bg-gradient-to-r ' + step.color
                    : idx < currentStep
                    ? 'w-2 bg-green-400'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium flex items-center justify-center gap-2"
              >
                <FaArrowLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={currentStep === 0 ? handleSkip : handleNext}
              className={`flex-1 px-4 py-3 bg-gradient-to-r ${step.color} text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2 transform hover:scale-105`}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <FaCheckCircle size={16} /> Get Started!
                </>
              ) : currentStep === 0 ? (
                <>
                  Start Tour <FaArrowRight size={14} />
                </>
              ) : (
                <>
                  Next <FaArrowRight size={14} />
                </>
              )}
            </button>
          </div>

          {/* Skip Link */}
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition mt-3"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>

    </>
  );
};

export default ProductTour;
