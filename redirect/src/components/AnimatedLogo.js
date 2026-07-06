import React, { useState, useEffect } from 'react';

const fonts = [
  'Inter', 'Playfair Display', 'JetBrains Mono', 'Dancing Script', 'Verdana',
  'Manrope', 'Georgia', 'Bebas Neue', 'Fira Code', 'Pacifico',
  'Helvetica', 'Canela', 'Ubuntu Mono', 'Nunito', 'Cinzel',
  'Roboto', 'Libre Baskerville', 'Anton', 'Caveat', 'Calibri',
  'Poppins', 'Lora', 'League Spartan', 'Indie Flower', 'Segoe UI',
  'Montserrat', 'EB Garamond', 'Archivo Black', 'Great Vibes', 'Tahoma',
  'Lato', 'Crimson Text', 'Cooper Black', 'Sacramento', 'Gill Sans',
  'SF Pro Display', 'Charter', 'Oswald', 'Satisfy', 'Franklin Gothic',
  'Avenir', 'Didot', 'Abril Fatface', 'Kaushan Script', 'Times New Roman',
  'Proxima Nova', 'Baskerville', 'Cinzel Decorative', 'Yellowtail', 'Garamond',
  'Nunito Sans', 'PT Serif', 'Alata', 'Alex Brush', 'Bodoni',
  'Ubuntu', 'Palatino', 'Playfair Display SC', 'Allura', 'Baskerville Old Face',
  'Raleway', 'Optima', 'Fredoka', 'Permanent Marker', 'Trebuchet MS',
  'Source Sans Pro', 'Candara', 'Baloo', 'Lobster', 'Lucida Sans',
  'Work Sans', 'DM Sans', 'Oswald Stencil', 'Sora', 'Lucida Console',
  'Noto Sans', 'Merriweather', 'Anton SC', 'Red Hat Display', 'Courier New',
  'Tahoma Rounded', 'Didact Gothic', 'IBM Plex Mono', 'Mulish', 'Consolas',
  'Space Grotesk', 'Charis SIL', 'Inconsolata', 'Assistant', 'Monaco',
  'Plus Jakarta Sans', 'Cormorant Garamond', 'Menlo', 'Karla', 'Futura',
  'Urbanist', 'Spectral', 'Source Code Pro', 'General Sans', 'Clash Display',
  'Outfit', 'Zilla Slab', 'Ubuntu Condensed', 'Instrument Sans', 'Neue Haas Grotesk',
  'Circular Std', 'GT America', 'PP Neue Montreal', 'Suisse Intl', 'Aeonik',
  'Archivo', 'Josefin Sans', 'Quicksand', 'Varela Round', 'Rubik',
  'Kanit', 'Hind', 'Exo', 'Cabin', 'Teko',
  'Rokkitt', 'Arvo', 'Alegreya', 'Yanone Kaffeesatz', 'Titillium Web',
  'Pathway Gothic One', 'Barlow', 'Heebo', 'Asap', 'Fjalla One',
  'Prompt', 'Chivo', 'Encode Sans', 'Metropolis', 'Public Sans'
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
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayText(text);
      setFontFamily(fonts[0]);
      return undefined;
    }

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
    <span
      aria-hidden="true"
      className="inline-block min-w-[76px] whitespace-nowrap text-xl font-bold leading-none sm:min-w-[120px] sm:text-3xl"
      style={{ fontFamily }}
    >
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

export default AnimatedLogo;
