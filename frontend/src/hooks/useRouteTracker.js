import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import socketService from '../services/socket';

export const useRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    socketService.updateRoute(location.pathname);
  }, [location.pathname]);
};
