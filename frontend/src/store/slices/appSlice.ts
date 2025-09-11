/**
 * App State Redux Slice
 * 
 * Manages general application state including network status,
 * notifications, and global UI state.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  isOnline: boolean;
  isInitialized: boolean;
  isFirstLaunch: boolean;
  notifications: {
    enabled: boolean;
    token?: string;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    activeTab: string;
    isKeyboardVisible: boolean;
  };
  location: {
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
    country?: string;
  };
  lastSync: string | null;
}

const initialState: AppState = {
  isOnline: true,
  isInitialized: false,
  isFirstLaunch: true,
  notifications: {
    enabled: false,
  },
  ui: {
    theme: 'auto',
    activeTab: 'Home',
    isKeyboardVisible: false,
  },
  location: {},
  lastSync: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setFirstLaunch: (state, action: PayloadAction<boolean>) => {
      state.isFirstLaunch = action.payload;
    },
    setNotificationToken: (state, action: PayloadAction<string>) => {
      state.notifications.token = action.payload;
      state.notifications.enabled = true;
    },
    toggleNotifications: (state, action: PayloadAction<boolean>) => {
      state.notifications.enabled = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.ui.theme = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.ui.activeTab = action.payload;
    },
    setKeyboardVisible: (state, action: PayloadAction<boolean>) => {
      state.ui.isKeyboardVisible = action.payload;
    },
    setLocation: (state, action: PayloadAction<Partial<AppState['location']>>) => {
      state.location = { ...state.location, ...action.payload };
    },
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload;
    },
    resetAppState: () => initialState,
  },
});

export const {
  setOnlineStatus,
  setInitialized,
  setFirstLaunch,
  setNotificationToken,
  toggleNotifications,
  setTheme,
  setActiveTab,
  setKeyboardVisible,
  setLocation,
  setLastSync,
  resetAppState,
} = appSlice.actions;

export default appSlice.reducer;