import React, { useState, useEffect } from 'react';

const fonts = [
  'Helvetica', 'Arial', 'Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'SF Pro Display', 'Segoe UI',
  'Futura', 'Avenir', 'Proxima Nova', 'Nunito', 'Ubuntu', 'Raleway', 'Source Sans Pro', 'Work Sans', 'DM Sans', 'Noto Sans',
  'Verdana', 'Tahoma', 'Calibri', 'Gill Sans', 'Franklin Gothic', 'Times New Roman', 'Georgia', 'Garamond', 'Baskerville',
  'Playfair Display', 'Merriweather', 'Didot', 'Bodoni', 'Libre Baskerville', 'Crimson Text', 'EB Garamond', 'Lora',
  'PT Serif', 'Charter', 'Palatino', 'Oswald', 'Bebas Neue', 'Anton', 'League Spartan', 'Abril Fatface', 'Cinzel',
  'Pacifico', 'Lobster', 'Permanent Marker', 'Fredoka', 'Baloo', 'Playfair Display SC', 'Alata', 'Archivo Black',
  'Cooper Black', 'Dancing Script', 'Great Vibes', 'Sacramento', 'Caveat', 'Indie Flower', 'Allura', 'Satisfy',
  'Kaushan Script', 'Alex Brush', 'Yellowtail', 'Courier New', 'Consolas', 'Monaco', 'Menlo', 'Fira Code',
  'JetBrains Mono', 'Source Code Pro', 'IBM Plex Mono', 'Inconsolata', 'Ubuntu Mono', 'Manrope', 'Plus Jakarta Sans',
  'Space Grotesk', 'Sora', 'Urbanist', 'Red Hat Display', 'Outfit', 'Mulish', 'Karla', 'Assistant', 'Trebuchet MS',
  'Lucida Sans', 'Lucida Console', 'Optima', 'Candara', 'Clash Display', 'General Sans', 'Neue Haas Grotesk',
  'Circular Std', 'GT America', 'Canela', 'PP Neue Montreal', 'Instrument Sans', 'Suisse Intl', 'Aeonik'
];

const text = 'Lekhon';
const CHAR_SPEED = 190;
const PAUSE_TYPED = 4000;
const PAUSE_BEFORE_RETYPE = 500;
const CYCLE_TIME = text.length * CHAR_SPEED + PAUSE_TYPED + text.length * CHAR_SPEED + PAUSE_BEFORE_RETYPE;

const AnimatedLogo = () => {
  const [displayText, setDisplayText] = useState('');
  const [fontFamily, setFontFamily] = useState(fonts[0]);

  useEffect(() => {
    const now = Date.now();
    const cycleIndex = Math.floor(now / CYCLE_TIME);
    const timeInCycle = now % CYCLE_TIME;
    
    const currentFont = fonts[cycleIndex % fonts.length];
    setFontFamily(currentFont);

    const typingTime = text.length * CHAR_SPEED;
    const erasingStart = typingTime + PAUSE_TYPED;
    const erasingEnd = erasingStart + text.length * CHAR_SPEED;

    let initialText = '';
    if (timeInCycle < typingTime) {
      const charIndex = Math.floor(timeInCycle / CHAR_SPEED);
      initialText = text.slice(0, charIndex);
    } else if (timeInCycle < erasingStart) {
      initialText = text;
    } else if (timeInCycle < erasingEnd) {
      const eraseProgress = timeInCycle - erasingStart;
      const charsToShow = text.length - Math.floor(eraseProgress / CHAR_SPEED);
      initialText = text.slice(0, charsToShow);
    }
    setDisplayText(initialText);

    const interval = setInterval(() => {
      const now = Date.now();
      const cycleIndex = Math.floor(now / CYCLE_TIME);
      const timeInCycle = now % CYCLE_TIME;
      
      const newFont = fonts[cycleIndex % fonts.length];
      setFontFamily(newFont);

      if (timeInCycle < typingTime) {
        const charIndex = Math.floor(timeInCycle / CHAR_SPEED);
        setDisplayText(text.slice(0, charIndex));
      } else if (timeInCycle < erasingStart) {
        setDisplayText(text);
      } else if (timeInCycle < erasingEnd) {
        const eraseProgress = timeInCycle - erasingStart;
        const charsToShow = text.length - Math.floor(eraseProgress / CHAR_SPEED);
        setDisplayText(text.slice(0, charsToShow));
      } else {
        setDisplayText('');
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-3xl font-bold inline-block gap-2 min-w-[120px]" style={{ fontFamily }}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

export default AnimatedLogo;
