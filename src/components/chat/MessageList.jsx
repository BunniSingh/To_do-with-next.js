"use client";

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Check, CheckCheck } from 'lucide-react';

export default function MessageList({ messages, conversation, typingUsers }) {
  const { data: session } = useSession();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const msgDate = new Date(date);
    const now = new Date();
    const isToday = msgDate.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = msgDate.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return msgDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const getMessageStatus = (message) => {
    if (message.status === 'read') {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (message.status === 'delivered') {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  const groupMessagesByDate = () => {
    const groups = {};

    messages.forEach((msg) => {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900 min-h-full">
      {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
        <div key={dateKey}>
          {/* Date Separator */}
          <div className="flex items-center justify-center mb-4">
            <span className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
              {formatDate(dateMessages[0].createdAt)}
            </span>
          </div>

          {/* Messages */}
          {dateMessages.map((msg, index) => {
            // Handle both string sender and object sender
            const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
            const isOwn = senderId === session?.user?.id;
            
            // Show avatar only for the last message from a sender in a consecutive group
            const showAvatar = !isOwn && (
              index === dateMessages.length - 1 ||
              dateMessages[index + 1]?.sender?._id !== msg.sender?._id
            );

            // Use unique key combining id, tempId, and index for stability
            const messageKey = msg.id || msg._tempId || `msg-${index}`;

            return (
              <div
                key={messageKey}
                className={`flex items-end gap-1.5 sm:gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
                  showAvatar ? 'mb-3' : 'mb-1'
                }`}
              >
                {/* Avatar for received messages */}
                {!isOwn && (
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0 ${
                    showAvatar ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {msg.sender?.name?.charAt(0) || 'U'}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[75%] sm:max-w-[70%] px-3 sm:px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white rounded-bl-md shadow-sm'
                  }`}
                >
                  {/* Sender name for received messages (always show for direct messages) */}
                  {!isOwn && (
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      {msg.sender?.name || 'Unknown'}
                    </p>
                  )}
                  {/* "You" label for sent messages */}
                  {isOwn && (
                    <p className="text-xs font-semibold text-indigo-200 mb-1 text-right">
                      You
                    </p>
                  )}

                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>

                  {/* Message Meta */}
                  <div className={`flex items-center justify-end gap-1 mt-1 ${
                    isOwn ? 'text-indigo-200' : 'text-gray-400'
                  }`}>
                    <span className="text-xs">{formatTime(msg.createdAt)}</span>
                    {isOwn && getMessageStatus(msg)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-end gap-1.5 sm:gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
            {typingUsers[0]?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-slate-800 rounded-2xl rounded-bl-md shadow-sm">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
