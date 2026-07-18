import { io } from 'socket.io-client';
import { getAuthToken } from '../utils/authSession';
import { getSocketBaseUrl } from '../utils/apiBaseUrl';

const SOCKET_URL = getSocketBaseUrl();

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
  }

  getToken() {
    return getAuthToken();
  }

  connect(userId) {
    const token = this.getToken();
    if (!token) return null;
    if (this.socket && this.userId && this.userId !== userId) {
      this.disconnect();
    }

    this.userId = userId;
    if (!this.socket) {
      const socketOptions = {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        transports: ['websocket', 'polling']
      };
      this.socket = SOCKET_URL ? io(SOCKET_URL, socketOptions) : io(socketOptions);

      this.socket.on('connect', () => {
        // console.log('✅ Socket connected:', this.socket.id);
        this.socket.emit('user:online', this.userId);
        if (this.currentRoute) {
          this.socket.emit('route:change', this.currentRoute);
        }
      });

      this.socket.on('disconnect', (reason) => {
        // console.log('❌ Socket disconnected:', reason);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        // console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        this.socket.emit('user:online', this.userId);
        if (this.currentRoute) {
          this.socket.emit('route:change', this.currentRoute);
        }
      });

      this.socket.on('reconnect_error', (error) => {
        // console.error('🔴 Reconnection error:', error.message);
      });
    }
    return this.socket;
  }

  updateRoute(route) {
    this.currentRoute = route;
    if (this.socket && this.socket.connected) {
      this.socket.emit('route:change', route);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

const socketServiceInstance = new SocketService();

// Ensure getSocket is available
if (!socketServiceInstance.getSocket) {
  socketServiceInstance.getSocket = function() {
    return this.socket;
  };
}

export default socketServiceInstance;
