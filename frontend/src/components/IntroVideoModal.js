import React, { useEffect, useState } from 'react';

const IntroVideoModal = ({ onClose }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 2500),
      setTimeout(() => setStep(3), 3500),
      setTimeout(() => setStep(4), 6000),
      setTimeout(() => setStep(5), 7000),
      setTimeout(() => setStep(6), 9000),
      setTimeout(() => setStep(7), 10000),
      setTimeout(() => {
        document.body.style.overflow = 'unset';
        onClose();
      }, 11500)
    ];
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden">
      <div 
        className="relative flex items-center justify-center transition-transform duration-[1200ms] ease-out"
        style={{ 
          transform: step >= 2 && step < 6 ? 'translateX(-120px)' : 'translateX(0)'
        }}
      >
        <div
          className="w-32 h-32 md:w-44 md:h-44 transition-all duration-[2000ms] ease-out"
          style={{
            opacity: step >= 1 && step < 7 ? 1 : 0,
            transform: `scale(${step >= 1 && step < 7 ? 1 : 0.9})`
          }}
        >
          <img 
            src="/image/lekhon.png" 
            alt="LEKHON" 
            className="w-full h-full object-contain"
          />
        </div>

        {step >= 3 && step < 6 && (
          <div className="absolute left-[130%] flex gap-3 md:gap-5">
            {'LEKHON'.split('').map((char, i) => (
              <span
                key={i}
                className="text-5xl md:text-7xl font-light text-white/90 transition-all duration-700 ease-out"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  opacity: step === 5 ? 0 : 1,
                  transform: step === 5 
                    ? `translate(-40px, ${i % 2 === 0 ? -30 : 30}px)` 
                    : 'translate(0, 0)',
                  transitionDelay: step === 3 ? `${i * 150}ms` : `${(5 - i) * 100}ms`
                }}
              >
                {char}
              </span>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300&display=swap');
      `}</style>
    </div>
  );
};

export default IntroVideoModal;
