import React, { lazy, Suspense, useEffect, useState } from 'react';
import { FaRobot } from 'react-icons/fa';

const ModernChatbot = lazy(() => import('./ModernChatbot'));

const ModernChatbotLauncher = () => {
  const [shouldLoadChatbot, setShouldLoadChatbot] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const dockedBottom = showScrollTop ? 'bottom-20 sm:bottom-24' : 'bottom-4 sm:bottom-6';

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (shouldLoadChatbot) {
    return (
      <Suspense
        fallback={
          <button
            type="button"
            disabled
            aria-label="Loading assistant"
            className={`fixed right-3 sm:right-4 lg:right-6 ${dockedBottom} text-white p-3 sm:p-4 rounded-full shadow-2xl z-30 border border-white/20 opacity-75 cursor-wait`}
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
          >
            <FaRobot size={22} className="sm:hidden" />
            <FaRobot size={26} className="hidden sm:block" />
          </button>
        }
      >
        <ModernChatbot defaultOpen />
      </Suspense>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShouldLoadChatbot(true)}
      aria-label="Open assistant"
      className={`fixed right-3 sm:right-4 lg:right-6 ${dockedBottom} text-white p-3 sm:p-4 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 z-30 border border-white/20`}
      style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
    >
      <FaRobot size={22} className="sm:hidden" />
      <FaRobot size={26} className="hidden sm:block" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white" />
    </button>
  );
};

export default ModernChatbotLauncher;
