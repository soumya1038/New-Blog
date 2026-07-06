import { useEffect, useState } from 'react';
import { isNativeApp } from '../utils/nativeApp';

const getIsCompactProfileLayout = () => {
  if (typeof window === 'undefined') return false;
  return isNativeApp() || window.matchMedia('(max-width: 767px)').matches;
};

const useCompactProfileLayout = () => {
  const [isCompact, setIsCompact] = useState(getIsCompactProfileLayout);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsCompact(getIsCompactProfileLayout());

    update();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return isCompact;
};

export default useCompactProfileLayout;
