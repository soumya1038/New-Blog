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
      // Allow Socket.IO to select best transport (polling/websocket) and enable reconnection
      this.socket = io(SOCKET_URL, {
        reconnection: true
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.socket.emit('user:online', userId);
        // Send current route after connection
        if (this.currentRoute) {
          this.socket.emit('route:change', this.currentRoute);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
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
