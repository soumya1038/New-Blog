import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
  }

  connect(userId) {
    this.userId = userId;
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        transports: ['websocket', 'polling']
      });

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
