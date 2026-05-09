import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import examReducer from './slices/examSlice';
import streakReducer from './slices/streakSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    exam: examReducer,
    streak: streakReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types that may carry non-serializable values
        ignoredActions: ['exam/setCurrentAudio'],
      },
    }),
});

export default store;
