import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.token) {
      const newSocket = io(`${import.meta.env.VITE_BACKEND_URL || "https://zapchatbackend-e0u7wph3.b4a.run"}`, {
        auth: { token: user.token },
        transports: ['websocket', 'polling'],
        withCredentials: true,
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 2000,
        timeout: 20000
      });

      newSocket.on('connect', () => {
        console.log('Socket connected', newSocket.id);
      });

      newSocket.on('initial_online_users', (users) => {
        const statusMap = {};
        users.forEach(({ userId, status, lastSeen }) => {
          statusMap[userId] = { status, lastSeen };
        });
        setOnlineUsers(statusMap);
      });

      newSocket.on('user_status', ({ userId, status, lastSeen }) => {
        setOnlineUsers(prev => ({
          ...prev,
          [userId]: { status, lastSeen }
        }));
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user?.token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
