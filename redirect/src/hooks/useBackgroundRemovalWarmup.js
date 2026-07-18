import { useEffect } from 'react';
import api from '../services/api';

const WARMUP_INTERVAL_MS = 10 * 60 * 1000;
const ENABLE_WARMUP = process.env.REACT_APP_ENABLE_BG_REMOVER_WARMUP === 'true';

const useBackgroundRemovalWarmup = () => {
  useEffect(() => {
    if (!ENABLE_WARMUP) return undefined;
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let timeoutId;
    let intervalId;

    const ping = () => {
      if (document.hidden || navigator.onLine === false) return;
      api.get('/system/bg-remover/warmup').catch(() => {});
    };

    const start = () => {
      clearInterval(intervalId);
      intervalId = setInterval(ping, WARMUP_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        ping();
        start();
      } else {
        clearInterval(intervalId);
      }
    };

    timeoutId = setTimeout(ping, 3000);
    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};

export default useBackgroundRemovalWarmup;
