/**
 * Root Navigator
 * 
 * Top-level navigation with authentication guards that switches
 * between authenticated and unauthenticated navigation stacks.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadStoredUser } from '@/store/slices/authSlice';
import { setInitialized } from '@/store/slices/appSlice';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { RootStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { isInitialized } = useAppSelector((state) => state.app);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Try to load stored user session
        await dispatch(loadStoredUser());
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        // Mark app as initialized
        dispatch(setInitialized(true));
      }
    };

    if (!isInitialized) {
      initializeApp();
    }
  }, [isInitialized]);

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen
            name="Main"
            component={MainNavigator}
            options={{
              gestureEnabled: false, // Prevent swipe back to auth
            }}
          />
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              gestureEnabled: false, // Prevent swipe gestures during auth
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * Loading Screen Component
 * 
 * Displayed while the app is initializing and checking
 * for stored authentication sessions.
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>MediMate Malaysia</Text>
      <Text style={styles.loadingSubtitle}>
        Pengurusan Ubat dengan Kecerdasan Budaya
      </Text>
      <View style={styles.loadingIndicator}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
  },
  loadingTitle: {
    fontSize: TYPOGRAPHY.fontSizes['3xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 48,
  },
  loadingIndicator: {
    padding: 20,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});