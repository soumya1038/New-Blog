import React, { useState, useEffect } from 'react';
import { FaTimes, FaArrowRight, FaArrowLeft } from 'react-icons/fa';

const ProductTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      target: '.navbar',
      title: '🎉 Welcome to New Blog!',
      content: 'Let\'s take a quick tour of the key features. This will only take a minute!',
      position: 'bottom'
    },
    {
      target: '.create-blog-btn',
      title: '✍️ Create Your First Blog',
      content: 'Click here to write and publish your blog posts with our markdown editor.',
      position: 'bottom'
    },
    {
      target: '.profile-menu',
      title: '👤 Your Profile',
      content: 'Access your profile, settings, and manage your account from here.',
      position: 'bottom'
    },
    {
      target: '.notifications-btn',
      title: '🔔 Stay Updated',
      content: 'Get notified when someone likes or comments on your posts.',
      position: 'bottom'
    },
    {
      target: '.chat-btn',
      title: '💬 Connect with Others',
      content: 'Chat with other bloggers and build your network.',
      position: 'bottom'
    },
    {
      target: '.search-bar',
      title: '🔍 Discover Content',
      content: 'Search for blogs, topics, and users you\'re interested in.',
      position: 'bottom'
    }
  ];

  useEffect(() => {
    // Highlight current target
    const target = document.querySelector(steps[currentStep]?.target);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('tour-highlight');
    }

    return () => {
      if (target) {
        target.classList.remove('tour-highlight');
      }
    };
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

  if (!rect) return null;

  const tooltipStyle = {
    position: 'fixed',
    top: step.position === 'bottom' ? rect.bottom + 20 : rect.top - 200,
    left: rect.left + rect.width / 2,
    transform: 'translateX(-50%)',
    zIndex: 10000
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]" onClick={handleSkip} />

      {/* Spotlight */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          top: rect.top - 10,
          left: rect.left - 10,
          width: rect.width + 20,
          height: rect.height + 20,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
          transition: 'all 0.3s ease'
        }}
      />

      {/* Tooltip */}
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-sm z-[10000] animate-fadeIn"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-800">{step.title}</h3>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <p className="text-gray-600 mb-6">{step.content}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-8 bg-blue-600'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition flex items-center gap-2"
              >
                <FaArrowLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'} <FaArrowRight size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Skip Tour
        </button>
      </div>

      <style jsx>{`
        .tour-highlight {
          position: relative;
          z-index: 10000 !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
      `}</style>
    </>
  );
};

export default ProductTour;
