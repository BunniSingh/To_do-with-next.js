"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const currentConversationIdRef = useRef(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setConnected(false);
      setOnlineUsers(new Set());
      setConnectionError(null);
      return;
    }

    if (socketRef.current) {
      const socketInstance = socketRef.current;
      
      socketInstance.on('connect', () => {
        setConnected(true);
        setConnectionError(null);
      });

      socketInstance.on('disconnect', () => {
        setConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        setConnectionError(error.message);
        setConnected(false);
      });

      socketInstance.on('user:offline', (data) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      socketInstance.on('user:online', (data) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(data.userId);
          return newSet;
        });
      });

      socketInstance.on('user:online:list', (data) => {
        setOnlineUsers(new Set(data.userIds));
      });

      socketInstance.on('message:new', (message) => {
        window.dispatchEvent(new CustomEvent('socket:message:new', { detail: message }));
      });

      socketInstance.on('typing:started', (data) => {
        window.dispatchEvent(new CustomEvent('socket:typing:started', { detail: data }));
      });

      socketInstance.on('typing:stopped', (data) => {
        window.dispatchEvent(new CustomEvent('socket:typing:stopped', { detail: data }));
      });

      return () => {
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('connect_error');
        socketInstance.off('user:offline');
        socketInstance.off('user:online');
        socketInstance.off('user:online:list');
        socketInstance.off('message:new');
        socketInstance.off('typing:started');
        socketInstance.off('typing:stopped');
      };
    }

    const userId = session.user.id;
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: false,
      autoConnect: true,
      withCredentials: true,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      setConnectionError(error.message);
      setConnected(false);
    });

    socketInstance.on('user:offline', (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socketInstance.on('user:online', (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(data.userId);
        return newSet;
      });
    });

    socketInstance.on('user:online:list', (data) => {
      setOnlineUsers(new Set(data.userIds));
    });

    socketInstance.on('message:new', (message) => {
      window.dispatchEvent(new CustomEvent('socket:message:new', { detail: message }));
    });

    socketInstance.on('typing:started', (data) => {
      window.dispatchEvent(new CustomEvent('socket:typing:started', { detail: data }));
    });

    socketInstance.on('typing:stopped', (data) => {
      window.dispatchEvent(new CustomEvent('socket:typing:stopped', { detail: data }));
    });

    return () => {
      if (!session?.user?.id && socketRef.current) {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketRef.current = null;
      }
    };
  }, [session, status]);

  const joinConversation = (conversationId) => {
    currentConversationIdRef.current = conversationId;
    if (socket) {
      socket.emit('conversation:join', conversationId);
    }
  };

  const leaveConversation = (conversationId) => {
    if (currentConversationIdRef.current === conversationId) {
      currentConversationIdRef.current = null;
    }
    if (socket) {
      socket.emit('conversation:leave', conversationId);
    }
  };

  const sendMessage = (conversationId, content, type = 'text') => {
    if (socket) {
      socket.emit('message:send', { conversationId, content, type });
    }
  };

  const startTyping = (conversationId) => {
    if (socket) {
      socket.emit('typing:start', conversationId);
    }
  };

  const stopTyping = (conversationId) => {
    if (socket) {
      socket.emit('typing:stop', conversationId);
    }
  };

  const deliverMessages = (conversationId, messageIds) => {
    if (socket) {
      socket.emit('message:deliver', { conversationId, messageIds });
    }
  };

  const value = {
    socket,
    connected,
    onlineUsers,
    connectionError,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    deliverMessages,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
