"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSession } from 'next-auth/react';

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
  const connectionAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const currentConversationIdRef = useRef(null); // Track current conversation in ref

  useEffect(() => {
    console.log('[SocketContext] === Effect triggered ===');
    console.log('[SocketContext] Session status:', status);
    console.log('[SocketContext] Session user:', session?.user);
    console.log('[SocketContext] Already has socket:', !!socketRef.current);

    // Cleanup function - only cleanup when user changes or session ends
    const cleanupSocket = () => {
      if (socketRef.current) {
        console.log('[SocketContext] Cleaning up existing socket connection');
        const socketInstance = socketRef.current;

        // Remove only specific listeners (not all - to keep reconnection working)
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('connect_error');
        socketInstance.off('error');
        socketInstance.off('user:offline');
        socketInstance.off('message:new');
        socketInstance.off('messages:delivered');
        socketInstance.off('messages:read');
        socketInstance.off('typing:started');
        socketInstance.off('typing:stopped');
        socketInstance.off('reconnect');
        socketInstance.off('reconnect_attempt');
        socketInstance.off('reconnect_error');
        socketInstance.off('reconnect_failed');
        
        // IMPORTANT: Do NOT set socketRef.current to null here
        // This keeps the socket connection alive across component re-renders
        // Only disconnect on logout
      }
      setSocket(null);
      setConnected(false);
      setConnectionError(null);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    // Wait for session to be authenticated
    if (status === 'loading') {
      console.log('[SocketContext] Session still loading, waiting...');
      return;
    }

    if (!session?.user?.id) {
      console.log('[SocketContext] No user ID available, fully disconnecting socket');
      // Fully disconnect when no session (logout)
      if (socketRef.current) {
        const socketInstance = socketRef.current;
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setConnected(false);
      setConnectionError(null);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    // IMPORTANT: If we already have a socket, don't create a new one
    // This prevents multiple socket connections
    if (socketRef.current) {
      console.log('[SocketContext] Socket already exists, reusing existing connection');
      setSocket(socketRef.current);
      setConnected(socketRef.current.connected);
      
      // Re-attach listeners to existing socket
      const socketInstance = socketRef.current;
      
      // Define event handlers
      const handleConnect = () => {
        console.log('[SocketContext] ✓✓✓ SOCKET CONNECTED! ID:', socketInstance.id);
        setConnected(true);
        setConnectionError(null);
      };

      const handleDisconnect = (reason) => {
        console.log('[SocketContext] ✗✗✗ SOCKET DISCONNECTED. Reason:', reason);
        setConnected(false);
      };

      const handleConnectError = (error) => {
        console.error('[SocketContext] ✗✗✗ SOCKET CONNECTION ERROR:', error.message);
        setConnectionError(error.message || 'Connection failed');
        setConnected(false);
      };

      const handleError = (error) => {
        console.error('[SocketContext] ⚠ Socket error:', error);
      };

      const handleUserOffline = (data) => {
        console.log('[SocketContext] User offline:', data.userId);
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      };

      const handleNewMessage = (message) => {
        console.log('[SocketContext] New message received:', message);
        window.dispatchEvent(new CustomEvent('socket:message:new', { detail: message }));
      };

      const handleMessagesDelivered = (data) => {
        window.dispatchEvent(new CustomEvent('socket:messages:delivered', { detail: data }));
      };

      const handleMessagesRead = (data) => {
        window.dispatchEvent(new CustomEvent('socket:messages:read', { detail: data }));
      };

      const handleTypingStarted = (data) => {
        window.dispatchEvent(new CustomEvent('socket:typing:started', { detail: data }));
      };

      const handleTypingStopped = (data) => {
        window.dispatchEvent(new CustomEvent('socket:typing:stopped', { detail: data }));
      };

      // Re-attach event listeners
      socketInstance.on('connect', handleConnect);
      socketInstance.on('disconnect', handleDisconnect);
      socketInstance.on('connect_error', handleConnectError);
      socketInstance.on('error', handleError);
      socketInstance.on('user:offline', handleUserOffline);
      socketInstance.on('message:new', handleNewMessage);
      socketInstance.on('messages:delivered', handleMessagesDelivered);
      socketInstance.on('messages:read', handleMessagesRead);
      socketInstance.on('typing:started', handleTypingStarted);
      socketInstance.on('typing:stopped', handleTypingStopped);
      
      // Reconnection events
      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('[SocketContext] ✓✓✓ SOCKET RECONNECTED after', attemptNumber, 'attempts');
        setConnected(true);
        setConnectionError(null);
        
        // Re-join the current conversation room after reconnection
        if (currentConversationIdRef.current) {
          console.log('[SocketContext] Re-joining conversation after reconnect:', currentConversationIdRef.current);
          setTimeout(() => {
            socketInstance.emit('conversation:join', currentConversationIdRef.current);
          }, 500);
        }
      });
      
      socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log('[SocketContext] Reconnection attempt #', attemptNumber);
      });
      
      socketInstance.on('reconnect_error', (error) => {
        console.error('[SocketContext] Reconnection error:', error);
      });
      
      socketInstance.on('reconnect_failed', () => {
        console.error('[SocketContext] ✗✗✗ Reconnection failed after all attempts');
        setConnectionError('Reconnection failed');
      });
      
      return () => {
        console.log('[SocketContext] === Cleanup triggered (reuse) ===');
        cleanupSocket();
      };
    }

    // Validate user ID format before connecting
    const userId = session.user.id;
    console.log('[SocketContext] User ID to connect:', userId);

    if (typeof userId !== 'string') {
      console.error('[SocketContext] Invalid user ID type:', typeof userId);
      setConnectionError('Invalid user ID format');
      return;
    }

    // Create socket instance with optimized config
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    console.log('[SocketContext] Socket URL:', socketUrl);
    console.log('[SocketContext] Connection attempt #', ++connectionAttemptRef.current);

    // Create socket instance with better reconnection config
    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      auth: {
        userId: userId,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,  // Increased from 5
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,  // Changed to false to reuse existing connection
      autoConnect: true,
      withCredentials: true,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    socketRef.current = socketInstance;

    // Define event handlers
    const handleConnect = () => {
      console.log('[SocketContext] ✓✓✓ SOCKET CONNECTED! ID:', socketInstance.id);
      setConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = (reason) => {
      console.log('[SocketContext] ✗✗✗ SOCKET DISCONNECTED. Reason:', reason);
      setConnected(false);

      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        console.log('[SocketContext] Server disconnected, will attempt reconnect...');
        // The socket will auto-reconnect due to config
      } else if (reason === 'io client disconnect') {
        console.log('[SocketContext] Client initiated disconnect');
      } else if (reason === 'ping timeout') {
        console.log('[SocketContext] Ping timeout - connection lost');
        // Socket will auto-reconnect
      } else if (reason === 'transport close') {
        console.log('[SocketContext] Transport closed - will reconnect');
      } else if (reason === 'transport error') {
        console.log('[SocketContext] Transport error - will reconnect');
      } else {
        console.log('[SocketContext] Unknown disconnect reason:', reason);
      }
    };

    const handleConnectError = (error) => {
      console.error('[SocketContext] ✗✗✗ SOCKET CONNECTION ERROR:', error.message);
      setConnectionError(error.message || 'Connection failed');
      setConnected(false);
    };

    const handleError = (error) => {
      console.error('[SocketContext] ⚠ Socket error:', error);
    };

    const handleUserOffline = (data) => {
      console.log('[SocketContext] User offline:', data.userId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    const handleNewMessage = (message) => {
      console.log('[SocketContext] New message received:', message);
      window.dispatchEvent(new CustomEvent('socket:message:new', { detail: message }));
    };

    const handleMessagesDelivered = (data) => {
      window.dispatchEvent(new CustomEvent('socket:messages:delivered', { detail: data }));
    };

    const handleMessagesRead = (data) => {
      window.dispatchEvent(new CustomEvent('socket:messages:read', { detail: data }));
    };

    const handleTypingStarted = (data) => {
      window.dispatchEvent(new CustomEvent('socket:typing:started', { detail: data }));
    };

    const handleTypingStopped = (data) => {
      window.dispatchEvent(new CustomEvent('socket:typing:stopped', { detail: data }));
    };

    // Register event listeners
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('error', handleError);
    socketInstance.on('user:offline', handleUserOffline);
    socketInstance.on('message:new', handleNewMessage);
    socketInstance.on('messages:delivered', handleMessagesDelivered);
    socketInstance.on('messages:read', handleMessagesRead);
    socketInstance.on('typing:started', handleTypingStarted);
    socketInstance.on('typing:stopped', handleTypingStopped);
    
    // Reconnection events
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[SocketContext] ✓✓✓ SOCKET RECONNECTED after', attemptNumber, 'attempts');
      setConnected(true);
      setConnectionError(null);
      
      // Re-join the current conversation room after reconnection
      if (currentConversationIdRef.current) {
        console.log('[SocketContext] Re-joining conversation after reconnect:', currentConversationIdRef.current);
        setTimeout(() => {
          socketInstance.emit('conversation:join', currentConversationIdRef.current);
        }, 500);
      }
    });
    
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('[SocketContext] Reconnection attempt #', attemptNumber);
    });
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('[SocketContext] Reconnection error:', error);
    });
    
    socketInstance.on('reconnect_failed', () => {
      console.error('[SocketContext] ✗✗✗ Reconnection failed after all attempts');
      setConnectionError('Reconnection failed');
    });

    setSocket(socketInstance);

    // Cleanup on unmount or session change (logout)
    return () => {
      console.log('[SocketContext] === Cleanup triggered ===');
      console.log('[SocketContext] Session status:', status);
      console.log('[SocketContext] Has session user:', !!session?.user);
      
      // Only fully disconnect if user is logging out (no session)
      if (!session?.user?.id && socketRef.current) {
        console.log('[SocketContext] User logged out, fully disconnecting socket');
        const socketInstance = socketRef.current;
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketRef.current = null;
      } else {
        // Just remove listeners if session still exists (component unmount)
        console.log('[SocketContext] Session still active, keeping socket connected');
        if (socketRef.current) {
          const socketInstance = socketRef.current;
          socketInstance.off('connect');
          socketInstance.off('disconnect');
          socketInstance.off('connect_error');
          socketInstance.off('error');
          socketInstance.off('user:offline');
          socketInstance.off('message:new');
          socketInstance.off('messages:delivered');
          socketInstance.off('messages:read');
          socketInstance.off('typing:started');
          socketInstance.off('typing:stopped');
          socketInstance.off('reconnect');
          socketInstance.off('reconnect_attempt');
          socketInstance.off('reconnect_error');
          socketInstance.off('reconnect_failed');
          // IMPORTANT: Do NOT set socketRef.current to null
          // Keep the socket connection alive
        }
      }
      
      setSocket(null);
      setConnected(false);
      setConnectionError(null);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  // Join conversation room
  const joinConversation = useCallback((conversationId) => {
    console.log('[SocketContext] joinConversation called:', conversationId);
    currentConversationIdRef.current = conversationId; // Track current conversation in ref
    if (socket) {
      console.log('[SocketContext] Socket connected:', socket.connected);
      socket.emit('conversation:join', conversationId);
      console.log('[SocketContext] Emitted conversation:join for:', conversationId);
    } else {
      console.error('[SocketContext] Socket is null! Cannot join conversation');
    }
  }, [socket]);

  // Leave conversation room
  const leaveConversation = useCallback((conversationId) => {
    console.log('[SocketContext] leaveConversation called:', conversationId);
    if (conversationId === currentConversationIdRef.current) {
      currentConversationIdRef.current = null;
    }
    if (socket) {
      socket.emit('conversation:leave', conversationId);
      console.log('[SocketContext] Emitted conversation:leave for:', conversationId);
    }
  }, [socket]);

  // Send message
  const sendMessage = useCallback((conversationId, content, type = 'text') => {
    console.log('[SocketContext] sendMessage called:', { conversationId, content, type });
    console.log('[SocketContext] Socket exists:', !!socket);
    console.log('[SocketContext] Socket connected:', socket?.connected);
    
    if (socket) {
      console.log('[SocketContext] Emitting message:send...');
      socket.emit('message:send', { conversationId, content, type }, (ack) => {
        console.log('[SocketContext] Message send ACK:', ack);
      });
    } else {
      console.error('[SocketContext] Socket is null! Cannot send message');
    }
  }, [socket]);

  // Start typing indicator
  const startTyping = useCallback((conversationId) => {
    if (socket) {
      socket.emit('typing:start', conversationId);
    }
  }, [socket]);

  // Stop typing indicator
  const stopTyping = useCallback((conversationId) => {
    if (socket) {
      socket.emit('typing:stop', conversationId);
    }
  }, [socket]);

  // Mark messages as delivered
  const deliverMessages = useCallback((conversationId, messageIds) => {
    if (socket) {
      socket.emit('message:deliver', { conversationId, messageIds });
    }
  }, [socket]);

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
