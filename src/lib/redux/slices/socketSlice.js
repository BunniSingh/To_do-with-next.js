import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  socket: null,
  connected: false,
  onlineUsers: new Set(),
  connectionError: null,
  joinedConversations: new Set(),
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    setConnected: (state, action) => {
      state.connected = action.payload;
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = new Set(action.payload);
    },
    addUserOnline: (state, action) => {
      state.onlineUsers.add(action.payload);
    },
    removeUserOnline: (state, action) => {
      state.onlineUsers.delete(action.payload);
    },
    setConnectionError: (state, action) => {
      state.connectionError = action.payload;
    },
    addJoinedConversation: (state, action) => {
      state.joinedConversations.add(action.payload);
    },
    removeJoinedConversation: (state, action) => {
      state.joinedConversations.delete(action.payload);
    },
    clearSocket: (state) => {
      state.socket = null;
      state.connected = false;
      state.onlineUsers = new Set();
      state.connectionError = null;
      state.joinedConversations = new Set();
    },
  },
});

export const {
  setSocket,
  setConnected,
  setOnlineUsers,
  addUserOnline,
  removeUserOnline,
  setConnectionError,
  addJoinedConversation,
  removeJoinedConversation,
  clearSocket,
} = socketSlice.actions;

export default socketSlice.reducer;
