import api from './api';
import { hasAuthToken } from '../utils/authSession';

const GUEST_SESSION_ID_KEY = 'guest_session_id';

const safeSessionStorage = () => {
  try {
    return window.sessionStorage;
  } catch (error) {
    return null;
  }
};

const clearLegacyGuestSessionId = () => {
  try {
    window.localStorage?.removeItem(GUEST_SESSION_ID_KEY);
  } catch (error) {
    // Ignore storage access failures; tracking should never block the app.
  }
};

const createGuestSessionId = () => {
  const cryptoApi = window.crypto || window.msCrypto;
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    const randomHex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `guest_${randomHex}`;
  }

  const timestamp = Date.now().toString(36);
  const tick = String(window.performance?.now?.() || '').replace(/\D/g, '');
  return `guest_${timestamp}_${tick}`;
};

class GuestTrackingService {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.currentPage = null;
    this.pageStartTime = null;
    this.isTracking = false;
  }

  getOrCreateSessionId() {
    const storage = safeSessionStorage();
    let sessionId = storage?.getItem(GUEST_SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = createGuestSessionId();
      storage?.setItem(GUEST_SESSION_ID_KEY, sessionId);
    }
    clearLegacyGuestSessionId();
    return sessionId;
  }

  async trackPageView(path) {
    // Skip tracking for authenticated users
    if (hasAuthToken()) return;

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
        const payload = JSON.stringify({
          sessionId: this.sessionId,
          path: this.currentPage,
          pageStart: this.pageStartTime
        });
        navigator.sendBeacon('/api/guest/track', new Blob([payload], { type: 'application/json' }));
      }
    });
  }
}

const guestTracker = new GuestTrackingService();
export default guestTracker;
