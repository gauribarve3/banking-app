import { io } from 'socket.io-client';

let socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
if (socketUrl.endsWith('/api')) {
  socketUrl = socketUrl.slice(0, -4);
} else if (socketUrl.endsWith('/api/')) {
  socketUrl = socketUrl.slice(0, -5);
} else if (!socketUrl.startsWith('http')) {
  socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
}

export const socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true
});
