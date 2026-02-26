import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  conversations: [],
  selectedConversation: null,
  messages: [],
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Conversations
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action) => {
      const existing = state.conversations.find(c => c.id === action.payload.id);
      if (existing) {
        Object.assign(existing, action.payload);
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    updateConversation: (state, action) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          ...action.payload,
        };
      }
    },
    updateConversationLastMessage: (state, action) => {
      const { conversationId, lastMessage } = action.payload;
      const index = state.conversations.findIndex(c => c.id === conversationId);
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          lastMessage,
          updatedAt: lastMessage.createdAt,
        };
        // Move to top
        const [updated] = state.conversations.splice(index, 1);
        state.conversations.unshift(updated);
      }
    },
    incrementUnreadCount: (state, action) => {
      const index = state.conversations.findIndex(c => c.id === action.payload);
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          unreadCount: (state.conversations[index].unreadCount || 0) + 1,
        };
      }
    },
    resetUnreadCount: (state, action) => {
      const index = state.conversations.findIndex(c => c.id === action.payload);
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          unreadCount: 0,
        };
      }
    },
    
    // Selected Conversation
    setSelectedConversation: (state, action) => {
      state.selectedConversation = action.payload;
    },
    clearSelectedConversation: (state) => {
      state.selectedConversation = null;
    },
    updateSelectedConversation: (state, action) => {
      if (state.selectedConversation) {
        state.selectedConversation = {
          ...state.selectedConversation,
          ...action.payload,
        };
      }
    },
    
    // Messages
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      const exists = state.messages.find(m => m._id === action.payload._id || m.id === action.payload._id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    replaceTempMessage: (state, action) => {
      const { tempId, message } = action.payload;
      const index = state.messages.findIndex(m => m._tempId === tempId);
      if (index !== -1) {
        state.messages[index] = {
          ...message,
          _tempId: undefined,
        };
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    
    // Loading & Error
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  // Conversations
  setConversations,
  addConversation,
  updateConversation,
  updateConversationLastMessage,
  incrementUnreadCount,
  resetUnreadCount,
  
  // Selected Conversation
  setSelectedConversation,
  clearSelectedConversation,
  updateSelectedConversation,
  
  // Messages
  setMessages,
  addMessage,
  replaceTempMessage,
  clearMessages,
  
  // Loading & Error
  setLoading,
  setError,
  clearError,
} = chatSlice.actions;

export default chatSlice.reducer;
