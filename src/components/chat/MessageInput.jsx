"use client";

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function MessageInput({ onSendMessage, disabled }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim());
    setMessage('');
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    // Notify typing start
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-slate-700">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-0 rounded-2xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 resize-none max-h-32"
            style={{ minHeight: '44px' }}
          />
        </div>
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors shadow-md hover:shadow-lg"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
