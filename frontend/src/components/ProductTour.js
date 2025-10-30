import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaArrowRight, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const ProductTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const steps = [
    {
      route: '/',
      title: '🚀 Welcome to New Blog',
      content: 'Your modern platform to write, share, and connect with readers around the world! Let\'s take a quick tour to help you get started.',
      showOverlay: true
    },
    {
      route: '/',
      title: '🧩 Dashboard Overview',
      content: 'This is your Dashboard — the central hub where you can discover blogs, track trends, and explore content from writers worldwide.',
      showOverlay: false
    },
    {
      route: '/create',
      title: '✍️ Create a Blog',
      content: 'Click "Create Blog" to start writing your post. Our editor supports Markdown, live preview, and image uploads — so your creativity flows naturally.',
      showOverlay: false
    },
    {
      route: '/drafts',
      title: '📝 Manage Drafts',
      content: 'You can save unfinished blogs as Drafts. Revisit them anytime to edit and publish when ready.',
      showOverlay: false
    },
    {
      route: '/notifications',
      title: '🔔 Notifications',
      content: 'Stay updated with real-time notifications about likes, comments, and followers. Never miss what\'s happening!',
      showOverlay: false
    },
    {
      route: '/profile',
      title: '👤 My Profile',
      content: 'Visit your Profile to update your bio, manage settings, and showcase your work to readers.',
      showOverlay: false
    },
    ...(user?.role === 'admin' || user?.role === 'coAdmin' ? [{
      route: '/admin',
      title: '⚙️ Admin Panel',
      content: 'As an admin, you can manage users, approve content, and maintain the platform — all from the Admin Panel.',
      showOverlay: false
    }] : []),
    {
      route: '/chat',
      title: '💬 Chat & Community',
      content: 'Connect instantly with other bloggers through Chat — share thoughts, collaborate, and grow together!',
      showOverlay: false
    },
    {
      route: '/',
      title: '🎉 You\'re All Set!',
      content: 'That\'s it! You\'re ready to explore New Blog. Start writing your first story and join our community of passionate writers!',
      showOverlay: true
    }
  ];

  useEffect(() => {
    const step = steps[currentStep];
    if (step.route !== window.location.pathname) {
      navigate(step.route);
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
    navigate('/');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('tourCompleted', 'true');
    navigate('/');
    onComplete();
  };

  const step = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      {step.showOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[9999]" />
      )}

      {/* Tour Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full pointer-events-auto animate-slideUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{step.title}</h2>
                <p className="text-blue-100 text-sm">Step {currentStep + 1} of {steps.length}</p>
              </div>
              <button
                onClick={handleSkip}
                className="text-white hover:text-gray-200 transition p-2"
                title="Skip Tour"
              >
                <FaTimes size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-gray-700 text-lg leading-relaxed mb-8">{step.content}</p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex gap-2 mb-2">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      idx <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progress</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700 transition font-medium"
              >
                Skip Tour
              </button>

              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold flex items-center gap-2"
                  >
                    <FaArrowLeft size={16} /> Previous
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center gap-2"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <FaCheck size={16} /> Start Exploring
                    </>
                  ) : (
                    <>
                      Next <FaArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </>
  );
};

export default ProductTour;
