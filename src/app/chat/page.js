"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { ArrowLeft } from 'lucide-react';
import ConversationList from '@/components/chat/ConversationList';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import NewConversationDialog from '@/components/chat/NewConversationDialog';
import Toast from '@/components/chat/Toast';
import { playNotificationSound, showBrowserNotification, isDocumentVisible, isWindowFocused, initializeNotifications } from '@/Utils/notifications';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { socket, connected, onlineUsers, joinConversation, leaveConversation, sendMessage, startTyping, stopTyping, connectionError } = useSocket();

  // Local state
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  const selectedConversationRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
    
    // Check current permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Track previous messages length for detecting new messages
  useEffect(() => {
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async (conversationId) => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      const fetchData = async () => {
        setLoading(true);
        try {
          await loadConversations();
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [status, router, loadConversations]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conv) => {
    if (selectedConversation?.id === conv.id) return;

    if (selectedConversation) {
      leaveConversation(selectedConversation.id);
    }

    setSelectedConversation(conv);
    setShowMobileList(false);
    setMessages([]);
    setTypingUsers([]);

    joinConversation(conv.id);
    loadMessages(conv.id);

    setTimeout(() => {
      fetch(`/api/chat/conversations/${conv.id}/read`, {
        method: 'POST',
      }).catch(err => console.error('Error marking messages as read:', err));
      
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, unreadCount: 0 } : c
      ));
    }, 500);
  }, [selectedConversation, joinConversation, leaveConversation, loadMessages]);

  // Handle sending message
  const handleSendMessage = useCallback((content) => {
    if (!selectedConversation || !session?.user) {
      setToast({ message: 'Please wait, connection not established yet', type: 'error' });
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Optimistically add message to UI immediately
    const newMessage = {
      id: tempId,
      conversation: selectedConversation.id,
      sender: {
        _id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      content,
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
      _tempId: tempId,
    };

    setMessages(prev => [...prev, newMessage]);

    // Update conversation's last message
    setConversations(prev => prev.map(conv => 
      conv.id === selectedConversation.id 
        ? { 
            ...conv, 
            lastMessage: { 
              id: tempId, 
              content, 
              sender: { _id: session.user.id, name: session.user.name },
              createdAt: newMessage.createdAt 
            },
            updatedAt: newMessage.createdAt 
          }
        : conv
    ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));

    // Send via socket or HTTP fallback
    if (socket && connected) {
      sendMessage(selectedConversation.id, content);
    } else {
      // HTTP fallback
      fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: 'text' }),
      })
      .then(async res => {
        const data = await res.json();
        if (res.ok) {
          // Replace temp message with real one
          setMessages(prev => prev.map(msg =>
            msg._tempId === tempId ? { 
              ...msg, 
              id: data.id, 
              sender: data.sender, 
              _tempId: undefined,
              status: 'sent'
            } : msg
          ));
        } else {
          // Show error if message failed to send
          setToast({ message: 'Failed to send message', type: 'error' });
        }
      })
      .catch(error => {
        console.error('HTTP message send failed:', error);
        setToast({ message: 'Message failed to send', type: 'error' });
      });
    }

    // Stop typing indicator
    stopTyping(selectedConversation.id);
  }, [selectedConversation, socket, connected, sendMessage, stopTyping, session]);

  // Handle new conversation
  const handleStartConversation = useCallback(async ({ participantIds, name, type }) => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds, name, type }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowNewConversationDialog(false);
        
        const newConv = {
          id: data.id,
          name: data.name,
          type: data.type,
          participants: data.participants,
          lastMessage: data.lastMessage || null,
          updatedAt: data.updatedAt || new Date().toISOString(),
          unreadCount: 0,
        };

        // Add conversation to list smoothly
        setConversations(prev => {
          const exists = prev.find(c => c.id === newConv.id);
          if (exists) {
            return prev.map(c => c.id === newConv.id ? { ...c, ...newConv } : c);
          }
          return [newConv, ...prev];
        });

        // Select the new conversation
        setSelectedConversation(newConv);
        setShowMobileList(false);
        setMessages([]);
        setTypingUsers([]);

        // Join conversation room
        joinConversation(newConv.id);
        loadMessages(newConv.id);

        // Show success toast
        setToast({ 
          message: `Conversation started with ${newConv.name}`, 
          type: 'success' 
        });
      } else {
        setToast({ message: data.error || 'Failed to create conversation', type: 'error' });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setToast({ message: 'Error creating conversation', type: 'error' });
    }
  }, [joinConversation, loadMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!connected || !socket) return;

    const handleNewMessage = (event) => {
      const message = event.detail;
      const currentConv = selectedConversationRef.current;
      const isCurrentConversation = currentConv && message.conversation === currentConv.id;
      const isFromMe = message.sender?._id === session?.user?.id;

      // Show notification if message is from someone else and not in current conversation
      if (!isFromMe && !isCurrentConversation) {
        // Play notification sound
        playNotificationSound();

        // Show browser notification if tab is not focused
        if (!isDocumentVisible() || !isWindowFocused()) {
          showBrowserNotification(
            'New Message',
            `${message.sender?.name || 'Someone'} sent you a message`,
          );
        }

        // Update conversation list with notification
        setConversations(prev => {
          const updated = prev.map(conv => {
            if (conv.id === message.conversation) {
              return {
                ...conv,
                unreadCount: (conv.unreadCount || 0) + 1,
                lastMessage: {
                  id: message._id,
                  content: message.content,
                  sender: message.sender,
                  createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
              };
            }
            return conv;
          }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          return updated;
        });
      }

      // Update messages if in current conversation
      if (isCurrentConversation) {
        setMessages(prev => {
          const exists = prev.find(m => m._id === message._id || m.id === message._id);
          if (exists) return prev;

          const tempMessageIndex = prev.findIndex(
            m => m._tempId && m.sender?._id === message.sender?._id && m.content === message.content
          );

          if (tempMessageIndex !== -1) {
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = { ...message, id: message._id, sender: message.sender, _tempId: undefined };
            return newMessages;
          }

          return [...prev, { ...message, id: message._id }];
        });

        setConversations(prev => {
          const updated = prev.map(conv => {
            if (conv.id === message.conversation) {
              return {
                ...conv,
                lastMessage: {
                  id: message._id,
                  content: message.content,
                  sender: message.sender,
                  createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
                lastSeenAt: message.sender?._id !== session?.user?.id ? message.createdAt : conv.lastSeenAt,
              };
            }
            return conv;
          }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          return updated;
        });

        const isFromOtherParticipant = message.sender?._id !== session?.user?.id;
        if (isFromOtherParticipant) {
          setSelectedConversation(prev => ({
            ...prev,
            lastSeenAt: message.createdAt,
          }));
        }
      }
    };

    const handleTypingStarted = (event) => {
      const data = event.detail;
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversationId === currentConv.id) {
        setTypingUsers(prev => [...prev, data.userName]);
      }
    };

    const handleTypingStopped = (event) => {
      const data = event.detail;
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversationId === currentConv.id) {
        setTypingUsers(prev => prev.filter(u => u !== data.userName));
      }
    };

    const handleConversationCreated = (event) => {
      const data = event.detail;
      const newConv = data.conversation;
      
      // Add conversation to list smoothly
      setConversations(prev => {
        const exists = prev.find(conv => conv.id === newConv.id);
        if (exists) {
          // Update existing conversation
          return prev.map(conv => 
            conv.id === newConv.id ? { ...conv, ...newConv } : conv
          );
        }
        // Add new conversation at the top
        return [newConv, ...prev];
      });
      
      // Show toast notification
      setToast({ 
        message: `New conversation: ${newConv.name}`, 
        type: 'info' 
      });
    };

    window.addEventListener('socket:message:new', handleNewMessage);
    window.addEventListener('socket:typing:started', handleTypingStarted);
    window.addEventListener('socket:typing:stopped', handleTypingStopped);
    window.addEventListener('socket:conversation:created', handleConversationCreated);

    return () => {
      window.removeEventListener('socket:message:new', handleNewMessage);
      window.removeEventListener('socket:typing:started', handleTypingStarted);
      window.removeEventListener('socket:typing:stopped', handleTypingStopped);
      window.removeEventListener('socket:conversation:created', handleConversationCreated);
    };
  }, [connected, socket, session]);

  // Sync selectedConversation lastSeenAt AND name from conversations state
  useEffect(() => {
    if (!selectedConversation) return;

    const currentConv = conversations.find(c => c.id === selectedConversation.id);
    if (currentConv) {
      const updates = {};
      if (currentConv.lastSeenAt !== selectedConversation.lastSeenAt) {
        updates.lastSeenAt = currentConv.lastSeenAt;
      }
      // Update name if it changed (e.g., was 'Unknown' and now has proper name)
      if (currentConv.name && currentConv.name !== selectedConversation.name) {
        updates.name = currentConv.name;
      }
      if (Object.keys(updates).length > 0) {
        setSelectedConversation(prev => ({
          ...prev,
          ...updates,
        }));
      }
    }
  }, [conversations, selectedConversation]);

  // Handle back button on mobile
  const handleBack = () => {
    setShowMobileList(true);
    setSelectedConversation(null);
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Notification permission banner
  const showNotificationBanner = notificationPermission === 'default' && status === 'authenticated';

  const requestNotificationAccess = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setToast({ message: 'Notifications enabled!', type: 'success' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Notification Permission Banner */}
      {showNotificationBanner && (
        <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm font-medium">Enable notifications to get alerts when you receive new messages</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={requestNotificationAccess}
              className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              Enable
            </button>
            <button
              onClick={() => setNotificationPermission('denied')}
              className="px-3 py-2 text-indigo-200 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto h-[calc(100vh-2rem)] py-4 px-2 sm:px-4">
        <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row">
          {/* Conversation List - Always visible on desktop, toggle on mobile */}
          <div className={`${
            showMobileList ? 'flex' : 'hidden sm:flex'
          } w-full sm:w-80 md:w-96 flex-shrink-0 flex-col`}>
            <ConversationList
              conversations={conversations}
              onSelectConversation={handleSelectConversation}
              selectedId={selectedConversation?.id}
              onNewConversation={() => setShowNewConversationDialog(true)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showSearch={showSearch}
              setShowSearch={setShowSearch}
            />
          </div>

          {/* Chat Area */}
          <div className={`${
            !showMobileList ? 'flex' : 'hidden sm:flex'
          } flex-1 flex-col min-w-0 h-full`}>
            {selectedConversation ? (
              <>
                {/* Chat Header - Fixed */}
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 flex-shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      onClick={handleBack}
                      className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors flex-shrink-0"
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    {(() => {
                      // Get the friend's name (other participant) for direct messages
                      const friend = selectedConversation.type === 'direct' && selectedConversation.participants
                        ? selectedConversation.participants.find(p => p.id !== session?.user?.id)
                        : null;
                      const displayName = friend ? friend.name : selectedConversation.name;
                      const friendId = friend?.id;
                      const isFriendOnline = friendId ? onlineUsers.has(friendId) : false;

                      return (
                        <>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-800 dark:text-white truncate text-sm sm:text-base">
                              {displayName || 'Unknown'}
                            </h3>
                            <div className="flex items-center gap-2">
                              {selectedConversation.type === 'direct' && (
                                <>
                                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                    isFriendOnline ? 'bg-green-500' : 'bg-gray-400'
                                  }`} title={isFriendOnline ? 'Active now' : 'Offline'}></span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {typingUsers.length > 0
                                      ? `${typingUsers.join(', ')} typing...`
                                      : isFriendOnline
                                        ? 'Active now'
                                        : selectedConversation.lastSeenAt
                                          ? `Last seen ${new Date(selectedConversation.lastSeenAt).toLocaleString([], {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              day: selectedConversation.lastSeenAt && new Date(selectedConversation.lastSeenAt).toDateString() !== new Date().toDateString() ? 'numeric' : undefined,
                                              month: selectedConversation.lastSeenAt && new Date(selectedConversation.lastSeenAt).toDateString() !== new Date().toDateString() ? 'short' : undefined,
                                            })}`
                                          : 'Offline'}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Connection Error Banner - Fixed */}
                {connectionError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-3 sm:px-4 py-2 flex-shrink-0">
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                      ⚠️ Connection issue: {connectionError}. Messages will be sent when reconnected.
                    </p>
                  </div>
                )}

                {/* Messages - Scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <MessageList
                    messages={messages}
                    conversation={selectedConversation}
                    typingUsers={typingUsers}
                  />
                </div>

                {/* Message Input - Fixed at bottom */}
                <div className="flex-shrink-0">
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    disabled={false}
                  />
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
                <div className="text-center text-gray-500 dark:text-gray-400 max-w-md">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Welcome to Chat</h3>
                  <p className="text-sm sm:text-base mb-4">Select a conversation or start a new one</p>
                  <button
                    onClick={() => setShowNewConversationDialog(true)}
                    className="px-4 sm:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                  >
                    New Conversation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        isOpen={showNewConversationDialog}
        onClose={() => setShowNewConversationDialog(false)}
        onStartConversation={handleStartConversation}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
