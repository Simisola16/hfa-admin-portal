import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  if (!socket && token) {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    socket = io(backendUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
