"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { Search, Plus, MessageCircle } from 'lucide-react';

export default function ConversationList({ conversations, onSelectConversation, selectedId, onNewConversation }) {
  const router = useRouter();
  const { connected } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

    if (days === 0) {
      return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return msgDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Messages</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="Search conversations"
            >
              <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={onNewConversation}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="New conversation"
            >
              <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 border-0 rounded-lg text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Connection Status */}
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div key="empty-state" className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
            <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewConversation}
                className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Start a new conversation
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 ${
                  selectedId === conv.id ? 'bg-indigo-50 dark:bg-slate-700' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {conv.name.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                      {conv.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {formatLastMessage(conv.lastMessage)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
