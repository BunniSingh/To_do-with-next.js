import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import socketReducer from './slices/socketSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    socket: socketReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for Socket.io
        ignoredActions: ['socket/setSocket'],
        // Ignore these field paths in state
        ignoredPaths: ['socket.socket'],
      },
    }),
});

export default store;
