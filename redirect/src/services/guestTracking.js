import api from './api';

class GuestTrackingService {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.currentPage = null;
    this.pageStartTime = null;
    this.isTracking = false;
  }

  getOrCreateSessionId() {
    let sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) {
      sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('guest_session_id', sessionId);
    }
    return sessionId;
  }

  async trackPageView(path) {
    // Skip tracking for authenticated users
    const token = localStorage.getItem('token');
    if (token) return;

    try {
      const previousPageStart = this.pageStartTime;
      this.currentPage = path;
      this.pageStartTime = new Date().toISOString();

      await api.post('/guest/track', {
        sessionId: this.sessionId,
        path: path,
        pageStart: previousPageStart
      });
    } catch (error) {
      console.error('Guest tracking error:', error);
    }
  }

  startTracking() {
    if (this.isTracking) return;
    this.isTracking = true;

    // Track initial page
    this.trackPageView(window.location.pathname);

    // Track page changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.trackPageView(window.location.pathname);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.trackPageView(window.location.pathname);
    };

    // Track back/forward navigation
    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname);
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      if (this.pageStartTime) {
        navigator.sendBeacon('/api/guest/track', JSON.stringify({
          sessionId: this.sessionId,
          path: this.currentPage,
          pageStart: this.pageStartTime
        }));
      }
    });
  }
}

const guestTracker = new GuestTrackingService();
export default guestTracker;