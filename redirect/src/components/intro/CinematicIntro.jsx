import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CinematicLogo } from './CinematicLogo';
import { AnimStage } from './AnimStage';

export const CinematicIntro = ({ onComplete }) => {
  const [stage, setStage] = useState(AnimStage.IDLE);

  const startAnimation = useCallback(() => {
    setStage(AnimStage.LOGO_REVEAL);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      startAnimation();
    }, 800);
    return () => clearTimeout(timer);
  }, [startAnimation]);

  useEffect(() => {
    let timer;

    if (stage === AnimStage.LOGO_REVEAL) {
      // Show logo for 2.5s before moving it
      timer = setTimeout(() => setStage(AnimStage.SPLIT), 2500);
    } else if (stage === AnimStage.SPLIT) {
      // The slide and letter reveal takes ~2s, hold it for another 2s
      timer = setTimeout(() => setStage(AnimStage.HOLD), 4000);
    } else if (stage === AnimStage.HOLD) {
      // Pause on the full identity - reduced from 2000 to 1000
      timer = setTimeout(() => setStage(AnimStage.DISPERSE), 1000);
    } else if (stage === AnimStage.DISPERSE) {
      // Dissolve takes less time - reduced from 5000 to 3000
      timer = setTimeout(() => setStage(AnimStage.EXIT), 3000);
    } else if (stage === AnimStage.EXIT) {
      // Final logo fade takes 3.5s
      timer = setTimeout(() => {
        setStage(AnimStage.FINISHED);
        if (onComplete) onComplete();
      }, 3500);
    }

    return () => clearTimeout(timer);
  }, [stage, onComplete]);

  const sceneTransformStyles = useMemo(() => {
    switch (stage) {
      case AnimStage.IDLE:
        return 'opacity-0 scale-95 blur-xl';
      case AnimStage.LOGO_REVEAL:
      case AnimStage.SPLIT:
      case AnimStage.HOLD:
      case AnimStage.DISPERSE:
      case AnimStage.EXIT:
        return 'opacity-100 scale-100 blur-0';
      case AnimStage.FINISHED:
        return 'opacity-0 scale-90 blur-3xl';
      default:
        return 'opacity-100 scale-100';
    }
  }, [stage]);

  if (stage === AnimStage.FINISHED) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] w-full h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-[#05080f]">
      {/* Cinematic Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/5 blur-[150px] rounded-full" />
      </div>

      {/* Main Scene Container */}
      <div 
        className={`w-full flex justify-center items-center transition-all duration-[3000ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${sceneTransformStyles}`}
      >
        <CinematicLogo stage={stage} />
      </div>
    </div>
  );
};
