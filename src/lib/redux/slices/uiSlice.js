import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Mobile UI state
  showMobileList: true,
  showNewConversationDialog: false,
  showSearch: false,
  
  // Typing indicators
  typingUsers: [],
  
  // Toast notifications
  toast: null,
  
  // Search
  searchQuery: '',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Mobile list view
    setShowMobileList: (state, action) => {
      state.showMobileList = action.payload;
    },
    toggleMobileList: (state) => {
      state.showMobileList = !state.showMobileList;
    },
    
    // Dialogs
    setShowNewConversationDialog: (state, action) => {
      state.showNewConversationDialog = action.payload;
    },
    setShowSearch: (state, action) => {
      state.showSearch = action.payload;
    },
    
    // Typing
    setTypingUsers: (state, action) => {
      state.typingUsers = action.payload;
    },
    addTypingUser: (state, action) => {
      if (!state.typingUsers.includes(action.payload)) {
        state.typingUsers.push(action.payload);
      }
    },
    removeTypingUser: (state, action) => {
      state.typingUsers = state.typingUsers.filter(u => u !== action.payload);
    },
    
    // Toast
    setToast: (state, action) => {
      state.toast = action.payload;
    },
    clearToast: (state) => {
      state.toast = null;
    },
    
    // Search
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearSearch: (state) => {
      state.searchQuery = '';
    },
    
    // Reset all UI state
    resetUI: (state) => {
      return initialState;
    },
  },
});

export const {
  setShowMobileList,
  toggleMobileList,
  setShowNewConversationDialog,
  setShowSearch,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
  setToast,
  clearToast,
  setSearchQuery,
  clearSearch,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;
