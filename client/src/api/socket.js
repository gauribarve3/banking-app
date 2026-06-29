import { io } from 'socket.io-client';

let socketUrl = import.meta.env.VITE_API_URL || '';
if (socketUrl) {
  if (socketUrl.endsWith('/api')) {
    socketUrl = socketUrl.slice(0, -4);
  } else if (socketUrl.endsWith('/api/')) {
    socketUrl = socketUrl.slice(0, -5);
  }
} else {
  socketUrl = 'https://vaultbank-backend-3x09.onrender.com';
}

export const socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true
});
