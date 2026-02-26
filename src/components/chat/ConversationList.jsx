"use client";

import { useSession } from 'next-auth/react';
import { useSocket } from '@/context/SocketContext';
import { Search, Plus, MessageCircle } from 'lucide-react';

export default function ConversationList({ 
  conversations, 
  onSelectConversation, 
  selectedId, 
  onNewConversation,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
}) {
  const { data: session } = useSession();
  const { connected } = useSocket();
  const onlineUsers = useSocket().onlineUsers;

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOnlineStatus = (conv) => {
    if (conv.type !== 'direct' || !conv.participants || !session?.user?.id) return null;
    const otherParticipant = conv.participants.find(p => p.id !== session.user.id);
    if (!otherParticipant) return null;
    return onlineUsers.has(otherParticipant.id);
  };

  const getLastSeen = (lastSeenAt, isOnline) => {
    if (!lastSeenAt) return '';
    if (isOnline) return '';

    const now = new Date();
    const lastSeenDate = new Date(lastSeenAt);
    const diff = now - lastSeenDate;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return lastSeenDate.toLocaleDateString([], { weekday: 'short' });
    return lastSeenDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet';
    const prefix = message.sender?.name ? `${message.sender.name}: ` : '';
    return prefix + message.content;
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const msgDate = new Date(date);
    const diff = now - msgDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return msgDate.toLocaleDateString([], { weekday: 'short' });
    return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Messages</h2>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="Search conversations"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={onNewConversation}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="New conversation"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="relative mb-2 sm:mb-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-gray-100 dark:bg-slate-700 border-0 rounded-lg text-sm sm:text-base text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Connection Status */}
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto flex-shrink-0">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
            <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mb-4 opacity-50" />
            <p className="text-center text-sm sm:text-base">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewConversation}
                className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline text-sm sm:text-base"
              >
                Start a new conversation
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredConversations.map((conv) => {
              const isOnline = getOnlineStatus(conv);
              const lastSeen = getLastSeen(conv.lastSeenAt, isOnline);
              const unreadCount = conv.unreadCount || 0;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full p-3 sm:p-4 flex items-start gap-2 sm:gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 ${
                    selectedId === conv.id ? 'bg-indigo-50 dark:bg-slate-700' : ''
                  }`}
                >
                  {/* Avatar with Online Status */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                      {conv.name.charAt(0).toUpperCase()}
                    </div>
                    {isOnline !== null && (
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`} title={isOnline ? 'Active now' : 'Offline'} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate text-sm sm:text-base">
                        {conv.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                        {formatTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                        {lastSeen && !isOnline ? (
                          <span className="text-gray-500 dark:text-gray-500">{lastSeen} · </span>
                        ) : null}
                        {formatLastMessage(conv.lastMessage)}
                      </p>
                      {unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] sm:min-w-[20px] h-4 sm:h-5 px-1 sm:px-1.5 flex items-center justify-center bg-green-500 text-white text-xs font-bold rounded-full">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
