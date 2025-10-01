/**
 * MediMate Malaysia Mobile App
 * 
 * Main application entry point with Redux Provider and navigation setup.
 * Provides culturally-intelligent medication management for Malaysian families.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import RootNavigator from '@/navigation/RootNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}
