/**
 * Redux Store Configuration
 * 
 * Central store for application state management using Redux Toolkit
 * with advanced middleware for performance, navigation, and cultural persistence.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import culturalReducer from './slices/culturalSlice';
import appReducer from './slices/appSlice';
import { configureMiddleware } from './middleware';

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
        ignoredActions: ['auth/setTokens', 'cultural/updateProfile', 'app/setTimestamp'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp', 'meta.culturalContext'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.tokens.expiresAt', 'cultural.lastUpdated', 'app.lastActivity'],
      },
    }).concat(configureMiddleware()),
  devTools: __DEV__ && {
    name: 'MediMate Malaysia',
    features: {
      pause: true,
      lock: true,
      persist: true,
      export: true,
      import: 'custom',
      jump: true,
      skip: true,
      reorder: true,
      dispatch: true,
      test: true,
    },
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';