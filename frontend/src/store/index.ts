/**
 * Redux Store Configuration
 * 
 * Central store for application state management using Redux Toolkit.
 * Includes authentication, cultural settings, and app state.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import culturalReducer from './slices/culturalSlice';
import appReducer from './slices/appSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cultural: culturalReducer,
    app: appReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for date serialization
        ignoredActions: ['auth/setTokens'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.tokens.expiresAt'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';