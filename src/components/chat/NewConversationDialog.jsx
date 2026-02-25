"use client";

import { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';

export default function NewConversationDialog({ isOpen, onClose, onStartConversation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationName, setConversationName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setConversationName('');
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await fetch(`/api/chat/users/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const users = await res.json();
            setSearchResults(users);
          }
        } catch (error) {
          console.error('Error searching users:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSelectUser = (user) => {
    if (!selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
      if (!conversationName) {
        setConversationName(user.name);
      }
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };

  const handleSubmit = () => {
    if (selectedUsers.length === 0) return;
    
    onStartConversation({
      participantIds: selectedUsers.map(u => u._id),
      name: conversationName || undefined,
      type: selectedUsers.length > 1 ? 'group' : 'direct',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Participants
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user._id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                  >
                    {user.name}
                    <button
                      onClick={() => handleRemoveUser(user._id)}
                      className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add People
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 border-0 rounded-lg text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Search Results */}
          {loading && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <UserPlus className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {!loading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Start Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
