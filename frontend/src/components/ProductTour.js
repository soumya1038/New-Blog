import React, { useState, useEffect, useContext } from 'react';
import { FaTimes, FaArrowRight, FaCheck, FaLightbulb } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const ProductTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useContext(AuthContext);

  const steps = [
    {
      target: '.navbar',
      title: '🚀 Welcome to New Blog!',
      content: 'Let\'s explore the key features. Click Next to continue.',
      position: 'bottom',
      action: null
    },
    {
      target: '.create-blog-btn',
      title: '✍️ Write Your First Blog',
      content: 'Click here to create a new blog post with our Markdown editor.',
      position: 'bottom',
      action: 'Try clicking "Create Blog" to see the editor'
    },
    {
      target: '.search-bar',
      title: '🔍 Discover Content',
      content: 'Search for blogs, topics, and writers you\'re interested in.',
      position: 'bottom',
      action: null
    },
    {
      target: '.notifications-btn',
      title: '🔔 Stay Updated',
      content: 'Get notified about likes, comments, and new followers.',
      position: 'bottom',
      action: null
    },
    {
      target: '.profile-menu',
      title: '👤 Your Profile',
      content: 'Manage your account, settings, and view your published blogs.',
      position: 'bottom',
      action: null
    }
  ];

  useEffect(() => {
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
    top: rect.bottom + 20,
    left: Math.max(20, Math.min(rect.left, window.innerWidth - 420)),
    zIndex: 10001
  };

  return (
    <>
      {/* Subtle Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-[9999]" onClick={handleSkip} />

      {/* Spotlight */}
      <div
        className="fixed z-[10000] pointer-events-none"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          transition: 'all 0.3s ease',
          animation: 'pulse 2s infinite'
        }}
      />

      {/* Tooltip */}
      <div
        className="bg-white rounded-xl shadow-2xl max-w-sm z-[10001] animate-fadeIn"
        style={tooltipStyle}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaLightbulb className="text-yellow-500" size={20} />
              <h3 className="text-lg font-bold text-gray-800">{step.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <FaTimes size={18} />
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{step.content}</p>

          {step.action && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 rounded">
              <p className="text-blue-700 text-xs font-medium">👉 {step.action}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-500 hover:text-gray-700 transition px-3 py-1.5"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-1.5"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <FaCheck size={12} /> Got it!
                  </>
                ) : (
                  <>
                    Next <FaArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 0 9999px rgba(0, 0, 0, 0.3); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
        .tour-highlight {
          position: relative;
          z-index: 10000 !important;
        }
      `}</style>
    </>
  );
};

export default ProductTour;
