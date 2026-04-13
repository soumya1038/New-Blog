import React, { useMemo } from 'react';
import { AnimStage } from './AnimStage';

export const CinematicLogo = ({ stage }) => {
  // Use viewport units for perfectly proportional splitting across all screens
  const splitTranslationLogo = '-translate-x-[15vw] sm:-translate-x-[18vw] md:-translate-x-[20vw] lg:-translate-x-[22vw] xl:-translate-x-[24vw]';
  const splitTranslationText = 'translate-x-[12vw] sm:translate-x-[14vw] md:translate-x-[16vw] lg:translate-x-[18vw] xl:translate-x-[20vw]';

  // Master Logo transition logic
  const logoStyles = useMemo(() => {
    switch (stage) {
      case AnimStage.LOGO_REVEAL:
        return 'opacity-100 scale-100 blur-0 translate-x-0';
      case AnimStage.SPLIT:
      case AnimStage.HOLD:
        return `opacity-100 scale-100 blur-0 ${splitTranslationLogo}`;
      case AnimStage.DISPERSE:
        // Logo returns to center while letters calmly drift away
        return 'opacity-100 scale-100 blur-0 translate-x-0';
      case AnimStage.EXIT:
        return 'opacity-0 scale-[0.8] blur-[60px] translate-x-0 transition-all duration-[3000ms] ease-[cubic-bezier(0.22,1,0.36,1)]';
      case AnimStage.FINISHED:
        return 'opacity-0 scale-75 blur-[80px] translate-x-0';
      default:
        return 'opacity-0 scale-90 blur-2xl translate-x-0';
    }
  }, [stage, splitTranslationLogo]);

  const textContainerStyles = useMemo(() => {
    if (stage === AnimStage.SPLIT || stage === AnimStage.HOLD || stage === AnimStage.DISPERSE) {
      return `opacity-100 ${splitTranslationText}`;
    }
    return 'opacity-0 translate-x-0 pointer-events-none transition-opacity duration-1000';
  }, [stage, splitTranslationText]);

  const logoTransitionClass = stage === AnimStage.DISPERSE 
    ? 'duration-[3500ms] ease-[cubic-bezier(0.22, 1, 0.36, 1)]' 
    : 'duration-[2500ms] ease-[cubic-bezier(0.22,1,0.36,1)]';

  const letters = "LEKHON".split("");

  return (
    <div className="relative flex items-center justify-center w-full max-w-[100vw] h-[60vh] md:h-[70vh]">
      
      {/* Background Aura - Scales with screen size */}
      <div 
        className={`absolute w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] transition-all duration-[3000ms] ease-[cubic-bezier(0.22,1,0.36,1)]
          ${(stage === AnimStage.SPLIT || stage === AnimStage.HOLD) ? splitTranslationLogo : 'translate-x-0'}
          ${(stage === AnimStage.IDLE || stage === AnimStage.FINISHED || stage === AnimStage.EXIT) ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}
        `}
      >
        <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[10vw] md:blur-[100px] animate-aura-pulse" />
      </div>

      {/* Graphical Logo Element - Ultra Responsive Sizing */}
      <div 
        className={`relative z-50 pointer-events-none transition-all ${logoTransitionClass} ${logoStyles}`}
      >
        <div className="w-16 h-16 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-48 lg:h-48 xl:w-64 xl:h-64 2xl:w-80 2xl:h-80 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full border border-blue-400/5 scale-125 opacity-30 animate-pulse" />
          <img 
            src="/image/lekhon_url.png"
            alt="Lekhon Logo" 
            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          />
        </div>
      </div>

      {/* Typography Container */}
      <div 
        className={`absolute z-10 transition-all duration-[2000ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${textContainerStyles}`}
      >
        <div 
          className={`flex font-serif uppercase transition-all duration-[2500ms] ease-[cubic-bezier(0.22,1,0.36,1)]
            ${stage === AnimStage.HOLD ? 'gap-[1vw]' : 'gap-[2vw]'}
          `}
        >
          {letters.map((char, i) => (
            <Letter 
              key={i} 
              char={char} 
              index={i} 
              total={letters.length}
              stage={stage} 
            />
          ))}
        </div>
      </div>

    </div>
  );
};

const Letter = ({ char, index, total, stage }) => {
  const driftValues = useMemo(() => {
    const getRand = (s) => {
      const x = Math.sin(index + s) * 10000;
      return x - Math.floor(x);
    };

    const dx = (getRand(15) - 0.5) * 30; 
    const direction = index % 2 === 0 ? -1 : 1;
    const dy = direction * (30 + getRand(10) * 20); 
    const preDr = (getRand(50) - 0.5) * 30;
    const dr = (getRand(120) - 0.5) * 12; 

    return { dx, dy, dr, preDr };
  }, [index]);

  const cinematicEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  const letterStyle = useMemo(() => {
    if (stage === AnimStage.FINISHED) return { opacity: 0 };

    if (stage === AnimStage.DISPERSE) {
      return {
        '--dx': `${driftValues.dx}px`,
        '--dy': `${driftValues.dy}px`,
        '--dr': `${driftValues.dr}deg`,
        '--pre-dr': `${driftValues.preDr}deg`,
        animationDelay: `${index * 150}ms`,
      };
    }

    switch (stage) {
      case AnimStage.SPLIT:
      case AnimStage.HOLD:
        return {
          opacity: 1,
          filter: 'blur(0)',
          transform: 'translate(0, 0) scale(1)',
          transition: `all 1.8s ${cinematicEasing} ${index * 120}ms`
        };
      case AnimStage.EXIT:
        const exitDelay = index * 180;
        return {
          opacity: 0,
          filter: 'blur(35px)',
          transform: `translateY(${driftValues.dy * 0.15}px) scale(0.95)`,
          transition: `opacity 1.2s ${cinematicEasing} ${exitDelay}ms, filter 1.2s ${cinematicEasing} ${exitDelay}ms, transform 1.5s ${cinematicEasing} ${exitDelay}ms`,
        };
      default:
        return {
          opacity: 0,
          filter: 'blur(10px)',
          transform: 'translateY(20px) scale(0.98)',
          transition: 'none'
        };
    }
  }, [stage, index, driftValues, cinematicEasing]);

  return (
    <span 
      style={letterStyle}
      className={`inline-block font-light text-gray-900 dark:text-white will-change-transform 
        text-2xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl 2xl:text-9xl
        tracking-[0.1em] sm:tracking-[0.2em]
        ${stage === AnimStage.DISPERSE ? 'animate-calm-drift' : ''}`}
    >
      {char}
    </span>
  );
};
