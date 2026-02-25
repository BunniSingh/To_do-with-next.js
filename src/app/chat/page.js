"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { ArrowLeft, Phone, Video, MoreVertical, Info } from 'lucide-react';
import ConversationList from '@/components/chat/ConversationList';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import NewConversationDialog from '@/components/chat/NewConversationDialog';
import Toast from '@/components/chat/Toast';

// Force dynamic rendering - requires authentication
export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { socket, connected, joinConversation, leaveConversation, sendMessage, startTyping, stopTyping, connectionError } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [toast, setToast] = useState(null);
  const selectedConversationRef = useRef(null); // Ref to track selected conversation

  // Update ref when selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

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

  // Load messages for a conversation
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
      // Set loading and fetch conversations
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conv) => {
    if (selectedConversation?.id === conv.id) return;

    // Leave previous conversation room
    if (selectedConversation) {
      console.log('[Chat Page] Leaving conversation:', selectedConversation.id);
      leaveConversation(selectedConversation.id);
    }

    setSelectedConversation(conv);
    setShowMobileList(false);
    setMessages([]);
    setTypingUsers([]);

    // Join new conversation room
    console.log('[Chat Page] Joining conversation:', conv.id);
    joinConversation(conv.id);

    // Load messages
    loadMessages(conv.id);
  }, [selectedConversation, leaveConversation, joinConversation, loadMessages]);

  // Handle sending message
  const handleSendMessage = useCallback((content) => {
    if (!selectedConversation || !session?.user) {
      console.log('[Chat Page] Cannot send: no conversation or session');
      setToast({
        message: 'Please wait, connection not established yet',
        type: 'error',
      });
      return;
    }

    console.log('[Chat Page] Sending message:', {
      conversationId: selectedConversation.id,
      content,
      socketConnected: connected,
      socketExists: !!socket,
      userId: session.user.id,
    });

    // Generate a temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Try socket first if connected
    if (socket && connected) {
      console.log('[Chat Page] Sending via Socket...');
      sendMessage(selectedConversation.id, content);
    } else {
      // Fallback to HTTP API
      console.log('[Chat Page] Socket not available, using HTTP fallback');
      fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: 'text' }),
      })
      .then(async res => {
        const data = await res.json();
        console.log('[Chat Page] HTTP response:', res.status, data);
        
        if (res.ok) {
          // Replace temp message with real one
          setMessages(prev => prev.map(msg => 
            msg._tempId === tempId ? {
              ...msg,
              id: data.id,
              sender: data.sender,
              _tempId: undefined,
            } : msg
          ));
        } else {
          console.error('[Chat Page] HTTP API error:', data);
          setToast({
            message: data.error || 'Failed to send message',
            type: 'error',
          });
        }
      })
      .catch(error => {
        console.error('[Chat Page] HTTP message send failed:', error);
        setToast({
          message: 'Network error. Please try again.',
          type: 'error',
        });
      });
    }

    stopTyping(selectedConversation.id);

    // Optimistically add message to UI with temp ID
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
      _tempId: tempId, // Mark as temporary for later replacement
    };

    setMessages(prev => [...prev, newMessage]);
  }, [selectedConversation, socket, connected, sendMessage, stopTyping, session]);

  // Handle new conversation
  const handleStartConversation = useCallback(async ({ participantIds, name, type }) => {
    console.log('[Chat Page] Starting conversation:', { participantIds, name, type });

    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds, name, type }),
      });

      const data = await res.json();
      console.log('[Chat Page] API Response:', { status: res.status, data });

      if (res.ok) {
        // Close the dialog first
        setShowNewConversationDialog(false);

        // Refresh conversations list
        await loadConversations();

        // Create conversation object with proper participant names
        const newConv = {
          id: data.id,
          name: data.name,
          type: data.type,
          participants: data.participants,
          lastMessage: data.lastMessage || null,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };

        console.log('[Chat Page] Conversation created/opened:', newConv);

        // Set as selected conversation
        setSelectedConversation(newConv);
        setShowMobileList(false);
        setMessages([]);
        setTypingUsers([]);

        // Join conversation room
        joinConversation(newConv.id);

        // Load messages
        loadMessages(newConv.id);

        // Show success toast (even for existing conversations)
        setToast({
          message: data.message || 'Conversation opened successfully!',
          type: 'success',
        });
      } else {
        console.error('[Chat Page] Failed to create conversation:', data.error || data);
        setToast({
          message: data.error || data.details || 'Failed to create conversation',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('[Chat Page] Error creating conversation:', error);
      setToast({
        message: 'Error creating conversation: ' + (error.message || 'Unknown error'),
        type: 'error',
      });
    }
  }, [loadConversations, joinConversation, loadMessages]);

  // Socket event listeners - only setup once when socket is connected
  useEffect(() => {
    console.log('[Chat Page] Socket event listeners setup');
    console.log('[Chat Page] Socket connected:', connected);
    console.log('[Chat Page] Socket exists:', !!socket);
    
    if (!connected || !socket) {
      console.log('[Chat Page] Socket not ready, skipping event listener setup');
      return;
    }

    console.log('[Chat Page] Setting up window event listeners...');

    const handleNewMessage = (event) => {
      const message = event.detail;
      console.log('[Chat Page] New message event:', message);

      if (selectedConversation && message.conversation === selectedConversation.id) {
        setMessages(prev => {
          // Check if message already exists by real ID
          if (prev.find(m => m.id === message._id)) {
            console.log('[Chat Page] Message already exists, skipping');
            return prev;
          }

          // Replace temporary message with real one (match by sender and content)
          const tempMessageIndex = prev.findIndex(
            m => m._tempId && m.sender._id === message.sender._id && m.content === message.content
          );

          if (tempMessageIndex !== -1) {
            console.log('[Chat Page] Replacing temp message with real one');
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = {
              ...message,
              id: message._id,
              sender: message.sender,
            };
            return newMessages;
          }

          // Add new message
          console.log('[Chat Page] Adding new message to list');
          return [...prev, {
            id: message._id,
            conversation: message.conversation,
            sender: message.sender,
            content: message.content,
            type: message.type,
            status: message.status,
            createdAt: message.createdAt,
          }];
        });

        // Update conversation list
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
              };
            }
            return conv;
          }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          
          console.log('[Chat Page] Updated conversations:', updated.length);
          return updated;
        });
      }
    };

    const handleTypingStarted = (event) => {
      const data = event.detail;
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversationId === currentConv.id) {
        setTypingUsers(prev => {
          if (prev.includes(data.userName)) return prev;
          return [...prev, data.userName];
        });
      }
    };

    const handleTypingStopped = (event) => {
      const data = event.detail;
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversationId === currentConv.id) {
        setTypingUsers(prev => prev.filter(u => u !== data.userName));
      }
    };

    window.addEventListener('socket:message:new', handleNewMessage);
    window.addEventListener('socket:typing:started', handleTypingStarted);
    window.addEventListener('socket:typing:stopped', handleTypingStopped);

    return () => {
      window.removeEventListener('socket:message:new', handleNewMessage);
      window.removeEventListener('socket:typing:started', handleTypingStarted);
      window.removeEventListener('socket:typing:stopped', handleTypingStopped);
    };
  }, [connected, socket]); // Removed selectedConversation from dependencies

  // Typing indicator timeout
  useEffect(() => {
    if (!selectedConversation || !socket) return;

    const handleTypingTimeout = setTimeout(() => {
      stopTyping(selectedConversation.id);
    }, 2000);

    return () => clearTimeout(handleTypingTimeout);
  }, [selectedConversation, socket, stopTyping, messages]);

  // Handle back button on mobile
  const handleBack = () => {
    setShowMobileList(true);
    setSelectedConversation(null);
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto h-[calc(100vh-2rem)] py-4 px-2 sm:px-4">
        <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex">
          {/* Conversation List */}
          <div className={`${
            showMobileList ? 'block' : 'hidden sm:block'
          } w-full sm:w-80 md:w-96 flex-shrink-0`}>
            <ConversationList
              conversations={conversations}
              onSelectConversation={handleSelectConversation}
              selectedId={selectedConversation?.id}
              onNewConversation={() => setShowNewConversationDialog(true)}
            />
          </div>

          {/* Chat Area */}
          <div className={`${
            !showMobileList ? 'flex' : 'hidden sm:flex'
          } flex-1 flex-col`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBack}
                      className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {selectedConversation.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {selectedConversation.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          connected ? 'bg-green-500' : 'bg-red-500'
                        }`} title={connected ? 'Connected' : 'Disconnected'}></span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {typingUsers.length > 0
                            ? `${typingUsers.join(', ')} typing...`
                            : connected ? 'Active now' : 'Reconnecting...'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors hidden sm:block">
                      <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors hidden sm:block">
                      <Video className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Connection Error Banner */}
                {connectionError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ⚠️ Connection issue: {connectionError}. Messages will be sent when reconnected.
                    </p>
                  </div>
                )}

                {/* Messages */}
                <MessageList
                  messages={messages}
                  conversation={selectedConversation}
                  typingUsers={typingUsers}
                />

                {/* Message Input - Always enabled, uses HTTP fallback if socket fails */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  disabled={false}
                />
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="w-20 h-20 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Welcome to Chat</h3>
                  <p className="mb-4">Select a conversation or start a new one</p>
                  <button
                    onClick={() => setShowNewConversationDialog(true)}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
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
