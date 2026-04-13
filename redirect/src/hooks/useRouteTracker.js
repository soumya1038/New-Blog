import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import socketService from '../services/socket';

export const useRouteTracker = () => {
  const location = useLocation();
  const timeoutRef = useRef(null);
  const lastPathRef = useRef('');

  useEffect(() => {
    // Debounce route updates to prevent rapid firing
    if (location.pathname !== lastPathRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastPathRef.current = location.pathname;
        socketService.updateRoute(location.pathname);
      }, 300);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname]);
};
